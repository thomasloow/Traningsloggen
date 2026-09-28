import { PROGRAM, WARMUPS, STRENGTH_MET, GOAL_DATE } from './program.js';

/* ---------- hjälpfunktioner ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n, d = 1) => Number(n).toLocaleString('sv-SE', { maximumFractionDigits: d });
const signed = (n, unit = '') => (n > 0 ? '+' : n < 0 ? '−' : '±') + fmt(Math.abs(n)) + unit;
const DAYNAMES = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];
const MONTHS = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];
const DAY_MS = 86400000;
const days = () => PROGRAM.map(d => ({ ...d, exercises: [...d.exercises, ...(((data && data.custom) || []).filter(c => c.dayId === d.id))] }));
const allEx = () => days().flatMap(d => d.exercises);
const exById = id => allEx().find(e => e.id === id);
const dayById = id => days().find(d => d.id === id);
const dayOfEx = id => days().find(d => d.exercises.some(e => e.id === id));
const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100"><rect width="160" height="100" fill="#DCE3EC"/><g fill="#0E2240"><rect x="30" y="47" width="100" height="6" rx="3"/><rect x="42" y="30" width="10" height="40" rx="3"/><rect x="108" y="30" width="10" height="40" rx="3"/><rect x="54" y="37" width="7" height="26" rx="2"/><rect x="99" y="37" width="7" height="26" rx="2"/></g></svg>');
const photoUrl = k => '/.netlify/functions/photo?k=' + encodeURIComponent(k);
function imgSrc(e) {
  const o = data && data.overrides && data.overrides[e.id];
  const k = (o && o.photo) || e.photo;
  if (k) return photoUrl(k);
  if (e.img) return '/' + e.img.replace(/^\/?(img\/)?/, '');
  return PLACEHOLDER;
}
document.addEventListener('error', ev => { const el = ev.target; if (el && el.tagName === 'IMG' && !el.dataset.fb) { el.dataset.fb = '1'; el.src = PLACEHOLDER; } }, true);
const ymd = t => new Date(t).toLocaleDateString('sv-SE');
const target = e => `${e.sets} × ${e.reps[0] === e.reps[1] ? e.reps[0] : e.reps[0] + '–' + e.reps[1]}${e.perSide ? ' / ' + e.perSide : ''}`;
function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const n = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - n);
  const y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - y0) / DAY_MS + 1) / 7);
}
function weekStart(date) { const d = new Date(date); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; }
const clock = sec => { sec = Math.max(0, Math.floor(sec)); const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = sec % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0'); };
const hm = min => min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`;

let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 3200); }

/* ---------- inloggning (Netlify Identity / GoTrue) ---------- */
const ID = '/.netlify/identity';
let auth = JSON.parse(localStorage.getItem('tl_auth') || 'null');
let user = null;
function saveAuth(t) {
  auth = { access_token: t.access_token, refresh_token: t.refresh_token, expires_at: Date.now() + (t.expires_in || 3600) * 1000 };
  localStorage.setItem('tl_auth', JSON.stringify(auth));
  user = userFromToken();
}
function userFromToken() {
  try {
    let p = auth.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    p += '==='.slice((p.length + 3) % 4);
    const j = JSON.parse(decodeURIComponent(escape(atob(p))));
    return { id: j.sub, email: j.email, name: (j.user_metadata && j.user_metadata.full_name) || '' };
  } catch { return null; }
}
async function tokenReq(params) {
  const r = await fetch(ID + '/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params) });
  if (!r.ok) throw new Error('auth');
  saveAuth(await r.json());
}
async function getToken() {
  if (!auth) return null;
  if (Date.now() > auth.expires_at - 60000) {
    try { await tokenReq({ grant_type: 'refresh_token', refresh_token: auth.refresh_token }); }
    catch { if (navigator.onLine) logout(); return null; }
  }
  return auth.access_token;
}
async function verify(body) {
  const r = await fetch(ID + '/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error('verify');
  saveAuth(await r.json());
}
async function setPassword(password) {
  const t = await getToken();
  const r = await fetch(ID + '/user', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify({ password }) });
  if (!r.ok) throw new Error('pw');
}
function logout() { localStorage.removeItem('tl_auth'); auth = null; user = null; data = null; location.hash = '#/'; render(); }

/* ---------- data och synk ---------- */
let data = null, saveT = null, dirty = false, synced = true;
const cacheKey = () => 'tl_data_' + user.id;
const blank = () => ({ version: 1, profile: { name: user.name || '', heightCm: null, weights: [] }, schedule: { 1: 'd1', 2: 'd2', 3: 'd3', 6: 'd4' }, sessions: [], custom: [], overrides: {}, updatedAt: 0 });
async function api(method, body) {
  const t = await getToken();
  if (!t) throw new Error('noauth');
  const r = await fetch('/.netlify/functions/data', { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error('http ' + r.status);
  return r.json();
}
async function loadData() {
  const cached = JSON.parse(localStorage.getItem(cacheKey()) || 'null');
  data = cached || blank();
  try {
    const remote = await api('GET');
    if (remote && (!cached || (remote.updatedAt || 0) >= (cached.updatedAt || 0))) data = remote;
    else if (cached) { dirty = true; push(); }
    synced = true;
  } catch { synced = false; toast('Offline – visar sparad data på telefonen'); }
  data.custom = data.custom || []; data.overrides = data.overrides || {};
  localStorage.setItem(cacheKey(), JSON.stringify(data));
}
function save() {
  data.updatedAt = Date.now();
  localStorage.setItem(cacheKey(), JSON.stringify(data));
  dirty = true; clearTimeout(saveT); saveT = setTimeout(push, 800);
}
async function push() {
  if (!dirty || !data) return;
  try { await api('PUT', data); dirty = false; synced = true; }
  catch { synced = false; }
  const dot = $('.sync'); if (dot) dot.classList.toggle('off', !synced);
}
addEventListener('online', push);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') push(); });

/* ---------- pass, kalorier och historik ---------- */
const active = () => data.sessions.find(s => !s.end);
const bodyKg = () => { const w = data.profile.weights; return w.length ? w[w.length - 1].kg : 80; };
const durMin = s => Math.max(s.warmup ? s.warmup.min : 0, Math.round(((s.end || Date.now()) - s.start) / 60000));
const warmupKcal = w => { const t = w && WARMUPS.find(x => x.id === w.type); return t ? t.met * bodyKg() * w.min / 60 : 0; };
function sessionKcal(s) {
  const strengthMin = Math.max(0, durMin(s) - (s.warmup ? s.warmup.min : 0));
  return Math.round(STRENGTH_MET * bodyKg() * strengthMin / 60 + warmupKcal(s.warmup));
}
const doneSets = (s, exId) => (s.sets[exId] || []).filter(x => x.done && x.r > 0);
const sessionVolume = s => Object.keys(s.sets).reduce((a, k) => a + doneSets(s, k).reduce((b, x) => b + x.kg * x.r, 0), 0);
const hasWork = s => Object.keys(s.sets).some(k => doneSets(s, k).length) || s.warmup;

function startSession(dayId) {
  let s = active();
  if (s) return s;
  s = { id: 's' + Date.now(), dayId, start: Date.now(), end: null, warmup: null, sets: {}, note: '' };
  data.sessions.push(s); save(); keepAwake(true);
  return s;
}
function ensureSession(day) {
  const s = active();
  if (s && s.dayId !== day.id) {
    if (!confirm(`Du har ett pågående pass (${dayById(s.dayId).name}). Avsluta det och starta ${day.name}?`)) return null;
    endSession(true);
  }
  if (!active()) { startSession(day.id); toast('Passet startat – timern går'); }
  return active();
}
function endSession(silent) {
  const s = active(); if (!s) return;
  stopRest();
  s.end = Date.now();
  for (const k of Object.keys(s.sets)) { s.sets[k] = s.sets[k].filter(x => x.done && x.r > 0); if (!s.sets[k].length) delete s.sets[k]; }
  if (!hasWork(s)) { data.sessions = data.sessions.filter(x => x !== s); save(); if (!silent) toast('Tomt pass – inget sparat'); keepAwake(false); return; }
  save(); keepAwake(false);
  if (!silent) toast(`Pass sparat: ${hm(durMin(s))} · ≈ ${fmt(sessionKcal(s), 0)} kcal · ${fmt(sessionVolume(s) / 1000)} ton`);
}

function exHistory(exId) {
  return data.sessions.filter(s => doneSets(s, exId).length).sort((a, b) => b.start - a.start)
    .map(s => { const sets = doneSets(s, exId); return { s, sets, best: Math.max(...sets.map(x => x.kg)) }; });
}
const kgStep = kg => kg < 20 ? 1 : 2.5;
function suggestion(e) {
  const cur = active();
  const h = exHistory(e.id).filter(x => x.s !== cur);
  if (!h.length) return null;
  const last = h[0];
  const hit = last.sets.length >= e.sets && last.sets.every(x => x.r >= e.reps[1]) && last.best > 0;
  if (!hit) return { last, up: false };
  const step = kgStep(last.best);
  return { last, up: true, kg: Math.max(last.best + step, Math.ceil(last.best * 1.025 / step) * step) };
}
function prefill(e) {
  const sg = suggestion(e);
  if (!sg) return Array.from({ length: e.sets }, () => ({ kg: 0, r: e.reps[1], done: false }));
  if (sg.up) return Array.from({ length: e.sets }, () => ({ kg: sg.kg, r: e.reps[0], done: false }));
  const ls = sg.last.sets;
  return Array.from({ length: Math.max(e.sets, ls.length) }, (_, i) => { const x = ls[i] || ls[ls.length - 1]; return { kg: x.kg, r: x.r, done: false }; });
}
function diffs(exId) {
  const h = exHistory(exId); if (h.length < 2) return null;
  const latest = h[0], out = { Pass: latest.best - h[1].best };
  for (const [k, days] of [['Vecka', 7], ['Månad', 30], ['År', 365]]) {
    const cut = latest.s.start - days * DAY_MS;
    const ref = h.find(x => x.s.start <= cut) || h[h.length - 1];
    out[k] = latest.best - ref.best;
  }
  return out;
}
function records() {
  const out = [];
  for (const e of allEx()) {
    const h = exHistory(e.id).slice().reverse();
    if (h.length < 2) continue;
    let best = h[0].best, rec = null;
    for (const x of h.slice(1)) if (x.best > best) { best = x.best; rec = x; }
    if (rec) { const set = rec.sets.find(x => x.kg === rec.best); out.push({ e, at: rec.s.start, kg: rec.best, r: set.r }); }
  }
  return out.sort((a, b) => b.at - a.at);
}
function weekStats(ref = new Date()) {
  const ws = weekStart(ref).getTime(), we = ws + 7 * DAY_MS;
  const ss = data.sessions.filter(s => s.start >= ws && s.start < we && (s.end ? true : hasWork(s)));
  return { ss, count: ss.length, min: ss.reduce((a, s) => a + durMin(s), 0), kcal: ss.reduce((a, s) => a + sessionKcal(s), 0), vol: ss.reduce((a, s) => a + sessionVolume(s), 0) };
}
const plannedPerWeek = () => Object.values(data.schedule).filter(Boolean).length || 4;
function streak() {
  const goal = plannedPerWeek(); let n = 0; const d = new Date(); d.setDate(d.getDate() - 7);
  while (weekStats(d).count >= goal && n < 200) { n++; d.setDate(d.getDate() - 7); }
  if (weekStats().count >= goal) n++;
  return n;
}
function nextPlanned() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const doneToday = data.sessions.some(s => ymd(s.start) === ymd(today) && s.end);
  for (let i = 0; i < 8; i++) {
    const d = new Date(today.getTime() + i * DAY_MS), dayId = data.schedule[d.getDay()];
    if (dayId && !(i === 0 && doneToday)) return { date: d, day: dayById(dayId), label: i === 0 ? 'idag' : i === 1 ? 'imorgon' : DAYNAMES[d.getDay()].toLowerCase() };
  }
  return { date: today, day: dayById('d1'), label: 'idag' };
}
function notes() {
  const left = Math.max(0, Math.ceil((new Date(GOAL_DATE + 'T00:00:00') - new Date()) / DAY_MS));
  const w = weekStats(), rec = records()[0], st = streak(), nx = nextPlanned();
  const list = [];
  if (left) list.push(`${left} dagar kvar till 1 december. Med ${plannedPerWeek()} pass i veckan blir det cirka ${Math.round(left / 7 * plannedPerWeek())} pass till.`);
  if (w.vol >= 5000) list.push(`Du har lyft ${fmt(w.vol / 1000)} ton den här veckan. Det är ungefär ${fmt(w.vol / 5000)} elefanter.`);
  else if (w.vol >= 1000) list.push(`Du har lyft ${fmt(w.vol / 1000)} ton den här veckan. Ungefär ${fmt(w.vol / 2000)} Volvo XC60.`);
  if (rec) list.push(`Senaste rekordet: ${rec.e.name}, ${fmt(rec.kg)} kg × ${rec.r}. Nästa steg: ${fmt(rec.kg + kgStep(rec.kg))} kg.`);
  if (st >= 2) list.push(`${st} veckor i rad med ${plannedPerWeek()} pass. Kontinuitet slår motivation.`);
  list.push(`Nästa pass ${nx.label}: ${nx.day.short}. Lägg fram träningskläderna kvällen innan.`);
  list.push('Kontinuitet idag – starkare imorgon. Ett pass i taget.');
  return list;
}

/* ---------- skärmen vaken under pass ---------- */
let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); }
    if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch { /* ignoreras */ }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && data && active()) keepAwake(true); });

/* ---------- vilotimer ---------- */
const rest = { endAt: 0, total: 0, t: null };
function startRest(sec) {
  clearInterval(rest.t); rest.total = sec; rest.endAt = Date.now() + sec * 1000;
  $('#rest').classList.add('on'); drawRest(); rest.t = setInterval(drawRest, 250);
}
function drawRest() {
  const left = Math.max(0, Math.ceil((rest.endAt - Date.now()) / 1000));
  $('#rt').textContent = clock(left); $('#rb').style.width = (left / rest.total * 100) + '%';
  if (left <= 0) { stopRest(); if (navigator.vibrate) navigator.vibrate([300, 150, 300]); toast('Vilan är slut – nästa set'); }
}
function stopRest() { clearInterval(rest.t); $('#rest').classList.remove('on'); }
$('#rplus').onclick = () => { rest.endAt += 15000; rest.total += 15; drawRest(); };
$('#rskip').onclick = stopRest;

/* ---------- vyer ---------- */
const app = $('#app');
let pending = null;      // {kind, token} från e-postlänk
let noteIdx = 0;
const drafts = {};       // set som inte hunnit sparas i ett pass

function render() {
  if (!user) { $('#nav').hidden = true; return viewAuth(); }
  if (pending && pending.kind === 'recovery') { $('#nav').hidden = true; return viewNewPassword(); }
  $('#nav').hidden = false;
  const p = (location.hash.slice(1) || '/').split('/').filter(Boolean);
  $$('#nav a').forEach(a => a.classList.toggle('on', a.dataset.r === ({ ovning: 'pass', ny: 'pass', andra: 'pass', logg: 'historik' }[p[0]] || p[0] || 'hem')));
  if (p[0] === 'pass') viewDay(p[1]);
  else if (p[0] === 'ovning') viewExercise(p[1]);
  else if (p[0] === 'profil') viewProfile();
  else if (p[0] === 'historik') viewHistory();
  else if (p[0] === 'logg') viewSession(p[1]);
  else if (p[0] === 'ny') viewExerciseForm(p[1], null);
  else if (p[0] === 'andra') viewExerciseForm(null, p[1]);
  else viewHome();
  scrollTo(0, 0);
}
addEventListener('hashchange', render);
setInterval(() => {
  const s = data && active();
  $$('[data-clock]').forEach(el => { el.textContent = s ? clock((Date.now() - s.start) / 1000) : '0:00'; });
}, 1000);

/* inloggning */
function viewAuth(mode = pending && pending.kind === 'invite' ? 'invite' : 'login') {
  if (mode === 'invite') {
    app.innerHTML = `<div class="auth"><h1>Välkommen</h1><p>Välj ett lösenord för Träningsloggen.</p>
      <label class="field"><span>Lösenord (minst 8 tecken)</span><input id="pw" type="password" autocomplete="new-password"></label>
      <label class="field"><span>Upprepa lösenord</span><input id="pw2" type="password" autocomplete="new-password"></label>
      <div class="err" id="err"></div><button class="btn" id="go">Skapa konto</button></div>`;
    $('#go').onclick = async () => {
      const pw = $('#pw').value;
      if (pw.length < 8) return ($('#err').textContent = 'Lösenordet behöver minst 8 tecken.');
      if (pw !== $('#pw2').value) return ($('#err').textContent = 'Lösenorden matchar inte.');
      try { await verify({ token: pending.token, type: 'signup', password: pw }); pending = null; await boot(); }
      catch { $('#err').textContent = 'Inbjudan är ogiltig eller har gått ut. Be om en ny.'; }
    };
    return;
  }
  app.innerHTML = `<div class="auth"><h1>Träningsloggen</h1><p>Kontinuitet idag – starkare imorgon</p>
    <label class="field"><span>E-post</span><input id="em" type="email" autocomplete="username" inputmode="email"></label>
    <label class="field"><span>Lösenord</span><input id="pw" type="password" autocomplete="current-password"></label>
    <div class="err" id="err"></div><button class="btn" id="go">Logga in</button>
    <button class="linkbtn" id="forgot">Glömt lösenordet?</button></div>`;
  const go = async () => {
    $('#err').textContent = '';
    try { await tokenReq({ grant_type: 'password', username: $('#em').value.trim(), password: $('#pw').value }); await boot(); }
    catch { $('#err').textContent = 'Fel e-post eller lösenord.'; }
  };
  $('#go').onclick = go;
  $('#pw').onkeydown = e => { if (e.key === 'Enter') go(); };
  $('#forgot').onclick = async () => {
    const email = $('#em').value.trim();
    if (!email) return ($('#err').textContent = 'Skriv din e-post först.');
    await fetch(ID + '/recover', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    toast('Om adressen finns skickas en länk för nytt lösenord.');
  };
}
function viewNewPassword() {
  app.innerHTML = `<div class="auth"><h1>Nytt lösenord</h1><p>Välj ett nytt lösenord.</p>
    <label class="field"><span>Lösenord (minst 8 tecken)</span><input id="pw" type="password" autocomplete="new-password"></label>
    <div class="err" id="err"></div><button class="btn" id="go">Spara lösenord</button></div>`;
  $('#go').onclick = async () => {
    const pw = $('#pw').value;
    if (pw.length < 8) return ($('#err').textContent = 'Lösenordet behöver minst 8 tecken.');
    try { await setPassword(pw); pending = null; toast('Lösenordet är sparat'); render(); }
    catch { $('#err').textContent = 'Det gick inte att spara. Försök igen.'; }
  };
}

/* startsida */
function viewHome() {
  const now = new Date(), w = weekStats(), goal = plannedPerWeek(), nx = nextPlanned(), s = active();
  const ns = notes(); noteIdx %= ns.length;
  const circ = 301.6, off = circ * (1 - Math.min(1, w.count / goal));
  const ws = weekStart(now);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(ws.getTime() + i * DAY_MS), wd = d.getDay(), dayId = data.schedule[wd];
    const done = w.ss.filter(x => ymd(x.start) === ymd(d));
    const info = done.length ? `${DAYNAMES[wd]}: ${done.map(x => `${dayById(x.dayId).short}, ${hm(durMin(x))}${x.warmup ? ' inkl. uppvärmning' : ''}`).join(' + ')}`
      : dayId ? `${DAYNAMES[wd]}: planerat ${dayById(dayId).name}` : `${DAYNAMES[wd]}: vila`;
    return `<button class="day ${done.length ? 's' : dayId ? 'p' : ''} ${ymd(d) === ymd(now) ? 'today' : ''}" data-info="${esc(info)}" aria-label="${esc(info)}">${DAYNAMES[wd][0]}<i></i></button>`;
  }).join('');
  const weeks = Array.from({ length: 8 }, (_, i) => { const d = new Date(now.getTime() - (7 - i) * 7 * DAY_MS); return { wk: isoWeek(d), min: weekStats(d).min }; });
  const maxMin = Math.max(60, ...weeks.map(x => x.min));
  const avg = Math.round(weeks.slice(0, 7).reduce((a, x) => a + x.min, 0) / 7);
  const wts = data.profile.weights, recs = records().slice(0, 3);
  const nextDay = s ? dayById(s.dayId) : nx.day;

  app.innerHTML = `
  <header class="hdr"><div><small>${DAYNAMES[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]} · vecka ${isoWeek(now)}</small>
    <h1>Hej ${esc((data.profile.name || user.name || '').split(' ')[0] || 'där')}</h1></div><span class="sync ${synced ? '' : 'off'}" title="${synced ? 'Synkad' : 'Ej synkad ännu'}"></span></header>
  <p class="motto">Kontinuitet idag – starkare imorgon</p>
  <button class="note" id="note"><span class="ic" aria-hidden="true">⚡</span><span><p id="noteText">${esc(ns[noteIdx])}</p><small>Tryck för nästa</small></span></button>

  <div class="week"><div class="row">
    <div class="ring"><svg width="112" height="112" viewBox="0 0 112 112" aria-hidden="true">
      <circle cx="56" cy="56" r="48" fill="none" stroke="rgba(127,127,127,.3)" stroke-width="10"/>
      <circle cx="56" cy="56" r="48" fill="none" stroke="#4DA3FF" stroke-width="10" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${off}"/></svg>
      <div><b>${w.count}/${goal}</b><small>styrkepass</small></div></div>
    <div class="wk"><h2>Den här veckan</h2><dl>
      <dt>Tid</dt><dd>${hm(w.min)}</dd><dt>Kalorier</dt><dd>≈ ${fmt(w.kcal, 0)} kcal</dd>
      <dt>Volym</dt><dd>${fmt(w.vol / 1000)} ton</dd><dt>I rad</dt><dd>${streak()} veckor</dd></dl></div></div>
    <div class="days">${days}</div><div class="dayinfo" id="dayinfo"></div>
    <div class="legend"><span style="--c:#4DA3FF">Tränat</span><span style="--c:transparent;--b:2px solid #4DA3FF">Planerat</span></div></div>

  <section><h3>${s ? 'Pågående pass' : 'Nästa pass'} <span>${s ? '' : nx.label + ' 06–09'}</span></h3>
    <div class="next"><div class="img"><img src="${imgSrc(nextDay.exercises[0])}" alt=""><span class="tag">${nextDay.exercises.length} övningar · 45–50 min</span></div>
    <div class="body"><h4>${esc(nextDay.name)}</h4><p>${esc(nextDay.exercises.slice(0, 3).map(e => e.name).join(', '))} med mera.</p>
    ${s ? `<a class="btn go" href="#/pass/${s.dayId}">Fortsätt <b data-clock>${clock((Date.now() - s.start) / 1000)}</b></a>` : `<button class="btn" id="start">Starta pass</button>`}</div></div></section>

  <section><h3>Träningstid <span>senaste 8 veckorna</span></h3><div class="card">
    <div class="bars" role="img" aria-label="Träningstid per vecka">${weeks.map(x => `<div><i style="height:${Math.round(x.min / maxMin * 100)}%" title="${hm(x.min)}"></i><small>v${x.wk}</small></div>`).join('')}</div>
    <p class="muted" style="margin:10px 0 0">Snitt ${hm(avg)} per vecka de senaste 7 hela veckorna.</p></div></section>

  <section><h3>Kroppen</h3><div class="two">
    <a class="card" href="#/profil" style="color:var(--ink)"><div class="muted">Vikt nu</div><div class="big">${wts.length ? fmt(bodyKg()) + ' kg' : '–'}</div>
      ${wts.length > 1 ? `<div class="${bodyKg() - wts[0].kg <= 0 ? 'good' : 'badv'}">${signed(bodyKg() - wts[0].kg, ' kg')} sedan start</div>` : `<div class="muted">Lägg in din vikt</div>`}</a>
    <div class="card"><div class="muted">Kalorier i veckan</div><div class="big">≈ ${fmt(w.kcal, 0)}</div><div class="muted">förra veckan ≈ ${fmt(weekStats(new Date(Date.now() - 7 * DAY_MS)).kcal, 0)}</div></div></div></section>

  ${data.sessions.some(x => x.end) ? `<section><h3>Senaste pass <a href="#/historik" style="font-family:Barlow,sans-serif;font-size:14px;font-weight:500">Visa alla</a></h3><div class="card list">${data.sessions.filter(x => x.end).sort((a, b) => b.start - a.start).slice(0, 3).map(sessionRow).join('')}</div></section>` : ''}
  ${recs.length ? `<section><h3>Senaste rekord</h3><div class="card list">${recs.map(r => `<a href="#/ovning/${r.e.id}"><span>${esc(r.e.name)}${ymd(r.at) === ymd(now) ? '<span class="badge">Idag</span>' : ''}</span><em>${fmt(r.kg)} kg × ${r.r}</em></a>`).join('')}</div></section>` : ''}`;

  $('#note').onclick = () => { noteIdx = (noteIdx + 1) % ns.length; $('#noteText').textContent = ns[noteIdx]; };
  $$('.day').forEach(b => b.onclick = () => { $('#dayinfo').textContent = b.dataset.info; });
  const today = $('.day.today'); if (today) $('#dayinfo').textContent = today.dataset.info;
  const st = $('#start'); if (st) st.onclick = () => { startSession(nx.day.id); location.hash = '#/pass/' + nx.day.id; };
}

/* dagvy */
function viewDay(dayId) {
  const s = active();
  const d = dayById(dayId) || (s ? dayById(s.dayId) : nextPlanned().day);
  const mine = s && s.dayId === d.id;
  const last = data.sessions.filter(x => x.dayId === d.id && x.end).sort((a, b) => b.start - a.start)[0];
  const wu = mine && s.warmup;
  app.innerHTML = `
  <nav class="tabs" aria-label="Dagar">${PROGRAM.map((x, i) => `<a href="#/pass/${x.id}" class="${x.id === d.id ? 'on' : ''}">Dag ${i + 1}</a>`).join('')}</nav>
  <div class="dayhead"><h1>${esc(d.short)}</h1><p>${esc(d.focus)}${last ? ` · förra gången ${hm(durMin(last))}` : ''}</p></div>
  ${s && !mine ? `<div class="notice">Du har ett pågående pass: <a href="#/pass/${s.dayId}">${esc(dayById(s.dayId).name)}</a>.</div>` : ''}
  <div class="card timer"><div><div class="muted">Passtimer</div><div class="clock" ${mine ? 'data-clock' : ''}>${mine ? clock((Date.now() - s.start) / 1000) : '0:00'}</div></div>
    ${mine ? `<button class="btn go small" id="end">Avsluta pass</button>` : `<button class="btn small" id="start">Starta pass</button>`}</div>

  <div class="warm"><h4>Uppvärmning</h4><p>${esc(d.warmup)}</p>
    ${wu ? `<div class="list"><div><span>${esc(WARMUPS.find(x => x.id === wu.type).name)}, ${wu.min} min</span><em>≈ ${fmt(warmupKcal(wu), 0)} kcal</em></div></div><button class="linkbtn" id="wuedit">Ändra</button>`
      : `<div class="row"><select id="wutype" aria-label="Typ av uppvärmning">${WARMUPS.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select>
        <input id="wumin" type="number" inputmode="numeric" min="1" max="120" value="6" aria-label="Minuter"></div>
        <div class="muted" id="wukcal" style="margin-bottom:8px"></div><button class="btn small" id="wusave">Spara uppvärmning</button>`}</div>

  <section><h3>Övningar <span>${d.exercises.length} st</span></h3><div class="exlist">
    ${d.exercises.map(e => {
      const done = mine ? doneSets(s, e.id).length : 0, sg = suggestion(e);
      const right = mine && done ? `${done}/${e.sets} ✓` : sg ? (sg.up ? `▲ ${fmt(sg.kg)} kg` : `${fmt(sg.last.best)} kg`) : '';
      return `<a href="#/ovning/${e.id}" class="${mine && done >= e.sets ? 'done' : ''}"><img src="${imgSrc(e)}" alt="" loading="lazy">
        <span class="t"><b>${esc(e.name)}</b><small>${target(e)} · vila ${e.rest} s</small></span><span class="st">${right}</span></a>`;
    }).join('')}</div><a class="add" href="#/ny/${d.id}" style="display:block;text-align:center">+ Lägg till egen övning</a></section>
  ${mine ? `<section><button class="btn go" id="end2">Avsluta pass</button><button class="linkbtn" id="cancel" style="width:100%;color:var(--bad)">Avbryt passet utan att spara</button></section>` : ''}`;

  const start = $('#start'); if (start) start.onclick = () => { if (ensureSession(d)) viewDay(d.id); };
  const end = () => { if (confirm('Avsluta och spara passet?')) { endSession(); location.hash = '#/'; } };
  if ($('#end')) $('#end').onclick = end;
  if ($('#end2')) $('#end2').onclick = end;
  if ($('#cancel')) $('#cancel').onclick = () => {
    if (!confirm('Avbryta passet? Allt som loggats i passet tas bort.')) return;
    deleteSession(active()); location.hash = '#/';
  };
  if ($('#wuedit')) $('#wuedit').onclick = () => { s.warmup = null; save(); viewDay(d.id); };
  if ($('#wusave')) {
    const upd = () => { const w = { type: $('#wutype').value, min: +$('#wumin').value || 0 }; $('#wukcal').textContent = `≈ ${fmt(warmupKcal(w), 0)} kcal vid ${fmt(bodyKg())} kg kroppsvikt`; };
    $('#wutype').onchange = upd; $('#wumin').oninput = upd; upd();
    $('#wusave').onclick = () => {
      const min = Math.round(+$('#wumin').value); if (!min) return toast('Ange antal minuter');
      const ss = ensureSession(d); if (!ss) return;
      ss.warmup = { type: $('#wutype').value, min }; save(); viewDay(d.id);
    };
  }
}

/* övningsvy */
function viewExercise(exId) {
  const e = exById(exId); if (!e) return viewHome();
  const d = dayOfEx(exId), idx = d.exercises.indexOf(e), nextEx = d.exercises[idx + 1];
  const sg = suggestion(e), df = diffs(exId), h = exHistory(exId);
  const s0 = active();
  if (s0 && s0.dayId === d.id && !s0.sets[exId]) s0.sets[exId] = drafts[exId] || prefill(e);
  let sets = s0 && s0.dayId === d.id ? s0.sets[exId] : (drafts[exId] = drafts[exId] || prefill(e));
  const inSession = () => { const s = active(); return s && s.dayId === d.id && s.sets[exId] === sets; };
  const persist = () => { if (inSession()) save(); };

  const chartPts = h.slice(0, 10).reverse();
  let chart = '';
  if (chartPts.length >= 2) {
    const ys = chartPts.map(x => x.best), lo = Math.min(...ys), hi = Math.max(...ys), span = hi - lo || 1;
    const pts = chartPts.map((x, i) => [10 + i * (300 / (chartPts.length - 1)), 95 - (x.best - lo) / span * 75]);
    chart = `<div class="card chart" style="margin-top:8px"><svg viewBox="0 0 320 110" role="img" aria-label="Tyngsta set de senaste ${chartPts.length} passen">
      <line x1="0" y1="102" x2="320" y2="102" stroke="var(--line)"/>
      <polyline fill="none" stroke="var(--blue)" stroke-width="3" stroke-linejoin="round" points="${pts.map(p => p.join(',')).join(' ')}"/>
      ${pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="${i === pts.length - 1 ? 5.5 : 3.5}" fill="${i === pts.length - 1 ? 'var(--go)' : 'var(--blue)'}"/>`).join('')}
      <text x="4" y="12" font-size="11" fill="var(--mute)">${fmt(hi)} kg</text><text x="4" y="92" font-size="11" fill="var(--mute)">${fmt(lo)} kg</text></svg></div>`;
  }

  app.innerHTML = `
  <header class="top"><a class="back" href="#/pass/${d.id}" aria-label="Tillbaka till ${esc(d.name)}">‹</a>
    <div class="t"><b>${esc(d.name)}</b><span>Övning ${idx + 1} av ${d.exercises.length}</span></div>
    <div class="dots" aria-hidden="true">${d.exercises.map((_, i) => `<i class="${i === idx ? 'on' : ''}"></i>`).join('')}</div></header>
  <div class="hero"><img src="${imgSrc(e)}" alt="${esc(e.name)}">
    <label class="photo">Byt bild<input type="file" accept="image/*" id="photoIn" hidden></label>
    <div class="cap"><h1>${esc(e.name)}</h1>
    <div class="chips">${(e.muscles || '').split(',').map(m => m.trim()).filter(Boolean).map(m => `<span>${esc(m)}</span>`).join('')}</div></div></div>
  ${e.custom ? `<a class="linkbtn" href="#/andra/${e.id}" style="display:inline-block">Ändra eller ta bort övningen</a>` : ''}
  <div class="target"><div><small>Mål</small><b>${target(e)}</b></div><div><small>Vila</small><b>${e.rest} s</b></div>
    <div><small>Förra passet</small><b>${sg ? fmt(sg.last.best) + ' kg' : '–'}</b></div></div>
  ${sg && sg.up ? `<div class="nudge"><strong>Dags att höja.</strong> Du klarade ${e.reps[1]} reps i alla set förra gången. Vikten är uppräknad till ${fmt(sg.kg)} kg (${signed(sg.kg - sg.last.best, ' kg')}).</div>` : ''}
  ${e.tip ? `<details class="tip"><summary>Teknik att tänka på</summary><p style="margin:8px 0 0">${esc(e.tip)}${e.custom ? '' : ' Träna med 1–2 reps i reserv på basövningarna.'}</p></details>` : ''}

  <section><h3>Dagens set <span id="vol"></span></h3><div id="sets"></div><button class="add" id="addSet">+ Lägg till set</button></section>
  <section><h3>Utveckling <span>tyngsta set</span></h3>
    ${df ? `<div class="diff">${Object.entries(df).map(([k, v]) => `<div><small>${k}</small><b class="${v > 0 ? 'good' : v < 0 ? 'badv' : ''}">${signed(v)}</b></div>`).join('')}</div>` : `<p class="muted">Utvecklingen visas efter två loggade pass.</p>`}
    ${chart}</section>
  ${h.length ? `<section><h3>Tidigare pass</h3><div class="card list">${h.slice(0, 6).map(x => `<div><span>${DAYNAMES[new Date(x.s.start).getDay()].slice(0, 3)} ${new Date(x.s.start).getDate()} ${MONTHS[new Date(x.s.start).getMonth()].slice(0, 3)}</span><em>${fmt(x.best)} kg · ${x.sets.map(y => y.r).join(', ')}</em></div>`).join('')}</div></section>` : ''}
  ${nextEx ? `<section><h3>Nästa övning</h3><div class="exlist"><a href="#/ovning/${nextEx.id}"><img src="${imgSrc(nextEx)}" alt=""><span class="t"><b>${esc(nextEx.name)}</b><small>${target(nextEx)} · vila ${nextEx.rest} s</small></span><span class="st">›</span></a></div></section>`
    : `<section><a class="btn ghost" href="#/pass/${d.id}">Tillbaka till passet</a></section>`}`;

  $('#photoIn').onchange = async ev => {
    const f = ev.target.files[0]; if (!f) return;
    toast('Laddar upp bilden …');
    try {
      const k = await uploadPhoto(f);
      const old = e.custom ? e.photo : (data.overrides[e.id] || {}).photo;
      if (e.custom) data.custom.find(c => c.id === e.id).photo = k; else data.overrides[e.id] = { photo: k };
      save(); if (old) deletePhoto(old);
      $('.hero img').src = photoUrl(k); toast('Bilden är sparad');
    } catch { toast('Det gick inte att ladda upp bilden. Försök igen.'); }
  };
  const drawSets = () => {
    $('#sets').innerHTML = sets.map((x, i) => `<div class="set ${x.done ? 'done' : ''}"><span class="n">${i + 1}</span>
      <div class="step"><button data-i="${i}" data-k="kg" data-v="-1" aria-label="Minska vikt">−</button><label><input data-i="${i}" data-k="kg" type="number" inputmode="decimal" step="0.5" value="${x.kg || ''}" placeholder="0"><small>kg</small></label><button data-i="${i}" data-k="kg" data-v="1" aria-label="Öka vikt">+</button></div>
      <div class="step"><button data-i="${i}" data-k="r" data-v="-1" aria-label="Färre reps">−</button><label><input data-i="${i}" data-k="r" type="number" inputmode="numeric" value="${x.r}"><small>reps${e.perSide ? '/' + e.perSide : ''}</small></label><button data-i="${i}" data-k="r" data-v="1" aria-label="Fler reps">+</button></div>
      <button class="chk" data-c="${i}" aria-label="Markera set ${i + 1} som klart">✓</button></div>`).join('');
    $('#vol').textContent = 'Volym ' + fmt(sets.filter(x => x.done).reduce((a, x) => a + x.kg * x.r, 0)) + ' kg';
  };
  drawSets();
  $('#sets').addEventListener('click', ev => {
    const b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.c !== undefined) {
      const x = sets[+b.dataset.c];
      if (!x.done && !x.r) return toast('Ange antal reps');
      if (!inSession()) {
        const s = ensureSession(d); if (!s) return;
        s.sets[exId] = sets;
        delete drafts[exId];
      }
      x.done = !x.done; persist(); drawSets();
      if (x.done) startRest(e.rest);
      return;
    }
    const x = sets[+b.dataset.i], k = b.dataset.k, dir = +b.dataset.v;
    x[k] = k === 'kg' ? Math.max(0, Math.round((x.kg + dir * kgStep(x.kg + (dir < 0 ? -0.01 : 0))) * 10) / 10) : Math.max(0, x.r + dir);
    persist(); drawSets();
  });
  $('#sets').addEventListener('change', ev => {
    const inp = ev.target.closest('input'); if (!inp) return;
    const x = sets[+inp.dataset.i], v = parseFloat(String(inp.value).replace(',', '.'));
    x[inp.dataset.k] = isNaN(v) ? 0 : inp.dataset.k === 'r' ? Math.round(v) : Math.round(v * 10) / 10;
    persist(); drawSets();
  });
  $('#addSet').onclick = () => { const l = sets[sets.length - 1] || { kg: 0, r: e.reps[1] }; sets.push({ kg: l.kg, r: l.r, done: false }); persist(); drawSets(); };
}

/* foton */
async function resizeImage(file, max = 1000) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.78).split(',')[1];
  } finally { URL.revokeObjectURL(url); }
}
async function uploadPhoto(file) {
  const t = await getToken(); if (!t) throw new Error('noauth');
  const body = JSON.stringify({ data: await resizeImage(file) });
  const r = await fetch('/.netlify/functions/photo', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body });
  if (!r.ok) throw new Error('upload');
  return (await r.json()).k;
}
async function deletePhoto(k) {
  try { const t = await getToken(); await fetch(photoUrl(k), { method: 'DELETE', headers: { Authorization: 'Bearer ' + t } }); } catch { /* ignoreras */ }
}

/* egen övning */
function viewExerciseForm(dayId, exId) {
  const editing = exId ? data.custom.find(c => c.id === exId) : null;
  if (exId && !editing) { location.hash = '#/pass'; return; }
  const d = dayById(editing ? editing.dayId : dayId) || dayById('d1');
  const e = editing || { name: '', muscles: '', sets: 3, reps: [10, 12], rest: 60, tip: '', photo: null };
  let file = null;
  app.innerHTML = `
  <header class="top"><a class="back" href="${editing ? '#/ovning/' + e.id : '#/pass/' + d.id}" aria-label="Tillbaka">‹</a>
    <div class="t"><b>${editing ? 'Ändra övning' : 'Ny övning'}</b><span>${esc(d.name)}</span></div></header>
  <label class="photopick"><img id="prev" src="${imgSrc(e)}" alt=""><span id="plabel">${e.photo ? 'Byt foto' : 'Ta foto eller välj bild'}</span><input id="file" type="file" accept="image/*" hidden></label>
  <div class="card" style="margin-top:12px">
    <label class="field"><span>Namn på övningen</span><input id="name" value="${esc(e.name)}" placeholder="Utfallsgång med hantlar"></label>
    <label class="field"><span>Muskelgrupp</span><input id="muscles" value="${esc(e.muscles)}" placeholder="Ben, säte"></label>
    <div class="grid3">
      <label class="field"><span>Set</span><input id="sets" type="number" inputmode="numeric" min="1" max="10" value="${e.sets}"></label>
      <label class="field"><span>Reps från</span><input id="r0" type="number" inputmode="numeric" min="1" max="100" value="${e.reps[0]}"></label>
      <label class="field"><span>Reps till</span><input id="r1" type="number" inputmode="numeric" min="1" max="100" value="${e.reps[1]}"></label>
    </div>
    <label class="field"><span>Vila mellan set (sekunder)</span><input id="rest" type="number" inputmode="numeric" min="0" max="600" value="${e.rest}"></label>
    <label class="field" style="margin:0"><span>Beskrivning / teknik</span><textarea id="tip" placeholder="Långa steg, knät rakt över foten.">${esc(e.tip)}</textarea></label>
  </div>
  <section><button class="btn" id="save">Spara övning</button>
    ${editing ? '<button class="btn ghost danger" id="del" style="margin-top:10px">Ta bort övningen</button>' : ''}</section>`;
  $('#file').onchange = ev => {
    file = ev.target.files[0] || null;
    if (file) { $('#prev').src = URL.createObjectURL(file); $('#plabel').textContent = 'Byt foto'; }
  };
  $('#save').onclick = async () => {
    const name = $('#name').value.trim();
    if (!name) { toast('Ge övningen ett namn'); $('#name').focus(); return; }
    const num = (id, lo, hi, def) => { const v = Math.round(+$(id).value); return v >= lo && v <= hi ? v : def; };
    let r0 = num('#r0', 1, 100, 10), r1 = num('#r1', 1, 100, r0);
    if (r1 < r0) [r0, r1] = [r1, r0];
    const btn = $('#save'); btn.disabled = true; btn.textContent = 'Sparar …';
    let photo = e.photo || null;
    if (file) {
      try { const k = await uploadPhoto(file); if (photo) deletePhoto(photo); photo = k; }
      catch { toast('Bilden kunde inte laddas upp. Övningen sparas utan ny bild.'); }
    }
    const fields = { name, muscles: $('#muscles').value.trim(), sets: num('#sets', 1, 10, 3), reps: [r0, r1], rest: num('#rest', 0, 600, 60), tip: $('#tip').value.trim(), photo };
    if (editing) Object.assign(editing, fields);
    else data.custom.push({ id: 'c' + Date.now(), dayId: d.id, custom: true, ...fields });
    save(); toast(editing ? 'Övningen är uppdaterad' : 'Övningen är tillagd');
    location.hash = editing ? '#/ovning/' + e.id : '#/pass/' + d.id;
  };
  if ($('#del')) $('#del').onclick = () => {
    if (!confirm(`Ta bort ${e.name}? Tidigare loggade set finns kvar i historiken.`)) return;
    data.custom = data.custom.filter(c => c !== editing);
    if (editing.photo) deletePhoto(editing.photo);
    save(); toast('Övningen är borttagen'); location.hash = '#/pass/' + d.id;
  };
}

/* historik */
const shortDate = t => { const d = new Date(t); return `${DAYNAMES[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`; };
const timeOf = t => new Date(t).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
function sessionRow(s) {
  const d = dayById(s.dayId);
  return `<a href="#/logg/${s.id}"><span>${shortDate(s.start)} <span class="muted">${timeOf(s.start)}</span><br><small class="muted">${esc(d ? d.short : 'Pass')}</small></span>
    <em>${s.end ? hm(durMin(s)) : '<span class="badge">Pågår</span>'}<br><small class="muted" style="font-weight:400">${fmt(sessionVolume(s) / 1000)} ton</small></em></a>`;
}
function deleteSession(s) {
  if (!s) return;
  if (!s.end) { stopRest(); keepAwake(false); }
  data.sessions = data.sessions.filter(x => x !== s); save();
}
function viewHistory() {
  const list = data.sessions.slice().sort((a, b) => b.start - a.start);
  let month = '', html = '';
  for (const s of list) {
    const d = new Date(s.start), m = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    if (m !== month) { if (html) html += '</div>'; html += `<h3 class="mhead">${m.charAt(0).toUpperCase() + m.slice(1)}</h3><div class="card list">`; month = m; }
    html += sessionRow(s);
  }
  if (html) html += '</div>';
  app.innerHTML = `<header class="hdr"><div><small>${list.length} pass totalt</small><h1>Historik</h1></div></header>
    ${html || '<div class="card"><p style="margin:0">Här hamnar dina pass när du loggat det första. Starta ett pass under <a href="#/pass">Pass</a>.</p></div>'}`;
}
function viewSession(sid) {
  const s = data.sessions.find(x => x.id === sid);
  if (!s) { location.hash = '#/historik'; return; }
  const d = dayById(s.dayId), cur = active();
  const local = t => new Date(t - new Date(t).getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const exRows = Object.keys(s.sets).map(k => {
    const e = exById(k), sets = doneSets(s, k); if (!sets.length) return '';
    return `<div><span>${esc(e ? e.name : 'Borttagen övning')}</span><em style="font-weight:500">${sets.map(x => `${fmt(x.kg)}×${x.r}`).join(', ')}</em></div>`;
  }).join('');
  const wu = s.warmup && WARMUPS.find(x => x.id === s.warmup.type);
  app.innerHTML = `
  <header class="top"><a class="back" href="#/historik" aria-label="Tillbaka till historiken">‹</a>
    <div class="t"><b>${esc(d ? d.name : 'Pass')}</b><span>${shortDate(s.start)} kl. ${timeOf(s.start)}</span></div></header>
  <div class="two">
    <div class="card"><div class="muted">Tid</div><div class="big">${hm(durMin(s))}</div></div>
    <div class="card"><div class="muted">Kalorier · volym</div><div class="big">≈ ${fmt(sessionKcal(s), 0)}</div><div class="muted">${fmt(sessionVolume(s) / 1000)} ton</div></div>
  </div>
  ${wu ? `<p class="muted">Uppvärmning: ${esc(wu.name)}, ${s.warmup.min} min</p>` : ''}
  <section><h3>Loggade set</h3><div class="card list">${exRows || '<div><span class="muted">Inga set loggade</span></div>'}</div></section>
  <section><h3>Ändra passet</h3><div class="card">
    <label class="field"><span>Start</span><input id="st" type="datetime-local" value="${local(s.start)}"></label>
    ${s.end ? `<label class="field"><span>Längd (minuter)</span><input id="len" type="number" inputmode="numeric" min="1" max="600" value="${durMin(s)}"></label>` : '<p class="muted">Passet pågår. Längden sätts när du avslutar.</p>'}
    <button class="btn small" id="saveS">Spara ändringar</button></div></section>
  <section>
    ${s.end && !cur ? '<button class="btn ghost" id="resume">Återuppta passet</button>' : ''}
    ${!s.end ? `<a class="btn go" href="#/pass/${s.dayId}">Gå till pågående pass</a>` : ''}
    <button class="btn ghost danger" id="delS" style="margin-top:10px">Ta bort passet</button>
  </section>`;
  $('#saveS').onclick = () => {
    const st = new Date($('#st').value).getTime();
    if (!st) return toast('Ange en giltig starttid');
    if (s.end) {
      const len = Math.round(+$('#len').value);
      if (!(len >= 1 && len <= 600)) return toast('Ange längd mellan 1 och 600 minuter');
      s.end = st + len * 60000;
    }
    s.start = st; save(); toast('Passet är uppdaterat'); viewSession(s.id);
  };
  if ($('#resume')) $('#resume').onclick = () => {
    if (!confirm('Återuppta passet? Timern fortsätter från passets start.')) return;
    s.end = null; save(); keepAwake(true); location.hash = '#/pass/' + s.dayId;
  };
  $('#delS').onclick = () => {
    if (!confirm('Ta bort passet? Det går inte att ångra.')) return;
    deleteSession(s); toast('Passet är borttaget'); location.hash = '#/historik';
  };
}

/* profil */
function viewProfile() {
  const p = data.profile, w = p.weights;
  const bmi = p.heightCm && w.length ? bodyKg() / Math.pow(p.heightCm / 100, 2) : null;
  app.innerHTML = `
  <header class="hdr"><div><small>${esc(user.email)}</small><h1>Profil</h1></div></header>
  <section><div class="card">
    <label class="field"><span>Namn</span><input id="name" value="${esc(p.name)}" autocomplete="name"></label>
    <label class="field" style="margin:0"><span>Längd (cm)</span><input id="height" type="number" inputmode="numeric" value="${p.heightCm || ''}"></label></div></section>

  <section><h3>Vikt <span>${w.length ? `start ${fmt(w[0].kg)} kg · nu ${fmt(bodyKg())} kg` : ''}</span></h3><div class="card">
    <div class="weigh"><label class="field" style="margin:0"><span>Dagens vikt (kg)</span><input id="kg" type="number" inputmode="decimal" step="0.1" placeholder="${w.length ? fmt(bodyKg()) : '85,0'}"></label>
    <button class="btn small" id="addkg">Spara vägning</button></div>
    ${w.length > 1 ? `<p style="margin:10px 0 0" class="${bodyKg() - w[0].kg <= 0 ? 'good' : 'badv'}">${signed(bodyKg() - w[0].kg, ' kg')} sedan start${bmi ? ` <span class="muted">· BMI ${fmt(bmi)}</span>` : ''}</p>` : ''}
    ${w.length ? `<div class="list" style="margin-top:6px">${w.slice(-6).reverse().map(x => `<div><span>${x.date}</span><em>${fmt(x.kg)} kg</em></div>`).join('')}</div>` : ''}
    <p class="muted" style="margin:10px 0 0">Vikten används för att räkna kalorier.</p></div></section>

  <section><h3>Veckoschema <span>morgonpass 06–09</span></h3><div class="card sched">
    ${[1, 2, 3, 4, 5, 6, 0].map(wd => `<label>${DAYNAMES[wd].slice(0, 3)}<select data-wd="${wd}">
      <option value="">Vila</option>${PROGRAM.map((x, i) => `<option value="${x.id}" ${data.schedule[wd] === x.id ? 'selected' : ''}>D${i + 1}</option>`).join('')}</select></label>`).join('')}</div></section>

  <section><h3>Data</h3><div class="card">
    <p class="muted" style="margin:0 0 10px">${data.sessions.filter(s => s.end).length} sparade pass. Allt synkas till ditt konto.</p>
    <button class="btn ghost" id="export">Ladda ner säkerhetskopia (JSON)</button></div></section>
  <section><button class="btn ghost" id="logout">Logga ut</button></section>`;

  $('#name').onchange = ev => { p.name = ev.target.value.trim(); save(); };
  $('#height').onchange = ev => { p.heightCm = Math.round(+ev.target.value) || null; save(); viewProfile(); };
  $('#addkg').onclick = () => {
    const kg = parseFloat(String($('#kg').value).replace(',', '.'));
    if (!kg || kg < 30 || kg > 250) return toast('Ange en vikt i kg');
    const date = ymd(Date.now()), ex = w.find(x => x.date === date);
    if (ex) ex.kg = kg; else w.push({ date, kg });
    w.sort((a, b) => a.date.localeCompare(b.date)); save(); toast('Vägning sparad'); viewProfile();
  };
  $$('.sched select').forEach(sel => sel.onchange = () => { const wd = sel.dataset.wd; if (sel.value) data.schedule[wd] = sel.value; else delete data.schedule[wd]; save(); });
  $('#export').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = `traningsloggen-${ymd(Date.now())}.json`; a.click();
  };
  $('#logout').onclick = () => { if (confirm('Logga ut?')) logout(); };
}

/* ---------- start ---------- */
async function boot() {
  user = auth ? userFromToken() : null;
  if (user) {
    const t = await getToken();
    if (!t && navigator.onLine) { user = null; }
    else { await loadData(); if (active()) keepAwake(true); }
  }
  render();
}
(async () => {
  const m = location.hash.match(/(invite|recovery|confirmation)_token=([^&]+)/);
  if (m) {
    window.history.replaceState(null, '', location.pathname + '#/');
    if (m[1] === 'invite') pending = { kind: 'invite', token: m[2] };
    else if (m[1] === 'recovery') { try { await verify({ token: m[2], type: 'recovery' }); pending = { kind: 'recovery' }; } catch { toast('Länken har gått ut. Begär en ny.'); } }
    else { try { await verify({ token: m[2], type: 'signup' }); } catch { toast('Länken har gått ut.'); } }
  }
  await boot();
})();
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
