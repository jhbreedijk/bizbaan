/* The app: the top menu, the project frame, popups, actions and events. Loaded last. */
'use strict';

/* ---------- the screens ---------- */
// The functions in the top menu. Each is a page of the open project: a layout with named sections.
// While he types, every section except the one with the cursor is redrawn, so totals follow along without losing his place.
const TABS = {
  info: { name: 'Client', icon: 'user', layout: infoLayout, secs: INFO },
  calc: { name: 'Calculation', icon: 'calc', layout: calcView, secs: SECS },
  docs: { name: 'Quotes', icon: 'doc', layout: () => '<div data-sec="main"></div>', secs: { main: docsView } },
  plan: { name: 'Planning', icon: 'cal', layout: planLayout, secs: PLAN },
  talk: { name: 'Mail', icon: 'mail', layout: talkLayout, secs: TALK },
  files: { name: 'Folder', icon: 'folder', layout: () => '<div data-sec="main"></div>', secs: { main: filesView } },
};
// Whole pages, drawn in one go. Offer, document and private sheet belong to a project function for the menu.
const PAGES = { home: homeView, offer: offerView, doc: docView, private: privateView, settings: settingsView };
const PAGE_TAB = { offer: 'docs', doc: 'docs', private: 'calc' };

const ICONS = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2M14 12h2M8 16h2M14 16h2"/>',
  doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  folder: '<path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7M12 17h.01"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.4-2.3.9a7.6 7.6 0 0 0-2.6-1.5L14 2.5h-4l-.5 2.5A7.6 7.6 0 0 0 6.9 6.5l-2.3-.9-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.4 2.3-.9a7.6 7.6 0 0 0 2.6 1.5l.5 2.5h4l.5-2.5a7.6 7.6 0 0 0 2.6-1.5l2.3.9 2-3.4z"/>',
};
const icon = (k) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k]}</svg>`;

/** The menu on top of every screen: home, the project functions, help and settings. */
function topMenu() {
  const tab = ui.view === 'project' ? ui.tab : PAGE_TAB[ui.view];
  const item = (k, name, ic, on) => `<button data-act="go" data-v="${k}" class="${on ? 'on' : ''}" ${on ? 'aria-current="page"' : ''}>${icon(ic)}<span>${name}</span></button>`;
  return `<div class="fn">${item('home', 'Home', 'home', ui.view === 'home')}${Object.entries(TABS).map(([k, t]) => item(k, t.name, t.icon, tab === k)).join('')}</div>
    <div class="aux"><button data-act="tourstart" aria-label="Walkthrough" title="Walkthrough">${icon('help')}</button><button data-act="go" data-v="settings" class="${ui.view === 'settings' ? 'on' : ''}" aria-label="Settings" title="Settings">${icon('gear')}</button></div>`;
}

/** The head of a project page: which project (tap to switch), its stage, and the one next step. */
function shell(body) {
  const p = P(), st = stage(p), at = STAGES.findIndex(([k]) => k === st), nx = nextStep(p);
  const tpls = state.templates.map((t, i) => `<button data-act="tplnew" data-i="${i}">New from “${esc(t.name)}”</button>`).join('');
  const menu = `<div class="menu"><button data-act="live">Update live prices</button><button data-act="view" data-v="private">Private sheet</button>${tpls}<button data-act="savetpl">Save as template</button><button data-act="dup">Duplicate</button><button data-act="delproject" class="danger">Delete project</button></div>`;
  const sub = [p.address && p.client, p.phone].filter(Boolean).join(' · ');
  return `<div class="phead">
      <button class="switch" data-act="pick" title="Switch project"><b>${esc(label(p))}</b>${sub ? `<span>${esc(sub)}</span>` : ''}<i aria-hidden="true">▾</i></button>
      <div class="steps">${STAGES.map(([k, name], i) => `<button class="${i < at ? 'past' : ''} ${i === at ? 'on' : ''}" data-act="status" data-s="${k}">${name}</button>`).join('')}</div>
      ${DET('pmenu', '⋯', menu, 'pop')}</div>
    ${nx ? `<div class="next"><small>Next</small><span>${esc(nx.text)}</span>${nx.btn}</div>` : ''}
    <div class="tabbody tab-${ui.tab}">${body}</div>`;
}

/** Popups: pick a project for a function, or start a new one. */
function modalView() {
  const m = ui.modal;
  if (!m) return '';
  let body = '';
  if (m.kind === 'pick') {
    const order = STAGES.map(([k]) => k);
    const list = state.projects.map(fix).sort((a, b) => (stage(a) === 'done') - (stage(b) === 'done') || order.indexOf(stage(a)) - order.indexOf(stage(b)) || (b.created || '').localeCompare(a.created || ''));
    body = `<h2>${TABS[m.tab].name} <span class="mute">for which project?</span></h2>
      <div class="picks">${list.map((p) => `<button class="pick ${p.id === state.current ? 'on' : ''}" data-act="pickp" data-id="${p.id}" data-tab="${m.tab}"><b>${esc(label(p))}</b><span>${esc(p.address && p.client ? p.client : '')}</span><span class="tag k-${stage(p) === 'request' ? 'request' : 'task'}">${STAGE[stage(p)]}</span></button>`).join('')}</div>
      <div class="acts"><button data-act="newp">New project</button></div>`;
  }
  if (m.kind === 'new') {
    const tpl = state.templates.length ? `<select data-change="tplnew" aria-label="Start from a template"><option value="">Or start from a template</option>${state.templates.map((t, i) => `<option value="${i}">${esc(t.name)}</option>`).join('')}</select>` : '';
    body = `<h2>New project</h2>
      ${TA('Paste the request', 'st.draft.req', { rows: 8, ph: 'From the website form, an email or your own notes. Name, phone, address, services and sizes are picked out by themselves.\n\nLeave it empty for a phone call.' })}
      <div class="acts"><button class="primary" data-act="newrequest">Create project</button>${tpl}</div>`;
  }
  return `<div class="scrim" data-act="closemodal"></div><div class="sheet" role="dialog" aria-modal="true"><button class="x close" data-act="closemodal" aria-label="Close">×</button>${body}</div>`;
}

function paint(full) {
  save();
  applySkin();
  const view = $('#view');
  if (ui.view === 'project' && !state.projects.length) ui.view = 'home';
  if (full) { $('#nav').innerHTML = topMenu(); $('#modal').innerHTML = modalView(); document.body.classList.toggle('modal-open', !!ui.modal); }
  if (!['home', 'settings'].includes(ui.view)) R = compute(P(), state.materials);
  if (ui.view !== 'project') {
    if (full) { view.className = ui.view; view.dataset.k = ui.view; view.innerHTML = PAGES[ui.view](); }
    if (full) tourPaint();
    return;
  }
  const tab = TABS[ui.tab], key = `${state.current}:${ui.tab}`;
  if (full || view.dataset.k !== key) { view.className = 'project'; view.dataset.k = key; view.innerHTML = shell(tab.layout()); full = true; }
  const act = document.activeElement;
  const skip = !full && act?.matches('input:not([type=checkbox]), textarea') ? act.closest('[data-sec]')?.dataset.sec : null;
  outs = {};
  for (const k in tab.secs) {
    const html = tab.secs[k]();
    const el = k !== skip && view.querySelector(`[data-sec="${k}"]`);
    if (el) el.innerHTML = html;
  }
  for (const el of view.querySelectorAll('[data-o]')) { const v = outs[el.dataset.o]; if (v !== undefined && el.textContent !== v) el.textContent = v; }
  // Day grids open at the week that matters instead of at their left edge.
  if (full) for (const b of view.querySelectorAll('.board')) { const a = b.querySelector('.anchor'); if (a) b.scrollLeft = Math.max(0, a.getBoundingClientRect().left - b.getBoundingClientRect().left - b.querySelector('.blab').offsetWidth - 40); }
  const h = view.querySelector('.phead .switch b');
  if (h && h.textContent !== label(P())) h.textContent = label(P());
  if (full) tourPaint();
}
const say = (t) => { ui.status = t; const el = $('[data-o="status"]') || $('.status'); if (el) el.textContent = t; };

/* ---------- actions ---------- */
Object.assign(A, {
  view(d) {
    if (d.v === 'offer' && ui.view === 'project' && ui.tab === 'calc') joke();
    if (TABS[d.v]) { ui.view = 'project'; ui.tab = d.v; } else {
      if (['project', 'home'].includes(ui.view)) ui.from = { view: ui.view, tab: ui.tab };
      ui.view = d.v;
    }
    ui.status = ''; ui.open.pmenu = false; scrollTo(0, 0);
  },
  /** A function in the top menu: stay in the open project, or pick one first. */
  go(d) {
    ui.modal = null;
    if (!TABS[d.v]) return A.view(d);
    if (ui.view === 'project' || PAGE_TAB[ui.view]) { ui.view = 'project'; ui.tab = d.v; ui.status = ''; scrollTo(0, 0); return; }
    if (!state.projects.length) { ui.modal = { kind: 'new' }; return; }
    if (state.projects.length === 1) return A.pickp({ id: state.projects[0].id, tab: d.v });
    ui.modal = { kind: 'pick', tab: d.v };
  },
  pick() { ui.modal = { kind: 'pick', tab: ui.tab }; },
  pickp(d) { state.current = d.id; ui.view = 'project'; ui.tab = d.tab; ui.modal = null; ui.change = null; ui.status = ''; scrollTo(0, 0); },
  newp() { ui.modal = { kind: 'new' }; },
  closemodal() { ui.modal = null; },
  back() { Object.assign(ui, ui.from || { view: 'home' }); ui.from = null; scrollTo(0, 0); },
  status(d) {
    const p = P(), was = stage(p);
    if (d.s === was) return;
    p.status = d.s === 'running' ? 'planned' : d.s;
    if (d.s === 'running' && !(Calc.schedule(p).start <= todayT())) { p.start = today(); }
    if (['planned', 'running'].includes(d.s)) p.acceptedOn ||= today();
    if (d.s === 'done') p.doneOn = today();
    logTalk(p, 'system', `Stage: ${STAGE[was]} to ${STAGE[stage(p)]}.`);
  },
  set(d) { set(d.path, /^\d+$/.test(d.val) ? +d.val : d.val); },
  tplnew(d) {
    const t = state.templates[+d.i], p = newProject(t.data);
    Object.assign(p, { status: 'request', talk: [], docs: [], acceptedOn: '', doneOn: '' });
    logTalk(p, 'system', `Started from the template ${t.name}.`);
    ui.open.pmenu = false; ui.status = `Started from ${t.name}.`; ui.view = 'project'; ui.tab = 'info'; ui.modal = null;
  },
  savetpl() {
    const name = prompt('Name this template', SERVICES.filter((s) => P().services[s.id]?.on).map((s) => s.en).join(', '));
    if (!name) return;
    const data = clone(P());
    Object.assign(data, { address: '', client: '', start: '', geo: null, parkNote: '' });
    Object.assign(data.costs, { km: '', parkingDay: '', permit: '' });
    data.offer.text = {}; data.docs = []; data.offerNo = '';
    state.templates.push({ id: uid(), name, data });
    ui.open.pmenu = false; ui.status = `Template ${name} saved.`;
  },
  dup() {
    const p = newProject(P());
    Object.assign(p, { address: '', geo: null, status: 'request', talk: [], docs: [], offerNo: '', acceptedOn: '', doneOn: '' });
    logTalk(p, 'system', 'Copied from another project.');
    ui.open.pmenu = false; ui.tab = 'info';
  },
  delproject() {
    const p = P();
    if (!confirm(`Delete ${label(p)}, with its documents, history and files? This cannot be undone.`)) return;
    state.projects = state.projects.filter((x) => x.id !== p.id);
    state.current = state.projects[0]?.id || null;
    removeProjectFiles(p.id);
    ui.open.pmenu = false; ui.view = 'home';
  },
});

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  e.preventDefault();
  if (A[el.dataset.act](el.dataset) !== false) paint(true);
});
/** Fields that pull other things along when they change. */
function afterProjectEdit(p, path, value) {
  if (path === 'p.costs.permit' && p.geo?.municipality) state.permits[p.geo.municipality] = value;
  if (path === 'p.address') {
    Object.assign(p, { geo: null, addrId: '', parkNote: '', parkOptions: [], distNote: '' });
    clearTimeout(suggT); suggT = setTimeout(() => suggest(value), 250);
  }
  if (path === 'p.costs.km') p.distNote = '';
  if (path === 'p.team') for (const id in p.services) if (p.services[id].mode !== 'hour') p.services[id].workers = value;
}
document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset.ce) {
    const o = P().offer, d = ui.view === 'doc' && openDoc();
    if (d) d.text[el.dataset.ce] = el.innerText; else ((o.text ??= {})[o.lang] ??= {})[el.dataset.ce] = el.innerText;
    save(); return;
  }
  if (!el.dataset.bind) return;
  const path = el.dataset.bind;
  set(path, el.type === 'checkbox' ? el.checked : el.value);
  if (path.startsWith('p.')) afterProjectEdit(P(), path, el.value);
  paint(el.type === 'checkbox');
});
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.id === 'file' && el.files[0]) {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const raw = JSON.parse(fr.result);
        if (!raw.settings) throw new Error('not a Bizbaan file');
        stamp();
        state = merge(state, raw); snap = null; stamp();
        ui.status = `File merged: ${state.projects.length} projects, ${state.materials.length} materials.`; ui.view = 'home'; paint(true);
      } catch { alert('That file could not be read. Pick the Bizbaan file you saved earlier.'); }
      el.value = '';
    };
    fr.readAsText(el.files[0]);
  }
  if (el.dataset.change === 'tplnew' && el.value !== '') { A.tplnew({ i: el.value }); paint(true); }
  if (el.dataset.change === 'addfiles' && el.files.length) { addFiles(el.files, P(), el.dataset.folder || '').then(() => paint(true)); }
  // Lists and dates outside the calculation redraw once he leaves the field.
  if (el.matches('select[data-bind], input[type=date][data-bind]')) paint(true);
  if (el.dataset.change === 'addmat' && el.value) { P().matManual.push({ matId: el.value, qty: 1 }); paint(true); }
  if (el.dataset.bind === 'p.address' && el.value.trim().length > 5) {
    // Typed without picking: try the text as it is, unless a pick follows right after.
    clearTimeout(geoT);
    geoT = setTimeout(() => {
      const p = P();
      if (p.addrId || p.geo) return;
      say('Finding the address.');
      locate(p).then((m) => { ui.status = m; paint(false); }, () => say('Address not found. Pick it from the list, or type the distance yourself.'));
    }, 400);
  }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && (ui.modal || ui.tour != null)) { ui.modal = null; tourEnd(); paint(true); } });
document.addEventListener('toggle', (e) => { const k = e.target.dataset?.d; if (k) ui.open[k] = e.target.open; }, true);
document.addEventListener('click', (e) => { for (const d of document.querySelectorAll('details.pop[open]')) if (!d.contains(e.target)) { d.open = false; } }, true);

// Files dropped anywhere on a project go into its Files tab, sorted into folders.
document.addEventListener('dragover', (e) => { if (ui.view === 'project' && e.dataTransfer?.types.includes('Files')) { e.preventDefault(); document.body.classList.add('dropping'); } });
document.addEventListener('dragleave', (e) => { if (!e.relatedTarget) document.body.classList.remove('dropping'); });
document.addEventListener('drop', (e) => {
  document.body.classList.remove('dropping');
  if (ui.view !== 'project' || !e.dataTransfer?.files.length) return;
  e.preventDefault();
  addFiles(e.dataTransfer.files).then(() => { ui.tab = 'files'; paint(true); });
});

stamp();
// Links can open a screen directly: ?example makes the example project, &go=plan opens a function, &tour=0 skips the walkthrough.
const params = new URLSearchParams(location.search);
if (params.has('example')) exampleProject();
if (TABS[params.get('go')]) { state.current = exampleProject().id; ui.view = 'project'; ui.tab = params.get('go'); }
else if (PAGES[params.get('go')]) ui.view = params.get('go');
if (['light', 'dark', 'auto'].includes(params.get('skin'))) state.settings.skin = params.get('skin');
if (params.get('modal') === 'new') ui.modal = { kind: 'new' };
if (params.has('step')) tourGo(Math.min(TOUR.length - 1, +params.get('step') || 0));
else if (params.get('tour') !== '0' && state.settings.tour && !state.settings.tourSeen) tourGo(0);
paint(true);
prices(false).then((m) => { if (m) { ui.status = m; paint(false); } });
dieselToday(false).then((d) => { if (d) paint(false); }, () => {});
