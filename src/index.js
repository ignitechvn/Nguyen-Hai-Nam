import cratedigger from './scripts/cratedigger';
import Constants from './scripts/constants';
import content from './content.json';

// Content source: content/Website_Layout_Hai_Nam.xlsx -> src/content.json (tools/xlsx_to_json.py)
const { profile } = content;

const CATEGORY_COLORS = {
  'About Me': ['#1d3557', '#e9c46a'],
  'VEX Competition & Robotics Journey': ['#9b2226', '#f4f1de'],
  'Rural Education & Digital Inclusion': ['#2d6a4f', '#f1faee'],
  'Dedication to Digitalized Sound': ['#3c1642', '#f6bd60'],
  'STEM Activities & Social Impacts': ['#0b6e8a', '#f8f9fa'],
  'Miles & Milestones': ['#bc6c25', '#fefae0'],
  'Honors & Awards': ['#2b2d42', '#ffd166'],
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

// One record per menu item (spreadsheet page), holding all of its entries
const sections = [];
content.records.forEach((record) => {
  let section = sections.find((s) => s.title === record.category);
  if (!section) {
    section = { title: record.category, entries: [], index: sections.length };
    sections.push(section);
  }
  section.entries.push(Object.assign({ photos: [], groups: [] }, record));
});

// The first section is placed at the front of the crate
const data = sections.slice().reverse().map((section) => Object.assign({}, section, {
  cover: '',
  hasSleeve: false,
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
  return sections.length - 1 - index;
}

function trackNumber(i) {
  return String.fromCharCode(65 + Math.floor(i / 4)) + (i % 4 + 1); // A1..A4, B1..
}

function shortTitle(title) {
  return title.replace(/^The Research:\s*/, '').replace(/[“”"]/g, '');
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

  el('cratedigger-record-toc').addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (button) {
      el('entry-' + button.dataset.entry).scrollIntoView({ behavior: 'smooth' });
    }
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

function renderEntry(entry, i, section) {
  const labels = LABELS[lang];
  // An entry named like its section (e.g. "Miles & Milestones") needs no second heading
  const header = entry.title === section.title ? '' :
    `${entry.role ? `<div class="entry-role">${escapeHtml(entry.role)}</div>` : ''}
     <h2 class="entry-title">${escapeHtml(entry.title)}</h2>
     ${entry.subtitle ? `<div class="entry-subtitle">${escapeHtml(entry.subtitle)}</div>` : ''}`;
  const links = entry.links.map((link) =>
    `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener">${labels[link.type] || link.type} &#8599;</a>`
  ).join('');

  return `<section class="entry" id="entry-${i}">
    ${header}
    ${links ? `<div class="entry-links">${links}</div>` : ''}
    ${renderBody(entry[lang], entry.photos, entry.layout, entry.groups)}
  </section>`;
}

function fillInfoPanel(record) {
  const section = record.data;
  const labels = LABELS[lang];

  el('cratedigger-record-category').textContent = 'No. ' + String(section.index + 1).padStart(2, '0');
  el('cratedigger-record-title').textContent = section.title;

  el('cratedigger-record-toc').innerHTML = section.entries.length < 2 ? '' : section.entries.map((entry, i) =>
    `<button type="button" data-entry="${i}"><span>${trackNumber(i)}</span>${escapeHtml(shortTitle(entry.title))}</button>`
  ).join('');

  el('cratedigger-record-content').innerHTML = section.entries
    .map((entry, i) => renderEntry(entry, i, section))
    .join('');

  el('cratedigger-record-contact').innerHTML = section.index === 0 ?
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

function ellipsize(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }
  let cut = text;
  while (cut.length > 1 && ctx.measureText(cut + '…').width > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return cut.trim() + '…';
}

// Text-only sleeve: catalogue number, section title and its entries as a tracklist
function drawPlaceholderCover(ctx, size, section) {
  const colors = CATEGORY_COLORS[section.title] || ['#222222', '#fefefe'];
  const pad = 30;
  let fontSize = 46;
  let lines;

  ctx.fillStyle = colors[0];
  ctx.fillRect(0, 0, size, size);

  // Vinyl grooves peeking out of the sleeve
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 2;
  for (let r = 30; r < size * 0.5; r += 9) {
    ctx.beginPath();
    ctx.arc(size, 0, r, Math.PI / 2, Math.PI);
    ctx.stroke();
  }

  ctx.textBaseline = 'top';
  ctx.fillStyle = colors[1];
  ctx.font = '700 14px Montserrat, sans-serif';
  ctx.fillText('NO. ' + String(section.index + 1).padStart(2, '0'), pad, pad);
  ctx.font = '400 14px Montserrat, sans-serif';
  ctx.fillText(profile.name.toUpperCase(), pad, pad + 20);

  do {
    ctx.font = '700 ' + fontSize + 'px Montserrat, sans-serif';
    lines = wrapText(ctx, section.title.toUpperCase(), size - pad * 2);
    fontSize -= 2;
  } while (lines.length * fontSize * 1.1 > size * 0.36 && fontSize > 20);

  ctx.fillStyle = '#fefefe';
  lines.forEach((line, i) => {
    ctx.fillText(line, pad, pad + 70 + i * (fontSize + 2) * 1.1);
  });

  // Tracklist
  const tracks = section.entries.length > 1 ? section.entries : [];
  const lineHeight = 22;
  const top = size - pad - tracks.length * lineHeight;
  ctx.strokeStyle = colors[1];
  ctx.lineWidth = 1;
  if (tracks.length) {
    ctx.beginPath();
    ctx.moveTo(pad, top - 14);
    ctx.lineTo(size - pad, top - 14);
    ctx.stroke();
  }
  tracks.forEach((entry, i) => {
    const y = top + i * lineHeight;
    ctx.fillStyle = colors[1];
    ctx.font = '700 14px Montserrat, sans-serif';
    ctx.fillText(trackNumber(i), pad, y);
    ctx.fillStyle = '#fefefe';
    ctx.font = '400 15px Montserrat, sans-serif';
    ctx.fillText(ellipsize(ctx, shortTitle(entry.title), size - pad * 2 - 34), pad + 34, y);
  });
}

function renderChrome() {
  document.documentElement.lang = lang;
  el('profile-name').textContent = profile.name;
  el('profile-meta').innerHTML = `${escapeHtml(profile.major)} &middot; ` +
    `<a href="https://${escapeHtml(profile.domain)}" target="_blank" rel="noopener">${escapeHtml(profile.domain)}</a>`;
  langToggle.innerHTML = lang === 'en' ? '<b>EN</b> / VI' : 'EN / <b>VI</b>';

  categoryNav.innerHTML = sections.map((section) =>
    `<button type="button" data-index="${section.index}">${escapeHtml(section.title)}</button>`
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

  // Menu: pull the record out of the crate, then flip it open
  let openTimeout;
  categoryNav.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (button) {
      const id = recordId(Number(button.dataset.index));
      clearTimeout(openTimeout);
      cratedigger.selectRecord(id);
      openTimeout = setTimeout(() => {
        const selected = cratedigger.getSelectedRecord();
        if (selected && selected.id === id) {
          cratedigger.flipSelectedRecord();
        }
      }, 900);
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

fontsReady.then(() => {
  cratedigger.loadRecords(data, false, () => {
    bindEvents();
  });
});
