/* Documents: the offer, additions, invoices, the project sum, and the private sheet. */
'use strict';
/* ---------- documents: offers, additions, invoices ---------- */
const TXT = {
  nl: {
    titles: { offer: 'Offerte', addition: 'Meerwerk', less: 'Minderwerk', invoice: 'Factuur' }, client: 'Voor', project: 'Project', date: 'Datum', due: 'Betalen vóór', no: 'Nummer', area: 'Oppervlakte', work: 'Werkzaamheden', price: 'Prijs',
    ex: 'Totaal exclusief btw', vat: (r, b) => `Btw ${r}% over ${b}`, inc: 'Totaal inclusief btw', known: 'Goed om te weten', term: 'Termijn',
    lines: { transport: 'Transport', parking: 'Parkeren', waste: 'Afval en afvoer', crane: 'Kraan', toilet: 'Mobiel toilet', materials: 'Materialen', other: 'Overig' },
    intro: (c, a) => `Beste ${c || 'klant'},\n\nBedankt voor het prettige gesprek en voor uw vertrouwen. Hieronder vindt u wat ik voor u ga doen${a ? ' aan de ' + a : ''} en wat het kost. Ik heb het bewust kort en helder gehouden.`,
    notes: () => `In de prijs zit alles wat nodig is om het werk netjes af te maken: arbeid, materialen, transport en afvoer.\nDeze offerte is gebaseerd op wat we nu weten. Verandert de opdracht of een materiaalkeuze, dan bespreek ik dat altijd eerst met u. Er komen geen verrassingen achteraf.\nU heeft één aanspreekpunt: mij. Ook voor het werk van mijn vaste partners.`,
    closing: (o) => `Heeft u vragen, of wilt u iets aanpassen? Bel of app me gerust. Ik loop het graag samen met u door.\n\nMet vriendelijke groet,\n${o}`,
    addIntro: (c) => `Beste ${c || 'klant'},\n\nZoals besproken komt er werk bij. Hieronder staat wat het is en wat het kost. Dit komt bovenop de eerdere offerte, verder verandert er niets.`,
    invIntro: (c, a) => `Beste ${c || 'klant'},\n\nHierbij de factuur voor het werk${a ? ' aan de ' + a : ''}.`,
    invClosing: (d, co) => `Wilt u ${eur(d.incVat, 2)} uiterlijk ${day(Date.parse(d.due), 'nl', true)} overmaken${co.iban ? ' op ' + co.iban : ''} ten name van ${co.name}, onder vermelding van factuurnummer ${d.no}?\n\nHartelijk dank,\n${co.owner}`,
  },
  en: {
    titles: { offer: 'Quote', addition: 'Additional work', less: 'Less work', invoice: 'Invoice' }, client: 'For', project: 'Project', date: 'Date', due: 'Pay before', no: 'Number', area: 'Area', work: 'Work', price: 'Price',
    ex: 'Total excluding VAT', vat: (r, b) => `VAT ${r}% on ${b}`, inc: 'Total including VAT', known: 'Good to know', term: 'Instalment',
    lines: { transport: 'Transport', parking: 'Parking', waste: 'Waste removal', crane: 'Crane', toilet: 'Site toilet', materials: 'Materials', other: 'Other' },
    intro: (c, a) => `Dear ${c || 'client'},\n\nThank you for the good conversation and for your trust. Below you will find what I will do for you${a ? ' at ' + a : ''} and what it costs. I kept it short and clear on purpose.`,
    notes: () => `The price covers everything needed to finish the work properly: labour, materials, transport and waste removal.\nThis quote is based on what we know today. If the scope or a material choice changes, I always discuss it with you first. No surprises afterwards.\nYou have one point of contact: me. That includes the work of my regular partners.`,
    closing: (o) => `Any questions, or would you like to change something? Call or message me any time. I am happy to walk you through it.\n\nKind regards,\n${o}`,
    addIntro: (c) => `Dear ${c || 'client'},\n\nAs discussed, some work is added. Below you will find what it is and what it costs. This comes on top of the earlier quote, nothing else changes.`,
    invIntro: (c, a) => `Dear ${c || 'client'},\n\nPlease find the invoice for the work${a ? ' at ' + a : ''}.`,
    invClosing: (d, co) => `Please transfer ${eur(d.incVat, 2)} by ${day(Date.parse(d.due), 'en', true)}${co.iban ? ' to ' + co.iban : ''} in the name of ${co.name}, quoting invoice number ${d.no}.\n\nThank you,\n${co.owner}`,
  },
};
const offerText = (p, key) => {
  const L = p.offer.lang, own = p.offer.text?.[L]?.[key];
  if (own !== undefined) return own;
  return key === 'intro' ? TXT[L].intro(p.client, p.geo?.label || p.address) : key === 'notes' ? TXT[L].notes() : TXT[L].closing(state.settings.company.owner);
};
const paperHead = (co) => `<header class="phead"><img src="assets/logo-dark.png" alt="${esc(co.name)}"><address>${[co.name, co.address, co.phone, co.email].filter(Boolean).map(esc).join('<br>')}</address></header>`;
const paperFoot = (co) => `<footer class="pfoot">${[co.name, co.address, co.email, co.web, co.kvk && 'KVK ' + co.kvk, co.btw && 'BTW ' + co.btw, co.iban && 'IBAN ' + co.iban].filter(Boolean).map(esc).join(' · ')}</footer>`;
const total = (o) => Object.values(o).reduce((t, x) => t + x, 0);
/** Totals of a document from its amounts per VAT rate. */
const finish = (d) => {
  d.exVat = r2(total(d.exBy));
  d.vatBy ??= Object.fromEntries(Object.keys(d.exBy).map((r) => [r, r2((d.exBy[r] * r) / 100)]));
  d.incVat = r2(d.exVat + total(d.vatBy));
  return d;
};
const docsOf = (p, type) => (p.docs ??= []).filter((d) => d.type === type);
/** Additions below zero are less work (minderwerk). */
const docTitle = (d, L = 'en') => TXT[L].titles[d.type === 'addition' && d.exVat < 0 ? 'less' : d.type];
const docName = (d) => `${docTitle(d)} ${d.no}`;

/** The offer as it stands in the calculation right now. Saving freezes a copy. */
function draftOffer() {
  const p = P(), o = p.offer, L = o.lang, T = TXT[L], brk = o.detail === 'breakdown';
  const name = (key) => (key.startsWith('svc:') ? SVC[key.slice(4)][L] : T.lines[key]);
  return finish({
    type: 'offer', lang: L, date: today(), client: p.client, address: p.geo?.label || p.address, m2: n(p.m2),
    lines: R.lines.filter((l) => brk || l.key.startsWith('svc:')).map((l) => ({ label: name(l.key), price: brk ? l.price : null })),
    exBy: { ...R.exBy }, vatBy: { ...R.vatBy }, whole: true, text: { intro: offerText(p, 'intro'), notes: offerText(p, 'notes'), closing: offerText(p, 'closing') },
  });
}
/** What the project adds up to: the latest offer plus additions, against what was invoiced and paid. */
function projectSum(p) {
  const offers = docsOf(p, 'offer'), cur = offers[offers.length - 1], adds = docsOf(p, 'addition'), inv = docsOf(p, 'invoice');
  const exBy = {};
  for (const d of [cur, ...adds].filter(Boolean)) for (const r in d.exBy) exBy[r] = (exBy[r] || 0) + d.exBy[r];
  const agreed = r2((cur?.incVat || 0) + adds.reduce((t, d) => t + d.incVat, 0));
  const invoiced = r2(inv.reduce((t, d) => t + d.incVat, 0)), paid = r2(inv.filter((d) => d.paidOn).reduce((t, d) => t + d.incVat, 0));
  const invBy = {};
  for (const d of inv) for (const r in d.exBy) invBy[r] = (invBy[r] || 0) + d.exBy[r];
  const agreedEx = r2(total(exBy)), invEx = r2(total(invBy));
  // VAT is rounded per invoice, so "what is left" is judged before VAT. A cent of VAT drift is not an open amount.
  const left = agreedEx - invEx > 0.005 ? r2(agreed - invoiced) : 0;
  return { cur, exBy, invBy, agreedEx, agreed, invoiced, paid, open: r2(invoiced - paid), left, invEx };
}

function paper(d) {
  const T = TXT[d.lang], co = state.settings.company, priced = d.lines.some((l) => l.price != null), dec = d.whole ? 0 : 2;
  const vatOf = (r) => d.vatBy?.[r] ?? r2((d.exBy[r] * r) / 100);
  const ce = (key) => (d.text?.[key] === undefined ? '' : `<div class="ce" contenteditable="plaintext-only" data-ce="${key}">${esc(d.text[key])}</div>`);
  const cell = (k, v) => (v ? `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>` : '');
  return `<article class="paper">${paperHead(co)}
    <h1>${docTitle(d, d.lang)}</h1>
    <dl class="meta">${cell(T.client, d.client)}${cell(T.project, d.address)}${cell(T.no, d.no)}${d.type === 'offer' && d.m2 ? cell(T.area, num(d.m2) + ' m²') : ''}${cell(T.date, day(Date.parse(d.date), d.lang, true))}${d.due ? cell(T.due, day(Date.parse(d.due), d.lang, true)) : ''}</dl>
    ${ce('intro')}
    <table><thead><tr><th>${T.work}</th>${priced ? `<th>${T.price}</th>` : ''}</tr></thead><tbody>${d.lines.map((l) => `<tr><td>${esc(l.label)}</td>${priced ? `<td>${eur(l.price, dec)}</td>` : ''}</tr>`).join('')}</tbody></table>
    <table class="totals"><tbody><tr><td>${T.ex}</td><td>${eur(d.exVat, dec)}</td></tr>${Object.keys(d.exBy).sort().map((r) => `<tr><td>${T.vat(r, eur(d.exBy[r], dec))}</td><td>${eur(vatOf(r), dec)}</td></tr>`).join('')}<tr class="grand"><td>${T.inc}</td><td>${eur(d.incVat, dec)}</td></tr></tbody></table>
    ${d.text?.notes !== undefined ? `<h2>${T.known}</h2>${ce('notes')}` : ''}
    ${ce('closing')}
    ${paperFoot(co)}</article>`;
}
function offerView() {
  const n0 = docsOf(P(), 'offer').length;
  return `<div class="tools"><button data-act="back">Back</button>
      ${SEG('p.offer.detail', [['simple', 'Simple'], ['breakdown', 'Breakdown']])}${SEG('p.offer.lang', [['nl', 'Nederlands'], ['en', 'English']])}
      <button data-act="resettext">Reset text</button><button data-act="print">Print or save PDF</button><button class="primary" data-act="saveoffer">${n0 ? `Save as version ${n0 + 1}` : 'Save offer'}</button></div>
    <p class="hint center">Click any text on the page to change it. ${n0 ? 'Saving keeps the earlier versions as they were.' : 'Save it to keep this exact version with the project.'}</p>
    ${paper(draftOffer())}`;
}
const openDoc = () => P().docs?.find((d) => d.id === ui.docId);
function docView() {
  const d = openDoc();
  if (!d) return docsView();
  return `<div class="tools"><button data-act="view" data-v="docs">Back to documents</button><button class="primary" data-act="print">Print or save PDF</button></div>
    <p class="hint center">The amounts are fixed. The text can still be changed.</p>${paper(d)}`;
}
function docsView() {
  const p = P(), S = projectSum(p), offers = docsOf(p, 'offer'), dr = state.draft || {};
  const stat = (label, fig, clause) => `<div class="stat"><b>${eur(fig, 2)}</b><small>${label}</small><span>${clause}</span></div>`;
  const row = (d, extra = '') => `<div class="drow"><a href="#" data-act="opendoc" data-id="${d.id}">${docName(d)}</a><span class="mute">${esc(d.note || '')}</span><span class="mute">${day(Date.parse(d.date))}</span><span class="amt">${eur(d.incVat, 2)}</span>${extra}
    ${DET('d:' + d.id, '⋯', `<div class="menu"><button data-act="opendoc" data-id="${d.id}">Open</button><button class="danger" data-act="deldoc" data-id="${d.id}">Delete</button></div>`, 'pop')}</div>`;
  const lang = S.cur?.lang || p.offer.lang;
  return `<div class="form narrow">
    <div class="stats">${stat('Agreed', S.agreed, S.cur ? `offer v${offers.length}${docsOf(p, 'addition').length ? ' plus ' + docsOf(p, 'addition').length + ' additions' : ''}` : 'no offer saved yet')}${stat('Invoiced', S.invoiced, `${eur(S.left, 2)} still to invoice`)}${stat('Paid', S.paid, `${docsOf(p, 'invoice').filter((d) => d.paidOn).length} of ${docsOf(p, 'invoice').length} invoices`)}${stat('Open', S.open, 'sent, not paid yet')}</div>
    <section class="card"><h2>Offers</h2>${offers.map((d, i) => row({ ...d, note: i === offers.length - 1 ? 'current' : 'replaced' })).join('') || '<p class="empty">No offer saved yet. Turn the calculation into an offer and save it.</p>'}
      <div class="acts"><button class="${offers.length ? '' : 'primary'}" data-act="view" data-v="offer">${offers.length ? 'Change the offer' : 'Make the offer'}</button>${offers.length && stage(p) === 'quote' ? '<button class="primary" data-act="accept">Offer accepted</button>' : ''}</div>
      ${offers.length ? '<p class="hint">Changing the offer makes a new version from the calculation. The earlier ones stay here untouched.</p>' : ''}</section>
    <section class="card"><h2>Additions and less work</h2>${docsOf(p, 'addition').map((d) => row({ ...d, note: d.lines[0]?.label })).join('')}
      <div class="row3 add4">${F('What is added', 'st.draft.addDesc', { type: 'text', ph: 'Extra socket in the kitchen' })}${F('Price excl. VAT', 'st.draft.addAmt', { unit: '€' })}<div class="f"><span>VAT</span>${SEG('st.draft.addVat', [[21, '21%'], [9, '9%']])}</div><button data-act="addaddition">Add</button></div>
      <p class="hint">Extra work agreed after the offer (meerwerk). Type a minus amount for work that is dropped (minderwerk). The price you type is what the client pays, so your margin is already in it.</p></section>
    <section class="card"><h2>Invoices</h2>${docsOf(p, 'invoice').map((d) => row({ ...d, note: d.label }, `<button class="chip sm ${d.paidOn ? 'on' : ''}" data-act="paid" data-id="${d.id}">${d.paidOn ? 'Paid ' + day(Date.parse(d.paidOn)) : 'Mark paid'}</button>`)).join('') || (S.agreed ? '' : '<p class="empty">Save an offer first, then invoice it in parts.</p>')}
      ${S.agreed ? `<div class="row3 add4">${F('For', 'st.draft.invDesc', { type: 'text', ph: `${TXT[lang].term} ${docsOf(p, 'invoice').length + 1}` })}${F('Part of the sum', 'st.draft.invPct', { unit: '%', ph: dr.invAmt ? '' : 'rest' })}${F('or amount excl. VAT', 'st.draft.invAmt', { unit: '€' })}<button class="${offers.length ? 'primary' : ''}" data-act="addinvoice">Make invoice</button></div>
      <p class="hint">Leave both empty to invoice everything that is left: ${eur(S.left, 2)} incl. VAT.</p>` : ''}</section>
    <section class="card"><h2>For the bookkeeper</h2><p class="hint">Kees de Boekhouder has no import. Save each invoice as PDF and book it there under Externe facturen (inkomsten). This list has every invoice of every project to check against.</p><div class="acts"><button data-act="csv">Download invoice list</button></div><p class="status">${esc(ui.status)}</p></section></div>`;
}

/* ---------- private sheet ---------- */
function privateView() {
  const p = P(), c = R.cost, f = 1 + n(p.margins.profit) / 100, co = state.settings.company;
  const tr = (a, b, x, cls = '') => (x ? `<tr class="${cls}"><td>${a}</td><td class="mute">${b}</td><td>${eur(x, 2)}</td><td>${eur(x * f, 2)}</td></tr>` : '');
  let rows = '';
  for (const s of R.services) {
    const hrs = s.hours ? `${num(s.hours)} h at ${eur(p.rate)} / ${eur(n(p.rate) * f)}` : s.kind === 'm2' ? `${num(p.services[s.id].m2)} m² at ${eur(p.services[s.id].labour, 2)}` : '';
    rows += tr(`${SVC[s.id].en} labour`, hrs, s.labour) + tr(`${SVC[s.id].en} materials`, '', s.mats + s.lib) + tr(SVC[s.id].en, s.kind === 'sub' ? 'subcontractor' : 'pieces', s.other);
  }
  rows += tr('Materials added by hand', '', R.manual.reduce((t, x) => t + x.cost, 0));
  rows += tr('Transport', `${num(p.costs.km)} km × ${num(p.days)} days`, c.transport) + tr('Parking', '', c.parking) + tr('Floor extra', `floor ${num(p.floor)}, no elevator`, c.floorExtra) + tr('Crane', '', c.crane) + tr('Container and permit', p.geo?.municipality || '', c.container) + tr('Toilet', `${R.sched.weeks} weeks`, c.toilet) + tr('Waste', '', c.waste) + tr('Additional costs', '', c.additional);
  const line = (a, x, cls = '') => `<tr class="${cls}"><td colspan="3">${a}</td><td>${eur(x, 2)}</td></tr>`;
  const mats = R.materials.map(({ m, packs, cost }) => `<tr><td>${esc(m.name)}</td><td class="mute">${num(packs)} × ${eur(m.price, 2)}</td><td>${eur(cost, 2)}</td><td>${eur(cost * f, 2)}</td></tr>`).join('');
  return `<div class="tools"><button data-act="back">Back</button><button class="primary" data-act="print">Print or save PDF</button></div>
    <article class="paper">${paperHead(co)}<h1>Private estimate</h1>
      <dl class="meta"><div><dt>Project</dt><dd>${esc(p.geo?.label || p.address || '')}</dd></div><div><dt>Area</dt><dd>${num(p.m2)} m²</dd></div><div><dt>Length</dt><dd>${num(p.days)} days, ${R.sched.weeks} weeks${R.sched.end ? `, ${day(R.sched.start)} to ${day(R.sched.end)}` : ''}</dd></div><div><dt>Team</dt><dd>${num(p.team)} × ${num(p.hpd)} h</dd></div></dl>
      <table class="four"><thead><tr><th>Cost</th><th></th><th>My cost</th><th>+ ${num(p.margins.profit)}%</th></tr></thead><tbody>${rows}${tr('All costs', '', R.total, 'grand')}</tbody></table>
      <table class="totals"><tbody>${line(`Error margin ${p.margins.errorOn ? num(p.margins.error) + '%' : 'off'}`, R.errorAmt)}${line(`Discount margin ${num(p.margins.discount)}%`, R.discountAmt)}${line(`Food at cost, ${num(p.days)} days × ${eur(p.costs.food, 2)}`, R.food)}${line('Price excl. VAT', R.exVat, 'grand')}${Object.keys(R.vatBy).sort().map((r) => line(`VAT ${r}% on ${eur(R.exBy[r])}`, R.vatBy[r])).join('')}${line('Price incl. VAT', R.incVat)}${line('Total estimated profit', R.profit, 'grand')}</tbody></table>
      ${mats ? `<h2>Materials to buy</h2><table class="four"><tbody>${mats}</tbody></table>` : ''}
      <p class="pfoot">Private. Not for the client.</p></article>`;
}

Object.assign(A, {
  saveoffer() {
    const p = P(), d = draftOffer(), v = docsOf(p, 'offer').length + 1;
    p.offerNo ||= `${new Date().getFullYear()}-${String(state.seq.offer++).padStart(3, '0')}`;
    Object.assign(d, { id: uid(), no: `${p.offerNo}${v > 1 ? ' v' + v : ''}` });
    p.docs.push(d);
    if (p.status === 'request') p.status = 'quote';
    logTalk(p, 'system', `Offer ${d.no} saved, ${eur(d.incVat)} incl. VAT.`);
    ui.view = 'project'; ui.tab = 'docs'; ui.status = '';
  },
  opendoc(d) { ui.docId = d.id; ui.view = 'doc'; ui.open['d:' + d.id] = false; scrollTo(0, 0); },
  deldoc(d) { const p = P(), doc = p.docs.find((x) => x.id === d.id); if (doc && confirm(`Delete ${docName(doc)}? This cannot be undone.`)) p.docs = p.docs.filter((x) => x.id !== d.id); },
  addaddition() {
    const p = P(), dr = (state.draft ??= {}), amt = r2(n(dr.addAmt));
    if (!dr.addDesc || !amt) { ui.status = 'Type what changes and its price. A minus price is less work.'; return; }
    const L = projectSum(p).cur?.lang || p.offer.lang, T = TXT[L], k = docsOf(p, 'addition').length + 1;
    p.offerNo ||= `${new Date().getFullYear()}-${String(state.seq.offer++).padStart(3, '0')}`;
    p.docs.push(finish({ id: uid(), type: 'addition', no: `${p.offerNo} M${k}`, lang: L, date: today(), client: p.client, address: p.geo?.label || p.address, lines: [{ label: dr.addDesc, price: amt }], exBy: { [dr.addVat || 21]: amt }, text: { intro: T.addIntro(p.client), closing: T.closing(state.settings.company.owner) } }));
    logTalk(p, 'system', `${docName(p.docs.at(-1))} added: ${dr.addDesc}, ${eur(amt, 2)} excl. VAT.`);
    Object.assign(dr, { addDesc: '', addAmt: '' });
  },
  addinvoice() {
    const p = P(), dr = (state.draft ??= {}), S = projectSum(p), co = state.settings.company;
    const L = S.cur?.lang || p.offer.lang, T = TXT[L];
    const rest = !n(dr.invAmt) && !n(dr.invPct);
    const ex = n(dr.invAmt) ? r2(n(dr.invAmt)) : rest ? r2(S.agreedEx - S.invEx) : r2((S.agreedEx * n(dr.invPct)) / 100);
    if (!(ex > 0)) { ui.status = 'Nothing left to invoice.'; return; }
    const label = dr.invDesc || `${T.term} ${docsOf(p, 'invoice').length + 1}${n(dr.invPct) && !n(dr.invAmt) ? `, ${num(dr.invPct)}%` : ''}`;
    const rates = Object.keys(S.exBy).filter((r) => (rest ? r2(S.exBy[r] - (S.invBy[r] || 0)) : S.exBy[r]) > 0), exBy = {}, lines = [];
    let used = 0;
    (rates.length ? rates : ['21']).forEach((r, i, all) => {
      const part = rest && S.exBy[r] !== undefined ? r2(S.exBy[r] - (S.invBy[r] || 0)) : i === all.length - 1 ? r2(ex - used) : r2((ex * S.exBy[r]) / S.agreedEx);
      used += part; exBy[r] = part;
      lines.push({ label: all.length > 1 ? `${label} (${L === 'nl' ? 'btw' : 'VAT'} ${r}%)` : label, price: part });
    });
    const due = new Date(Date.now() + n(state.settings.payDays || 14) * 864e5).toISOString().slice(0, 10);
    const d = finish({ id: uid(), type: 'invoice', no: `${new Date().getFullYear()}-${String(state.seq.invoice++).padStart(3, '0')}`, lang: L, date: today(), due, label, client: p.client, address: p.geo?.label || p.address, lines, exBy, paidOn: '' });
    d.text = { intro: T.invIntro(p.client, d.address), closing: T.invClosing(d, co) };
    p.docs.push(d);
    logTalk(p, 'system', `${docName(d)} made: ${label}, ${eur(d.incVat, 2)}.`);
    Object.assign(dr, { invDesc: '', invPct: '', invAmt: '' });
  },
  paid(d) {
    const p = P(), doc = p.docs.find((x) => x.id === d.id);
    doc.paidOn = doc.paidOn ? '' : today();
    if (doc.paidOn) logTalk(p, 'system', `${docName(doc)} paid, ${eur(doc.incVat, 2)}.`);
  },
  csv() {
    const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`, m = (x) => n(x).toFixed(2).replace('.', ',');
    const rows = [['Invoice', 'Date', 'Due', 'Client', 'Project', 'Description', 'VAT rate', 'Excl. VAT', 'VAT', 'Incl. VAT', 'Paid on']];
    for (const p of state.projects) for (const d of docsOf(p, 'invoice')) for (const r of Object.keys(d.exBy)) rows.push([d.no, d.date, d.due, d.client, d.address, d.label, r + '%', m(d.exBy[r]), m(d.vatBy?.[r] ?? (d.exBy[r] * r) / 100), m(d.exBy[r] + n(d.vatBy?.[r] ?? (d.exBy[r] * r) / 100)), d.paidOn]);
    if (rows.length === 1) { ui.status = 'No invoices yet.'; return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + rows.map((r) => r.map(q).join(';')).join('\r\n')], { type: 'text/csv' }));
    a.download = `bizbaan-invoices-${today()}.csv`;
    a.click();
    ui.status = `${rows.length - 1} lines saved.`;
  },
  resettext() { P().offer.text[P().offer.lang] = {}; },
  print() { window.print(); return false; },
});
