/* Mail: write to the client from a template (situation, tone, language), log calls and visits,
   and keep one history of everything that happened on the project. */
'use strict';

const TALK_KINDS = [['call', 'Call'], ['email', 'Email'], ['whatsapp', 'WhatsApp'], ['visit', 'Visit'], ['note', 'Note']];
const TALK_NAME = { ...Object.fromEntries(TALK_KINDS), request: 'Request', change: 'Change', system: 'Update' };
// Which situations fit which stage. They are shown first.
const STAGE_MAILS = { request: ['ack', 'details', 'visit', 'decline'], quote: ['offer', 'followup', 'details'], planned: ['accepted', 'planning', 'reminder', 'invoice'], running: ['update', 'extra', 'change', 'invoice'], done: ['done', 'invoice', 'payment'] };

/** Fills {client}, {start} and the rest into a template, from this project. */
function fillMail(text, p, L = p.offer.lang, extra = {}) {
  const s = Calc.schedule(p), S = projectSum(p), co = state.settings.company, inv = docsOf(p, 'invoice').at(-1);
  const v = {
    client: p.client || (L === 'nl' ? 'klant' : 'client'), address: p.geo?.label || p.address || '',
    start: s.start ? day(s.start, L, true) : '…', end: s.end ? day(s.end, L, true) : '…', weeks: s.weeks || '…',
    offer: S.cur?.no || '', total: eur(S.cur?.incVat ?? compute(p, state.materials).incVat),
    invoice: inv?.no || '', amount: inv ? eur(inv.incVat, 2) : '',
    owner: co.owner, company: co.name, phone: co.phone, review: co.review || '', change: '', ...extra,
  };
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in v ? String(v[k]) : m));
}

const talkLayout = () => `<div class="cols"><section class="card mail-card" data-sec="mail"></section><div class="stack"><section class="card" data-sec="write"></section><section class="card" data-sec="log"></section></div></div>`;
const TALK = {
  mail() {
    if (!state.draft?.mail) A.mailpick({}); // open with the template that fits the stage, never empty
    const p = P(), m = state.draft?.mail, mails = state.settings.mails, st = stage(p);
    const sel = { sit: m?.sit, tone: m?.tone || 'warm', lang: m?.lang || p.offer.lang };
    const name = Object.fromEntries(MAIL_SITUATIONS);
    const chip = (sit) => `<button type="button" class="chip sm ${sel.sit === sit ? 'on' : ''}" data-act="mailpick" data-sit="${sit}">${name[sit]}</button>`;
    const fits = STAGE_MAILS[st] || [], rest = MAIL_SITUATIONS.map(([k]) => k).filter((k) => !fits.includes(k));
    const own = mails.filter((t) => !t.sit);
    return `<h2>Write to ${esc(p.client || 'the client')}</h2>
      <div class="f"><span>For this stage</span><div class="chips">${fits.map(chip).join('')}</div></div>
      ${DET('allmails', `All situations · ${rest.length}`, `<div class="chips">${rest.map(chip).join('')}</div>`)}
      ${own.length ? `<div class="f"><span>Your own</span><div class="chips">${own.map((t) => `<button type="button" class="chip sm ${m?.tpl === t.id ? 'on' : ''}" data-act="mailpick" data-id="${t.id}">${esc(t.name)}</button>`).join('')}</div></div>` : ''}
      <div class="row2"><div class="f"><span>Tone</span>${seg('tone', MAIL_TONES, sel.tone)}</div><div class="f"><span>Language</span>${seg('lang', [['nl', 'Nederlands'], ['en', 'English']], sel.lang)}</div></div>
      ${m ? `<div class="grid">${F('To', 'st.draft.mail.to', { type: 'email', cls: 'wide' })}${F('Subject', 'st.draft.mail.subject', { type: 'text', cls: 'wide' })}${TA('Message', 'st.draft.mail.body', { rows: 12 })}</div>
        ${/\[[^\]]+\]/.test(m.body) ? '<p class="hint">Fill in the parts in [square brackets] before sending.</p>' : ''}
        <div class="acts"><button class="primary" data-act="sendmail" data-how="mail">Open in mail</button>${p.phone ? '<button data-act="sendmail" data-how="wa">WhatsApp</button>' : ''}<button data-act="sendmail" data-how="copy">Copy</button></div>`
        : '<p class="empty">Pick a situation. The text fills in with the client, dates and amounts of this project.</p>'}`;
  },
  write() {
    const p = P(), open = openTasks(p), dr = state.draft || {};
    return `<h2>Log a call or visit</h2>
      <div class="f"><span>How</span>${SEG('st.draft.talkKind', TALK_KINDS)}</div>
      ${TA('What was said', 'st.draft.talkText', { rows: 3, ph: 'Start can move a week. Keys with the neighbours at number 12.' })}
      ${open.length ? `<label class="f"><span>This settles</span><select data-bind="st.draft.talkTask"><option value="">Nothing in the planning</option>${open.map((t) => `<option value="${t.key}" ${dr.talkTask === t.key ? 'selected' : ''}>${t.date ? dm(t.date) + ' · ' : ''}${esc(t.title)}</option>`).join('')}</select></label>` : ''}
      <div class="acts"><button data-act="logtalk">Log it</button></div>`;
  },
  log() {
    const p = P(), all = tasks(p);
    const rows = p.talk.map((e) => {
      const at = new Date(e.at), when = `${day(at.getTime())} ${at.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`;
      const settled = e.task && all.find((t) => t.key === e.task);
      return `<div class="lrow"><span class="tag k-${e.kind}">${TALK_NAME[e.kind] || e.kind}</span><div><small class="mute">${when}</small><p>${esc(e.text.split('\n\n')[0])}</p>${settled ? `<small class="mute">Settled: ${esc(settled.title)}</small>` : ''}</div>
        ${['system', 'request', 'change'].includes(e.kind) ? '<span></span>' : `<button class="x" data-act="talkdel" data-id="${e.id}" aria-label="Remove">×</button>`}</div>`;
    }).join('');
    return `<h2>History ${O('tcount', `${p.talk.length}`, 'amt small')}</h2>${rows || '<p class="empty">Nothing yet. Every call, mail and change lands here.</p>'}`;
  },
};
const seg = (key, opts, cur) => `<span class="seg">${opts.map(([v, l]) => `<button type="button" class="${cur === v ? 'on' : ''}" data-act="mailpick" data-${key}="${v}">${l}</button>`).join('')}</span>`;

Object.assign(A, {
  /** Choose a situation, tone or language; the other two stay as they were. */
  mailpick(d) {
    const p = P(), dr = (state.draft ??= {}), cur = dr.mail || {};
    let t;
    if (d.id) t = state.settings.mails.find((x) => x.id === d.id);
    else {
      const sel = { sit: d.sit || cur.sit || (STAGE_MAILS[stage(p)] || ['ack'])[0], tone: d.tone || cur.tone || 'warm', lang: d.lang || cur.lang || p.offer.lang };
      t = state.settings.mails.find((x) => x.sit === sel.sit && x.tone === sel.tone && x.lang === sel.lang);
    }
    if (!t) return;
    const lang = t.lang || p.offer.lang, extra = { change: d.change ?? cur.change ?? '' };
    dr.mail = { tpl: t.id, sit: t.sit, tone: t.tone, lang, change: extra.change, to: cur.to || p.email, subject: fillMail(t.subject, p, lang, extra), body: fillMail(t.body, p, lang, extra) };
  },
  logtalk() {
    const p = P(), dr = (state.draft ??= {});
    if (!dr.talkText?.trim()) { ui.status = 'Type what was said.'; return; }
    logTalk(p, dr.talkKind || 'call', dr.talkText.trim(), dr.talkTask ? { task: dr.talkTask } : {});
    if (dr.talkTask) p.plan.done[dr.talkTask] = today();
    if (p.status === 'request' && (dr.talkKind || 'call') === 'call') p.call.phone = true;
    Object.assign(dr, { talkText: '', talkTask: '' });
  },
  talkdel(d) { const p = P(); p.talk = p.talk.filter((e) => e.id !== d.id); },
  sendmail(d) {
    const p = P(), m = state.draft.mail, text = `${m.subject}\n\n${m.body}`;
    if (d.how === 'copy') { navigator.clipboard?.writeText(text).then(() => say('Copied.'), () => say('Copying is blocked here. Select the text and copy it.')); return false; }
    if (d.how === 'wa') window.open(`https://wa.me/${waNumber(p.phone)}?text=${encodeURIComponent(m.body)}`, '_blank', 'noopener');
    else location.href = `mailto:${encodeURIComponent(m.to || '')}?subject=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(m.body)}`;
    logTalk(p, d.how === 'wa' ? 'whatsapp' : 'email', `${m.subject}\n\n${m.body}`);
    state.draft.mail = null;
  },
});
