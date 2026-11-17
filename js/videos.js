/* Help videos. The instruction video opens on every visit until it has been watched to the end (pausing is fine).
   Each page offers its own short part of the video on the first visit, and every section has a ? that plays it.
   All of it switches off under Settings, Help. The parts come from help/bizbaan-video-chapters.json. */
'use strict';

const VIDEO = 'help/bizbaan-video.mp4?v=4';
let CHAPTERS = null;
fetch('help/bizbaan-video-chapters.json?v=4').then((r) => (r.ok ? r.json() : null)).then((j) => { CHAPTERS = j; if (j && ui.view !== 'home') paint(true); }).catch(() => {});
const PAGE_NAME = () => ({ home: 'Home', ...Object.fromEntries(Object.entries(TABS).map(([k, t]) => [k, t.name])) });
const pageKey = () => (ui.view === 'project' ? ui.tab : ui.view === 'home' ? 'home' : null);

function videoModal() {
  const m = ui.modal, ch = m.tab && CHAPTERS?.[m.tab], first = !m.tab && !state.settings.videoSeen;
  const title = m.tab ? `${PAGE_NAME()[m.tab]} <span class="mute">in ${Math.round(ch[1] - ch[0])} seconds</span>` : 'How your workstation works';
  return `<h2>${title}</h2><video id="helpvid" src="${VIDEO}" controls playsinline preload="auto"></video>
    <div class="acts"><button data-act="vidclose">${first ? 'Later' : 'Close'}</button>${m.tab ? '<button data-act="vidopen">The whole video</button>' : ''}</div>
    ${first ? '<p class="hint">It comes back next time until you have seen it to the end. Pause whenever you like.</p>' : ''}`;
}
/** Starts the video at the page's part and stops at its end; the whole video marks itself seen when it ends. */
function setupVideo() {
  const v = $('#helpvid'), m = ui.modal;
  if (!v || !m) return;
  const ch = m.tab && CHAPTERS?.[m.tab];
  v.addEventListener('loadedmetadata', () => { if (ch) v.currentTime = ch[0]; v.play().catch(() => {}); }, { once: true });
  if (ch) v.addEventListener('timeupdate', () => { if (v.currentTime >= ch[1]) { v.pause(); v.currentTime = ch[1]; } });
  else v.addEventListener('ended', () => { state.settings.videoSeen = true; save(); });
}
/** The first time on a page: a small offer to watch its part. Once answered, never again for that page. */
function introPrompt() {
  const box = $('#intro'), k = pageKey(), s = state.settings;
  const show = s.explain !== false && s.videoSeen && k && CHAPTERS?.[k] && !s.pagesSeen?.[k] && !ui.modal && ui.tour == null;
  box.classList.toggle('on', !!show);
  if (show) box.innerHTML = `<b>First time on ${PAGE_NAME()[k]}.</b><span>Watch the ${Math.round(CHAPTERS[k][1] - CHAPTERS[k][0])}-second intro?</span><div class="acts tight"><button class="primary" data-act="introyes">Show me</button><button data-act="introno">No thanks</button></div>`;
}
/** A ? on every section of a page that has its own part of the video. */
function questionMarks(root) {
  const k = pageKey();
  if (state.settings.explain === false || !k || !CHAPTERS?.[k]) return;
  for (const h of root.querySelectorAll('.card > h2')) if (!h.querySelector('.qbtn'))
    h.insertAdjacentHTML('beforeend', `<button class="qbtn" data-act="vidtab" data-tab="${k}" aria-label="What is this?" title="What is this?">?</button>`);
}

Object.assign(A, {
  vidopen() { ui.modal = { kind: 'video' }; },
  vidtab(d) { ui.modal = { kind: 'video', tab: d.tab }; },
  vidclose() { ui.modal = null; },
  introyes() { const k = pageKey(); (state.settings.pagesSeen ??= {})[k] = true; ui.modal = { kind: 'video', tab: k }; },
  introno() { (state.settings.pagesSeen ??= {})[pageKey()] = true; },
});
