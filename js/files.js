/* Folder: every project has the same ten numbered folders. Files he adds are kept in this browser (IndexedDB)
   and sorted by name, type and stage. Quotes, invoices and the request appear in their folder by themselves.
   The whole folder downloads as one zip, with the documents as printable pages. */
'use strict';

const FOLDERS = [
  ['request', '01 Request and client'], ['quotes', '02 Quotes and agreements'], ['planning', '03 Planning'],
  ['before', '04 Photos before'], ['during', '05 Photos during'], ['after', '06 Photos after'],
  ['drawings', '07 Drawings'], ['partners', '08 Partners and suppliers'], ['money', '09 Invoices and receipts'], ['other', '10 Other'],
];
const FOLDER = Object.fromEntries(FOLDERS);
const OLD_FOLDER = { photos: 'before', partner: 'partners', receipts: 'money', contracts: 'quotes' };

/** Which folder a file belongs in. The name wins over the type, so a photo of a receipt lands with the receipts. */
function folderFor(f, p) {
  const nm = f.name.toLowerCase();
  if (/\.(dwg|dxf|skp)$|tekening|plattegrond|drawing|floor ?plan|ontwerp|design/.test(nm)) return 'drawings';
  if (/bon\b|bonnetje|kassa|receipt|factuur|invoice/.test(nm)) return 'money';
  if (/offerte|quote|quotation/.test(nm)) return 'partners';
  if (/overeenkomst|contract|agreement/.test(nm)) return 'quotes';
  if (/planning|schedule/.test(nm)) return 'planning';
  if ((f.type || '').startsWith('image/') || /\.(heic|jpe?g|png|webp)$/.test(nm)) {
    const st = p ? stage(p) : 'request';
    return st === 'running' ? 'during' : st === 'done' ? 'after' : 'before';
  }
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
async function loadFiles(pid) {
  fileCache[pid] = (await FileStore.list(pid)).map((f) => ({ ...f, folder: OLD_FOLDER[f.folder] || (FOLDER[f.folder] ? f.folder : 'other') })).sort((a, b) => b.added.localeCompare(a.added));
}

async function addFiles(list, p = P(), folder = '') {
  navigator.storage?.persist?.();
  const files = [...list], put = [];
  for (const f of files) { const to = folder || folderFor(f, p); put.push(to); await FileStore.put({ id: uid(), projectId: p.id, folder: to, name: f.name, type: f.type, size: f.size, added: new Date().toISOString(), blob: f }); }
  await loadFiles(p.id);
  const where = [...new Set(put.map((k) => FOLDER[k]))].join(', ');
  logTalk(p, 'system', `${files.length} file${files.length === 1 ? '' : 's'} added to ${where}.`);
  ui.status = `${files.length} file${files.length === 1 ? '' : 's'} put in ${where}.`;
}
async function removeProjectFiles(pid) {
  for (const f of await FileStore.list(pid).catch(() => [])) await FileStore.del(f.id);
  delete fileCache[pid];
}

/** Documents the app makes itself, shown in their folder next to his own files. */
function madeDocs(p) {
  const out = [{ folder: 'request', name: 'Request and call notes', kind: 'TXT', act: 'data-act="go" data-v="info"' }];
  for (const d of p.docs) out.push({ folder: d.type === 'invoice' ? 'money' : 'quotes', name: docName(d), kind: 'DOC', act: `data-act="opendoc" data-id="${d.id}"`, doc: d });
  if (Calc.schedule(p).start) out.push({ folder: 'planning', name: 'Planning and payment steps', kind: 'PLAN', act: 'data-act="go" data-v="plan"' });
  return out;
}

const size = (b) => (b > 1e6 ? num(b / 1e6) + ' MB' : Math.max(1, Math.round(b / 1e3)) + ' kB');
function fileCard(f) {
  const ext = (f.name.split('.').pop() || '').slice(0, 4).toUpperCase();
  const pic = (f.type || '').startsWith('image/') && !/heic/i.test(f.type) ? `<img src="${fileUrl(f)}" alt="" loading="lazy">` : `<span class="ext">${esc(ext)}</span>`;
  const moves = FOLDERS.filter(([k]) => k !== f.folder).map(([k, name]) => `<button data-act="fmove" data-id="${f.id}" data-to="${k}">Move to ${name}</button>`).join('');
  return `<div class="fcard"><a href="${fileUrl(f)}" target="_blank" rel="noopener" class="thumb">${pic}</a><div class="fmeta"><b title="${esc(f.name)}">${esc(f.name)}</b><small>${size(f.size)} · ${dm(Date.parse(f.added))}</small></div>
    ${DET('f:' + f.id, '⋯', `<div class="menu">${moves}<button class="danger" data-act="fdel" data-id="${f.id}">Delete</button></div>`, 'pop')}</div>`;
}
const madeCard = (m) => `<div class="fcard made"><button class="thumb" ${m.act}><span class="ext">${m.kind}</span></button><div class="fmeta"><b>${esc(m.name)}</b><small>made by the app</small></div></div>`;

function filesView() {
  const p = P(), list = fileCache[p.id];
  if (!list) {
    loadFiles(p.id).then(() => paint(true), () => { fileCache[p.id] = []; ui.status = 'This browser does not allow storing files.'; paint(true); });
    return '<p class="loading">Opening the folder.</p>';
  }
  const made = madeDocs(p);
  const rows = FOLDERS.map(([k, name]) => {
    const mine = list.filter((f) => f.folder === k), auto = made.filter((m) => m.folder === k), count = mine.length + auto.length;
    const add = `<label class="btn small"><input type="file" multiple data-change="addfiles" data-folder="${k}" hidden>Add</label>`;
    const open = ui.open['fold:' + k] ?? count > 0;
    return `<div class="frow ${open ? 'open' : ''}"><div class="fhead"><button class="fbtn" data-act="fold" data-k="${k}" data-open="${open ? 1 : 0}" aria-expanded="${open}"><span class="ficon">${icon('folder')}</span><b>${name}</b><small>${count || ''}</small></button>${add}</div>
      ${open ? (count ? `<div class="fgrid">${auto.map(madeCard).join('')}${mine.map(fileCard).join('')}</div>` : '<p class="empty">Empty.</p>') : ''}</div>`;
  }).join('');
  return `<section class="card folder-card"><h2>Project folder ${O('fcount', `${list.length} files`, 'amt small')}</h2>
    <label class="drop"><input type="file" multiple data-change="addfiles" hidden><b>Drop files here, or tap to add</b><span>Photos go to before, during or after by the stage of the project. Drawings, receipts and partner quotes find their own folder.</span></label>
    <div class="folders">${rows}</div>
    <div class="acts"><button data-act="zip">Download the whole folder</button></div>
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

/** A document as a page that opens and prints on its own, with the style and logo inside. */
let pageKit;
async function standalonePage(title, inner) {
  pageKit ??= await Promise.all([
    fetch('style.css').then((r) => r.text()),
    fetch('assets/logo-dark.png').then((r) => r.blob()).then((b) => new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(b); })),
  ]);
  const [css, logo] = pageKit;
  const body = inner.replaceAll('assets/logo-dark.png', logo).replaceAll(' contenteditable="plaintext-only"', '');
  return new Blob([`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><style>${css}\nbody{background:#fff;padding:24px 0}</style></head><body>${body}</body></html>`], { type: 'text/html' });
}

Object.assign(A, {
  fold(d) { ui.open['fold:' + d.k] = d.open !== '1'; },
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
    const unique = (name) => { for (let k = 2; used.has(name); k++) name = name.replace(/( \(\d+\))?(\.[^.]*)?$/, (m, _, ext = '') => ` (${k})${ext}`); used.add(name); return name; };
    const entries = fileCache[p.id].map((f) => ({ name: unique(`${root}/${FOLDER[f.folder]}/${f.added.slice(0, 10)} ${f.name}`), blob: f.blob, date: f.added }));
    const q = p.request, s = Calc.schedule(p), S = projectSum(p);
    const notes = [label(p), p.geo?.label || p.address, `Client: ${[p.client, p.phone, p.email].filter(Boolean).join(', ')}`, s.start ? `Planned: ${day(s.start)} to ${day(s.end)}` : '',
      S.cur ? `Agreed: ${eur(S.agreed, 2)} incl. VAT. Invoiced ${eur(S.invoiced, 2)}, paid ${eur(S.paid, 2)}.` : '', '', 'What they asked:', q.text || '', '', 'Call notes:', p.call.notes || '',
      '', 'Checked:', ...CALL_CHECKS.filter(([k]) => p.call[k]).map(([, l]) => '- ' + l)].join('\r\n');
    say('Packing the folder.');
    (async () => {
      entries.push({ name: `${root}/${FOLDER.request}/Request and call notes.txt`, blob: new Blob([notes]) });
      for (const d of p.docs) entries.push({ name: unique(`${root}/${FOLDER[d.type === 'invoice' ? 'money' : 'quotes']}/${docName(d)}.html`), blob: await standalonePage(docName(d), paper(d)), date: d.date });
      const plan = planSnapshot(p, S.cur?.incVat ?? R.incVat);
      if (plan) entries.push({ name: `${root}/${FOLDER.planning}/Planning.html`, blob: await standalonePage('Planning', `<article class="paper">${paperHead(state.settings.company)}<h1>${label(p)}</h1>${planPaper(plan, p.offer.lang)}</article>`) });
      const blob = await zipBlob(entries);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = root + '.zip'; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      say(`${entries.length} items in ${root}.zip.`);
    })();
    return false;
  },
});
