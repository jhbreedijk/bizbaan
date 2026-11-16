/* The walkthrough: thirteen steps through every function, with an example project to look at.
   On when the app first opens; switched off or started again under Help in settings, or with the ? on top. */
'use strict';

const TOUR = [
  { go: 'home', title: 'Welcome to your workstation', text: 'Every project in one place, from the first request to the last invoice. This takes two minutes. Stop any time; the question mark on top starts it again.' },
  { go: 'home', sel: '#nav .fn', title: 'The main functions, always on top', text: 'Home, and everything you do for a project: Projects, Calculation, Quotes, Planning, Email and Project folder. Tap one and pick the project.' },
  { go: 'home', sel: '.pagehead .primary', title: 'New project', text: 'Paste a request from the website or an email. Name, phone, address, services and sizes fill in by themselves. Leave it empty after a phone call.' },
  { go: 'home', sel: '.now-card', title: 'Now', text: 'Requests to call and everything due in the next two weeks, from all projects. Tick things off right here.' },
  { go: 'home', sel: '.cal-card', title: 'The calendar', text: 'Six weeks of every project and every person. Red means someone is booked twice.' },
  { go: 'info', sel: '.plist', title: 'Projects', text: 'All your projects on the left. Pick one and its details open on the right. This is an example project.' },
  { go: 'info', sel: '.phero', title: 'The project', text: 'Its stage, and Next: the one thing to do now. Below: the client, what they asked, and the checklist for the first call.' },
  { go: 'calc', sel: '.sum', title: 'Calculation', text: 'Pick the jobs and fill in the sizes. The price builds itself. Turn into offer makes the quote.' },
  { go: 'docs', sel: '.tabbody .stats', title: 'Quotes', text: 'Every version of the quote, extra work, invoices and what is paid. The quote carries the planning and the payment steps, as one document.' },
  { go: 'plan', sel: '[data-sec="timeline"]', title: 'Planning', text: 'The timeline lays itself out. Buying, booking and invoicing get a date. If something changes, say so here and it asks whether the price changes.' },
  { go: 'talk', sel: '.mail-card', title: 'Email', text: 'Pick a situation, a tone and a language. The text fills in with this project. Open it in your mail or in WhatsApp.' },
  { go: 'files', sel: '.folder-card .drop', title: 'Project folder', text: 'Ten numbered folders per project. Drop photos anywhere on a project and they find their folder. Download it all as one zip.' },
  { go: 'home', sel: '#nav .aux', title: 'Help and settings', text: 'The question mark starts this walkthrough again. Settings holds your prices, crew, partners and templates. Delete the example project from its ⋯ menu when you are done.' },
];

/** A filled-in project to look at: a bathroom, stucco and painting in Amsterdam Oost, accepted and planned. */
function createExample() {
  const { p } = projectFromRequest('Naam: Sanne de Wit\nTelefoon: 06 12 34 56 78\nE-mail: sanne@example.nl\nAdres: Javastraat 1, Amsterdam\nDiensten: Badkamerrenovatie / afbouw, Stuc- of schilderwerk, Loodgieterswerk\nOppervlakte: 45 m2\nDoel: Nieuwe badkamer, en de woonkamer opnieuw stucen en schilderen.\nMotivatie: Net het huis gekocht.');
  const sv = (id, v) => Object.assign((p.services[id] ??= newService(id)), { on: true, ...v });
  Object.assign(p, { example: true, client: 'Sanne de Wit (example)', days: 15, start: iso(Calc.shiftWorkdays(todayT(), 15)), rate: n(p.rate) || 50, hpd: n(p.hpd) || 9, team: n(p.team) || 2 });
  p.geo = { lat: 52.3627, lon: 4.9279, label: 'Javastraat 1, 1094GX Amsterdam', municipality: 'Amsterdam' };
  CALL_CHECKS.forEach(([k]) => { p.call[k] = true; });
  p.call.notes = 'Bathroom 6 m², tiles chosen. Living room walls 90 m². Keys with the neighbours at number 3. Parking permit for the container needed.';
  sv('tiling', { m2: 14, labour: 40, tilePrice: 64, tileWaste: 10, gluePrice: 8.3 });
  sv('bathroom', { m2: 6, labour: 180, matM2: 120 });
  sv('stucco', { m2: 90, labour: n(p.services.stucco?.labour) || 20 });
  sv('painting', { m2: 90, labour: n(p.services.painting?.labour) || 20 });
  sv('plumbing', { total: 2400 });
  Object.assign(p.margins, { profit: n(p.margins.profit) || 30, error: n(p.margins.error) || 5, discount: n(p.margins.discount) || 3, errorOn: true });
  Object.assign(p.costs, { food: n(p.costs.food) || 15, containerOn: true, containerBase: n(p.costs.containerBase) || 450, permit: 90, km: 2, diesel: n(p.costs.diesel) || 1.9, fuel: n(p.costs.fuel) || 8, parkingDay: 25 });
  state.current = p.id;
  R = compute(p, state.materials);
  const d = draftOffer();
  Object.assign(d, { id: uid(), no: 'EXAMPLE' });
  p.offerNo = 'EXAMPLE'; p.docs.push(d);
  Object.assign(p, { status: 'planned', acceptedOn: today() });
  logTalk(p, 'call', 'Called Sanne: the start date works, keys with the neighbours at number 3.');
  logTalk(p, 'system', 'Offer accepted.');
  return p;
}
const exampleProject = () => state.projects.find((p) => p.example) || createExample();

/** Moves to the screen of a step. */
function tourGo(i) {
  ui.tour = i; ui.modal = null;
  const st = TOUR[i];
  if (st.go === 'home') ui.view = 'home';
  else { state.current = exampleProject().id; ui.view = 'project'; ui.tab = st.go; }
}
function tourEnd() {
  if (ui.tour == null) return;
  ui.tour = null; state.settings.tourSeen = true;
  $('#tour').innerHTML = '';
}
/** Draws the step: a dimmed screen with a window around the thing it is about, and a card with the text. */
function tourPaint() {
  const box = $('#tour');
  if (ui.tour == null) { box.innerHTML = ''; return; }
  const i = ui.tour, st = TOUR[i];
  box.innerHTML = `<div class="tspot"></div><div class="tcard" role="dialog" aria-live="polite">${i === 0 ? starfield(3, 85, 15, 50, 16) : ''}<small>${i + 1} of ${TOUR.length}</small><h3>${st.title}</h3><p>${st.text}</p>
    <div class="tfoot">${SW('Show when the app opens', 's.tour')}<span class="acts tight">${i ? '<button data-act="tourprev">Back</button>' : '<button data-act="tourskip">Skip</button>'}<button class="primary" data-act="tournext">${i === TOUR.length - 1 ? 'Done' : 'Next'}</button></span></div></div>`;
  const target = st.sel && document.querySelector(st.sel);
  if (target) target.scrollIntoView({ block: 'center', behavior: 'instant' });
  requestAnimationFrame(tourPlace);
}
function tourPlace() {
  if (ui.tour == null) return;
  const st = TOUR[ui.tour], spot = $('#tour .tspot'), card = $('#tour .tcard'), target = st.sel && document.querySelector(st.sel);
  if (!spot || !card) return;
  if (!target) { spot.style.cssText = 'left:50%;top:40%;width:0;height:0'; card.classList.add('center'); card.style.cssText = ''; return; }
  card.classList.remove('center');
  const r = target.getBoundingClientRect(), pad = 8, W = innerWidth, H = innerHeight;
  spot.style.cssText = `left:${r.left - pad}px;top:${Math.max(4, r.top - pad)}px;width:${r.width + pad * 2}px;height:${Math.min(r.height + pad * 2, H - 8)}px`;
  if (W <= 700) { card.style.cssText = ''; card.classList.add('dock'); return; }
  card.classList.remove('dock');
  const cw = Math.min(380, W - 32), below = r.bottom + 16 + 220 < H;
  const left = Math.min(Math.max(16, r.left), W - cw - 16);
  card.style.cssText = `left:${left}px;width:${cw}px;${below ? `top:${Math.min(r.bottom + 16, H - 240)}px` : `bottom:${Math.max(16, H - r.top + 16)}px`}`;
}
addEventListener('resize', tourPlace);
addEventListener('scroll', tourPlace, { passive: true });

Object.assign(A, {
  tourstart() { tourGo(0); scrollTo(0, 0); },
  tournext() { if (ui.tour >= TOUR.length - 1) { tourEnd(); ui.view = 'home'; } else tourGo(ui.tour + 1); },
  tourprev() { tourGo(Math.max(0, ui.tour - 1)); },
  tourskip() { tourEnd(); },
});
