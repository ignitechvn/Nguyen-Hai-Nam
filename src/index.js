import cratedigger from './scripts/cratedigger';
import Constants from './scripts/constants';
import content from './content.json';

// Content source: content/Website_Layout_Hai_Nam.xlsx -> src/content.json (tools/xlsx_to_json.py)
const { profile } = content;

// Sleeve colour and label/accent colour per record
const CATEGORY_COLORS = {
  'About Me': ['#1f3a5f', '#f2c14e'],
  'VEX Competition & Robotics Journey': ['#a3332a', '#f6c9a8'],
  'Rural Education & Digital Inclusion': ['#2f5d4a', '#f3d9a4'],
  'Dedication to Digitalized Sound': ['#4a2c4f', '#f0b67f'],
  'STEM Activities & Social Impacts': ['#1e5f74', '#f6d8a8'],
  'Miles & Milestones': ['#b8622a', '#fde8c8'],
  'Honors & Awards': ['#2b2a33', '#e8c468'],
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

// Each sub-group of a section is a side of the record (A, B, C…), its entries are tracks (A1, B1, B2…)
sections.forEach((section) => {
  let side = -1;
  let track = 0;
  section.entries.forEach((entry, i) => {
    if (i === 0 || entry.group !== section.entries[i - 1].group) {
      side += 1;
      track = 0;
      entry.sideStart = true;
    }
    track += 1;
    entry.side = String.fromCharCode(65 + side);
    entry.track = entry.side + track;
  });
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
const menuToggle = document.getElementById('menu-toggle');
let pendingSection = -1;

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

function shortTitle(title) {
  return title.replace(/^The Research:\s*/, '').replace(/[“”"]/g, '');
}

// Compact name for the track lists: "TayTranslator - Vietnamese - …" -> "TayTranslator"
function trackTitle(title) {
  if (/^The Research:/.test(title)) {
    return 'Research: ' + shortTitle(title);
  }
  return title.split(' - ')[0].split(', ')[0];
}

// Scroll only the info panel (scrollIntoView would also shift the whole page on mobile)
function scrollToEntry(i) {
  const entry = el('entry-' + i);
  const toc = el('cratedigger-record-toc');
  if (entry) {
    const stickyBar = toc.scrollWidth > toc.clientWidth || getComputedStyle(toc).display === 'flex';
    const offset = stickyBar ? toc.offsetHeight + 16 : 24;
    infoContainer.scrollTo({ top: entry.offsetTop - offset, behavior: 'smooth' });
  }
}

// Highlight the track being read in the section's track list
function updateCurrentTrack() {
  const toc = el('cratedigger-record-toc');
  const entries = infoContainer.querySelectorAll('.entry');
  const top = infoContainer.getBoundingClientRect().top + 140;
  if (!infoContainer.clientHeight) {
    return; // panel not shown yet
  }
  let current = 0;
  entries.forEach((entry, i) => {
    if (entry.getBoundingClientRect().top <= top) {
      current = i;
    }
  });
  if (infoContainer.scrollTop + infoContainer.clientHeight >= infoContainer.scrollHeight - 4) {
    current = entries.length - 1; // last track is short: mark it once the bottom is reached
  }
  toc.querySelectorAll('button').forEach((button) => {
    const active = Number(button.dataset.entry) === current;
    if (active && !button.classList.contains('active') && toc.scrollWidth > toc.clientWidth) {
      toc.scrollTo({ left: button.offsetLeft - 24, behavior: 'smooth' }); // horizontal bar on small screens
    }
    button.classList.toggle('active', active);
  });
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

  infoContainer.addEventListener('click', (e) => {
    const button = e.target.closest('button[data-entry]');
    if (button) {
      scrollToEntry(button.dataset.entry);
    }
  });

  infoContainer.addEventListener('scroll', updateCurrentTrack, { passive: true });
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

function sideLabel(entry) {
  return 'Side ' + entry.side + (entry.group && entry.group !== entry.title ? ' · ' + entry.group : '');
}

function renderEntry(entry, i, section) {
  const labels = LABELS[lang];
  const multi = section.entries.length > 1;
  const sides = section.entries.some((e) => e.group);
  const next = section.entries[i + 1];
  // An entry named like its section (e.g. "Miles & Milestones") needs no second heading
  const header = entry.title === section.title ? '' :
    `${multi ? `<div class="entry-track">${entry.track}</div>` : ''}
     ${entry.role ? `<div class="entry-role">${escapeHtml(entry.role)}</div>` : ''}
     <h2 class="entry-title">${escapeHtml(entry.title)}</h2>
     ${entry.subtitle ? `<div class="entry-subtitle">${escapeHtml(entry.subtitle)}</div>` : ''}`;
  const links = entry.links.map((link) =>
    `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener">${labels[link.type] || link.type} &#8599;</a>`
  ).join('');

  return `${sides && entry.sideStart ? `<div class="side-label">${escapeHtml(sideLabel(entry))}</div>` : ''}
    <section class="entry" id="entry-${i}">
    ${header}
    ${links ? `<div class="entry-links">${links}</div>` : ''}
    ${renderBody(entry[lang], entry.photos, entry.layout, entry.groups)}
    ${next ? `<button type="button" class="next-track" data-entry="${i + 1}">
      <span>Next track &rarr;</span> ${next.track} &nbsp;${escapeHtml(trackTitle(next.title))}</button>` : ''}
  </section>`;
}

// Track list of the section, split into sides when the sheet groups its entries
function renderTrackList(section) {
  if (section.entries.length < 2) {
    return '';
  }
  const sides = section.entries.some((e) => e.group);

  return section.entries.map((entry, i) =>
    `${sides && entry.sideStart ? `<div class="toc-side">${escapeHtml(sideLabel(entry))}</div>` : ''}
     <button type="button" data-entry="${i}" title="${escapeHtml(entry.title)}">` +
    `<span>${entry.track}</span><span class="toc-title">${escapeHtml(trackTitle(entry.title))}</span></button>`
  ).join('');
}

function fillInfoPanel(record) {
  const section = record.data;
  el('info-article').style.setProperty('--section-color', (CATEGORY_COLORS[section.title] || [])[0] || '');
  const labels = LABELS[lang];

  el('cratedigger-record-category').textContent = 'No. ' + String(section.index + 1).padStart(2, '0');
  el('cratedigger-record-title').textContent = section.title;

  el('cratedigger-record-toc').innerHTML = renderTrackList(section);
  el('info-article').classList.toggle('has-tracks', section.entries.length > 1);

  el('cratedigger-record-content').innerHTML = section.entries
    .map((entry, i) => renderEntry(entry, i, section))
    .join('');

  el('cratedigger-record-contact').innerHTML = section.index === 0 ?
    `<h2>${labels.contact}</h2>
     <a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a>
     <a href="tel:${escapeHtml(profile.phone.replace(/[^\d+]/g, ''))}">${escapeHtml(profile.phone)}</a>
     <a href="https://${escapeHtml(profile.domain)}" target="_blank" rel="noopener">${escapeHtml(profile.domain)}</a>` : '';

  infoContainer.scrollTop = 0;
  setTimeout(updateCurrentTrack, 400); // once the panel has faded in
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

const SERIF = 'Fraunces, Georgia, serif';
const SANS = '"Be Vietnam Pro", Arial, sans-serif';
const MONO = '"IBM Plex Mono", Menlo, monospace';

// A record sliding out of the sleeve, with a label in the sleeve's accent colour
function drawDisc(ctx, x, y, r, labelColor) {
  ctx.save();
  ctx.fillStyle = '#15110e';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.lineWidth = 1;
  for (let g = r * 0.4; g < r - 3; g += 4) {
    ctx.beginPath();
    ctx.arc(x, y, g, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = labelColor;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#15110e';
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Text-only sleeve: catalogue number, section title and its entries as a tracklist
function drawPlaceholderCover(ctx, size, section) {
  const colors = CATEGORY_COLORS[section.title] || ['#2b2a33', '#e8c468'];
  const cream = '#fbf6ee';
  const pad = 30;
  const tracks = section.entries.length > 1 ? section.entries : [];
  const lineHeight = 21;
  const tracksTop = size - pad - tracks.length * lineHeight;
  let fontSize = 44;
  let lines;

  ctx.fillStyle = colors[0];
  ctx.fillRect(0, 0, size, size);

  drawDisc(ctx, size - 20, 86, 118, colors[1]);

  // Thin printed frame
  ctx.strokeStyle = colors[1];
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 1;
  ctx.strokeRect(12.5, 12.5, size - 25, size - 25);
  ctx.globalAlpha = 1;

  ctx.textBaseline = 'top';
  ctx.fillStyle = colors[1];
  ctx.font = '500 13px ' + MONO;
  ctx.fillText('NO. ' + String(section.index + 1).padStart(2, '0'), pad, pad);
  ctx.fillStyle = cream;
  ctx.globalAlpha = 0.75;
  ctx.font = '400 12px ' + MONO;
  ctx.fillText(profile.name.toUpperCase(), pad, pad + 19);
  ctx.globalAlpha = 1;

  do {
    ctx.font = '600 ' + fontSize + 'px ' + SERIF;
    lines = wrapText(ctx, section.title, size - pad * 2 - 10);
    fontSize -= 2;
  } while (lines.length > 3 && fontSize > 24);

  const titleBottom = tracks.length ? tracksTop - 30 : size - pad;
  const titleLine = (fontSize + 2) * 1.08;
  ctx.fillStyle = cream;
  lines.forEach((line, i) => {
    ctx.fillText(line, pad, titleBottom - (lines.length - i) * titleLine);
  });

  // Tracklist
  if (tracks.length) {
    ctx.strokeStyle = colors[1];
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(pad, tracksTop - 14);
    ctx.lineTo(size - pad, tracksTop - 14);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  tracks.forEach((entry, i) => {
    const y = tracksTop + i * lineHeight;
    ctx.fillStyle = colors[1];
    ctx.font = '500 13px ' + MONO;
    ctx.fillText(entry.track, pad, y + 1);
    ctx.fillStyle = cream;
    ctx.font = '400 14px ' + SANS;
    ctx.fillText(ellipsize(ctx, trackTitle(entry.title), size - pad * 2 - 34), pad + 34, y);
  });
}

function renderChrome() {
  document.documentElement.lang = lang;
  el('profile-name').textContent = profile.name;
  el('profile-meta').innerHTML = `<span>${escapeHtml(profile.major)}</span>` +
    `<a href="https://${escapeHtml(profile.domain)}" target="_blank" rel="noopener">${escapeHtml(profile.domain)}</a>`;
  langToggle.innerHTML = lang === 'en' ? '<b>EN</b><i>VI</i>' : '<i>EN</i><b>VI</b>';

  categoryNav.innerHTML = sections.map((section) =>
    `<button type="button" data-index="${section.index}">` +
    `<span>${String(section.index + 1).padStart(2, '0')}</span>${escapeHtml(section.title)}</button>`
  ).join('');
  highlightSelected();
}

// Highlight the menu item of the record currently pulled out of the crate
function highlightSelected() {
  const selected = cratedigger.getSelectedRecord();
  const index = selected ? selected.data && selected.data.index : -1;
  categoryNav.querySelectorAll('button').forEach((button) => {
    button.classList.toggle('active', Number(button.dataset.index) === index);
  });
}

function setMenuOpen(open) {
  topBar.classList.toggle('menu-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.innerHTML = open ? '&times;' : '&#9776;';
}

// Pull a record out of the crate, then flip it open
let openTimeout;
function openSection(index) {
  const id = recordId(index);
  clearTimeout(openTimeout);
  cratedigger.selectRecord(id);
  openTimeout = setTimeout(() => {
    const selected = cratedigger.getSelectedRecord();
    if (selected && selected.id === id) {
      cratedigger.flipSelectedRecord();
    }
  }, 900);
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
    if (!button) {
      return;
    }
    const index = Number(button.dataset.index);
    setMenuOpen(false);
    if (bottomBar.classList.contains('closed')) {
      // A section is open: put it back first, then open the new one
      pendingSection = index;
      cratedigger.flipBackSelectedRecord();
    } else {
      openSection(index);
    }
  });

  menuToggle.addEventListener('click', () => {
    setMenuOpen(!topBar.classList.contains('menu-open'));
  });

  setInterval(highlightSelected, 250);
}

// Pull the camera back on portrait screens (the original scene is framed for landscape)
function sceneForViewport() {
  const root = document.getElementById('cratedigger');
  const aspect = root.clientWidth / root.clientHeight;
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
  backgroundColor: 0x16120f,
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
    fillInfoPanel(cratedigger.getSelectedRecord());
  },

  onInfoPanelClosed() {
    bottomBar.classList.remove('closed');
    if (pendingSection >= 0) {
      openSection(pendingSection);
      pendingSection = -1;
    }
  },
});

// Wait for the web font so that the generated sleeves use it
const fontsReady = document.fonts ? Promise.all([
  '600 44px Fraunces',
  '500 13px "IBM Plex Mono"',
  '400 14px "Be Vietnam Pro"',
].map((font) => document.fonts.load(font))).catch(() => {}) : Promise.resolve();

fontsReady.then(() => {
  cratedigger.loadRecords(data, false, () => {
    bindEvents();
  });
});
