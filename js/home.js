/* Home: what needs doing now, every project by stage, and a calendar of all projects and the crew. */
'use strict';

/** The one thing to do next on a project, as a sentence and a button. */
function nextStep(p) {
  const st = stage(p), S = projectSum(p), first = openTasks(p)[0];
  const go = (tab, text) => `<button data-act="view" data-v="${tab}">${text}</button>`;
  if (st === 'request') {
    if (!p.phone) return { text: 'Get a phone number. The website form only gives an email.', btn: go('talk', 'Write to them') };
    const left = CALL_CHECKS.filter(([k]) => !p.call[k]).length;
    return left ? { text: `Call ${p.client || 'them'} and fill the gaps: ${left} things still unknown.`, btn: callLink(p) } : { text: 'Everything is known. Make the calculation.', btn: go('calc', 'Calculate') };
  }
  if (st === 'quote') {
    if (!S.cur) return { text: 'Finish the calculation and save the offer.', btn: go('calc', 'Calculation') };
    return { text: `Offer ${S.cur.no} is out. Mark it accepted when they say yes.`, btn: '<button data-act="accept">Accepted</button>' };
  }
  if (st === 'done') return S.open > 0 ? { text: `${eur(S.open, 2)} still unpaid.`, btn: go('docs', 'Invoices') } : null;
  if (first) return { text: `${first.date ? dm(first.date) + ': ' : ''}${first.title}`, btn: first.kind === 'invoice' ? `<button data-act="invtask" data-pct="${first.pct ?? ''}" data-title="${esc(first.title)}">Make this invoice</button>` : go('plan', 'Planning') };
  if (!Calc.schedule(p).start) return { text: 'Give it a start date.', btn: go('plan', 'Planning') };
  return null;
}

const stat = (label, fig, clause) => `<div class="stat"><b>${fig}</b><small>${label}</small><span>${clause}</span></div>`;

function calendar(projects) {
  const monday = (t) => { const d = new Date(t).getUTCDay(); return t - ((d + 6) % 7) * DAYMS; };
  const from = monday(todayT()) + ui.cal * 7 * DAYMS, days = Calc.workdaysBetween(from, from + 41 * DAYMS);
  const live = projects.map((p) => ({ p, s: Calc.schedule(p), tl: Calc.timeline(p) })).filter(({ s }) => s.start && s.end >= days[0] && s.start <= days.at(-1));
  const phaseOn = ({ s, tl }, t) => { const i = s.wd.indexOf(t); return i < 0 ? -1 : tl.findIndex((x) => i >= Math.floor(x.from) && i < Math.ceil(x.from + x.days)); };
  const rows = live.map((x, k) => {
    const marks = new Map(openTasks(x.p).filter((t) => t.date).map((t) => [t.date, t]));
    return {
      label: `<button class="linkish" data-act="openp" data-id="${x.p.id}">${esc(label(x.p))}</button>`, sub: STAGE[stage(x.p)],
      cell: (t) => { const ph = phaseOn(x, t); if (ph >= 0) return { cls: 'bar p' + (k % 4), title: `${label(x.p)}: ${SVC[x.tl[ph].id].en}` }; const m = marks.get(t); return m ? { cls: 'mark k-' + m.kind, title: m.title } : null; },
    };
  });
  const crew = state.settings.crew.map((m) => ({
    label: esc(m.name), sub: 'crew',
    cell: (t) => {
      const on = live.filter((x) => { const ph = phaseOn(x, t); return ph >= 0 && phaseCrew(x.p, x.tl[ph].id).includes(m.id); });
      return on.length ? { cls: on.length > 1 ? 'bar clash' : 'bar crew', title: on.map((x) => label(x.p)).join(' and ') + (on.length > 1 ? ': double booked' : ''), text: on.length > 1 ? '!' : '' } : null;
    },
  }));
  const nav = `<span class="acts tight"><button data-act="cal" data-d="-1" aria-label="Earlier">‹</button><button data-act="cal" data-d="0">Today</button><button data-act="cal" data-d="1" aria-label="Later">›</button></span>`;
  return `<h2>Calendar ${nav}</h2>${live.length || crew.length ? board(days, [...rows, ...crew]) : ''}
    ${live.length ? '' : '<p class="empty">No planned work in these six weeks. A project shows here once it has a start date.</p>'}`;
}

function homeView() {
  const all = state.projects.map(fix), by = (st) => all.filter((p) => stage(p) === st);
  const sums = all.map((p) => ({ p, S: projectSum(p) }));
  const quotes = sums.filter(({ p, S }) => stage(p) === 'quote' && S.cur);
  const unpaid = sums.reduce((t, x) => t + x.S.open, 0), unpaidN = all.reduce((t, p) => t + docsOf(p, 'invoice').filter((d) => !d.paidOn).length, 0);
  const reqs = by('request'), oldest = reqs.reduce((m, p) => Math.min(m, Date.parse(p.request.received || p.created)), Infinity);
  const soon = todayT() + 14 * DAYMS;
  const due = all.filter((p) => !['done', 'request'].includes(stage(p)))
    .flatMap((p) => openTasks(p).filter((t) => t.date && t.date <= soon).map((t) => ({ p, t }))).sort((a, b) => a.t.date - b.t.date);
  const go = (p) => `<button class="linkish" data-act="openp" data-id="${p.id}">${esc(label(p))}</button>`;
  const todo = [
    ...reqs.map((p) => `<div class="task"><span></span><span class="tdate">${dm(Date.parse(p.request.received || p.created))}</span><span class="tag k-request">Request</span><span class="ttl">${go(p)} <small>${esc(nextStep(p)?.text || '')}</small></span>${callLink(p)}</div>`),
    ...due.map(({ p, t }) => `<div class="task ${t.date < todayT() ? 'late' : ''}"><label class="tick"><input type="checkbox" data-act="taskdone" data-pid="${p.id}" data-key="${t.key}" aria-label="Done"></label><span class="tdate">${dm(t.date)}</span><span class="tag k-${t.kind}">${TASK_KINDS[t.kind]}</span>
      <span class="ttl">${esc(t.title)} <small>${go(p)}</small></span></div>`),
  ].join('');
  const row = (p) => { const S = projectSum(p), s = Calc.schedule(p); return `<button class="prow" data-act="openp" data-id="${p.id}"><b>${esc(label(p))}</b><span class="mute">${esc(p.address && p.client ? p.client : '')}${s.start ? ` · ${dm(s.start)} to ${dm(s.end)}` : ''}</span><span class="amt">${S.agreed ? eur(S.agreed) : ''}</span></button>`; };
  const groups = STAGES.map(([k, name]) => [k, name, by(k)]).filter(([, , ps]) => ps.length);
  const need = state.settings.profit === '' && !state.materials.length;
  const hour = new Date().getHours(), owner = state.settings.company.owner;
  const hello = `${hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'}${owner ? ', ' + esc(owner) : ''}`;
  return `${need ? `<div class="banner"><span>No prices on this device yet. Load your file, or type your own values in settings.</span><button data-act="import">Load file</button></div>` : ''}
    <div class="pagehead"><div><h1>${hello}</h1><span class="mute">${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span></div><button class="primary" data-act="newp">New project</button></div>
    <div class="stats">${stat('To call', reqs.length, reqs.length ? `oldest ${Math.round((todayT() - oldest) / DAYMS)} days ago` : 'no new requests')}${stat('Quotes out', eur(quotes.reduce((t, x) => t + x.S.cur.incVat, 0)), `${quotes.length} waiting for a yes`)}${stat('Running', by('running').length, `${by('planned').length} more planned`)}${stat('Unpaid', eur(unpaid), `${unpaidN} invoice${unpaidN === 1 ? '' : 's'} open`)}</div>
    <div class="cols even"><section class="card now-card"><h2>Now ${O('ntodo', due.length + reqs.length ? `${due.length + reqs.length}` : '', 'amt small')}</h2>${todo || '<p class="empty">Nothing due in the next two weeks.</p>'}</section>
      <section class="card list-card"><h2>Projects ${O('pcount', `${all.length}`, 'amt small')}</h2>
        ${groups.map(([k, name, ps]) => (k === 'done' ? DET('done', `Done · ${ps.length}`, ps.map(row).join('')) : `<h3 class="fold">${name} <small>${ps.length}</small></h3>${ps.map(row).join('')}`)).join('') || '<p class="empty">No projects yet. Tap New project to start one.</p>'}</section></div>
    <section class="card cal-card">${calendar(all.filter((p) => stage(p) !== 'done'))}</section>`;
}

Object.assign(A, {
  openp(d) {
    state.current = d.id;
    const st = stage(fix(byId(d.id)));
    ui.view = 'project'; ui.tab = { request: 'info', quote: 'calc', planned: 'plan', running: 'plan', done: 'docs' }[st] || 'info';
    ui.status = ''; ui.change = null; ui.modal = null; scrollTo(0, 0);
  },
  cal(d) { ui.cal = +d.d ? ui.cal + +d.d : 0; },
  accept() {
    const p = P();
    p.status = 'planned'; p.acceptedOn = today();
    logTalk(p, 'system', 'Offer accepted.');
    ui.view = 'project'; ui.tab = 'plan';
  },
});
