/* Settings: saved values, materials, crew, partners, shops, mail templates, the look and the file. */
'use strict';
/* ---------- settings ---------- */
function settingsView() {
  const s = state.settings;
  const svc = [['tiling', [['labour', 'Labour', '€/m²'], ['tilePrice', 'Tiles', '€/m²'], ['tileWaste', 'Tile waste', '%'], ['gluePrice', 'Glue and primer', '€/m²']]], ['painting', [['labour', 'Labour', '€/m²']]], ['stucco', [['labour', 'Labour', '€/m²']]], ['flooring', [['labour', 'Labour', '€/m²']]], ['bathroom', [['labour', 'Labour', '€/m²'], ['matM2', 'Materials', '€/m²']]], ['kitchen', [['labour', 'Labour', '€/m²'], ['matM2', 'Materials', '€/m²']]]];
  const mats = state.materials.map((m, i) => `<div class="panel"><div class="grid">${F('Name', `st.materials.${i}.name`, { type: 'text', cls: 'wide' })}${F('Bouwmaat link', `st.materials.${i}.url`, { type: 'text', cls: 'wide', ph: 'Paste the product page link' })}
    ${F('Price per package', `st.materials.${i}.price`, { unit: '€' })}${F('Package size', `st.materials.${i}.pack`)}${F('Unit', `st.materials.${i}.unit`, { type: 'text', ph: 'kg' })}${F('Used per m²', `st.materials.${i}.perM2`)}${F('Waste', `st.materials.${i}.waste`, { unit: '%' })}
    <div class="f wide"><span>Used by</span><div class="chips">${SERVICES.filter((x) => x.kind === 'm2').map((x) => `<button type="button" class="chip sm ${m.services.includes(x.id) ? 'on' : ''}" data-act="matsvc" data-i="${i}" data-id="${x.id}">${x.en}</button>`).join('')}</div></div></div>
    <div class="acts"><small class="mute">${m.priceDate ? `Price of ${m.priceDate}${m.priceFail ? ', last lookup failed' : ''}` : ''}</small><button class="danger" data-act="del" data-list="st.materials" data-i="${i}">Remove</button></div></div>`).join('');
  const list = (path, arr, fields, add) => `${arr.map((_, i) => `<div class="row3">${fields.map(([k, l, o]) => F(l, `${path}.${i}.${k}`, o)).join('')}<button class="x" data-act="del" data-list="${path}" data-i="${i}" aria-label="Remove">×</button></div>`).join('')}<button data-act="${add}">Add</button>`;
  return `<div class="tools"><button data-act="back">Back</button></div><div class="form narrow">
    <section class="card"><h2>Your file</h2><p class="hint">Save the file in your cloud folder (iCloud Drive, Google Drive or OneDrive) and load it on your other devices. Loading merges: whatever changed last wins, and what you deleted is deleted there too. Keep the file private.</p><div class="acts"><button class="primary" data-act="export">Save file</button><button data-act="import">Load file</button></div></section>
    <section class="card"><h2>Help</h2><div class="acts">${SW('Walkthrough when the app opens', 's.tour')}<button data-act="tourstart">Start the walkthrough</button><a class="btn" href="help/bizbaan-manual.pdf" target="_blank" rel="noopener">Manual (PDF)</a><a class="btn" href="help/bizbaan-video.mp4" target="_blank" rel="noopener">Video</a></div></section>
    <section class="card"><h2>Look</h2><div class="skins">${SKINS.map(([k, name, line, c1, c2]) => `<button type="button" class="skin ${(s.skin || 'auto') === k ? 'on' : ''}" data-act="set" data-path="s.skin" data-val="${k}"><i><span style="background:${c1}"></span><span style="background:${c2}"></span></i><b>${name}</b><small>${line}</small></button>`).join('')}</div><p class="hint">Offers, invoices and the private sheet always stay white, whatever you pick here.</p></section>
    <section class="card"><h2>Saved values</h2><p class="hint">New projects start with these. Changing them never touches a project you already made.</p><div class="grid">
      ${F('Hourly rate', 's.hourRate', { unit: '€/h' })}${F('Hours per day', 's.hoursPerDay')}${F('Team members', 's.teamMembers')}${F('Food per day', 's.food', { unit: '€' })}
      ${F('Profit', 's.profit', { unit: '%' })}${F('Error margin', 's.error', { unit: '%' })}${F('Discount margin', 's.discount', { unit: '%' })}${F('Floor extra per floor', 's.floorExtraPct', { unit: '%' })}
      ${F('Quick number per m²', 's.quickPerM2', { unit: '€' })}${F('Crane per day', 's.cranePerDay', { unit: '€' })}${F('Toilet per week', 's.toiletPerWeek', { unit: '€' })}${F('Container', 's.containerBase', { unit: '€' })}
      ${F('Van fuel use', 's.fuelPer100', { unit: 'l/100 km' })}${F('Diesel', 's.dieselPrice', { unit: '€/l' })}${F('Start address', 's.startAddress', { type: 'text', cls: 'wide', ph: 'Where the van leaves from' })}</div></section>
    <section class="card"><h2>Service starting values</h2>${svc.map(([id, fs]) => `<div class="crow"><div class="grid"><b class="f">${SVC[id].en}</b>${fs.map(([k, l, u]) => F(l, `s.services.${id}.${k}`, { unit: u })).join('')}</div></div>`).join('')}</section>
    <section class="card"><h2>Materials</h2>${mats || '<p class="empty">No materials yet. Add the ones you buy for most jobs.</p>'}<div class="acts"><button data-act="addmat">Add a material</button><button data-act="prices">Update Bouwmaat prices</button></div><p class="hint">Bouwmaat prices are read without VAT, as Bouwmaat shows them.</p><p class="status">${esc(ui.status)}</p></section>
    <section class="card"><h2>Partners</h2><p class="hint">Subcontractors, furniture builders, crane and container firms. Pick them per job in Planning; their tasks show who to call.</p>${list('s.partners', s.partners, [['name', 'Name', { type: 'text' }], ['trade', 'Does', { type: 'text', ph: 'Plumbing' }], ['phone', 'Phone', { type: 'tel' }], ['email', 'Email', { type: 'email' }]], 'addpartner')}</section>
    <section class="card"><h2>Mail templates</h2><p class="hint">Use {client}, {address}, {start}, {end}, {weeks}, {offer}, {total}, {invoice}, {amount}, {owner}, {company}, {review}. They fill in from the project.</p>
      ${[...MAIL_SITUATIONS, ['', 'Your own']].map(([sit, nm]) => {
        const items = s.mails.map((m, i) => [m, i]).filter(([m]) => (m.sit || '') === sit);
        if (!items.length) return '';
        return DET('msit:' + sit, `${nm} <small class="mute">${items.length}</small>`, items.map(([m, i]) => `<div class="medit"><b>${m.sit ? MAIL_TONES.find(([t]) => t === m.tone)?.[1] || '' : esc(m.name)} · ${m.lang.toUpperCase()}</b><div class="grid">${m.sit ? '' : F('Name', `s.mails.${i}.name`, { type: 'text' }) + `<div class="f"><span>Language</span>${SEG(`s.mails.${i}.lang`, [['nl', 'NL'], ['en', 'EN']])}</div>`}${F('Subject', `s.mails.${i}.subject`, { type: 'text', cls: 'wide' })}${TA('Message', `s.mails.${i}.body`, { rows: 7 })}</div>${m.sit ? '' : `<div class="acts"><button class="danger" data-act="del" data-list="s.mails" data-i="${i}">Remove</button></div>`}</div>`).join(''));
      }).join('')}
      <div class="acts"><button data-act="addmail">Add a template</button></div></section>
    <section class="card"><h2>Crew</h2>${list('s.crew', s.crew, [['name', 'Name', { type: 'text' }], ['rate', 'Rate', { unit: '€/h' }]], 'addcrewrow')}</section>
    <section class="card"><h2>Shops</h2><p class="hint">Each shop gets a search link on every material and a stop on the pick-up route. Use {q} where the search word goes.</p>${list('s.shops', s.shops, [['name', 'Name', { type: 'text' }], ['search', 'Search link', { type: 'text', ph: 'https://shop.nl/search?q={q}' }], ['address', 'Pick-up address', { type: 'text' }]], 'addshop')}</section>
    <section class="card"><h2>Container permits</h2>${Object.keys(state.permits).length ? `<div class="grid">${Object.keys(state.permits).map((m) => F(esc(m), `st.permits.${m}`, { unit: '€' })).join('')}</div>` : '<p class="empty">Empty. The first permit price you type on a project is remembered for that municipality.</p>'}</section>
    <section class="card"><h2>Templates</h2>${state.templates.length ? state.templates.map((t, i) => `<div class="trow"><span>${esc(t.name)}</span><button class="x" data-act="del" data-list="st.templates" data-i="${i}" aria-label="Remove">×</button></div>`).join('') : '<p class="empty">None yet. On a project, open ⋯ and choose Save as template.</p>'}</section>
    <section class="card"><h2>On the offer</h2><div class="grid">${[['name', 'Company'], ['owner', 'Signed by'], ['address', 'Address'], ['phone', 'Phone'], ['email', 'Email'], ['web', 'Website'], ['kvk', 'KVK'], ['btw', 'BTW number'], ['iban', 'IBAN'], ['review', 'Google review link']].map(([k, l]) => F(l, `s.company.${k}`, { type: 'text', cls: 'wide' })).join('')}${F('Next offer number', 'st.seq.offer')}${F('Next invoice number', 'st.seq.invoice')}${F('Days to pay', 's.payDays')}</div></section></div>`;
}

Object.assign(A, {
  addcrewrow() { state.settings.crew.push({ id: uid(), name: '', rate: state.settings.hourRate }); },
  addpartner() { state.settings.partners.push({ id: uid(), name: '', trade: '', phone: '', email: '' }); },
  addmail() { state.settings.mails.push({ id: uid(), lang: 'nl', name: 'New template', subject: '', body: 'Beste {client},\n\n\n\nMet vriendelijke groet,\n{owner}' }); ui.open['msit:'] = true; },
  addshop() { state.settings.shops.push({ name: '', search: '', address: '' }); },
  addmat() { state.materials.push({ id: uid(), name: '', url: '', price: '', pack: '', unit: '', perM2: '', waste: 10, services: [] }); },
  matsvc(d) { const s = state.materials[+d.i].services, i = s.indexOf(d.id); if (i < 0) s.push(d.id); else s.splice(i, 1); },
  del(d) { get(d.list).splice(+d.i, 1); },
  export() {
    stamp();
    const blob = new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' });
    (async () => {
      // Where the browser allows it, he picks the file in his cloud folder and it is overwritten in place.
      if (window.showSaveFilePicker) {
        try {
          const h = await window.showSaveFilePicker({ suggestedName: 'bizbaan.json', types: [{ description: 'Bizbaan file', accept: { 'application/json': ['.json'] } }] });
          const w = await h.createWritable(); await w.write(blob); await w.close();
          say('Saved.'); return;
        } catch (e) { if (e.name === 'AbortError') return; }
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'bizbaan.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    })();
    return false;
  },
  import() { $('#file').click(); return false; },
});
