/* The app: drawing the screen, actions and events. Loaded last. */
'use strict';
/* ---------- the screens ---------- */
// A project has six tabs. Each tab is a layout with named sections; while he types, every section except the one
// with the cursor is redrawn, so totals and timelines follow along without losing his place.
const TABS = {
  info: { name: 'Info', layout: infoLayout, secs: INFO },
  calc: { name: 'Calculation', layout: calcView, secs: SECS },
  plan: { name: 'Planning', layout: planLayout, secs: PLAN },
  docs: { name: 'Documents', layout: () => '<div data-sec="main"></div>', secs: { main: docsView } },
  talk: { name: 'Talk', layout: talkLayout, secs: TALK },
  files: { name: 'Files', layout: () => '<div data-sec="main"></div>', secs: { main: filesView } },
};
// Whole pages, drawn in one go.
const PAGES = { home: homeView, offer: offerView, doc: docView, private: privateView, settings: settingsView };

const GEAR = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.4-2.3.9a7.6 7.6 0 0 0-2.6-1.5L14 2.5h-4l-.5 2.5A7.6 7.6 0 0 0 6.9 6.5l-2.3-.9-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.4 2.3-.9a7.6 7.6 0 0 0 2.6 1.5l.5 2.5h4l.5-2.5a7.6 7.6 0 0 0 2.6-1.5l2.3.9 2-3.4z"/></svg>';

/** The frame around a project: name, stage, the next step, and the tabs. */
function shell(body) {
  const p = P(), st = stage(p), at = STAGES.findIndex(([k]) => k === st), nx = nextStep(p);
  const counts = { docs: p.docs.length, talk: p.talk.length, files: fileCache[p.id]?.length, plan: openTasks(p).length };
  const tpls = state.templates.map((t, i) => `<button data-act="tplnew" data-i="${i}">New from “${esc(t.name)}”</button>`).join('');
  const menu = `<div class="menu"><button data-act="live">Update live prices</button><button data-act="view" data-v="private">Private sheet</button>${tpls}<button data-act="savetpl">Save as template</button><button data-act="dup">Duplicate</button><button data-act="delproject" class="danger">Delete project</button></div>`;
  return `<div class="shead"><button class="back" data-act="view" data-v="home">‹ All projects</button>
      <h1>${esc(label(p))}</h1><span class="who">${esc([p.address && p.client, p.phone].filter(Boolean).join(' · '))}</span>${DET('pmenu', '⋯', menu, 'pop')}</div>
    <div class="steps">${STAGES.map(([k, name], i) => `<button class="${i < at ? 'past' : ''} ${i === at ? 'on' : ''}" data-act="status" data-s="${k}">${name}</button>`).join('')}</div>
    ${nx ? `<div class="next"><small>Next</small><span>${esc(nx.text)}</span>${nx.btn}</div>` : ''}
    <nav class="tabs">${Object.entries(TABS).map(([k, t]) => `<button class="${ui.tab === k ? 'on' : ''}" data-act="view" data-v="${k}">${t.name}${counts[k] ? ` <small>${counts[k]}</small>` : ''}</button>`).join('')}</nav>
    <div class="tabbody tab-${ui.tab}">${body}</div>`;
}

function paint(full) {
  save();
  applySkin();
  $('#nav').innerHTML = `<button data-act="view" data-v="home" class="${ui.view === 'home' ? 'on' : ''}">Projects</button><button data-act="view" data-v="settings" class="${ui.view === 'settings' ? 'on' : ''}" aria-label="Settings" title="Settings">${GEAR}</button>`;
  const view = $('#view');
  if (ui.view === 'project' && !state.projects.length) ui.view = 'home';
  if (!['home', 'settings'].includes(ui.view)) R = compute(P(), state.materials);
  if (ui.view !== 'project') {
    if (full) { view.className = ui.view; view.dataset.k = ui.view; view.innerHTML = PAGES[ui.view](); }
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
  const h = view.querySelector('.shead h1');
  if (h && h.textContent !== label(P())) h.textContent = label(P());
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
    ui.open.pmenu = false; ui.status = `Started from ${t.name}.`; ui.view = 'project'; ui.tab = 'info';
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
  if (el.dataset.change === 'addfiles' && el.files.length) { addFiles(el.files).then(() => paint(true)); }
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
paint(true);
prices(false).then((m) => { if (m) { ui.status = m; paint(false); } });
dieselToday(false).then((d) => { if (d) paint(false); }, () => {});
