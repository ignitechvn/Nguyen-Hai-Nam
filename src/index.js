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

// The site is English only (Content [ENG] column)
const LABELS = {
  platform: 'Visit platform',
  research: 'Read the research',
  fanpage: 'Fanpage',
  company: 'Company website',
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

const bottomBar = document.getElementById('bottom-bar');
const topBar = document.getElementById('top-bar');
const buttonPrev = document.getElementById('button-prev');
const buttonShow = document.getElementById('button-show');
const buttonNext = document.getElementById('button-next');
const infoContainer = document.getElementById('cratedigger-info');
const closeButton = document.getElementById('info-close');
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

let openSectionData = null;

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

  // Track list & previous/next cards: show that track
  infoContainer.addEventListener('click', (e) => {
    const button = e.target.closest('[data-entry]');
    if (button) {
      showTrack(Number(button.dataset.entry));
    }
  });
}

// Split n items into balanced rows of at most `max` (5 -> 3+2, 4 -> 2+2, 7 -> 3+2+2)
function rowSizes(n, max) {
  const rows = Math.ceil(n / max);
  const sizes = [];
  let left = n;
  for (let r = rows; r > 0; r--) {
    const size = Math.ceil(left / r);
    sizes.push(size);
    left -= size;
  }
  return sizes;
}

// Justified rows: every photo in a row gets the same height, widths follow each photo's own ratio,
// so nothing is cropped and there are no empty bars around portrait shots
function renderRows(photos, kind, max) {
  const shared = photos.length > 1 && photos[0].caption &&
    photos.every((photo) => photo.caption === photos[0].caption);
  let index = 0;

  const rows = rowSizes(photos.length, max).map((size) => {
    const row = photos.slice(index, index + size);
    index += size;
    // Keep a lone portrait photo, and certificates (documents, not scenes), to a sensible height
    const lone = row.length === 1 && row[0].height > row[0].width * 0.9;
    const maxHeight = kind === 'certificate' ? 330 : lone ? 560 : 0;

    return `<div class="photo-row${maxHeight ? ' lone' : ''}">` + row.map((photo) => {
      const ratio = photo.width / photo.height;
      return `<figure class="photo ${kind}" style="flex: ${ratio.toFixed(4)} 1 0%;${maxHeight ? ` max-width: ${Math.round(maxHeight * ratio)}px;` : ''}">
        <a href="${escapeHtml(photo.src)}" class="photo-link" data-src="${escapeHtml(photo.src)}"
          data-caption="${escapeHtml(photo.caption)}">
          <img src="${escapeHtml(photo.src)}" width="${photo.width}" height="${photo.height}"
            style="aspect-ratio: ${photo.width} / ${photo.height}" loading="lazy" alt="${escapeHtml(photo.caption)}">
        </a>
        ${photo.caption && !shared ? `<figcaption>${escapeHtml(photo.caption)}</figcaption>` : ''}
      </figure>`;
    }).join('') + '</div>';
  }).join('');

  return `<div class="photo-set ${kind}-set">${rows}` +
    `${shared ? `<p class="photo-set-caption">${escapeHtml(photos[0].caption)}</p>` : ''}</div>`;
}

function renderPhotos(photos) {
  if (!photos.length) {
    return '';
  }
  const pictures = photos.filter((photo) => !photo.kind);
  const screenshots = photos.filter((photo) => photo.kind === 'screenshot');
  const certificates = photos.filter((photo) => photo.kind === 'certificate');

  return (pictures.length ? renderRows(pictures, 'picture', 3) : '') +
    (screenshots.length ? renderRows(screenshots, 'screenshot', 2) : '') +
    (certificates.length ? renderRows(certificates, 'certificate', 2) : '');
}

// ---------- Lightbox: photos open full screen over the page ----------
const lightbox = { items: [], index: 0 };

function showLightboxItem(i) {
  const count = lightbox.items.length;
  lightbox.index = (i + count) % count;
  const item = lightbox.items[lightbox.index];
  el('lightbox-img').src = item.src;
  el('lightbox-img').alt = item.caption;
  el('lightbox-caption').textContent = item.caption;
  el('lightbox-count').textContent = count > 1 ? (lightbox.index + 1) + ' / ' + count : '';
  el('lightbox').classList.toggle('single', count < 2);
}

function openLightbox(link) {
  const links = [...el('track').querySelectorAll('.photo-link')];
  lightbox.items = links.map((a) => ({ src: a.dataset.src, caption: a.dataset.caption }));
  showLightboxItem(links.indexOf(link));
  el('lightbox').classList.add('open');
}

function closeLightbox() {
  el('lightbox').classList.remove('open');
}

function bindLightbox() {
  const box = el('lightbox');

  infoContainer.addEventListener('click', (e) => {
    const link = e.target.closest('.photo-link');
    if (link) {
      e.preventDefault();
      openLightbox(link);
    }
  });

  box.addEventListener('click', (e) => {
    if (e.target.closest('.lightbox-prev')) {
      showLightboxItem(lightbox.index - 1);
    } else if (e.target.closest('.lightbox-next')) {
      showLightboxItem(lightbox.index + 1);
    } else if (!e.target.closest('#lightbox-img')) {
      closeLightbox(); // backdrop or close button
    }
  });

  // Capture phase: keys must not also reach the crate (Escape would put the record back)
  window.addEventListener('keydown', (e) => {
    if (!box.classList.contains('open')) {
      return;
    }
    if (e.key === 'Escape') {
      closeLightbox();
    } else if (e.key === 'ArrowLeft') {
      showLightboxItem(lightbox.index - 1);
    } else if (e.key === 'ArrowRight') {
      showLightboxItem(lightbox.index + 1);
    } else {
      return;
    }
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);
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

// One track of the open record: header, links, text with photos
function renderEntry(entry, section) {
  // An entry named like its section (e.g. "Miles & Milestones") needs no second heading
  const title = entry.title === section.title ? '' :
    `<h2 class="entry-title">${escapeHtml(entry.title)}</h2>`;
  const links = entry.links.map((link) =>
    `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener">${LABELS[link.type] || link.type} &#8599;</a>`
  ).join('');

  const header = [
    entry.role ? `<div class="entry-role">${escapeHtml(entry.role)}</div>` : '',
    title,
    entry.subtitle ? `<div class="entry-subtitle">${escapeHtml(entry.subtitle)}</div>` : '',
    links ? `<div class="entry-links">${links}</div>` : '',
  ].join('');

  return (header ? `<header class="entry-header">${header}</header>` : '') +
    `<div class="entry-body">${renderBody(entry.en, entry.photos, entry.layout, entry.groups)}</div>`;
}

// Previous / next track cards at the end of a track
function renderTrackNav(section, i) {
  const card = (entry, index, label, cls) => entry ?
    `<button type="button" class="track-card ${cls}" data-entry="${index}">
      <span class="track-card-label">${label}</span>
      <span class="track-card-title">${escapeHtml(trackTitle(entry.title))}</span>
    </button>` : '<span></span>';

  return section.entries.length < 2 ? '' :
    card(section.entries[i - 1], i - 1, '&larr; Previous track', 'prev') +
    card(section.entries[i + 1], i + 1, 'Next track &rarr;', 'next');
}

// Track list of the record
function renderTrackList(section) {
  if (section.entries.length < 2) {
    return '';
  }

  return section.entries.map((entry, i) =>
    `<button type="button" data-entry="${i}" title="${escapeHtml(entry.title)}">` +
    `<span class="toc-title">${escapeHtml(trackTitle(entry.title))}</span></button>`
  ).join('');
}

// Show a single track of the open record
function showTrack(i) {
  const section = openSectionData;
  const entry = section && section.entries[i];
  if (!entry) {
    return;
  }

  const content = el('cratedigger-record-content');
  content.innerHTML = renderEntry(entry, section);
  content.classList.remove('track-enter');
  void content.offsetWidth; // restart the fade-in
  content.classList.add('track-enter');

  el('track-nav').innerHTML = renderTrackNav(section, i);

  const toc = el('cratedigger-record-toc');
  toc.querySelectorAll('button').forEach((button) => {
    const active = Number(button.dataset.entry) === i;
    button.classList.toggle('active', active);
    if (active && toc.scrollWidth > toc.clientWidth) {
      toc.scrollTo({ left: button.offsetLeft - 20, behavior: 'smooth' }); // horizontal list on small screens
    }
  });

  // Back to the top of the track (below the album header on small screens)
  const track = el('track');
  const top = el('album').offsetHeight > infoContainer.clientHeight * 0.6 || getComputedStyle(el('detail')).display === 'block' ?
    Math.min(infoContainer.scrollTop, track.offsetTop - 8) : 0;
  infoContainer.scrollTo({ top });
}

// ---------- About Me: overview page that introduces everything and links to the other records ----------

// Key figures quoted from the sheet's content, each linking to its record
const HIGHLIGHTS = [
  { value: 'No. 1', label: 'Nationwide ranking, VEX V5 Robotics 2026', section: 1 },
  { value: '2026', label: 'VEX Robotics World Championship, Missouri', section: 1 },
  { value: '14,179', label: 'Tày–Vietnamese sentence pairs behind TayTranslator', section: 2 },
  { value: '200+', label: 'Students taught through The CodingBuddy', section: 2 },
  { value: '10-stage', label: 'Physics simulation pipeline in Vinylize', section: 3 },
  { value: '3 × 21 km', label: 'Half marathons completed', section: 5 },
];

// Chapters of the "About Me" story (one per paragraph) and the photo shown beside each
const STORY_CHAPTERS = ['Where it began', 'Beyond the lab', 'The sound of grooves', 'Looking back'];

// "Moments": a mosaic of photos from across the journeys (first one is the large tile)
const MOMENTS = [
  { src: 'images/photos/vex/12.jpg', caption: 'VEX Robotics World Championship 2026 — St. Louis, Missouri' },
  { src: 'images/photos/humanitas/01.jpg', caption: 'Humanitas — Bản Liền, Lào Cai' },
  { src: 'images/photos/meckup/01.jpg', caption: 'Silver Award — MeckUP Quest, The University of Hong Kong' },
  { src: 'images/photos/kid-engineer/05.jpg', caption: 'Mentoring young engineers at Kid Engineer' },
  { src: 'images/photos/vex/09.jpg', caption: 'VEX V5 National Championship 2026' },
  { src: 'images/photos/humanitas/05.jpg', caption: 'Humanitas — digital literacy classes' },
  { src: 'images/photos/ntu-singapore/03.jpg', caption: 'Business and Innovation with Digitalisation — NTU Singapore' },
  { src: 'images/photos/miles-and-milestones/04.jpg', caption: 'Tây Hồ Half Marathon 2025 — 21 km' },
];

function lastSentence(text) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  return sentences[sentences.length - 1].replace(/^[^A-Za-z]*(Yet, it was[^:]*:\s*)?/, '').trim();
}

// Shorter track names for the record cards
function cardTrackTitle(title) {
  return /^The Research:/.test(title) ? 'Research paper' : trackTitle(title).replace(/\s*\(.*\)$/, '');
}

function renderOverview(section) {
  const statement = section.entries[0];
  const story = section.entries[1];
  const portrait = statement.photos[0];
  const quote = lastSentence(statement.en[statement.en.length - 1]);
  const contact = (href, text, external) =>
    `<a href="${escapeHtml(href)}"${external ? ' target="_blank" rel="noopener"' : ''}>${escapeHtml(text)}</a>`;

  const hero = `<section class="ov-hero">
      ${portrait ? `<figure class="ov-portrait"><img src="${escapeHtml(portrait.src)}" alt="${escapeHtml(profile.name)}"></figure>` : ''}
      <div class="ov-intro">
        <div class="ov-eyebrow">Portfolio · ${escapeHtml(profile.major)}</div>
        <h1 class="ov-name">${escapeHtml(profile.name)}</h1>
        <p class="ov-quote">${escapeHtml(quote)}</p>
        <div class="ov-contact">
          ${contact('mailto:' + profile.email, profile.email)}
          ${contact('https://' + profile.domain, profile.domain, true)}
        </div>
      </div>
    </section>`;

  const statementBlock = `<section class="ov-statement">
      <div class="ov-label">Personal statement</div>
      ${statement.en.map((p) => `<p>${formatParagraph(p)}</p>`).join('')}
    </section>`;

  const highlights = `<section class="ov-highlights">
      ${HIGHLIGHTS.map((h) => `<button type="button" data-section="${h.section}"
          style="--card-color: ${(CATEGORY_COLORS[sections[h.section].title] || [])[0]}">
          <span class="ov-stat">${escapeHtml(h.value)}</span>
          <span class="ov-stat-label">${escapeHtml(h.label)}</span>
        </button>`).join('')}
    </section>`;

  const chapters = `<section class="ov-story">
      <div class="ov-label">My story</div>
      ${story.en.map((p, i) => `<div class="ov-chapter">
          <div class="ov-chapter-head">
            <span>${String(i + 1).padStart(2, '0')}</span>
            ${STORY_CHAPTERS[i] ? `<h3>${escapeHtml(STORY_CHAPTERS[i])}</h3>` : ''}
          </div>
          <div class="ov-chapter-text"><p>${formatParagraph(p)}</p></div>
        </div>`).join('')}
    </section>`;

  const moments = `<section class="ov-moments">
      <div class="ov-label">Moments</div>
      <div class="ov-mosaic">
        ${MOMENTS.map((m) => `<a href="${m.src}" class="photo-link ov-tile" data-src="${m.src}"
            data-caption="${escapeHtml(m.caption)}">
          <img src="${m.src}" alt="${escapeHtml(m.caption)}" loading="lazy">
          <span>${escapeHtml(m.caption)}</span>
        </a>`).join('')}
      </div>
    </section>`;

  const records = `<section class="ov-records">
      <div class="ov-label">Explore the records</div>
      <div class="ov-grid">
        ${sections.slice(1).map((s) => {
          const colors = CATEGORY_COLORS[s.title] || ['#2b2a33', '#e8c468'];
          return `<button type="button" class="ov-card" data-section="${s.index}"
              style="--card-color: ${colors[0]}; --card-accent: ${colors[1]}">
            <span class="ov-card-title">${escapeHtml(s.title)}</span>
            <span class="ov-card-tracks">${s.entries.length > 1 ?
              s.entries.map((e) => escapeHtml(cardTrackTitle(e.title))).join(' · ') : 'Open record'}</span>
            <span class="ov-card-arrow">&rarr;</span>
          </button>`;
        }).join('')}
      </div>
    </section>`;

  return hero + statementBlock + highlights + chapters + moments + records;
}

function fillInfoPanel(record) {
  const section = record.data;
  const colors = CATEGORY_COLORS[section.title] || ['#2b2a33', '#e8c468'];
  openSectionData = section;

  // About Me is the overview: full-width page, no album column
  const overview = section.index === 0;
  el('detail').classList.toggle('overview', overview);
  if (overview) {
    el('detail').style.setProperty('--section-color', colors[0]);
    el('detail').style.setProperty('--section-accent', colors[1]);
    el('cratedigger-record-content').innerHTML = renderOverview(section);
    el('track-nav').innerHTML = '';
    infoContainer.scrollTop = 0;
    setTimeout(() => {
      infoContainer.scrollTop = 0;
    }, 320);
    return;
  }

  el('detail').style.setProperty('--section-color', colors[0]);
  el('detail').style.setProperty('--section-accent', colors[1]);
  el('cratedigger-record-title').textContent = section.title;
  el('cratedigger-record-toc').innerHTML = renderTrackList(section);

  const next = sections[(section.index + 1) % sections.length];
  el('next-record').innerHTML =
    `<button type="button" data-section="${next.index}">
      <span>Next record &rarr;</span>${escapeHtml(next.title)}
    </button>`;

  showTrack(0);
  // The panel is still hidden here and keeps the previous record's scroll: reset once it fades in
  infoContainer.scrollTop = 0;
  setTimeout(() => {
    infoContainer.scrollTop = 0;
  }, 320);
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
  ctx.fillText(profile.name.toUpperCase(), pad, pad);

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
    ctx.fillStyle = cream;
    ctx.font = '400 14px ' + SANS;
    ctx.fillText(ellipsize(ctx, trackTitle(entry.title), size - pad * 2), pad, y);
  });
}

function renderChrome() {
  el('profile-name').textContent = profile.name;
  el('profile-meta').textContent = profile.major;

  categoryNav.innerHTML = sections.map((section) =>
    `<button type="button" data-index="${section.index}">${escapeHtml(section.title)}</button>`
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

// Open a record from anywhere: when one is already open, put it back first
function goToSection(index) {
  if (bottomBar.classList.contains('closed')) {
    pendingSection = index;
    cratedigger.flipBackSelectedRecord();
  } else {
    openSection(index);
  }
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
  categoryNav.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (button) {
      setMenuOpen(false);
      goToSection(Number(button.dataset.index));
    }
  });

  // "Next record" in the album column, cards and figures on the About Me overview
  infoContainer.addEventListener('click', (e) => {
    const button = e.target.closest('[data-section]');
    if (button) {
      goToSection(Number(button.dataset.section));
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

// Contact row at the bottom of every detail page
const ICONS = {
  mail: '<path d="M3 6h18v12H3z"/><path d="M3 7l9 6 9-6"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/>',
  web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
};

function renderFooter() {
  const item = (icon, href, text, external) =>
    `<a href="${escapeHtml(href)}"${external ? ' target="_blank" rel="noopener"' : ''}>` +
    `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[icon]}</svg>${escapeHtml(text)}</a>`;

  el('detail-footer').innerHTML =
    item('mail', 'mailto:' + profile.email, profile.email) +
    item('phone', 'tel:' + profile.phone.replace(/[^\d+]/g, ''), profile.phone) +
    item('web', 'https://' + profile.domain, profile.domain, true);
}

renderChrome();
renderFooter();
bindChromeEvents();
bindLightbox();

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
    document.body.classList.add('detail-open');
    fillInfoPanel(cratedigger.getSelectedRecord());
  },

  onInfoPanelClosed() {
    bottomBar.classList.remove('closed');
    document.body.classList.remove('detail-open');
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
