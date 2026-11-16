/* Core: helpers, state, saving and syncing, the project model and the small HTML builders every screen uses.
   Nothing here holds a price or a margin; those come from local storage or the private file. */
'use strict';
const { SERVICES, SVC, n, r2, compute, timeline } = Calc;
const KEY = 'bizbaan.v1';
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const eur = (x, d = 0) => '€ ' + n(x).toLocaleString('nl-NL', { minimumFractionDigits: d, maximumFractionDigits: d });
const num = (x, d = 1) => n(x).toLocaleString('nl-NL', { maximumFractionDigits: d });
const day = (t, lang = 'en', long) => new Date(t).toLocaleDateString(lang === 'nl' ? 'nl-NL' : 'en-GB', { weekday: long ? undefined : 'short', day: 'numeric', month: long ? 'long' : 'short', year: long ? 'numeric' : undefined, timeZone: 'UTC' });
const today = () => new Date().toISOString().slice(0, 10);
const clone = (x) => JSON.parse(JSON.stringify(x));
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const todayT = () => Date.parse(today());
const dm = (t) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/* ---------- the sky: a faint, still starfield behind the brand surfaces ---------- */
// Dust plus streaks running out of a vanishing point, the moment before light speed. Deterministic, never moves.
function starfield(seed = 12, cx = 78, cy = 18, dust = 140, streaks = 40) {
  let s = seed >>> 0;
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const dots = Array.from({ length: dust }, () => `<circle cx="${(r() * 100).toFixed(2)}" cy="${(r() * 100).toFixed(2)}" r="${(0.05 + r() * 0.2).toFixed(3)}" opacity="${(0.1 + r() * 0.45).toFixed(2)}"/>`).join('');
  const lines = Array.from({ length: streaks }, () => {
    const a = r() * Math.PI * 2, near = 5 + r() * 30, len = 3 + r() * 22;
    return `<line stroke="currentColor" stroke-linecap="round" x1="${(cx + Math.cos(a) * near).toFixed(2)}" y1="${(cy + Math.sin(a) * near).toFixed(2)}" x2="${(cx + Math.cos(a) * (near + len)).toFixed(2)}" y2="${(cy + Math.sin(a) * (near + len)).toFixed(2)}" stroke-width="${(0.04 + r() * 0.12).toFixed(3)}" opacity="${(0.06 + r() * 0.25).toFixed(2)}"/>`;
  }).join('');
  return `<svg class="stars" aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice"><g fill="currentColor">${dots}${lines}<circle cx="${cx}" cy="${cy}" r="0.45" opacity="0.4"/></g></svg>`;
}
/** ISO week number, for the date line on Home. */
const weekNo = (t = Date.now()) => { const d = new Date(t); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); return Math.ceil(((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7); };
/** Coordinates as a navigator writes them: 52.3636° N · 4.9365° E */
const coords = (g) => (g ? `${g.lat.toFixed(4)}° N · ${g.lon.toFixed(4)}° E` : '');

/* ---------- the project's stages ---------- */
const STAGES = [['request', 'Request'], ['quote', 'Quote'], ['planned', 'Planned'], ['running', 'Running'], ['done', 'Done']];
const STAGE = Object.fromEntries(STAGES);
/** A planned project counts as running from its first working day until it is marked done. */
function stage(p) {
  if (p.status === 'planned') { const s = Calc.schedule(p); if (s.start && todayT() >= s.start) return 'running'; }
  return p.status;
}


/* ---------- state ---------- */
const blankSettings = () => ({
  hourRate: '', hoursPerDay: 9, teamMembers: 2, food: '', profit: '', error: '', discount: '', floorExtraPct: '',
  fuelPer100: 8, dieselPrice: '', startAddress: '', quickPerM2: '', cranePerDay: '', toiletPerWeek: '', containerBase: '',
  payDays: 14,
  services: { tiling: {}, painting: {}, stucco: {}, flooring: {}, bathroom: {}, kitchen: {} },
  crew: [], partners: [], mails: buildMails(), mailsVersion: MAILS_VERSION, tour: true, tourSeen: false,
  shops: [{ name: 'Bouwmaat', search: 'https://www.bouwmaat.nl/search?q={q}', address: 'Bouwmaat Amsterdam' }],
  company: { name: 'Bizbaan Interior Construction', owner: 'Urban', email: 'info@bizbaan.nl', phone: '', web: 'bizbaan.nl', address: '', kvk: '83629440', btw: '', iban: '', review: '' },
});
const blankState = () => ({ settings: blankSettings(), materials: [], permits: {}, templates: [], projects: [], current: null, lastPrices: '', home: null, seq: { offer: 1, invoice: 1 }, stamps: {}, deleted: {} });
const adopt = (raw) => {
  const b = blankState();
  const s = { ...b, ...raw, settings: { ...b.settings, ...(raw.settings || {}) } };
  s.settings.services = { ...b.settings.services, ...(raw.settings?.services || {}) };
  s.settings.company = { ...b.settings.company, ...(raw.settings?.company || {}) };
  s.seq = { ...b.seq, ...(raw.seq || {}) };
  // Templates from before the tones: the old defaults make way for the new set, his own stay.
  if ((raw.settings?.mailsVersion || 1) < MAILS_VERSION && raw.settings?.mails) {
    const old = new Set(['ack', 'offer', 'plan', 'change', 'invoice', 'review'].flatMap((k) => [k + '-nl', k + '-en']));
    s.settings.mails = [...raw.settings.mails.filter((m) => !old.has(m.id)), ...buildMails()];
    s.settings.mailsVersion = MAILS_VERSION;
  }
  return s;
};
let state = blankState();
try { const raw = localStorage.getItem(KEY); if (raw) state = adopt(JSON.parse(raw)); } catch { /* start empty */ }
const ui = { view: 'home', tab: 'info', status: '', open: {}, from: null, cal: 0, change: null };
let saveTimer;
let savedT;
/** Shows, quietly, that his work is kept. Or loudly, that it is not. */
function savedSignal(ok) {
  const el = $('#saved'); if (!el) return;
  el.textContent = ok ? 'Saved' : 'Not saved';
  el.className = `saved on${ok ? '' : ' warn'}`;
  clearTimeout(savedT);
  if (ok) savedT = setTimeout(() => { el.className = 'saved'; }, 1400);
}
const save = () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { stamp(); localStorage.setItem(KEY, JSON.stringify(state)); savedSignal(true); }
    catch { ui.status = 'Could not save on this device. Use Save file in settings.'; savedSignal(false); }
  }, 250);
};
/** Something removed that can be taken back: no "are you sure", an Undo for six seconds instead.
    commit runs when the six seconds are over, for what must really go (like files). */
let toastT, pending = null;
function undoable(text, undo, commit = () => {}) {
  pending?.();
  let settled = false;
  pending = () => { if (!settled) { settled = true; commit(); } pending = null; };
  const box = $('#toast');
  box.innerHTML = `<span>${esc(text)}</span><button data-act="undo">Undo</button>`;
  box.classList.add('on');
  A.undo = () => { settled = true; pending = null; clearTimeout(toastT); box.classList.remove('on'); undo(); paint(true); return false; };
  clearTimeout(toastT);
  toastT = setTimeout(() => { box.classList.remove('on'); pending?.(); }, 6000);
}
addEventListener('pagehide', () => pending?.());
/** Taking something back also takes back the deletion that would travel to other devices. */
const unDelete = (x) => { if (x?.id) for (const pre of ['p:', 'm:', 't:']) delete state.deleted[pre + x.id]; };

/* ---------- one file, several devices ----------
   Every project, material, template, saved value and permit price carries the time it last changed.
   Loading the file merges: the newest version of each wins, and deletions travel along. */
let snap = null;
function stamp() {
  const now = Date.now(), next = {};
  const look = (key, val, mark) => { const j = JSON.stringify(val); next[key] = j; if (snap && snap[key] !== j) mark(now); };
  for (const [pre, list] of [['p:', state.projects], ['m:', state.materials], ['t:', state.templates]])
    for (const x of list) { x.id ??= uid(); const { updated, ...rest } = x; look(pre + x.id, rest, (t) => { x.updated = t; }); }
  for (const k in state.settings) look('s:' + k, state.settings[k], (t) => { state.stamps['s:' + k] = t; });
  for (const k in state.permits) look('pm:' + k, state.permits[k], (t) => { state.stamps['pm:' + k] = t; });
  if (snap) for (const k in snap) if (!(k in next) && !k.startsWith('s:')) state.deleted[k] = now;
  snap = next;
}
function merge(local, incoming) {
  const a = adopt(clone(local)), b = adopt(clone(incoming));
  const del = { ...a.deleted };
  for (const k in b.deleted) del[k] = Math.max(del[k] || 0, b.deleted[k]);
  const gone = (key, t) => del[key] && del[key] >= t;
  const join = (la, lb, pre) => {
    const map = new Map();
    for (const x of [...la, ...lb]) { x.id ??= uid(); const o = map.get(x.id); if (!o || (x.updated || 0) >= (o.updated || 0)) map.set(x.id, x); }
    return [...map.values()].filter((x) => !gone(pre + x.id, x.updated || 0));
  };
  const blank = (p) => !p.address && !p.client && !Object.values(p.services || {}).some((x) => x.on) && !(p.docs || []).length;
  const st = (o, k) => o.stamps[k] || 0;
  a.projects = join(a.projects.filter((p) => !(b.projects.length && blank(p))), b.projects, 'p:');
  a.materials = join(a.materials, b.materials, 'm:');
  a.templates = join(a.templates, b.templates, 't:');
  for (const k in b.settings) if (st(b, 's:' + k) >= st(a, 's:' + k)) a.settings[k] = b.settings[k];
  const permits = {};
  for (const k of new Set([...Object.keys(a.permits), ...Object.keys(b.permits)])) {
    const useB = k in b.permits && (!(k in a.permits) || st(b, 'pm:' + k) >= st(a, 'pm:' + k));
    if (!gone('pm:' + k, Math.max(st(a, 'pm:' + k), st(b, 'pm:' + k)))) permits[k] = useB ? b.permits[k] : a.permits[k];
  }
  a.permits = permits;
  for (const k in b.stamps) a.stamps[k] = Math.max(st(a, k), b.stamps[k]);
  a.seq = { offer: Math.max(n(a.seq.offer), n(b.seq.offer)), invoice: Math.max(n(a.seq.invoice), n(b.seq.invoice)) };
  a.deleted = del;
  if (!a.projects.some((p) => p.id === a.current)) a.current = a.projects[0]?.id || null;
  return a;
}

function newProject(tpl) {
  const s = state.settings;
  const p = tpl ? clone(tpl) : {
    address: '', client: '', m2: '', days: '', team: s.teamMembers, hpd: s.hoursPerDay, rate: s.hourRate, start: '', floor: '', elevator: true,
    services: {}, matQty: {}, matOff: [], matManual: [], crew: [],
    costs: { km: '', diesel: s.dieselPrice, fuel: s.fuelPer100, parkingDay: '', food: s.food, floorOn: true, floorPct: s.floorExtraPct, craneOn: false, craneDays: '', cranePerDay: s.cranePerDay, containerOn: false, containerBase: s.containerBase, permit: '', toiletOn: false, toiletPerWeek: s.toiletPerWeek, waste: '', additional: '' },
    margins: { profit: s.profit, errorOn: true, error: s.error, discount: s.discount },
    offer: { lang: 'nl', detail: 'breakdown', text: {} },
  };
  Object.assign(p, { id: uid(), created: today(), geo: null, docs: [], offerNo: '', status: 'request', talk: [], plan: null, call: {}, request: {} });
  fix(p);
  state.projects.unshift(p);
  state.current = p.id;
  return p;
}
const P = () => fix(state.projects.find((x) => x.id === state.current) || state.projects[0] || newProject());
/** Fills in what older projects did not have yet. */
function fix(p) {
  p.status ??= (p.docs || []).some((d) => d.type === 'offer') ? 'quote' : 'request';
  p.docs ??= []; p.talk ??= []; p.call ??= {}; p.request ??= {}; p.crew ??= [];
  p.phone ??= ''; p.email ??= '';
  if (p.offer) p.offer.withPlan ??= 1;
  p.plan ??= {};
  const pl = p.plan;
  pl.tasks ??= []; pl.done ??= {}; pl.dates ??= {}; pl.hidden ??= []; pl.crew ??= {}; pl.partner ??= {};
  return p;
}
const byId = (id) => state.projects.find((x) => x.id === id);
/** Adds a line to the project's history. Everything that happens to a project lands here. */
function logTalk(p, kind, text, extra = {}) { p.talk.unshift({ id: uid(), at: new Date().toISOString(), kind, text, ...extra }); }
/** Every action the screen can call, filled by each part of the app. */
const A = {};
const newService = (id) => ({ on: true, m2: '', mode: 'm2', workers: P().team, days: '', inclMat: false, vat: 21, pieces: [], total: '', planDays: '', labour: '', ...clone(state.settings.services[id] || {}) });

// Field paths start with p (the open project), s (settings) or st (everything). The project is only looked up when needed.
const root = (head) => (head === 'p' ? P() : head === 's' ? state.settings : state);
const get = (path) => { const [head, ...ks] = path.split('.'); return ks.reduce((o, k) => (o == null ? o : o[k]), root(head)); };
const set = (path, v) => { const [head, ...ks] = path.split('.'), last = ks.pop(); ks.reduce((o, k) => (o[k] ??= {}), root(head))[last] = v; };

/* ---------- little builders ---------- */
let R, outs = {};
const O = (k, v, cls = '') => { outs[k] = String(v); return `<span data-o="${k}" class="${cls}">${esc(v)}</span>`; };
const INPUT = { text: 'type="text"', date: 'type="date"', tel: 'type="tel"', email: 'type="email"' };
const F = (label, path, o = {}) => `<label class="f ${o.cls || ''}"><span>${label}</span><span class="in"><input ${INPUT[o.type] || 'type="text" inputmode="decimal"'} data-bind="${path}" value="${esc(get(path) ?? '')}" placeholder="${esc(o.ph ?? '')}" autocomplete="off">${o.unit ? `<i>${o.unit}</i>` : ''}</span></label>`;
const TA = (label, path, o = {}) => `<label class="f ${o.cls ?? 'wide'}"><span>${label}</span><textarea data-bind="${path}" rows="${o.rows || 4}" placeholder="${esc(o.ph ?? '')}">${esc(get(path) ?? '')}</textarea></label>`;
const SW = (label, path) => `<label class="sw"><input type="checkbox" data-bind="${path}" ${get(path) ? 'checked' : ''}><b></b><span>${label}</span></label>`;
const SEG = (path, opts) => `<span class="seg">${opts.map(([v, l]) => `<button type="button" data-act="set" data-path="${path}" data-val="${v}" class="${String(get(path)) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</span>`;
const DET = (key, summary, body, cls = '') => `<details data-d="${key}" class="${cls}" ${ui.open[key] ? 'open' : ''}><summary>${summary}</summary>${body}</details>`;
const label = (p) => p.address || p.client || 'New project';

/* ---------- skins ---------- */
const SKINS = [
  ['auto', 'Auto', 'follows your device', '#f7f7f7', '#08131f'], ['light', 'Light', 'Bizbaan by day', '#ffffff', '#1262f5'], ['dark', 'Dark', 'Bizbaan by night', '#0b1826', '#1262f5'],
  ['press', 'Press', 'white label, typewriter, one red stamp', '#f1ede3', '#d2311f'], ['acid', 'Acid', 'black room, one strobe', '#080808', '#d4ff2a'], ['riso', 'Riso', 'two-colour sleeve print', '#f8f0de', '#ff4a78'],
];
const applySkin = () => { const k = state.settings.skin; if (k && k !== 'auto') document.documentElement.dataset.skin = k; else delete document.documentElement.dataset.skin; };
