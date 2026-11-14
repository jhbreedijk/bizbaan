/* Talk: every call, message, visit and change of a project in one history, plus mail and WhatsApp from templates. */
'use strict';

const TALK_KINDS = [['call', 'Call'], ['email', 'Email'], ['whatsapp', 'WhatsApp'], ['visit', 'Visit'], ['note', 'Note']];
const TALK_NAME = { ...Object.fromEntries(TALK_KINDS), request: 'Request', change: 'Change', system: 'Update' };

/** Fills {client}, {start} and the rest into a template, from this project. */
function fillMail(text, p) {
  const L = p.offer.lang, s = Calc.schedule(p), S = projectSum(p), co = state.settings.company, inv = docsOf(p, 'invoice').at(-1);
  const v = {
    client: p.client || (L === 'nl' ? 'klant' : 'client'), address: p.geo?.label || p.address || '',
    start: s.start ? day(s.start, L, true) : '…', end: s.end ? day(s.end, L, true) : '…', weeks: s.weeks || '…',
    offer: S.cur?.no || '', total: eur(S.cur?.incVat ?? compute(p, state.materials).incVat),
    invoice: inv?.no || '', amount: inv ? eur(inv.incVat, 2) : '',
    owner: co.owner, company: co.name, phone: co.phone, review: co.review || '', change: '',
  };
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in v ? String(v[k]) : m));
}

const talkLayout = () => `<div class="cols"><div class="stack"><section class="card" data-sec="write"></section><section class="card" data-sec="mail"></section></div><section class="card" data-sec="log"></section></div>`;
const TALK = {
  write() {
    const p = P(), open = openTasks(p), dr = state.draft || {};
    return `<h2>Log contact</h2>
      <div class="f"><span>How</span>${SEG('st.draft.talkKind', TALK_KINDS)}</div>
      ${TA('What was said', 'st.draft.talkText', { ph: 'Start can move a week. Keys with the neighbours at number 12.' })}
      ${open.length ? `<label class="f"><span>This settles</span><select data-bind="st.draft.talkTask"><option value="">Nothing in the planning</option>${open.map((t) => `<option value="${t.key}" ${dr.talkTask === t.key ? 'selected' : ''}>${t.date ? dm(t.date) + ' · ' : ''}${esc(t.title)}</option>`).join('')}</select></label>` : ''}
      <div class="acts"><button class="primary" data-act="logtalk">Log it</button></div>`;
  },
  mail() {
    const p = P(), m = state.draft?.mail, L = p.offer.lang;
    const list = state.settings.mails.filter((t) => t.lang === L);
    return `<h2>Email and WhatsApp</h2>
      <div class="chips">${list.map((t) => `<button type="button" class="chip sm ${m?.tpl === t.id ? 'on' : ''}" data-act="mailtpl" data-id="${t.id}">${esc(t.name)}</button>`).join('') || '<span class="hint">No templates in this language. Add them in settings.</span>'}</div>
      ${m ? `<div class="grid">${F('To', 'st.draft.mail.to', { type: 'email', cls: 'wide' })}${F('Subject', 'st.draft.mail.subject', { type: 'text', cls: 'wide' })}${TA('Message', 'st.draft.mail.body', { rows: 10 })}</div>
        <div class="acts"><button data-act="sendmail" data-how="mail">Open in mail</button>${p.phone ? '<button data-act="sendmail" data-how="wa">Send by WhatsApp</button>' : ''}<button data-act="sendmail" data-how="copy">Copy</button></div>
        <p class="hint">Your mail app or WhatsApp opens with the text ready. It goes into the history as sent.</p>` : '<p class="hint">Pick a template. It fills in the client, dates and amounts of this project.</p>'}`;
  },
  log() {
    const p = P(), all = tasks(p);
    const rows = p.talk.map((e) => {
      const at = new Date(e.at), when = `${day(at.getTime())} ${at.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`;
      const settled = e.task && all.find((t) => t.key === e.task);
      return `<div class="lrow"><span class="tag k-${e.kind}">${TALK_NAME[e.kind] || e.kind}</span><div><small class="mute">${when}</small><p>${esc(e.text)}</p>${settled ? `<small class="mute">Settled: ${esc(settled.title)}</small>` : ''}</div>
        ${['system', 'request', 'change'].includes(e.kind) ? '' : `<button class="x" data-act="talkdel" data-id="${e.id}" aria-label="Remove">×</button>`}</div>`;
    }).join('');
    return `<h2>History ${O('tcount', `${p.talk.length}`, 'amt small')}</h2>${rows || '<p class="empty">Nothing yet. Every call, mail and change lands here.</p>'}`;
  },
};

Object.assign(A, {
  logtalk() {
    const p = P(), dr = (state.draft ??= {});
    if (!dr.talkText?.trim()) { ui.status = 'Type what was said.'; return; }
    logTalk(p, dr.talkKind || 'call', dr.talkText.trim(), dr.talkTask ? { task: dr.talkTask } : {});
    if (dr.talkTask) p.plan.done[dr.talkTask] = today();
    if (p.status === 'request' && (dr.talkKind || 'call') === 'call') p.call.phone = true;
    Object.assign(dr, { talkText: '', talkTask: '' });
  },
  talkdel(d) { const p = P(); p.talk = p.talk.filter((e) => e.id !== d.id); },
  mailtpl(d) {
    const p = P(), t = state.settings.mails.find((x) => x.id === d.id);
    if (!t) return;
    const fill = (x) => fillMail(x, p).replace('{change}', d.change || '');
    (state.draft ??= {}).mail = { tpl: t.id, to: p.email, subject: fill(t.subject), body: fill(t.body) };
  },
  sendmail(d) {
    const p = P(), m = state.draft.mail, text = `${m.subject}\n\n${m.body}`;
    if (d.how === 'copy') { navigator.clipboard?.writeText(text).then(() => say('Copied.'), () => say('Copying is blocked here. Select the text and copy it.')); return false; }
    if (d.how === 'wa') window.open(`https://wa.me/${waNumber(p.phone)}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    else location.href = `mailto:${encodeURIComponent(m.to || '')}?subject=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(m.body)}`;
    logTalk(p, d.how === 'wa' ? 'whatsapp' : 'email', `${m.subject}\n\n${m.body}`);
    state.draft.mail = null;
  },
});
