import cratedigger from './scripts/cratedigger';
import { loadSheet } from './scripts/sheet';
import Constants from './scripts/constants';
import demoData from './demo-data.json';

// Content source: Google Sheet (must be shared as "Anyone with the link can view")
const SHEET_ID = '1MhcQlLpq3R2AkJyeuELQd2zKKj9xx3BiY7i2gf-7RF0';
const RECORDS_PER_CRATE = 24;
const MAX_CRATES = 6;
const defaultScene = Constants.scene;
const DEMO_DATA = demoData.map((d, i) => ({
  id: i,
  title: d.title,
  artist: d.artist,
  year: d.year,
  cover: '',
  link: '',
  description: '',
  extra: [],
  hasSleeve: false,
}));

const bottomBar = document.getElementById('bottom-bar');
const buttonPrev = document.getElementById('button-prev');
const buttonShow = document.getElementById('button-show');
const buttonNext = document.getElementById('button-next');
const titleContainer = document.getElementById('cratedigger-record-title');
const artistContainer = document.getElementById('cratedigger-record-artist');
const coverContainer = document.getElementById('cratedigger-record-cover');
const metaContainer = document.getElementById('cratedigger-record-meta');
const noticeContainer = document.getElementById('sheet-notice');

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
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;',
  })[c]);
}

function formatValue(value) {
  const safe = escapeHtml(value);
  return /^https?:\/\//i.test(value) ? `<a href="${safe}" target="_blank" rel="noopener">${safe}</a>` : safe;
}

function fillInfoPanel(record) {
  const data = record.data;
  const meta = [];

  titleContainer.innerHTML = escapeHtml(data.title || '');
  artistContainer.innerHTML = escapeHtml(data.artist || '');
  coverContainer.style.backgroundImage = data.cover ? 'url("' + data.cover + '")' : 'none';
  coverContainer.style.display = data.cover ? '' : 'none';

  if (data.year) {
    meta.push(`<div class="meta-year">${escapeHtml(data.year)}</div>`);
  }

  if (data.description) {
    meta.push(`<div class="meta-description">${escapeHtml(data.description)}</div>`);
  }

  data.extra.forEach((item) => {
    meta.push(`<div class="meta-item"><span>${escapeHtml(item.label)}</span> ${formatValue(item.value)}</div>`);
  });

  if (data.link) {
    meta.push(`<a class="meta-link" href="${escapeHtml(data.link)}" target="_blank" rel="noopener">Open link</a>`);
  }

  metaContainer.innerHTML = meta.join('');
}

function hashColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return 'hsl(' + (Math.abs(hash) % 360) + ', 45%, 32%)';
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = String(text).split(/\s+/);
  let line = '';
  let lines = 0;

  for (let i = 0; i < words.length && lines < maxLines; i++) {
    const test = line ? line + ' ' + words[i] : words[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + lines * lineHeight);
      lines++;
      line = words[i];
    } else {
      line = test;
    }
  }

  if (line && lines < maxLines) {
    ctx.fillText(line, x, y + lines * lineHeight);
  }
}

// Generated cover, shown until the real cover loads (or when the sheet row has no image)
function drawPlaceholderCover(ctx, size, data) {
  ctx.fillStyle = hashColor((data.title || '') + (data.artist || ''));
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 2;
  for (let r = 40; r < size * 0.7; r += 14) {
    ctx.beginPath();
    ctx.arc(size, size, r, Math.PI, Math.PI * 1.5);
    ctx.stroke();
  }
  ctx.fillStyle = '#fefefe';
  ctx.textBaseline = 'top';
  ctx.font = '700 34px Montserrat, sans-serif';
  wrapText(ctx, (data.title || '').toUpperCase(), 28, 32, size - 56, 40, 4);
  ctx.font = '400 22px Montserrat, sans-serif';
  wrapText(ctx, data.artist || '', 28, size - 70, size - 56, 26, 2);
}

function showNotice(message) {
  noticeContainer.textContent = message;
  noticeContainer.style.display = 'block';
}

function start(data) {
  const nbCrates = Math.min(MAX_CRATES, Math.max(1, Math.ceil(data.length / RECORDS_PER_CRATE)));
  const zoom = Math.max(1, Math.pow(nbCrates / 2, 0.75));

  if (data.length > nbCrates * RECORDS_PER_CRATE) {
    showNotice('Showing ' + nbCrates * RECORDS_PER_CRATE + ' / ' + data.length + ' records');
  }

  cratedigger.init({
    debug: false,
    nbCrates,
    recordsPerCrate: RECORDS_PER_CRATE,
    drawPlaceholderCover,
    scene: Object.assign({}, defaultScene, {
      cameraBasePosition: { x: 280 * zoom, y: 200 * zoom, z: 180 * zoom },
    }),
    elements: {
      rootContainer: document.getElementById('cratedigger'),
      canvasContainer: document.getElementById('cratedigger-canvas'),
      loadingContainer: document.getElementById('cratedigger-loading'),
      infoContainer: document.getElementById('cratedigger-info'),
    },
    onInfoPanelOpened() {
      bottomBar.classList.add('closed');
      fillInfoPanel(cratedigger.getSelectedRecord());
    },

    onInfoPanelClosed() {
      bottomBar.classList.remove('closed');
    },
  });

  cratedigger.loadRecords(data, false, () => {
    bindEvents();
  });
}

loadSheet({ sheetId: SHEET_ID })
  .then(start)
  .catch((err) => {
    console.error('Google Sheet error:', err);
    showNotice('Cannot load Google Sheet (' + err.message + ') — showing demo records. Share the sheet as "Anyone with the link can view".');
    start(DEMO_DATA);
  });
