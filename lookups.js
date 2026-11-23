/* Public lookups. Each one may fail; the caller keeps the last number and says so.
   PDOK (address), OSRM (distance), CBS (diesel), RDW (parking), Bouwmaat (price, stock). */
(function (g) {
  'use strict';
  const json = async (url) => {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 12000);
    try {
      const res = await fetch(url, { signal: ctl.signal });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } finally { clearTimeout(timer); }
  };

  const PDOK = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1/';
  /** Matching addresses while typing, nearest to `near` first. */
  async function suggest(q, near) {
    const bias = near ? `&lat=${near.lat}&lon=${near.lon}` : '';
    const d = await json(PDOK + 'suggest?rows=6&fq=type:adres' + bias + '&q=' + encodeURIComponent(q));
    return (d.response?.docs || []).map((x) => ({ id: x.id, label: x.weergavenaam }));
  }

  /** Address to coordinates and municipality. With an id from suggest() it is exact. */
  async function geocode(address, id) {
    const fl = '&fl=weergavenaam,gemeentenaam,centroide_ll';
    const d = await json(id ? PDOK + 'lookup?id=' + encodeURIComponent(id) + fl : PDOK + 'free?rows=1&fq=type:adres' + fl + '&q=' + encodeURIComponent(address));
    const doc = d.response?.docs?.[0];
    const m = /POINT\(([\d.-]+) ([\d.-]+)\)/.exec(doc?.centroide_ll || '');
    if (!m) throw new Error('Address not found');
    return { lon: +m[1], lat: +m[2], label: doc.weergavenaam, municipality: doc.gemeentenaam || '' };
  }

  /** Driving distance one way, in km. */
  async function routeKm(a, b) {
    const d = await json(`https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`);
    if (d.code !== 'Ok') throw new Error('No route');
    return d.routes[0].distance / 1000;
  }

  /** Straight-line distance in km, for when routing is down. */
  function straightKm(a, b) {
    const R = 6371, rad = Math.PI / 180;
    const x = Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lon - a.lon) * rad) / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }

  /** Latest national diesel pump price per litre, as CBS publishes it. */
  async function diesel() {
    const year = new Date().getFullYear();
    for (const y of [year, year - 1]) {
      const d = await json(`https://opendata.cbs.nl/ODataApi/odata/80416ned/TypedDataSet?$select=Perioden,Diesel_2&$filter=substring(Perioden,0,4) eq '${y}'`);
      const rows = (d.value || []).filter((r) => r.Diesel_2);
      if (rows.length) { const last = rows[rows.length - 1]; return { price: last.Diesel_2, date: last.Perioden.replace(/(\d{4})(\d\d)(\d\d)/, '$1-$2-$3') }; }
    }
    throw new Error('No diesel price');
  }

  /** Paid street parking within 400 m: the hourly rate and any day ticket of every paid zone found, nearest first. Zero rates are left out. */
  async function parking(pt) {
    const rdw = (ds, q) => json(`https://opendata.rdw.nl/resource/${ds}.json?` + new URLSearchParams(q));
    const f2 = (x) => (Math.floor(x * 100) / 100).toFixed(2);
    const today = new Date().toISOString().slice(0, 10);
    const todayNum = today.replace(/-/g, '');
    // The zone shapes are text, so we match the coordinate prefix (cells of about 700 m) and measure here.
    const cells = new Set();
    for (const dx of [-0.004, 0, 0.004]) for (const dy of [-0.003, 0, 0.003]) cells.add(`areageometryastext like '%${f2(pt.lon + dx)}% ${f2(pt.lat + dy)}%'`);
    const areas = await rdw('nsk3-v9n7', { $where: `(${[...cells].join(' OR ')}) AND (enddatearea is null OR enddatearea > '${today}')`, $limit: 400 });
    const dist = (x, y) => Math.hypot((x - pt.lon) * 111320 * Math.cos((pt.lat * Math.PI) / 180), (y - pt.lat) * 110540);
    const near = [];
    for (const a of areas) {
      let m = Infinity;
      for (const [, x, y] of (a.areageometryastext || '').matchAll(/(-?\d+\.\d+) (-?\d+\.\d+)/g)) m = Math.min(m, dist(+x, +y));
      if (m <= 400) near.push({ m, a });
    }
    near.sort((p, q) => p.m - q.m);
    // One zone can be stored as several shapes. Keep each zone once, at its nearest point.
    const seen = new Set();
    for (let i = near.length - 1; i >= 0; i--) near[i].key = near[i].a.areamanagerid + '/' + near[i].a.areaid;
    near.splice(0, near.length, ...near.filter((x) => !seen.has(x.key) && seen.add(x.key)));
    const rate = async ({ a, m }) => {
      const regs = (await rdw('qtex-qwd8', { areamanagerid: a.areamanagerid, areaid: a.areaid })).filter((r) => r.usageid === 'BETAALDP' && (r.enddatearearegulation || '9').slice(0, 8) >= todayNum);
      if (!regs.length) return null;
      const frames = await rdw('ixf8-gtwq', { areamanagerid: a.areamanagerid, regulationid: regs[regs.length - 1].regulationid });
      const codes = [...new Set(frames.map((f) => f.farecalculationcode).filter(Boolean))].slice(0, 4);
      // Steps of an hour or less are the hourly rate. A longer step is a day ticket: a price for the whole day, not per hour.
      let hourly = 0, dayCap = 0;
      for (const code of codes) {
        const parts = (await rdw('534e-5vdg', { areamanagerid: a.areamanagerid, farecalculationcode: code })).filter((f) => (f.enddatefarepart || '99999999') >= todayNum && (f.startdatefarepart || '0') <= todayNum);
        for (const f of parts) {
          const amt = parseFloat(f.amountfarepart) || 0, step = parseFloat(f.stepsizefarepart) || 0;
          if (amt <= 0) continue;
          if (step > 0 && step <= 60) hourly = Math.max(hourly, (amt * 60) / step);
          else if (step >= 240) dayCap = dayCap ? Math.min(dayCap, amt) : amt;
        }
      }
      return hourly > 0 ? { hourly: Math.round(hourly * 100) / 100, dayCap: Math.round(dayCap * 100) / 100, area: a.areaid, metres: Math.round(m) } : null;
    };
    const found = (await Promise.all(near.slice(0, 10).map((x) => rate(x).catch(() => null)))).filter(Boolean);
    if (!found.length) throw new Error('No paid parking found within 400 m');
    return found.sort((p, q) => p.metres - q.metres);
  }

  /** Current public price and stock for a Bouwmaat product link. */
  async function bouwmaat(url) {
    const m = /^(https:\/\/(?:www\.)?bouwmaat\.nl)\/(?:[^?#]*\/)?products\/([^/?#]+)/.exec(url || '');
    if (!m) throw new Error('Not a Bouwmaat product link');
    const d = await json(`${m[1]}/products/${m[2].replace(/\.js$/, '')}.js`);
    const v = d.variants?.[0] || d;
    if (!(v.price > 0)) throw new Error('No price');
    return { price: v.price / 100, available: !!d.available, title: d.title };
  }

  g.Lookups = { suggest, geocode, routeKm, straightKm, diesel, parking, bouwmaat };
})(globalThis);
