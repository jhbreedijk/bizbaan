/* The calculation tab: the form, the live lookups and the price panel. */
'use strict';
/* ---------- calculate: sections ---------- */
const SECS = {
  project() {
    const p = P(), q = n(p.m2) * n(state.settings.quickPerM2);
    const geo = p.geo ? `${p.geo.label} · ${p.geo.municipality}` : p.address ? 'Pick the address from the list to get distance and parking.' : 'No address yet, so transport and parking are 0.';
    return `<h2>Project</h2><div class="grid">
      ${F('Address', 'p.address', { type: 'text', cls: 'wide', ph: 'Start typing, then pick the address' })}<div id="addr-sugg" class="sugg wide"></div>
      ${F('Client', 'p.client', { type: 'text', cls: 'wide', ph: 'Name, for the offer' })}
      ${F('Total', 'p.m2', { unit: 'm²' })}${F('Working days', 'p.days')}${F('Team', 'p.team', { unit: 'people' })}${F('Hours per day', 'p.hpd')}
      ${F('Start date', 'p.start', { type: 'date' })}${F('Floor', 'p.floor', { ph: '0' })}
      <div class="f">${SW('Elevator', 'p.elevator')}</div></div>
      <p class="hint">${O('geo', geo)}</p>
      <p class="quick">${O('quick', q ? `Quick number ${eur(q)}` : state.settings.quickPerM2 ? 'Type the total m² for a quick number.' : '')}</p>`;
  },
  services() {
    const p = P();
    const chips = SERVICES.map((s) => `<button type="button" class="chip ${p.services[s.id]?.on ? 'on' : ''}" data-act="svc" data-id="${s.id}">${s.en}</button>`).join('');
    const panels = SERVICES.filter((s) => p.services[s.id]?.on).map((s) => {
      const sv = p.services[s.id], b = `p.services.${s.id}.`, r = R.services.find((x) => x.id === s.id) || {};
      let body = '';
      if (s.kind === 'demo') body = F('Demolition days', b + 'days') + `<p class="hint wide">${O('h:' + s.id, `${num(r.hours)} hours at ${eur(p.rate)}`)}</p>`;
      else if (s.kind === 'sub') body = F("Subcontractor's total", b + 'total', { unit: '€' });
      else if (s.kind === 'pieces') body = `<div class="wide rows">${(sv.pieces || []).map((_, i) => `<div class="row3">${F('Piece', `${b}pieces.${i}.name`, { type: 'text', ph: 'Wardrobe' })}${F('Amount', `${b}pieces.${i}.qty`, { ph: '1' })}${F('Price each', `${b}pieces.${i}.price`, { unit: '€' })}<button class="x" data-act="delpiece" data-i="${i}" aria-label="Remove piece">×</button></div>`).join('')}<button data-act="addpiece">Add a piece</button></div>`;
      else {
        body = F('Amount', b + 'm2', { unit: 'm²' }) + `<div class="f"><span>Paid</span>${SEG(b + 'mode', [['m2', 'per m²'], ['hour', 'per hour']])}</div>`;
        body += sv.mode === 'hour'
          ? F('Workers', b + 'workers') + F('Days', b + 'days') + `<p class="hint wide">${O('h:' + s.id, `${num(r.hours)} hours at ${eur(p.rate)}`)}</p>`
          : F(s.id === 'extra' ? 'Price' : 'Labour', b + 'labour', { unit: '€/m²' });
        if (s.id === 'tiling' && !sv.inclMat) body += F('Tiles', b + 'tilePrice', { unit: '€/m²' }) + F('Tile waste', b + 'tileWaste', { unit: '%' }) + F('Glue and primer', b + 'gluePrice', { unit: '€/m²' });
        if (s.matM2) body += F('Materials', b + 'matM2', { unit: '€/m²' });
        if (s.vatChoice) body += `<div class="f"><span>VAT</span>${SEG(b + 'vat', [[21, '21%'], [9, '9%']])}</div>`;
        if (s.incl) body += `<div class="f wide">${SW('Price includes materials', b + 'inclMat')}</div>`;
      }
      return `<div class="panel"><div class="ph"><b>${s.en}</b>${O('svc:' + s.id, eur(r.base), 'amt')}<button class="x" data-act="svc" data-id="${s.id}" aria-label="Remove ${s.en}">×</button></div><div class="grid">${body}</div>${r.note ? `<p class="hint">${esc(r.note)}</p>` : ''}</div>`;
    }).join('');
    return `<h2>Services</h2><div class="chips">${chips}</div>${panels || '<p class="empty">Pick what the job needs. Each card opens its own fields.</p>'}`;
  },
  materials() {
    const p = P(), shops = state.settings.shops || [];
    const find = (m) => `${m.url ? `<a href="${esc(m.url)}" target="_blank" rel="noopener">Open product</a>` : ''}${shops.filter((s) => s.search).map((s) => `<a href="${esc(s.search.replace('{q}', encodeURIComponent(m.name)))}" target="_blank" rel="noopener">Search ${esc(s.name)}</a>`).join('')}`;
    const info = (m) => [`${eur(m.price, 2)} per ${num(m.pack) || 1} ${esc(m.unit || 'pc')}`, m.priceDate ? (m.priceFail ? 'last price, ' : 'price of ') + day(Date.parse(m.priceDate)) : '', m.url && m.available === false ? '<em class="warn">out of stock online</em>' : m.url && m.available ? 'in stock online' : ''].filter(Boolean).join(' · ');
    const rows = R.materials.map(({ m, need, auto, cost }) => `<div class="mrow"><div class="mname"><b>${esc(m.name)}</b><small>${num(need)} ${esc(m.unit || '')} needed · ${info(m)}</small></div>
      <label class="in qty"><input type="text" inputmode="decimal" data-bind="p.matQty.${m.id}" value="${esc(p.matQty[m.id] ?? '')}" placeholder="${auto}" aria-label="Packages of ${esc(m.name)}"><i>packs</i></label>${O('mat:' + m.id, eur(cost), 'amt')}
      ${DET('m:' + m.id, '⋯', `<div class="menu">${find(m)}<button data-act="matoff" data-id="${m.id}">Remove from this project</button></div>`, 'pop')}</div>`).join('');
    const manual = R.manual.map(({ i, m, cost }) => `<div class="mrow"><div class="mname"><b>${esc(m.name)}</b><small>added by hand · ${info(m)}</small></div>
      <label class="in qty"><input type="text" inputmode="decimal" data-bind="p.matManual.${i}.qty" value="${esc(p.matManual[i].qty ?? '')}" aria-label="Packages of ${esc(m.name)}"><i>packs</i></label>${O('man:' + i, eur(cost), 'amt')}
      ${DET('mm:' + i, '⋯', `<div class="menu">${find(m)}<button data-act="delmanual" data-i="${i}">Remove</button></div>`, 'pop')}</div>`).join('');
    const stops = shops.map((s) => s.address).filter(Boolean);
    const home = state.settings.startAddress;
    const route = stops.length ? `https://www.google.com/maps/dir/?api=1&travelmode=driving${home ? '&origin=' + encodeURIComponent(home) : ''}&waypoints=${encodeURIComponent(stops.join('|'))}&destination=${encodeURIComponent(p.address || home || stops[0])}` : '';
    const any = rows || manual;
    return `<h2>Materials ${O('matTotal', any ? eur(R.materials.reduce((t, x) => t + x.cost, 0) + R.manual.reduce((t, x) => t + x.cost, 0)) : '', 'amt')}</h2>
      ${any ? rows + manual : `<p class="empty">${state.materials.length ? 'Nothing needed yet. Type the m² of a service and its materials appear here.' : 'No saved materials yet. Add the ones you use often once, in settings.'}</p>`}
      <div class="acts">${state.materials.length ? `<select data-change="addmat" aria-label="Add a saved material"><option value="">Add a saved material</option>${state.materials.map((m) => `<option value="${m.id}">${esc(m.name)}</option>`).join('')}</select>` : '<button data-act="view" data-v="settings">Add materials in settings</button>'}
      ${route && any ? `<a class="btn" href="${esc(route)}" target="_blank" rel="noopener">Pick-up route</a>` : ''}
      ${p.matOff.length ? `<button data-act="matrestore">Put back ${p.matOff.length} removed</button>` : ''}</div>`;
  },
  costs() {
    const p = P(), c = R.cost, k = p.costs, mun = p.geo?.municipality;
    const row = (fields, key, val) => `<div class="crow"><div class="grid">${fields}</div>${O('c:' + key, eur(val), 'amt')}</div>`;
    let h = `<h2>On site</h2>`;
    h += row(F('There and back', 'p.costs.km', { unit: 'km' }) + F('Diesel', 'p.costs.diesel', { unit: '€/l' }) + `<p class="hint wide">${O('distnote', p.distNote || '')}</p><p class="hint wide">${O('dieselnote', state.settings.dieselDate && n(k.diesel) === n(state.settings.dieselPrice) ? `Dutch average of ${day(Date.parse(state.settings.dieselDate))}, from CBS` : '')}</p>`, 'transport', c.transport);
    const opts = p.parkOptions || [];
    h += row(F('Parking per day', 'p.costs.parkingDay', { unit: '€' }) + `<p class="hint">${O('parknote', p.parkNote || '')}</p>` +
      (opts.length > 1 ? `<div class="chips wide">${opts.map((o, i) => `<button type="button" class="chip sm ${n(k.parkingDay) === o.day ? 'on' : ''}" data-act="park" data-i="${i}">${eur(o.hourly, 2)}/h · ${esc(o.area)} · ${o.metres} m</button>`).join('')}</div>` : ''), 'parking', c.parking);
    h += row(F('Food per day', 'p.costs.food', { unit: '€' }) + '<p class="hint">At cost, added after the margins.</p>', 'food', c.food);
    if (R.up) {
      h += row(`<div class="f">${SW('Floor extra', 'p.costs.floorOn')}</div>` + (k.floorOn ? F('Per floor', 'p.costs.floorPct', { unit: '%' }) : ''), 'floorExtra', c.floorExtra);
      h += row(`<div class="f">${SW('Crane rental', 'p.costs.craneOn')}</div>` + (k.craneOn ? F('Crane days', 'p.costs.craneDays') + F('Per day', 'p.costs.cranePerDay', { unit: '€' }) : ''), 'crane', c.crane);
    }
    h += row(`<div class="f">${SW('Waste container', 'p.costs.containerOn')}</div>` + (k.containerOn ? F('Container', 'p.costs.containerBase', { unit: '€' }) + F(`Permit${mun ? ' ' + esc(mun) : ''}`, 'p.costs.permit', { unit: '€' }) : ''), 'container', c.container);
    h += row(`<div class="f">${SW('Rental toilet', 'p.costs.toiletOn')}</div>` + (k.toiletOn ? F('Per week', 'p.costs.toiletPerWeek', { unit: '€' }) + `<p class="hint">${O('tweeks', `${R.sched.weeks} weeks`)}</p>` : ''), 'toilet', c.toilet);
    h += row(F('Waste', 'p.costs.waste', { unit: '€' }), 'waste', c.waste);
    h += row(F('Additional costs', 'p.costs.additional', { unit: '€' }), 'additional', c.additional);
    return h;
  },
  crew() {
    const p = P();
    const crew = state.settings.crew.map((m) => `<button type="button" class="chip ${p.crew.includes(m.id) ? 'on' : ''}" data-act="crew" data-id="${m.id}">${esc(m.name)} <small>${eur(m.rate)}</small></button>`).join('');
    const hours = n(p.days) * n(p.hpd);
    const rows = state.settings.crew.filter((m) => p.crew.includes(m.id)).map((m) => `<div class="trow"><span>${esc(m.name)}</span><span class="mute">${num(hours)} h expected</span><span class="amt">${eur(hours * n(m.rate))}</span></div>`).join('');
    return `<h2>Crew ${O('len', n(p.days) ? `${R.sched.weeks} weeks${R.sched.end ? `, done ${day(R.sched.end)}` : ''}` : '', 'amt small')}</h2>
      <div class="chips">${crew}</div>${rows}
      <div class="row3 add">${F('Name', 'st.draft.name', { type: 'text', ph: 'New member' })}${F('Rate', 'st.draft.rate', { unit: '€/h' })}<button data-act="addcrew">Add</button></div>
      <div class="grid">${F('Hourly rate for this project', 'p.rate', { unit: '€/h', cls: 'wide' })}</div>
      <p class="hint">Pick people and the team size and hourly rate follow their average. Who works on which part is set in Planning.</p>`;
  },
  price() {
    const p = P();
    return `<h2>Price</h2><div class="crow"><div class="grid">${F('Profit', 'p.margins.profit', { unit: '%' })}</div>${O('m:profit', eur(R.profit), 'amt')}</div>
      <div class="crow"><div class="grid"><div class="f">${SW('Error margin', 'p.margins.errorOn')}</div>${p.margins.errorOn ? F('Error margin', 'p.margins.error', { unit: '%' }) : ''}</div>${O('m:error', eur(R.errorAmt), 'amt')}</div>
      <div class="crow"><div class="grid">${F('Discount margin', 'p.margins.discount', { unit: '%' })}</div>${O('m:disc', eur(R.discountAmt), 'amt')}</div>
      <p class="hint">The discount margin comes off the last invoice when the client pays within 24 hours. Food (${eur(R.food)}) goes on after the margins, at cost.</p>`;
  },
  sum() {
    const s = R.sched;
    return `<div class="fig"><small>Price excl. VAT</small>${O('final', eur(R.final), 'big')}</div>
      <dl><div><dt>Incl. VAT</dt><dd>${O('inc', eur(R.incVat))}</dd></div><div><dt>My costs</dt><dd>${O('total', eur(R.total))}</dd></div><div><dt>After profit</dt><dd>${O('afterProfit', eur(R.afterProfit))}</dd></div><div><dt>Profit</dt><dd>${O('profit', eur(R.profit))}</dd></div>
      <div><dt>Length</dt><dd>${O('len2', n(P().days) ? `${s.weeks} wk${s.end ? ' · ' + day(s.end) : ''}` : 'no days yet')}</dd></div></dl>
      <button class="primary" data-act="view" data-v="offer">Turn into offer</button>
      <div class="two"><button data-act="live">Update live prices</button><button data-act="view" data-v="private">Private sheet</button></div>
      <p class="status">${O('status', ui.status)}</p>`;
  },
};

function calcView() {
  return `    <div class="calc"><div class="form">${['project', 'services', 'materials', 'costs', 'crew', 'price'].map((k) => `<section class="card" data-sec="${k}"></section>`).join('')}</div>
    <aside class="sum" data-sec="sum"></aside></div>`;
}

/* ---------- live lookups ---------- */
async function locate(p) {
  const geo = await Lookups.geocode(p.address, p.addrId);
  p.geo = geo;
  if (p.addrId) p.address = geo.label;
  if (p.costs.permit === '' && state.permits[geo.municipality] !== undefined) p.costs.permit = state.permits[geo.municipality];
  else if (p.costs.permit !== '' && state.permits[geo.municipality] === undefined) state.permits[geo.municipality] = p.costs.permit;
  const start = state.settings.startAddress;
  if (!start) return 'Add your start address in settings to get the distance.';
  if (state.home?.address !== start) state.home = { address: start, ...(await Lookups.geocode(start)) };
  let km, how = 'by road (OSRM)';
  try { km = await Lookups.routeKm(state.home, geo); } catch { km = Lookups.straightKm(state.home, geo) * 1.3; how = 'straight line × 1.3, because routing was down'; }
  p.costs.km = Math.round(km * 2 * 10) / 10;
  p.distNote = `${num(p.costs.km)} km there and back, ${how}.`;
  return '';
}
const parkNote = (p, o, best) => `Estimate: ${eur(o.hourly, 2)} per hour × ${num(p.hpd)} h, zone ${o.area} at ${o.metres} m${best ? ', the highest rate within 400 m' : ''}.`;
async function parkingFor(p) {
  const list = await Lookups.parking(p.geo);
  p.parkOptions = list.map((x) => ({ ...x, day: r2(x.hourly * n(p.hpd)) }));
  p.costs.parkingDay = p.parkOptions[0].day;
  p.parkNote = parkNote(p, p.parkOptions[0], true);
}
let suggT, geoT;
async function suggest(q) {
  const box = $('#addr-sugg');
  if (!box) return;
  if (q.trim().length < 3) { box.innerHTML = ''; return; }
  try {
    // Rank by distance from the van's start address; central Amsterdam until that is known.
    const list = await Lookups.suggest(q, state.home || { lat: 52.37, lon: 4.9 });
    if ($('[data-bind="p.address"]')?.value !== q) return; // he kept typing
    box.innerHTML = list.map((x) => `<button type="button" data-act="pickaddr" data-id="${esc(x.id)}" data-label="${esc(x.label)}">${esc(x.label)}</button>`).join('');
  } catch { box.innerHTML = ''; }
}
async function prices(force) {
  const list = state.materials.filter((m) => m.url);
  if (!list.length || (!force && state.lastPrices === today())) return '';
  let ok = 0;
  await Promise.all(list.map(async (m) => {
    try {
      const r = await Lookups.bouwmaat(m.url);
      m.price = Math.round(r.price * 100) / 100;
      Object.assign(m, { priceDate: today(), available: r.available, priceFail: false });
      ok++;
    } catch { m.priceFail = true; }
  }));
  state.lastPrices = today();
  return `${ok} of ${list.length} Bouwmaat prices updated${ok < list.length ? ', the rest keep their last price' : ''}.`;
}
/** The national average pump price of the latest day CBS has published. Once a day by itself, or on demand. */
async function dieselToday(force) {
  const s = state.settings;
  if (!force && s.dieselChecked === today()) return null;
  const d = await Lookups.diesel(), before = s.dieselPrice;
  Object.assign(s, { dieselPrice: d.price, dieselDate: d.date, dieselChecked: today() });
  // Projects not yet done follow along, unless he typed his own price there. On demand, the open project always does.
  for (const p of state.projects) {
    if (p.status === 'done' || !p.costs) continue;
    if ((force && p.id === state.current) || p.costs.diesel === '' || n(p.costs.diesel) === n(before)) p.costs.diesel = d.price;
  }
  return d;
}
async function live() {
  const p = P(), notes = [];
  say('Looking up address, diesel, parking and prices.');
  const step = async (fn, fail) => { try { const m = await fn(); if (m) notes.push(m); } catch { notes.push(fail); } };
  if (p.address) await step(() => locate(p), 'Address lookup failed, type the distance yourself.');
  else notes.push('No address, so no distance or parking.');
  await step(async () => { const d = await dieselToday(true); return d ? `Diesel ${eur(d.price, 3)}, the Dutch average of ${day(Date.parse(d.date))}.` : ''; }, 'Diesel lookup failed, kept the last price.');
  if (p.geo) await step(() => parkingFor(p), 'No paid parking found within 400 m, type it yourself.');
  await step(() => prices(true), 'Bouwmaat lookup failed.');
  ui.status = notes.join(' ') || 'All numbers are fresh.';
  paint(true);
}

/* ---------- the joke: a two-second oompah, at most once every 7 days ---------- */
function oompah() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ac = new AC(), out = ac.createGain(), t0 = ac.currentTime + 0.05;
  out.gain.value = 0.14; out.connect(ac.destination);
  const note = (f, t, len, type = 'sawtooth', g = 1) => {
    for (const det of [-8, 8]) { // two reeds slightly apart: that is the accordion
      const o = ac.createOscillator(), e = ac.createGain();
      o.type = type; o.frequency.value = f; o.detune.value = det;
      e.gain.setValueAtTime(0, t0 + t); e.gain.linearRampToValueAtTime(g, t0 + t + 0.02); e.gain.setTargetAtTime(0, t0 + t + len, 0.04);
      o.connect(e).connect(out); o.start(t0 + t); o.stop(t0 + t + len + 0.3);
    }
  };
  [[392, 0], [523, 0.15], [659, 0.3], [784, 0.45], [659, 0.75], [784, 0.9], [1047, 1.05, 0.6]].forEach(([f, t, l = 0.11]) => note(f, t, l));
  [[131, 0], [196, 0.3], [131, 0.6], [196, 0.9], [131, 1.05]].forEach(([f, t]) => note(f, t, 0.1, 'square', 0.8));
  [0.15, 0.45, 0.75].forEach((t) => [330, 392, 523].forEach((f) => note(f, t, 0.06, 'square', 0.3)));
  setTimeout(() => ac.close(), 2600);
}
function joke() {
  try {
    if (Date.now() - (+localStorage.getItem('bizbaan.joke') || 0) < 7 * 864e5) return;
    localStorage.setItem('bizbaan.joke', Date.now());
    let fell = false;
    const fallback = () => { if (!fell) { fell = true; oompah(); } };
    const own = new Audio('assets/shout.mp3'); // his own clip, if he puts one there
    own.onerror = fallback;
    own.play().catch(fallback);
  } catch { /* a joke must never break the offer */ }
}

Object.assign(A, {
  svc(d) { const p = P(), sv = p.services[d.id]; if (sv) sv.on = !sv.on; else p.services[d.id] = newService(d.id); },
  addpiece() { const sv = P().services.furniture; (sv.pieces ??= []).push({ name: '', qty: '', price: '' }); },
  delpiece(d) { P().services.furniture.pieces.splice(+d.i, 1); },
  matoff(d) { P().matOff.push(d.id); delete P().matQty[d.id]; },
  matrestore() { P().matOff = []; },
  delmanual(d) { P().matManual.splice(+d.i, 1); },
  crew(d) {
    const p = P(), i = p.crew.indexOf(d.id);
    if (i < 0) p.crew.push(d.id); else p.crew.splice(i, 1);
    const mine = state.settings.crew.filter((m) => p.crew.includes(m.id));
    if (mine.length) { p.team = mine.length; p.rate = Math.round((mine.reduce((t, m) => t + n(m.rate), 0) / mine.length) * 100) / 100; }
  },
  addcrew() { const dr = state.draft || {}; if (!dr.name) return; const m = { id: uid(), name: dr.name, rate: dr.rate || state.settings.hourRate }; state.settings.crew.push(m); state.draft = {}; A.crew({ id: m.id }); },
  pickaddr(d) {
    clearTimeout(geoT);
    const p = P();
    Object.assign(p, { address: d.label, addrId: d.id, parkOptions: [], parkNote: '' });
    say('Finding distance and parking.');
    locate(p).then((m) => {
      ui.status = m; paint(false);
      return parkingFor(p).then(() => paint(false), () => { p.parkNote = 'No paid parking found within 400 m. Type a price if you need one.'; paint(false); });
    }, () => say('Address lookup failed. Type the distance yourself.'));
  },
  park(d) { const p = P(), o = p.parkOptions[+d.i]; p.costs.parkingDay = o.day; p.parkNote = parkNote(p, o, +d.i === 0); },
  live() { ui.open.pmenu = false; live(); return false; },
  prices() { say('Asking Bouwmaat.'); prices(true).then((m) => { ui.status = m || 'No material has a Bouwmaat link yet.'; paint(true); }); return false; },
});
