import cratedigger from './scripts/cratedigger';
import Constants from './scripts/constants';
import content from './content.json';

// Content source: content/Website_Layout_Hai_Nam.xlsx -> src/content.json (tools/xlsx_to_json.py)
const { profile } = content;

const CATEGORY_COLORS = {
  'Personal Background': ['#1d3557', '#e9c46a'],
  'VEX Competition & Robotics Journey': ['#9b2226', '#f4f1de'],
  'Rural Education & Digital Inclusion': ['#2d6a4f', '#f1faee'],
  'Dedication to Digitalized Sound': ['#3c1642', '#f6bd60'],
  'STEM Activities & Social Impacts': ['#0b6e8a', '#f8f9fa'],
  'Miles & Milestones': ['#bc6c25', '#fefae0'],
};

const LABELS = {
  en: {
    platform: 'Visit platform',
    research: 'Read the research',
    fanpage: 'Fanpage',
    company: 'Company website',
    contact: 'Contact',
  },
  vi: {
    platform: 'Xem nền tảng',
    research: 'Đọc bài nghiên cứu',
    fanpage: 'Fanpage',
    company: 'Website công ty',
    contact: 'Liên hệ',
  },
};

// The first item of the spreadsheet is placed at the front of the crate
const data = content.records.slice().reverse().map((record, i) => Object.assign({}, record, {
  artist: record.role || record.category,
  cover: '',
  coverPath: record.cover || '',
  photos: record.photos || [],
  groups: record.groups || [],
  hasSleeve: false,
  index: content.records.length - 1 - i,
}));

let lang = 'en';
try {
  lang = localStorage.getItem('lang') === 'vi' ? 'vi' : 'en';
} catch (e) {
  // storage unavailable
}

const bottomBar = document.getElementById('bottom-bar');
const topBar = document.getElementById('top-bar');
const buttonPrev = document.getElementById('button-prev');
const buttonShow = document.getElementById('button-show');
const buttonNext = document.getElementById('button-next');
const infoContainer = document.getElementById('cratedigger-info');
const closeButton = document.getElementById('info-close');
const langToggle = document.getElementById('lang-toggle');
const categoryNav = document.getElementById('category-nav');

const el = (id) => document.getElementById(id);

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;',
  })[c]);
}

function formatParagraph(text) {
  return escapeHtml(text)
    .replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*\*/g, '');
}

function recordId(index) {
  return content.records.length - 1 - index;
}

function bindEvents() {
  buttonPrev.addEventListener('click', (e) => {
    e.preventDefault();
    cratedigger.selectPrevRecord();
  }, false);

  buttonShow.addEventListener('click', (e) => {
    e.preventDefault();
    if (cratedigger.getSelectedRecord()) {
      cratedigger.flipSelectedRecord();
    } else {
      cratedigger.selectNextRecord();
    }
  }, false);

  buttonNext.addEventListener('click', (e) => {
    e.preventDefault();
    cratedigger.selectNextRecord();
  }, false);

  closeButton.addEventListener('click', (e) => {
    e.preventDefault();
    cratedigger.flipBackSelectedRecord();
  }, false);

  // Keep clicks & touches inside the article from reaching the 3D scene
  ['mousedown', 'mouseup', 'touchstart', 'touchend'].forEach((type) => {
    infoContainer.addEventListener(type, (e) => e.stopPropagation(), false);
  });
}

function renderPhotos(photos) {
  if (!photos.length) {
    return '';
  }

  const columns = photos.length === 1 ? 1 : photos.length % 3 === 0 ? 3 : 2;

  return `<div class="photo-group photo-group-${columns}">` + photos.map((photo) =>
    `<figure>
      <a href="${escapeHtml(photo.src)}" target="_blank" rel="noopener">
        <img src="${escapeHtml(photo.src)}" width="${photo.width}" height="${photo.height}" loading="lazy" alt="${escapeHtml(photo.caption)}">
      </a>
      ${photo.caption ? `<figcaption>${escapeHtml(photo.caption)}</figcaption>` : ''}
    </figure>`
  ).join('') + '</div>';
}

// Photos are spread between paragraphs ("xen kẽ"), placed after given paragraphs, or all after the text
function renderBody(paragraphs, photos, layout, groups) {
  const html = paragraphs.map((p) => `<p>${formatParagraph(p)}</p>`);

  if (layout === 'groups') {
    const after = (key) => groups.filter((group) => group.after === key)
      .map((group) => renderPhotos(group.photos)).join('');
    return html.map((p, i) => p + after(i)).join('') + after('end');
  }

  if (layout === 'end' || paragraphs.length < 2) {
    return html.join('') + renderPhotos(photos);
  }

  let start = 0;

  return html.map((p, i) => {
    const end = Math.round(photos.length * (i + 1) / paragraphs.length);
    const group = photos.slice(start, end);
    start = end;
    return p + renderPhotos(group);
  }).join('');
}

function fillInfoPanel(record) {
  const item = record.data;
  const labels = LABELS[lang];

  el('cratedigger-record-category').textContent = item.category;
  el('cratedigger-record-artist').textContent = item.role;
  el('cratedigger-record-title').textContent = item.title;
  el('cratedigger-record-subtitle').textContent = item.subtitle;

  el('cratedigger-record-links').innerHTML = item.links.map((link) =>
    `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener">${labels[link.type] || link.type} &#8599;</a>`
  ).join('');

  el('cratedigger-record-content').innerHTML = renderBody(item[lang], item.photos, item.layout, item.groups);

  el('cratedigger-record-contact').innerHTML = item.index === 0 ?
    `<h2>${labels.contact}</h2>
     <a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a>
     <a href="tel:${escapeHtml(profile.phone.replace(/[^\d+]/g, ''))}">${escapeHtml(profile.phone)}</a>
     <a href="https://${escapeHtml(profile.domain)}" target="_blank" rel="noopener">${escapeHtml(profile.domain)}</a>` : '';

  infoContainer.scrollTop = 0;
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';

  words.forEach((word) => {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });

  if (line) {
    lines.push(line);
  }

  return lines;
}

// Sleeve design generated from the spreadsheet (shown until / instead of a photo)
function drawPhotoCover(ctx, size, item, colors) {
  const pad = 24;
  const band = size * 0.4;
  const title = (item.title || '').replace(/^The Research:\s*/, '');
  let fontSize = 30;
  let lines;

  ctx.drawImage(item.coverImage, 0, 0, size, size);
  ctx.fillStyle = colors[0];
  ctx.fillRect(0, size - band, size, band);

  ctx.textBaseline = 'top';
  ctx.fillStyle = colors[1];
  ctx.font = '700 12px Montserrat, sans-serif';
  ctx.fillText((item.category || '').toUpperCase(), pad, size - band + 18);

  do {
    ctx.font = '700 ' + fontSize + 'px Montserrat, sans-serif';
    lines = wrapText(ctx, title.toUpperCase(), size - pad * 2);
    fontSize -= 2;
  } while (lines.length > 2 && fontSize > 14);

  ctx.fillStyle = '#fefefe';
  lines.slice(0, 2).forEach((line, i) => {
    ctx.fillText(line, pad, size - band + 42 + i * (fontSize + 2) * 1.15);
  });

  ctx.fillStyle = colors[1];
  ctx.font = '400 15px Montserrat, sans-serif';
  ctx.fillText(item.role || profile.name, pad, size - pad - 15);
}

function drawPlaceholderCover(ctx, size, item) {
  const colors = CATEGORY_COLORS[item.category] || ['#222222', '#fefefe'];

  if (item.coverImage) {
    drawPhotoCover(ctx, size, item, colors);
    return;
  }

  const pad = 28;
  const title = (item.title || '').replace(/^The Research:\s*/, '');
  let fontSize = 40;
  let lines;

  ctx.fillStyle = colors[0];
  ctx.fillRect(0, 0, size, size);

  // Vinyl grooves peeking out of the sleeve
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 2;
  for (let r = 30; r < size * 0.62; r += 10) {
    ctx.beginPath();
    ctx.arc(size, size, r, Math.PI, Math.PI * 1.5);
    ctx.stroke();
  }
  ctx.fillStyle = colors[1];
  ctx.beginPath();
  ctx.arc(size, size, 26, Math.PI, Math.PI * 1.5);
  ctx.lineTo(size, size);
  ctx.fill();

  ctx.textBaseline = 'top';
  ctx.fillStyle = colors[1];
  ctx.font = '700 13px Montserrat, sans-serif';
  ctx.fillText((item.category || '').toUpperCase(), pad, pad);

  do {
    ctx.font = '700 ' + fontSize + 'px Montserrat, sans-serif';
    lines = wrapText(ctx, title.toUpperCase(), size - pad * 2);
    fontSize -= 2;
  } while (lines.length * fontSize * 1.15 > size * 0.52 && fontSize > 14);

  ctx.fillStyle = '#fefefe';
  lines.forEach((line, i) => {
    ctx.fillText(line, pad, pad + 32 + i * (fontSize + 2) * 1.15);
  });

  ctx.fillStyle = colors[1];
  ctx.font = '400 18px Montserrat, sans-serif';
  ctx.fillText(item.role || '', pad, size - pad - 46);
  ctx.font = '700 14px Montserrat, sans-serif';
  ctx.fillText(profile.name.toUpperCase(), pad, size - pad - 18);
}

function renderChrome() {
  document.documentElement.lang = lang;
  el('profile-name').textContent = profile.name;
  el('profile-meta').innerHTML = `${escapeHtml(profile.major)} &middot; ` +
    `<a href="https://${escapeHtml(profile.domain)}" target="_blank" rel="noopener">${escapeHtml(profile.domain)}</a>`;
  langToggle.innerHTML = lang === 'en' ? '<b>EN</b> / VI' : 'EN / <b>VI</b>';

  const categories = [];
  content.records.forEach((record, index) => {
    if (!categories.some((c) => c.name === record.category)) {
      categories.push({ name: record.category, index });
    }
  });

  categoryNav.innerHTML = categories.map((c) =>
    `<button type="button" data-index="${c.index}">${escapeHtml(c.name)}</button>`
  ).join('');
}

function bindChromeEvents() {
  langToggle.addEventListener('click', () => {
    lang = lang === 'en' ? 'vi' : 'en';
    try {
      localStorage.setItem('lang', lang);
    } catch (e) {
      // storage unavailable
    }
    renderChrome();
    if (cratedigger.getSelectedRecord() && bottomBar.classList.contains('closed')) {
      fillInfoPanel(cratedigger.getSelectedRecord());
    }
  });

  categoryNav.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (button) {
      cratedigger.selectRecord(recordId(Number(button.dataset.index)));
    }
  });
}

// Pull the camera back on portrait screens (the original scene is framed for landscape)
function sceneForViewport() {
  const aspect = window.innerWidth / window.innerHeight;
  const k = aspect < 1 ? Math.min(1.8, 0.75 / aspect) : 1;
  const scale = (pos) => ({ x: pos.x * k, y: pos.y * k, z: pos.z * k });

  return Object.assign({}, Constants.scene, {
    cameraBasePosition: scale(Constants.scene.cameraBasePosition),
    cameraFocusPosition: scale(Constants.scene.cameraFocusPosition),
  });
}

renderChrome();
bindChromeEvents();

cratedigger.init({
  debug: false,
  nbCrates: 1,
  recordsPerCrate: data.length,
  closeInfoPanelOnClick: false,
  closeInfoPanelOnScroll: false,
  drawPlaceholderCover,
  scene: sceneForViewport(),
  elements: {
    rootContainer: document.getElementById('cratedigger'),
    canvasContainer: document.getElementById('cratedigger-canvas'),
    loadingContainer: document.getElementById('cratedigger-loading'),
    infoContainer,
  },
  onInfoPanelOpened() {
    bottomBar.classList.add('closed');
    topBar.classList.add('closed');
    fillInfoPanel(cratedigger.getSelectedRecord());
  },

  onInfoPanelClosed() {
    bottomBar.classList.remove('closed');
    topBar.classList.remove('closed');
  },
});

// Wait for the web font so that the generated sleeves use it
const fontsReady = document.fonts ? document.fonts.load('700 40px Montserrat').catch(() => {}) : Promise.resolve();

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

const coversReady = Promise.all(data.filter((item) => item.coverPath).map((item) =>
  loadImage(item.coverPath).then((img) => {
    item.coverImage = img;
  })
));

Promise.all([fontsReady, coversReady]).then(() => {
  cratedigger.loadRecords(data, false, () => {
    bindEvents();
  });
});
