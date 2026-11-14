/* Files: photos, drawings, receipts and partner quotes per project.
   Kept in this browser (IndexedDB), sorted into folders by name and type, and downloadable as one zip. */
'use strict';

const FOLDERS = { photos: 'Photos', drawings: 'Drawings', partner: 'Partner quotes', receipts: 'Receipts and invoices', contracts: 'Contracts', other: 'Other' };

/** Which folder a file belongs in. The name wins over the type, so a photo of a receipt lands with the receipts. */
function folderFor(f) {
  const nm = f.name.toLowerCase();
  if (/\.(dwg|dxf|skp)$|tekening|plattegrond|drawing|floor ?plan|ontwerp|design/.test(nm)) return 'drawings';
  if (/bon\b|bonnetje|kassa|receipt|factuur|invoice/.test(nm)) return 'receipts';
  if (/offerte|quote|quotation/.test(nm)) return 'partner';
  if (/overeenkomst|contract|agreement/.test(nm)) return 'contracts';
  if ((f.type || '').startsWith('image/') || /\.(heic|jpe?g|png|webp)$/.test(nm)) return 'photos';
  return 'other';
}

const FileStore = (() => {
  let db;
  const open = () => (db ??= new Promise((ok, no) => {
    const r = indexedDB.open('bizbaan-files', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files', { keyPath: 'id' }).createIndex('project', 'projectId');
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error);
  }));
  const run = async (mode, fn) => {
    const store = (await open()).transaction('files', mode).objectStore('files');
    return new Promise((ok, no) => { const q = fn(store); q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error); });
  };
  return {
    put: (rec) => run('readwrite', (s) => s.put(rec)),
    del: (id) => run('readwrite', (s) => s.delete(id)),
    list: (pid) => run('readonly', (s) => s.index('project').getAll(pid)),
  };
})();

const fileCache = {};
const urlCache = new Map();
const fileUrl = (f) => { if (!urlCache.has(f.id)) urlCache.set(f.id, URL.createObjectURL(f.blob)); return urlCache.get(f.id); };
async function loadFiles(pid) { fileCache[pid] = (await FileStore.list(pid)).sort((a, b) => b.added.localeCompare(a.added)); }

async function addFiles(list, p = P()) {
  navigator.storage?.persist?.();
  const files = [...list];
  for (const f of files) await FileStore.put({ id: uid(), projectId: p.id, folder: folderFor(f), name: f.name, type: f.type, size: f.size, added: new Date().toISOString(), blob: f });
  await loadFiles(p.id);
  const where = [...new Set(files.map((f) => FOLDERS[folderFor(f)]))].join(', ');
  logTalk(p, 'system', `${files.length} file${files.length === 1 ? '' : 's'} added to ${where}.`);
  ui.status = `${files.length} file${files.length === 1 ? '' : 's'} put in ${where}.`;
}
async function removeProjectFiles(pid) {
  for (const f of await FileStore.list(pid).catch(() => [])) await FileStore.del(f.id);
  delete fileCache[pid];
}

const size = (b) => (b > 1e6 ? num(b / 1e6) + ' MB' : Math.max(1, Math.round(b / 1e3)) + ' kB');
function fileCard(f) {
  const ext = (f.name.split('.').pop() || '').slice(0, 4).toUpperCase();
  const pic = (f.type || '').startsWith('image/') && !/heic/i.test(f.type) ? `<img src="${fileUrl(f)}" alt="" loading="lazy">` : `<span class="ext">${esc(ext)}</span>`;
  const moves = Object.entries(FOLDERS).filter(([k]) => k !== f.folder).map(([k, name]) => `<button data-act="fmove" data-id="${f.id}" data-to="${k}">Move to ${name}</button>`).join('');
  return `<div class="fcard"><a href="${fileUrl(f)}" target="_blank" rel="noopener" class="thumb">${pic}</a><div class="fmeta"><b title="${esc(f.name)}">${esc(f.name)}</b><small>${size(f.size)} · ${dm(Date.parse(f.added))}</small></div>
    ${DET('f:' + f.id, '⋯', `<div class="menu">${moves}<button class="danger" data-act="fdel" data-id="${f.id}">Delete</button></div>`, 'pop')}</div>`;
}

function filesView() {
  const p = P(), list = fileCache[p.id];
  if (!list) {
    loadFiles(p.id).then(() => paint(true), () => { fileCache[p.id] = []; ui.status = 'This browser does not allow storing files.'; paint(true); });
    return '<p class="loading">Opening the files.</p>';
  }
  const groups = Object.entries(FOLDERS).map(([k, name]) => [name, list.filter((f) => f.folder === k)]).filter(([, fs]) => fs.length);
  return `<section class="card"><label class="drop"><input type="file" multiple data-change="addfiles" hidden><b>Drop files here, or tap to add</b><span>Photos, drawings, receipts, partner quotes. They sort themselves into folders.</span></label>
    ${groups.map(([name, fs]) => `<h3 class="fold">${name} <small>${fs.length}</small></h3><div class="fgrid">${fs.map(fileCard).join('')}</div>`).join('') || '<p class="empty">No files yet. You can also drop files anywhere on a project.</p>'}
    <div class="acts">${list.length ? '<button data-act="zip">Download the project folder</button>' : ''}</div>
    <p class="hint">Files stay in this browser on this device and are not in your sync file. Download the folder to keep a copy in your cloud folder or to send to the bookkeeper.</p>
    <p class="status">${esc(ui.status)}</p></section>`;
}

/* ---------- zip, without compression: photos and PDFs are compressed already ---------- */
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[i] = c >>> 0; } return t; })();
const crc32 = (b) => { let c = ~0; for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 255] ^ (c >>> 8); return ~c >>> 0; };
/** entries: [{ name: 'Folder/file.jpg', blob, date }] */
async function zipBlob(entries) {
  const enc = new TextEncoder(), parts = [], central = [];
  let offset = 0;
  for (const e of entries) {
    const data = new Uint8Array(await e.blob.arrayBuffer()), name = enc.encode(e.name), crc = crc32(data), d = new Date(e.date || Date.now());
    const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    const local = new DataView(new ArrayBuffer(30)), dir = new DataView(new ArrayBuffer(46));
    [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [10, time, 2], [12, date, 2], [14, crc, 4], [18, data.length, 4], [22, data.length, 4], [26, name.length, 2]]
      .forEach(([at, v, w]) => (w === 4 ? local.setUint32(at, v, true) : local.setUint16(at, v, true)));
    [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [12, time, 2], [14, date, 2], [16, crc, 4], [20, data.length, 4], [24, data.length, 4], [28, name.length, 2], [42, offset, 4]]
      .forEach(([at, v, w]) => (w === 4 ? dir.setUint32(at, v, true) : dir.setUint16(at, v, true)));
    parts.push(local, name, data);
    central.push(dir, name);
    offset += 30 + name.length + data.length;
  }
  const dirSize = central.reduce((t, x) => t + x.byteLength, 0), end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true);
  end.setUint32(12, dirSize, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end], { type: 'application/zip' });
}

Object.assign(A, {
  async fmove(d) {
    const p = P(), f = fileCache[p.id].find((x) => x.id === d.id);
    await FileStore.put({ ...f, folder: d.to });
    await loadFiles(p.id); paint(true);
  },
  async fdel(d) {
    const p = P();
    await FileStore.del(d.id);
    if (urlCache.has(d.id)) { URL.revokeObjectURL(urlCache.get(d.id)); urlCache.delete(d.id); }
    await loadFiles(p.id); paint(true);
  },
  zip() {
    const p = P(), root = label(p).replace(/[\\/:*?"<>|]+/g, ' ').trim(), used = new Set();
    const entries = fileCache[p.id].map((f) => {
      let name = `${root}/${FOLDERS[f.folder]}/${f.added.slice(0, 10)} ${f.name}`;
      for (let k = 2; used.has(name); k++) name = name.replace(/( \(\d+\))?(\.[^.]*)?$/, (m, _, ext = '') => ` (${k})${ext}`);
      used.add(name);
      return { name, blob: f.blob, date: f.added };
    });
    const S = projectSum(p), s = Calc.schedule(p);
    const summary = [label(p), p.geo?.label || p.address, `Client: ${p.client} ${p.phone} ${p.email}`.trim(), s.start ? `Planned: ${day(s.start)} to ${day(s.end)}` : '', S.cur ? `Agreed: ${eur(S.agreed, 2)} incl. VAT. Invoiced ${eur(S.invoiced, 2)}, paid ${eur(S.paid, 2)}.` : ''].filter(Boolean).join('\r\n');
    entries.push({ name: `${root}/Project summary.txt`, blob: new Blob([summary]) });
    say('Packing the folder.');
    zipBlob(entries).then((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = root + '.zip'; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      say(`${entries.length - 1} files in ${root}.zip.`);
    });
    return false;
  },
});
