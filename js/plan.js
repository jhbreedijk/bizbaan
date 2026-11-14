/* Planning: the timeline, who works when, what to buy and book, and what happens when the plan changes.
   Tasks that follow from the calculation are derived, so they move by themselves when the planning moves. */
'use strict';

const TASK_KINDS = { task: 'Task', buy: 'Buy', book: 'Book', call: 'Client', invoice: 'Invoice' };
const DAYMS = Calc.DAY;

/** Who works on a phase: its own pick, or the project crew. */
const phaseCrew = (p, sid) => p.plan.crew[sid] ?? p.crew;
const crewName = (id) => state.settings.crew.find((m) => m.id === id)?.name || '';
const partnerOf = (id) => state.settings.partners.find((x) => x.id === id);

/** Tasks that follow from the calculation and from the payment plan on bizbaan.nl. */
function autoTasks(p) {
  const s = Calc.schedule(p), tl = Calc.timeline(p), out = [];
  if (!s.start) return out;
  const back = (t, k) => Calc.shiftWorkdays(t, -k);
  const at = (i) => s.wd[Math.min(s.wd.length - 1, Math.max(0, Math.floor(i)))];
  const add = (key, date, kind, title, extra = {}) => out.push({ key, date, kind, title, auto: true, ...extra });
  const c = p.costs, mun = p.geo?.municipality;

  add('confirm', back(s.start, 10), 'call', 'Confirm the start date, keys and access with the client');
  if (c.containerOn) add('container', back(s.start, 5), 'book', `Order the waste container and the permit${mun ? ' in ' + mun : ''}`);
  if (!p.elevator && n(p.floor) > 0 && c.craneOn) add('crane', back(s.start, 5), 'book', `Book the crane for ${num(c.craneDays) || 1} day(s)`);
  if (c.toiletOn) add('toilet', back(s.start, 3), 'book', 'Order the rental toilet');
  for (const ph of tl) {
    const sv = p.services[ph.id], def = SVC[ph.id], start = at(ph.from), name = def.en.toLowerCase();
    const mats = state.materials.filter((m) => (m.services || []).includes(ph.id) && !p.matOff.includes(m.id)).map((m) => m.name);
    if (ph.id === 'tiling') mats.unshift('tiles, glue and primer');
    if (def.matM2 && n(sv.matM2)) mats.unshift(name + ' materials');
    if (mats.length && (n(sv.m2) || sv.mode === 'hour')) add('buy:' + ph.id, back(start, 1), 'buy', `Buy for ${name}: ${mats.join(', ')}`);
    if (def.kind === 'sub') add('sub:' + ph.id, back(start, 10), 'book', `Book the ${name} subcontractor for ${day(start)}`, { who: p.plan.partner[ph.id] });
    if (def.kind === 'pieces') add('furniture', back(start, 20), 'book', 'Order the custom furniture', { who: p.plan.partner[ph.id] });
  }
  const byHand = p.matManual.map((x) => state.materials.find((m) => m.id === x.matId)?.name).filter(Boolean);
  if (byHand.length) add('buy:manual', back(s.start, 1), 'buy', 'Buy: ' + byHand.join(', '));
  if (p.acceptedOn) {
    add('inv1', Date.parse(p.acceptedOn), 'invoice', 'Invoice the 1% deposit', { pct: 1 });
    add('inv5', Date.parse(p.acceptedOn), 'invoice', 'Invoice 5% when the agreement is signed', { pct: 5 });
  }
  add('inv45', s.start - 14 * DAYMS, 'invoice', 'Invoice 45%, due 14 days before the start', { pct: 45 });
  if (s.wd.length > 4) add('inv40', at(s.wd.length / 2), 'invoice', 'Invoice 40% at the halfway point', { pct: 40 });
  add('walk', s.end, 'call', 'Walk through the finished work with the client');
  add('invEnd', s.end, 'invoice', 'Final invoice for the rest', { pct: 0 });
  add('review', Calc.shiftWorkdays(s.end, 3), 'call', 'Ask for a Google review');
  return out;
}

/** All tasks of a project, derived and typed, with his own dates and ticks applied, in date order. */
function tasks(p) {
  const pl = p.plan;
  const own = pl.tasks.map((t) => ({ ...t, key: 'm:' + t.id, date: t.date ? Date.parse(t.date) : null }));
  return [...autoTasks(p).filter((t) => !pl.hidden.includes(t.key)), ...own]
    .map((t) => ({ ...t, date: pl.dates[t.key] ? Date.parse(pl.dates[t.key]) : t.date, done: pl.done[t.key] || '', moved: !!pl.dates[t.key] }))
    .sort((a, b) => (a.date ?? Infinity) - (b.date ?? Infinity));
}
const openTasks = (p) => tasks(p).filter((t) => !t.done);

/* ---------- the day grid, shared with the calendar on the home screen ---------- */
/** One column per working day. Each row says per day what to show: { cls, title, text } or nothing. */
function board(days, rows, anchor = todayT()) {
  const t0 = todayT();
  const col = (t, c = {}) => `<i class="${c.cls || ''}${t === anchor ? ' anchor' : ''}${t === t0 ? ' now' : ''}${new Date(t).getUTCDay() === 1 ? ' mon' : ''}"${c.title ? ` title="${esc(c.title)}"` : ''}>${c.text || ''}</i>`;
  const head = days.map((t, i) => col(t, { text: new Date(t).getUTCDay() === 1 || i === 0 ? `<b>${dm(t)}</b>` : '' })).join('');
  const body = rows.map((r) => `<div class="brow"><div class="blab">${r.label}${r.sub ? `<small>${r.sub}</small>` : ''}</div>${days.map((t) => col(t, r.cell(t) || {})).join('')}</div>`).join('');
  return `<div class="board"><div class="bgrid" style="--cols:${days.length}"><div class="brow bhead"><div class="blab"></div>${head}</div>${body}</div></div>`;
}

/* ---------- the Planning tab ---------- */
const planLayout = () => `<div data-sec="banner"></div><section class="card" data-sec="timeline"></section>
  <div class="cols"><section class="card" data-sec="phases"></section><section class="card" data-sec="change"></section></div>
  <section class="card" data-sec="tasks"></section>`;

const PLAN = {
  banner() {
    const c = ui.change;
    if (!c || c.pid !== P().id) return '';
    const diff = c.after - c.before;
    return `<div class="banner"><span>Planning changed. ${diff ? `The calculation went from ${eur(c.before)} to ${eur(c.after)}. ` : ''}Does the price change for the client?</span>
      <span class="acts"><button data-act="chgextra">${diff < 0 ? 'Add as less work' : 'Add as additional work'}</button><button data-act="view" data-v="offer">New offer version</button><button data-act="chgmail">Tell the client</button><button class="x" data-act="chgclose" aria-label="Close">×</button></span></div>`;
  },
  timeline() {
    const p = P(), s = Calc.schedule(p);
    if (!s.start) return `<h2>Timeline</h2><p class="empty">Type a start date and the working days, and the plan lays itself out.</p><div class="grid">${F('Start date', 'p.start', { type: 'date' })}${F('Working days', 'p.days')}</div>`;
    const tl = Calc.timeline(p), ts = tasks(p), first = Math.min(s.start, ...ts.filter((t) => t.date).map((t) => t.date));
    const days = Calc.workdaysBetween(Math.max(first, Calc.shiftWorkdays(s.start, -25)), Calc.shiftWorkdays(s.end, 3));
    const idx = new Map(s.wd.map((t, i) => [t, i]));
    const phaseOn = (t) => { const i = idx.get(t); return i === undefined ? null : tl.findIndex((x) => i >= Math.floor(x.from) && i < Math.ceil(x.from + x.days)); };
    const onDay = (t) => ts.filter((x) => x.date === t);
    const crew = [...new Set(tl.flatMap((x) => phaseCrew(p, x.id)))];
    const rows = [
      { label: 'To do', cell: (t) => { const d = onDay(t); return d.length ? { cls: 'mark k-' + d[0].kind + (d.every((x) => x.done) ? ' done' : ''), title: d.map((x) => x.title).join('\n'), text: d.length > 1 ? d.length : '' } : null; } },
      ...tl.map((x, k) => ({ label: SVC[x.id].en, sub: `${num(x.days)} d`, cell: (t) => (phaseOn(t) === k ? { cls: 'bar p' + (k % 4), title: SVC[x.id].en } : null) })),
      ...crew.map((id) => ({ label: esc(crewName(id) || 'Crew'), sub: 'crew', cell: (t) => { const k = phaseOn(t); return k >= 0 && k !== null && phaseCrew(p, tl[k].id).includes(id) ? { cls: 'bar crew', title: SVC[tl[k].id].en } : null; } })),
    ];
    const anchor = days.find((t) => t >= Math.min(Math.max(todayT(), Calc.shiftWorkdays(s.start, -5)), s.end)) ?? days[0];
    return `<h2>Timeline ${O('tlspan', `${day(s.start)} to ${day(s.end)} · ${s.weeks} weeks`, 'amt small')}</h2>${board(days, rows, anchor)}
      <p class="hint">Dots are tasks: buying, booking, the client and invoices. Hover a dot to see them.</p>`;
  },
  phases() {
    const p = P(), tl = Calc.timeline(p), crew = state.settings.crew, partners = state.settings.partners;
    const rows = tl.map((x) => {
      const def = SVC[x.id], mine = phaseCrew(p, x.id);
      const who = def.kind === 'sub' || def.kind === 'pieces'
        ? `<label class="f"><span>Partner</span><select data-bind="p.plan.partner.${x.id}"><option value="">Not chosen</option>${partners.map((m) => `<option value="${m.id}" ${p.plan.partner[x.id] === m.id ? 'selected' : ''}>${esc(m.name)}${m.trade ? ' · ' + esc(m.trade) : ''}</option>`).join('')}</select></label>`
        : `<div class="chips">${crew.map((m) => `<button type="button" class="chip sm ${mine.includes(m.id) ? 'on' : ''}" data-act="phasecrew" data-sid="${x.id}" data-id="${m.id}">${esc(m.name)}</button>`).join('') || '<span class="hint">Add your crew in settings.</span>'}</div>`;
      return `<div class="phase"><b>${def.en}</b><label class="in qty"><input type="text" inputmode="decimal" data-bind="p.services.${x.id}.planDays" value="${esc(p.services[x.id].planDays ?? '')}" placeholder="${num(x.days)}" aria-label="Working days for ${def.en}"><i>days</i></label>${who}</div>`;
    }).join('');
    return `<h2>Phases and people</h2><div class="grid">${F('Start date', 'p.start', { type: 'date' })}${F('Working days', 'p.days')}</div>
      ${rows || '<p class="empty">Pick services in the calculation and they line up here in building order.</p>'}
      <p class="hint">Days left empty share what is left of the working days.</p>`;
  },
  change() {
    const p = P(), dr = state.draft || {}, kind = dr.chgKind || 'start', tl = Calc.timeline(p);
    const what = kind === 'start' ? F('New start date', 'st.draft.chgStart', { type: 'date' })
      : `<label class="f"><span>Which part</span><select data-bind="st.draft.chgPhase">${tl.map((x) => `<option value="${x.id}" ${dr.chgPhase === x.id ? 'selected' : ''}>${SVC[x.id].en}</option>`).join('')}</select></label>${F('Working days', 'st.draft.chgDays', { ph: '2' })}`;
    return `<h2>Something changed</h2>
      <div class="f"><span>What</span>${SEG('st.draft.chgKind', [['start', 'Start moves'], ['longer', 'Takes longer'], ['shorter', 'Goes faster']])}</div>
      <div class="grid">${what}${F('Why', 'st.draft.chgWhy', { type: 'text', cls: 'wide', ph: 'Tiles not in stock until Thursday' })}</div>
      <div class="acts"><button data-act="replan">Change the planning</button></div>
      <p class="hint">Everything after it moves along, the change goes into the history, and you get asked whether the price changes.</p>`;
  },
  tasks() {
    const p = P(), ts = tasks(p), dr = state.draft || {};
    const people = [...state.settings.crew.map((m) => [m.id, m.name]), ...state.settings.partners.map((m) => [m.id, m.name + (m.trade ? ' · ' + m.trade : '')])];
    const rows = ts.map((t) => {
      const who = t.who && (crewName(t.who) || partnerOf(t.who)?.name);
      const pt = partnerOf(t.who);
      const menu = [
        t.kind === 'invoice' && `<button data-act="invtask" data-pct="${t.pct ?? ''}" data-title="${esc(t.title)}">Make this invoice</button>`,
        pt?.phone && `<a href="tel:${esc(pt.phone)}">Call ${esc(pt.name)}</a>`,
        t.moved && `<button data-act="taskreset" data-key="${t.key}">Back to the planned date</button>`,
        t.auto ? `<button data-act="taskhide" data-key="${t.key}">Not needed here</button>` : `<button data-act="taskdel" data-key="${t.key}">Delete</button>`,
      ].filter(Boolean).join('');
      const over = !t.done && t.date && t.date < todayT();
      return `<div class="task ${t.done ? 'done' : ''} ${over ? 'late' : ''}"><label class="tick"><input type="checkbox" data-act="taskdone" data-key="${t.key}" ${t.done ? 'checked' : ''} aria-label="Done"></label>
        <input type="date" class="tdate" data-bind="p.plan.dates.${t.key}" value="${t.date ? iso(t.date) : ''}" aria-label="Date">
        <span class="tag k-${t.kind}">${TASK_KINDS[t.kind]}</span><span class="ttl">${esc(t.title)}${who ? ` <small>${esc(who)}</small>` : ''}</span>
        ${DET('t:' + t.key, '⋯', `<div class="menu">${menu}</div>`, 'pop')}</div>`;
    }).join('');
    return `<h2>Tasks ${O('topen', `${ts.filter((t) => !t.done).length} open`, 'amt small')}</h2>${rows || '<p class="empty">No tasks yet. They appear once there is a start date.</p>'}
      <div class="row3 add4">${F('New task', 'st.draft.taskTitle', { type: 'text', ph: 'Measure the hallway again' })}${F('Date', 'st.draft.taskDate', { type: 'date' })}
        <label class="f"><span>Who</span><select data-bind="st.draft.taskWho"><option value="">Me</option>${people.map(([id, nm]) => `<option value="${id}" ${dr.taskWho === id ? 'selected' : ''}>${esc(nm)}</option>`).join('')}</select></label><button data-act="addtask">Add</button></div>`;
  },
};

Object.assign(A, {
  phasecrew(d) {
    const p = P(), list = [...phaseCrew(p, d.sid)], i = list.indexOf(d.id);
    if (i < 0) list.push(d.id); else list.splice(i, 1);
    p.plan.crew[d.sid] = list;
  },
  taskdone(d) {
    const p = d.pid ? fix(byId(d.pid)) : P(), t = tasks(p).find((x) => x.key === d.key);
    if (p.plan.done[d.key]) delete p.plan.done[d.key];
    else { p.plan.done[d.key] = today(); logTalk(p, 'system', 'Done: ' + (t?.title || 'a task')); }
  },
  taskhide(d) { P().plan.hidden.push(d.key); },
  taskreset(d) { delete P().plan.dates[d.key]; },
  taskdel(d) { const p = P(); p.plan.tasks = p.plan.tasks.filter((t) => 'm:' + t.id !== d.key); },
  addtask() {
    const dr = (state.draft ??= {});
    if (!dr.taskTitle) { ui.status = 'Type what needs doing.'; return; }
    P().plan.tasks.push({ id: uid(), title: dr.taskTitle, date: dr.taskDate || '', kind: 'task', who: dr.taskWho || '' });
    Object.assign(dr, { taskTitle: '', taskDate: '' });
  },
  invtask(d) { Object.assign((state.draft ??= {}), { invPct: d.pct || '', invDesc: d.title.replace(/^Invoice /, '').replace(/^the /, '') }); ui.tab = 'docs'; },
  replan() {
    const p = P(), dr = (state.draft ??= {}), kind = dr.chgKind || 'start', s0 = Calc.schedule(p), before = compute(p, state.materials).exVat;
    let what;
    if (kind === 'start') {
      if (!dr.chgStart) { ui.status = 'Pick the new start date.'; return; }
      what = `start moves from ${p.start ? day(Date.parse(p.start)) : 'no date'} to ${day(Date.parse(dr.chgStart))}`;
      p.start = dr.chgStart;
    } else {
      const tl = Calc.timeline(p), ph = tl.find((x) => x.id === dr.chgPhase) || tl[0], k = Math.abs(n(dr.chgDays)) * (kind === 'longer' ? 1 : -1);
      if (!ph || !k) { ui.status = 'Pick the part and the number of days.'; return; }
      const now = Math.max(0.5, ph.days + k);
      p.services[ph.id].planDays = now;
      p.days = Math.max(1, n(p.days) + (now - ph.days));
      what = `${SVC[ph.id].en.toLowerCase()} ${k > 0 ? 'takes' : 'saves'} ${num(Math.abs(now - ph.days))} working days, now ${num(now)}`;
    }
    const s1 = Calc.schedule(p);
    if (s1.end && s0.end !== s1.end) what += `; the end moves from ${s0.end ? day(s0.end) : 'no date'} to ${day(s1.end)}`;
    const why = dr.chgWhy || '';
    logTalk(p, 'change', `Planning changed: ${what}${why ? '. Why: ' + why : ''}.`);
    ui.change = { pid: p.id, what, why, before, after: compute(p, state.materials).exVat };
    Object.assign(dr, { chgStart: '', chgDays: '', chgWhy: '' });
  },
  chgextra() {
    const c = ui.change, diff = c.after - c.before;
    Object.assign((state.draft ??= {}), { addDesc: c.why || c.what.replace(/^./, (x) => x.toUpperCase()), addAmt: diff ? diff : '' });
    ui.change = null; ui.tab = 'docs';
  },
  chgmail() {
    const c = ui.change, p = P();
    ui.change = null;
    A.mailtpl({ id: `change-${p.offer.lang}`, change: c.why || '' });
    ui.tab = 'talk';
  },
  chgclose() { ui.change = null; },
});
