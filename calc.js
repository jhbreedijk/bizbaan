/* Bizbaan calculator: every sum lives here, as pure functions.
   No prices or margins in this file. They come from the private file. */
(function (g) {
  'use strict';

  const SERVICES = [
    { id: 'demolition', en: 'Demolition', nl: 'Sloopwerk', kind: 'demo' },
    { id: 'tiling', en: 'Tiling', nl: 'Tegelwerk', kind: 'm2', incl: true },
    { id: 'painting', en: 'Painting', nl: 'Schilderwerk', kind: 'm2', incl: true, vatChoice: true },
    { id: 'stucco', en: 'Stucco', nl: 'Stucwerk', kind: 'm2', incl: true, vatChoice: true },
    { id: 'flooring', en: 'Flooring', nl: 'Vloeren', kind: 'm2', incl: true },
    { id: 'bathroom', en: 'Bathroom', nl: 'Badkamer', kind: 'm2', matM2: true },
    { id: 'kitchen', en: 'Kitchen', nl: 'Keuken', kind: 'm2', matM2: true },
    { id: 'extra', en: 'Extra', nl: 'Overige werkzaamheden', kind: 'm2' },
    { id: 'furniture', en: 'Custom furniture', nl: 'Meubels op maat', kind: 'pieces' },
    { id: 'plumbing', en: 'Plumbing', nl: 'Loodgieterswerk', kind: 'sub' },
    { id: 'electra', en: 'Electra', nl: 'Elektra', kind: 'sub' },
    { id: 'ac', en: 'AC', nl: 'Airco', kind: 'sub' },
  ];
  const SVC = Object.fromEntries(SERVICES.map((s) => [s.id, s]));
  // The order work happens on site: break out, pipes and wiring, walls, wet rooms, then the finish.
  const BUILD_ORDER = ['demolition', 'plumbing', 'electra', 'ac', 'stucco', 'tiling', 'bathroom', 'kitchen', 'extra', 'painting', 'flooring', 'furniture'];

  const n = (v) => {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    const x = parseFloat(String(v ?? '').replace(',', '.'));
    return isFinite(x) ? x : 0;
  };
  const r2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
  const sum = (a) => a.reduce((t, x) => t + x, 0);

  /* ---------- working days and Dutch holidays ---------- */
  const DAY = 864e5;
  function easter(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), q = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - q + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    return Date.UTC(y, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
  }
  const hcache = {};
  function holidays(y) {
    if (hcache[y]) return hcache[y];
    const e = easter(y);
    const king = new Date(Date.UTC(y, 3, 27)).getUTCDay() === 0 ? Date.UTC(y, 3, 26) : Date.UTC(y, 3, 27);
    // New Year, Easter Monday, King's Day, Ascension, Whit Monday, Christmas, Boxing Day.
    return (hcache[y] = new Set([Date.UTC(y, 0, 1), e + DAY, king, e + 39 * DAY, e + 50 * DAY, Date.UTC(y, 11, 25), Date.UTC(y, 11, 26)]));
  }
  const isWorkday = (t) => {
    const d = new Date(t), wd = d.getUTCDay();
    return wd !== 0 && wd !== 6 && !holidays(d.getUTCFullYear()).has(t);
  };
  /** The first `count` working days from an ISO start date, as UTC timestamps. */
  function workdays(startIso, count) {
    const out = [];
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startIso || '');
    if (!m) return out;
    let t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    for (let guard = 0; out.length < count && guard < 5000; guard++, t += DAY) if (isWorkday(t)) out.push(t);
    return out;
  }
  function schedule(p) {
    const days = Math.ceil(n(p.days));
    const wd = workdays(p.start, days);
    if (!wd.length) return { weeks: days ? Math.ceil(days / 5) : 0, end: null, start: null, wd };
    const start = wd[0], end = wd[wd.length - 1];
    return { weeks: Math.ceil((end - start + DAY) / (7 * DAY)), end, start, wd };
  }
  /** Phases in building order. Days come from the plan field, the service's own days, or an even share of what is left. */
  function timeline(p) {
    const on = BUILD_ORDER.map((id) => SVC[id]).filter((s) => p.services[s.id]?.on);
    const fixed = on.map((s) => {
      const sv = p.services[s.id];
      return n(sv.planDays) || (s.kind === 'demo' || sv.mode === 'hour' ? n(sv.days) : 0);
    });
    const open = fixed.filter((d) => !d).length;
    const share = open ? Math.max(0, n(p.days) - sum(fixed)) / open : 0;
    let at = 0;
    return on.map((s, i) => {
      const days = fixed[i] || share;
      const row = { id: s.id, days, from: at, auto: !fixed[i] };
      at += days;
      return row;
    });
  }

  /* ---------- the calculation ---------- */
  function compute(p, lib) {
    const rate = n(p.rate), hpd = n(p.hpd), days = n(p.days);
    const sched = schedule(p);

    // Saved materials: amount needed, rounded up to full packages.
    const libShare = {};
    const materials = [];
    for (const m of lib || []) {
      if ((p.matOff || []).includes(m.id)) continue;
      const needBy = {};
      for (const sid of m.services || []) {
        const sv = p.services[sid];
        if (sv?.on && !sv.inclMat && n(sv.m2) > 0) needBy[sid] = n(sv.m2) * n(m.perM2) * (1 + n(m.waste) / 100);
      }
      const need = sum(Object.values(needBy));
      if (need <= 0) continue;
      const auto = n(m.pack) > 0 ? Math.ceil(need / n(m.pack) - 1e-9) : need;
      const typed = p.matQty?.[m.id];
      const packs = typed !== undefined && typed !== '' ? n(typed) : auto;
      const cost = packs * n(m.price);
      for (const sid in needBy) libShare[sid] = (libShare[sid] || 0) + (cost * needBy[sid]) / need;
      materials.push({ m, need, auto, packs, cost });
    }
    const manual = (p.matManual || []).map((row, i) => {
      const m = (lib || []).find((x) => x.id === row.matId);
      return { i, m, qty: n(row.qty), cost: n(row.qty) * n(m?.price) };
    }).filter((x) => x.m);
    const manualCost = sum(manual.map((x) => x.cost));

    // What one m2 of a service costs in saved materials. Splits an all-in price into materials (21%) and labour.
    const libPerM2 = (sid) => sum((lib || []).filter((m) => (m.services || []).includes(sid)).map((m) =>
      (n(m.pack) > 0 ? n(m.price) / n(m.pack) : n(m.price)) * n(m.perM2) * (1 + n(m.waste) / 100)));

    const up = !p.elevator && n(p.floor) > 0;
    const c = p.costs || {};
    const floorF = up && c.floorOn ? (n(c.floorPct) / 100) * n(p.floor) : 0;

    // Services.
    const services = [];
    for (const def of SERVICES) {
      const sv = p.services[def.id];
      if (!sv?.on) continue;
      let labour = 0, hours = 0, mats = 0, other = 0, note = '';
      if (def.kind === 'demo') {
        hours = n(sv.days) * n(p.team) * hpd;
        labour = hours * rate;
      } else if (def.kind === 'm2') {
        if (sv.mode === 'hour') { hours = n(sv.workers) * n(sv.days) * hpd; labour = hours * rate; }
        else labour = n(sv.m2) * n(sv.labour);
        if (def.id === 'tiling' && !sv.inclMat) mats = n(sv.m2) * n(sv.tilePrice) * (1 + n(sv.tileWaste) / 100) + n(sv.m2) * n(sv.gluePrice);
        if (def.matM2) mats = n(sv.m2) * n(sv.matM2);
      } else if (def.kind === 'pieces') {
        other = sum((sv.pieces || []).map((x) => n(x.price) * (x.qty === '' || x.qty === undefined ? 1 : n(x.qty))));
      } else other = n(sv.total);
      const lm = libShare[def.id] || 0;
      const fe = labour * floorF; // floor extra belongs to this service's labour
      const vat = def.vatChoice ? n(sv.vat) || 21 : 21;
      // The part of the cost that may take the low rate: labour only, never materials.
      let low = 0;
      if (vat !== 21) {
        if (def.kind === 'm2' && sv.mode !== 'hour' && sv.inclMat) {
          const per = libPerM2(def.id);
          if (per > 0) low = Math.max(0, labour - n(sv.m2) * per) + fe;
          else note = `No saved materials for ${def.en.toLowerCase()}, so all of it is at 21%.`;
        } else low = labour + fe;
      }
      services.push({ id: def.id, kind: def.kind, labour, hours, mats, lib: lm, other, fe, base: labour + mats + lm + other, vat, low, note });
    }

    const labour = sum(services.map((s) => s.labour));
    const cost = {
      labour,
      materials: sum(services.map((s) => s.mats + s.lib)) + manualCost,
      furniture: sum(services.filter((s) => s.kind === 'pieces').map((s) => s.other)),
      sub: sum(services.filter((s) => s.kind === 'sub').map((s) => s.other)),
      transport: n(c.km) * days * (n(c.fuel) / 100) * n(c.diesel),
      parking: n(c.parkingDay) * days,
      floorExtra: labour * floorF,
      crane: up && c.craneOn ? n(c.craneDays) * n(c.cranePerDay) : 0,
      container: c.containerOn ? n(c.containerBase) + n(c.permit) : 0,
      toilet: c.toiletOn ? sched.weeks * n(c.toiletPerWeek) : 0,
      waste: n(c.waste),
      additional: n(c.additional),
    };
    // All costs, without food. Food is added after the margins, at cost.
    const total = sum(Object.values(cost));
    const food = n(c.food) * days;
    cost.food = food;

    const mg = p.margins || {};
    const fProfit = 1 + n(mg.profit) / 100;
    const fError = mg.errorOn ? 1 + n(mg.error) / 100 : 1;
    const fDisc = 1 + n(mg.discount) / 100;
    const M = fProfit * fError * fDisc;
    const afterProfit = total * fProfit;
    const final = total * M + food;

    // Client lines: margins built in, food at cost, additional costs spread over the visible prices.
    const raw = services.map((s) => ({ key: 'svc:' + s.id, base: s.base + s.fe, low: s.low, rate: s.vat }));
    const push = (key, base) => base > 0 && raw.push({ key, base, low: 0, rate: 21 });
    push('materials', manualCost);
    push('transport', cost.transport);
    push('parking', cost.parking);
    push('waste', cost.waste + cost.container);
    push('crane', cost.crane);
    push('toilet', cost.toilet);
    const V = sum(raw.map((l) => l.base)) * M;
    const H = cost.additional * M + food; // hidden: always 21%
    const exactBy = {};
    const add = (r, x) => { if (x) exactBy[r] = (exactBy[r] || 0) + x; };
    for (const l of raw) { add(l.rate, l.low * M); add(21, (l.base - l.low) * M); }
    add(21, H);
    const exact = V > 0 ? raw.map((l) => ({ key: l.key, price: l.base * M * (1 + H / V) })) : H > 0 ? [{ key: 'other', price: H }] : [];

    // Whole euros. The largest line takes the rounding difference, so everything adds up exactly.
    const exVat = Math.round(final);
    const whole = (list, get, put) => {
      if (!list.length) return;
      for (const x of list) put(x, Math.round(get(x)));
      const diff = exVat - sum(list.map(get));
      if (diff) { const big = list.reduce((a, b) => (get(b) > get(a) ? b : a)); put(big, get(big) + diff); }
    };
    const lines = exact.map((l) => ({ ...l }));
    whole(lines, (l) => l.price, (l, v) => { l.price = v; });
    const rates = Object.keys(exactBy).map((r) => ({ r, v: exactBy[r] }));
    whole(rates, (x) => x.v, (x, v) => { x.v = v; });
    const exBy = {}, vatBy = {};
    for (const { r, v } of rates) if (v) { exBy[r] = v; vatBy[r] = Math.round((v * r) / 100); }
    const vat = sum(Object.values(vatBy));

    return {
      services, materials, manual, cost, total, food, M,
      profit: total * (fProfit - 1), afterProfit,
      errorAmt: afterProfit * (fError - 1), discountAmt: afterProfit * fError * (fDisc - 1),
      final, lines, exBy, vatBy, exVat, vat, incVat: exVat + vat,
      sched, hours: sum(services.map((s) => s.hours)), up,
    };
  }

  /** The working day k working days after a timestamp, or before it when k is negative. */
  function shiftWorkdays(t, k) {
    let x = t;
    const step = k < 0 ? -DAY : DAY;
    for (let left = Math.abs(Math.round(k)); left > 0;) { x += step; if (isWorkday(x)) left--; }
    return x;
  }
  /** Every working day from a to b, both included. */
  function workdaysBetween(a, b) {
    const out = [];
    for (let t = a; t <= b; t += DAY) if (isWorkday(t)) out.push(t);
    return out;
  }

  g.Calc = { SERVICES, SVC, n, r2, compute, schedule, timeline, workdays, holidays, isWorkday, shiftWorkdays, workdaysBetween, DAY };
})(globalThis);
