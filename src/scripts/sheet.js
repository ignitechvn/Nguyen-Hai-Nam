// Tải & chuẩn hoá dữ liệu từ Google Sheets (endpoint gviz hỗ trợ CORS cho sheet công khai).

const FIELD_ALIASES = {
  title: ['title', 'name', 'ten', 'ten bai hat', 'bai hat', 'song', 'track', 'album', 'tieu de', 'ten san pham', 'san pham', 'product'],
  artist: ['artist', 'ca si', 'nghe si', 'tac gia', 'author', 'band', 'subtitle', 'nhom', 'ban nhac', 'brand', 'thuong hieu'],
  cover: ['cover', 'image', 'img', 'anh', 'hinh', 'hinh anh', 'anh bia', 'bia', 'thumbnail', 'thumb', 'artwork', 'picture', 'photo', 'cover url', 'image url', 'link anh'],
  year: ['year', 'nam', 'nam phat hanh', 'release', 'date', 'ngay'],
  link: ['link', 'url', 'youtube', 'spotify', 'soundcloud', 'listen', 'nghe', 'website', 'lien ket'],
  description: ['description', 'desc', 'mo ta', 'ghi chu', 'note', 'notes', 'noi dung', 'content', 'gioi thieu'],
};

export function normalizeKey(s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .toLowerCase().replace(/[_\-:]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { quoted = false; }
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(v => v.trim() !== ''));
}

const IMAGE_RE = /^https?:\/\/\S+\.(jpe?g|png|gif|webp|avif)(\?\S*)?$/i;

function looksLikeImage(v) {
  return IMAGE_RE.test(v) || /drive\.google\.com|googleusercontent\.com|i\.imgur\.com|i\.ytimg\.com/i.test(v);
}

// Đổi link Google Drive / YouTube sang link ảnh trực tiếp.
export function toImageUrl(url) {
  if (!url) return '';
  url = url.trim();
  let m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]+)/);
  if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w600`;
  m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
  if (m) return `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg`;
  return url;
}

export function rowsToRecords(rows) {
  if (!rows.length) return [];
  const header = rows[0].map(h => h.trim());
  const keys = header.map(normalizeKey);
  const body = rows.slice(1);
  const map = {};

  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    let idx = keys.findIndex(k => aliases.includes(k));
    if (idx < 0) idx = keys.findIndex(k => aliases.some(a => a.length > 2 && k.includes(a)));
    if (idx >= 0 && !Object.values(map).includes(idx)) map[field] = idx;
  }

  // Không nhận ra tiêu đề cột: đoán theo nội dung.
  if (map.cover === undefined) {
    const idx = keys.findIndex((_, i) => !Object.values(map).includes(i) &&
      body.some(r => looksLikeImage((r[i] || '').trim())));
    if (idx >= 0) map.cover = idx;
  }
  const free = keys.map((_, i) => i).filter(i => !Object.values(map).includes(i));
  if (map.title === undefined && free.length) map.title = free.shift();
  if (map.artist === undefined && free.length) map.artist = free.shift();

  const used = new Set(Object.values(map));

  return body.map((r, i) => {
    const get = f => (map[f] !== undefined ? (r[map[f]] || '').trim() : '');
    const youtubeCover = toImageUrl(get('link'));
    const extra = [];
    header.forEach((h, j) => {
      const v = (r[j] || '').trim();
      if (!used.has(j) && v && h) extra.push({ label: h, value: v });
    });
    return {
      id: i,
      title: get('title'),
      artist: get('artist'),
      year: get('year'),
      link: get('link'),
      description: get('description'),
      cover: toImageUrl(get('cover')) || (/i\.ytimg\.com/.test(youtubeCover) ? youtubeCover : ''),
      extra,
      hasSleeve: false,
    };
  }).filter(rec => rec.title || rec.artist || rec.cover);
}

export async function loadSheet({ sheetId, sheetName, gid }) {
  const params = new URLSearchParams(location.search);
  const id = params.get('id') || sheetId;
  const name = params.get('sheet') || sheetName;
  const g = params.get('gid') || gid;

  let url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv`;
  if (name) url += `&sheet=${encodeURIComponent(name)}`;
  else if (g) url += `&gid=${encodeURIComponent(g)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (/^\s*<(!doctype|html)/i.test(text)) throw new Error('Sheet chưa được chia sẻ công khai');
  const records = rowsToRecords(parseCSV(text));
  if (!records.length) throw new Error('Sheet không có dữ liệu');
  return records;
}
