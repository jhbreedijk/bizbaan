/* Requests and the Info tab: who the client is, what they asked, and the call that fills the gaps. */
'use strict';

/* ---------- reading a request ---------- */
// The bizbaan.nl intake form sends these service ids. Mapped to the services in the calculation.
const SITE_SERVICES = {
  'full-renovation': ['demolition', 'extra'], 'plastering-painting': ['stucco', 'painting'], kitchen: ['kitchen'], bathroom: ['bathroom'],
  'custom-furniture': ['furniture'], flooring: ['flooring'], 'wall-ceiling': ['extra'], demolition: ['demolition'], other: ['extra'],
};
// Words in an email or a note that point at a service, in Dutch or English.
const SERVICE_WORDS = [
  [/stuc.*schilder|plaster.*paint/i, ['stucco', 'painting']], [/stuc|plaster/i, 'stucco'], [/schilder|paint/i, 'painting'], [/keuken|kitchen/i, 'kitchen'], [/badkamer|bathroom/i, 'bathroom'],
  [/meubel|furniture|kast\b|wardrobe/i, 'furniture'], [/vloer|floor/i, 'flooring'], [/tegel|tiling|tiles?\b/i, 'tiling'],
  [/wand|plafond|wall|ceiling|drywall|gips/i, 'extra'], [/sloop|demoli/i, 'demolition'], [/loodgiet|plumb/i, 'plumbing'],
  [/elektr|electr/i, 'electra'], [/airco|\bac\b/i, 'ac'], [/renovat|afbouw|fit-out/i, 'demolition'],
];
// Labels a request can use for each field, in a form email, a CSV export or his own notes.
const REQUEST_LABELS = [
  ['email', /e-?mail/i], ['phone', /telefoon|phone|\btel\b|mobiel|mobile|gsm/i], ['name', /^(naam|name|contact|klant|client)/i],
  ['address', /adres|address|locatie|location|straat|street/i], ['area', /oppervlak|area|m2|m²|vierkante/i],
  ['budgetFrom', /budget.*(van|from|min)|budgetfrom/i], ['budgetTo', /budget.*(tot|to\b|max)|budgetto/i],
  ['startDate', /start|begin|vanaf/i], ['endDate', /eind|^end|klaar|deadline|enddate/i],
  ['services', /dienst|service|werkzaamhed|^work/i], ['otherService', /anders|other/i],
  ['motivation', /motivati|waarom|why/i], ['goal', /doel|goal|wens|wish|omschrijving|description|project|vraag|message|bericht/i],
  ['priorities', /prioriteit|priorit/i],
];

/** Reads whatever he pastes: the form's JSON, a notification email, a CSV row or loose notes. */
function parseRequest(text) {
  const r = { raw: text.trim(), services: [] };
  const t = text.trim();
  if (!t) return r;
  let data = null;
  try { const j = JSON.parse(t); data = j.submission || j.data || j; } catch { /* not JSON */ }
  if (!data) {
    data = {};
    let last = null;
    for (const line of t.split(/\r?\n/)) {
      const m = /^\s*([^:]{2,40}?)\s*[:=]\s*(.*)$/.exec(line);
      const key = m && REQUEST_LABELS.find(([, re]) => re.test(m[1].trim()))?.[0];
      if (key) { data[key] = m[2].trim(); last = key; } else if (last && line.trim()) data[last] += '\n' + line.trim();
    }
  }
  const str = (v) => (Array.isArray(v) ? v.join(', ') : String(v ?? '')).trim();
  for (const k of ['name', 'email', 'phone', 'address', 'goal', 'motivation', 'otherService']) r[k] = str(data[k]);
  // The first number only: "45 m2" is 45, "€ 15.000" is 15000.
  const first = (v) => { const m = /\d[\d.,]*/.exec(str(v)); return m ? n(m[0].replace(/[.,](?=\d{3}\b)/g, '')) || '' : ''; };
  r.area = first(data.area); r.budgetFrom = first(data.budgetFrom); r.budgetTo = first(data.budgetTo);
  r.priorities = str(data.priorities);
  r.files = Array.isArray(data.fileUrls) ? data.fileUrls : [];
  for (const k of ['startDate', 'endDate']) { const v = str(data[k]); r[k] = /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : v; }
  // Whatever the form left out, the text may still hold.
  r.email ||= (/[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}/i.exec(t) || [''])[0];
  r.phone ||= (/(?:\+31|0031|0)\s?(?:6|[1-9]\d)[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}\d?/.exec(t) || [''])[0];
  const ids = Array.isArray(data.services) ? data.services : str(data.services).split(/[,;\n]+/);
  const found = new Set();
  for (const id of ids.map((x) => String(x).trim()).filter(Boolean)) {
    if (SITE_SERVICES[id]) SITE_SERVICES[id].forEach((s) => found.add(s));
    else { const hit = SERVICE_WORDS.find(([re]) => re.test(id)); if (hit) [].concat(hit[1]).forEach((x) => found.add(x)); } // the first, most specific word wins
  }
  if (!found.size) for (const [re, s] of SERVICE_WORDS.slice(0, -1)) if (re.test([r.goal, r.otherService].join(' '))) [].concat(s).forEach((x) => found.add(x));
  r.services = [...found];
  return r;
}

/** A new project at the request stage, filled from what was pasted. */
function projectFromRequest(text) {
  const r = parseRequest(text), p = newProject();
  Object.assign(p, { status: 'request', client: r.name || '', phone: r.phone || '', email: r.email || '', address: r.address || '', m2: r.area || '' });
  p.request = {
    received: today(), source: text.trim() ? 'pasted' : 'phone call', raw: r.raw,
    text: [r.goal, r.otherService && 'Other: ' + r.otherService, r.motivation && 'Why: ' + r.motivation].filter(Boolean).join('\n\n'),
    wishStart: r.startDate || '', wishEnd: r.endDate || '', budgetFrom: r.budgetFrom, budgetTo: r.budgetTo, priorities: r.priorities, files: r.files,
  };
  for (const id of r.services) p.services[id] = newService(id);
  if (r.phone) p.call.phone = true;
  logTalk(p, 'request', text.trim() ? 'Request received.' : 'Request taken by phone.');
  return { p, r };
}

/* ---------- the Info tab ---------- */
const CALL_CHECKS = [
  ['phone', 'Name, phone number and the best time to call'],
  ['scope', 'Every room, and what happens in each'],
  ['m2', 'Sizes in m² per job, or photos with a tape measure'],
  ['floor', 'Floor, elevator, stairs and parking in the street'],
  ['materials', 'Materials already chosen, or advice wanted'],
  ['timing', 'Start wish and any hard deadline'],
  ['budget', 'Budget, and what matters most: quality, time or price'],
  ['access', 'Keys, neighbours, house rules of the building (VvE)'],
  ['photos', 'Photos or drawings received'],
];
const waNumber = (phone) => { const d = String(phone).replace(/\D/g, ''); return d.startsWith('00') ? d.slice(2) : d.startsWith('0') ? '31' + d.slice(1) : d; };
const callLink = (p) => (p.phone ? `<a class="btn" href="tel:${esc(p.phone.replace(/\s/g, ''))}">Call</a>` : '');
const contactLinks = (p) => [
  callLink(p),
  p.phone && `<a class="btn" href="https://wa.me/${waNumber(p.phone)}" target="_blank" rel="noopener">WhatsApp</a>`,
  p.email && `<a class="btn" href="mailto:${esc(p.email)}">Email</a>`,
].filter(Boolean).join('');

const infoLayout = () => `<div class="projects"><aside class="card plist" data-sec="plist"></aside><div class="pdetail"><section class="card phero" data-sec="hero"></section>
  <div class="cols"><section class="card" data-sec="who"></section><section class="card" data-sec="call"></section></div><section class="card" data-sec="ask"></section></div></div>`;
const INFO = {
  plist() {
    const cur = P(), order = STAGES.map(([k]) => k);
    const groups = STAGES.map(([k, name]) => [k, name, state.projects.map(fix).filter((p) => stage(p) === k)]).filter(([, , ps]) => ps.length);
    const row = (p) => `<button class="lrow2 ${p.id === cur.id ? 'on' : ''}" data-act="selp" data-id="${p.id}"><b>${esc(label(p))}</b><span>${esc(p.address && p.client ? p.client : STAGE[stage(p)])}</span></button>`;
    return `<div class="plhead"><h2>Projects</h2><button class="primary small" data-act="newp">New</button></div>
      ${groups.map(([k, name, ps]) => (k === 'done' ? DET('pdone', `Done · ${ps.length}`, ps.map(row).join('')) : `<h3 class="fold">${name} <small>${ps.length}</small></h3>${ps.map(row).join('')}`)).join('')}`;
  },
  hero() {
    const p = P(), nx = nextStep(p), sub = [p.address && p.client, p.phone].filter(Boolean).join(' · ');
    return `<div class="herotop"><div><h1>${esc(label(p))}</h1>${sub ? `<span class="mute">${esc(sub)}</span>` : ''}${p.geo ? `<code class="coords">${coords(p.geo)}</code>` : ''}</div><span class="grow"></span>${stageSelect(p)}${projectMenu()}</div>
      ${nx ? `<div class="next"><small>Next</small><span>${esc(nx.text)}</span>${nx.btn}</div>` : ''}`;
  },
  who() {
    const p = P();
    return `<h2>Client</h2><div class="grid">
      ${F('Name', 'p.client', { type: 'text', cls: 'wide', ph: 'Who you are talking to' })}
      ${F('Phone', 'p.phone', { type: 'tel', ph: '06 …' })}${F('Email', 'p.email', { type: 'email' })}
      ${F('Address', 'p.address', { type: 'text', cls: 'wide', ph: 'Start typing, then pick the address' })}<div id="addr-sugg" class="sugg wide"></div></div>
      <p class="hint">${O('geo2', p.geo ? `${p.geo.label} · ${p.geo.municipality}` : '')}</p>
      <div class="acts">${contactLinks(p) || '<span class="hint">No phone number yet. The website form only asks for an email.</span>'}<button data-act="logcall">Log a call</button></div>`;
  },
  call() {
    const p = P(), done = CALL_CHECKS.filter(([k]) => p.call[k]).length;
    return `<h2>Before you calculate ${O('calls', `${done} of ${CALL_CHECKS.length}`, 'amt small')}</h2>
      <div class="checks">${CALL_CHECKS.map(([k, l]) => `<label class="check"><input type="checkbox" data-bind="p.call.${k}" ${p.call[k] ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
      ${TA('Call notes', 'p.call.notes', { ph: 'What they told you. Sizes, wishes, worries.' })}
      <div class="acts"><button data-act="tocalc">${done === CALL_CHECKS.length ? 'All there. Calculate' : 'Calculate anyway'}</button></div>`;
  },
  ask() {
    const p = P(), q = p.request, wish = [q.wishStart && 'start ' + q.wishStart, q.wishEnd && 'end ' + q.wishEnd].filter(Boolean).join(', ');
    const budget = q.budgetFrom || q.budgetTo ? `${q.budgetFrom ? eur(q.budgetFrom) : '?'} to ${q.budgetTo ? eur(q.budgetTo) : '?'}` : '';
    const facts = [['Received', q.received ? `${day(Date.parse(q.received))}, ${q.source}` : ''], ['Wish', wish], ['Budget', budget], ['Matters most', q.priorities], ['Area', p.m2 ? num(p.m2) + ' m²' : '']].filter(([, v]) => v);
    return `<h2>What they asked</h2>
      ${facts.length ? `<dl class="facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
      ${TA('What needs to be done', 'p.request.text', { rows: 5, ph: 'In their words, or yours after the call' })}
      ${(q.files || []).length ? `<div class="acts">${q.files.map((u, i) => `<a class="btn" href="${esc(u)}" target="_blank" rel="noopener">Their file ${i + 1}</a>`).join('')}</div>` : ''}
      ${q.raw ? DET('raw', 'The original message', `<pre class="raw">${esc(q.raw)}</pre>`) : ''}`;
  },
};

Object.assign(A, {
  newrequest() {
    const text = state.draft?.req || '';
    const { p, r } = projectFromRequest(text);
    (state.draft ??= {}).req = '';
    const got = ['name', 'phone', 'email', 'address'].filter((k) => r[k]);
    ui.status = text.trim() ? `Read from the message: ${got.length ? got.join(', ') : 'no contact details'}${r.services.length ? `, ${r.services.length} services` : ''}. Check it below.` : '';
    ui.view = 'project'; ui.tab = 'info'; ui.modal = null;
    if (p.address) setTimeout(() => locate(p).then(() => paint(false), () => {}), 0);
  },
  selp(d) { state.current = d.id; ui.change = null; ui.status = ''; },
  logcall() { ui.tab = 'talk'; (state.draft ??= {}).talkKind = 'call'; },
  tocalc() {
    const p = P();
    if (p.status === 'request') { p.status = 'quote'; logTalk(p, 'system', 'Info complete. On to the calculation.'); }
    ui.tab = 'calc';
  },
});
