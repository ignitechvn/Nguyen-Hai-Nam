/* Build script: bundles src/ into lib/ (replaces the old gulp 3 pipeline, which no longer runs on modern Node) */
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const less = require('less');

const src = path.join(__dirname, 'src');
const dest = path.join(__dirname, 'lib');
const watch = process.argv.includes('--watch');
const serve = process.argv.includes('--serve');

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach((name) => {
    const s = path.join(from, name);
    const d = path.join(to, name);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  });
}

async function buildStatic() {
  copyDir(path.join(src, 'htdocs'), dest);
  copyDir(path.join(src, 'images'), path.join(dest, 'images'));
  fs.copyFileSync(path.join(__dirname, 'vendor/css/reset.css'), path.join(dest, 'vendor.css'));

  const input = fs.readFileSync(path.join(src, 'index.less'), 'utf8');
  const output = await less.render(input, { filename: path.join(src, 'index.less'), compress: !watch });
  fs.writeFileSync(path.join(dest, 'index.css'), output.css);
}

async function main() {
  fs.rmSync(dest, { recursive: true, force: true });
  await buildStatic();
  // The page also loads vendor.js; everything is bundled into index.js now.
  fs.writeFileSync(path.join(dest, 'vendor.js'), '');

  const ctx = await esbuild.context({
    entryPoints: [path.join(src, 'index.js')],
    outfile: path.join(dest, 'index.js'),
    bundle: true,
    minify: !watch,
    sourcemap: watch,
    target: 'es2017',
    define: { 'process.env.NODE_ENV': '"production"' },
    logLevel: 'info',
  });

  if (watch || serve) {
    await ctx.watch();
    fs.watch(src, { recursive: true }, (event, file) => {
      if (file && !file.endsWith('.js')) buildStatic().catch(console.error);
    });
    const { port } = await ctx.serve({ servedir: dest, port: 3000 });
    console.log('Serving on http://localhost:' + port);
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
