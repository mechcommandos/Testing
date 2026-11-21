/* Écran de course : commandes tactiles, HUD, messages, prolongation, pause, résultats et récompenses. */
import { S, save, addCoins, addXp, spend, totalStars } from '../core/state.js';
import { Flow, session } from '../core/retention.js';
import { Ads } from '../core/ads.js';
import { Audio, Engine } from '../core/audio.js';
import { Native } from '../core/native.js';
import { Haptic } from '../core/haptics.js';
import { CONFIG } from '../core/config.js';
import { t, L, placeStr } from '../core/i18n.js';
import { fmt, lerp, clamp, TAU } from '../core/util.js';
import { WORLDS, EVENTS, RIVALS, MONSTER_PALS, WEAPONS, ACCESSORIES, ITEMS, WORLD_UNLOCK, starThresholds, byId } from '../game/data.js';
import { Race, MAXV, wdiff } from '../game/race.js';
import { Renderer } from '../game/render.js';
import { FX } from '../game/fx.js';
import { buildRivalSprites } from '../game/kart-art.js';
import { loadLogo } from '../game/scenery.js';
import { drawLayjou, poseOf, drawWeapon } from '../game/layjou.js';
import { drawMonster } from '../game/monsters.js';
import { $, UI, el, bindActions, modal, toast, fly, reward, countUp } from './dom.js';
import { IC, ITEM_IC } from './icons.js';
import { chronoPar, fmtClock, checkStarUnlocks } from './screens.js';

let R = null, ev = null, renderer = null, fx = null, raf = 0, last = 0, running = false, steerTarget = 0, root = null;
let hud = {}, hudCache = {}, rollT = 0, rollItem = null, sfxGate = {}, finishTimer = 0, videoUsed = false, podiumRun = false;
const spriteCache = new Map();
const keys = new Set();

export const inRace = () => !!R;

function rivalSprites(rival, palKey) {
  const k = rival.id + ':' + palKey;
  if (!spriteCache.has(k)) spriteCache.set(k, buildRivalSprites(rival, palKey));
  return spriteCache.get(k);
}

/* ================================= départ ================================= */
export function startRace(event) {
  ev = event;
  const d = S.data;
  loadLogo();
  R = new Race({
    world: ev.world, track: ev.track, mode: ev.kind, laps: ev.laps, challenge: ev.challenge,
    diff: Flow.difficulty(ev), assist: d.settings.assist, player: { ...d.equip }, rivalSprites,
  });
  if (d.turbos > 0) { d.turbos--; R.player.item = 'turbo3'; R.player.uses = 3; save(); }
  videoUsed = false; finishTimer = 0; hudCache = {}; steerTarget = 0; rollT = 0;
  if (UI.heroGarage) UI.heroGarage.stop();
  $('#menu').hidden = true;
  root = $('#race'); root.hidden = false;
  const timed = ev.kind === 'coins' || ev.kind === 'chrono';
  root.innerHTML = `
    <canvas id="game"></canvas>
    <div id="touch"></div>
    <div class="hud">
      <div class="hud-top">
        <button class="hud-btn" data-act="pause" aria-label="pause">${IC.pause}</button>
        <div class="hud-lap">${timed ? `<small>${t('r_time')}</small><b id="h-left">0</b>` : `<small>${t('r_lap')}</small><b id="h-lap">1/${R.laps}</b>`}<span id="h-time">0:00.0</span></div>
        <div class="hud-coins">${IC.coin}<b id="h-coins">0</b></div>
      </div>
      <button class="hud-item" id="h-item" aria-label="item"><span id="h-item-ic"></span><i id="h-uses"></i></button>
      ${ev.kind === 'race' || ev.kind === 'duel' ? `<div class="hud-place"><b id="h-place">${R.racers.length}</b><sup id="h-suf"></sup><small>/${R.racers.length}</small></div>` : ''}
      <button class="hud-special" id="h-special" aria-label="special"><span class="sp-heart"><i id="h-sp-fill"></i></span><canvas id="h-sp-cv"></canvas></button>
      <div class="hud-score"><small>${t('res_score')}</small><b id="h-score">0</b><span id="h-combo"></span></div>
      <div class="hud-msg" id="h-msg"></div>
      <div class="hud-points" id="h-points"></div>
      <div class="hud-hint" id="h-hint" hidden></div>
    </div>`;
  hud = { msg: $('#h-msg'), points: $('#h-points'), hint: $('#h-hint'), item: $('#h-item'), itemIc: $('#h-item-ic'), uses: $('#h-uses'), coins: $('#h-coins'), lap: $('#h-lap'), left: $('#h-left'), time: $('#h-time'), place: $('#h-place'), suf: $('#h-suf'), sp: $('#h-special'), spFill: $('#h-sp-fill'), score: $('#h-score'), combo: $('#h-combo') };
  // icône de l'arme spéciale
  const spc = $('#h-sp-cv'); requestAnimationFrame(() => { const dpr = Math.min(2, window.devicePixelRatio || 1), w = spc.clientWidth, h = spc.clientHeight; spc.width = w * dpr; spc.height = h * dpr; const c = spc.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); const wd = byId(WEAPONS, R.player.weapon); c.translate(w * 0.42, h * 0.55); c.rotate(-0.4); c.scale(w / 62, w / 62); c.translate(-16, 0); drawWeapon(c, wd.id, 0.3, wd.color); });
  renderer = new Renderer($('#game'));
  fx = new FX();
  renderer.race = R;
  renderer.resize(root.clientWidth || innerWidth, root.clientHeight || innerHeight, d.settings.quality);
  bindInput();
  bindActions(root.querySelector('.hud'), { pause: racePause });
  const music = ev.kind === 'duel' ? 'boss' : WORLDS[ev.world].night ? 'night' : 'race';
  Audio.music(music);
  if (d.stats.races >= 1 && !d.tut.start) hint('hint_start', 'start', 3200);
  running = true; last = performance.now();
  cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
}

/* ================================= boucle ================================= */
function frame(now) {
  if (!running) return;
  raf = requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const kb = (keys.has('ArrowRight') || keys.has('d') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('q') || keys.has('a') ? 1 : 0);
  const target = kb !== 0 ? kb : steerTarget;
  R.input.steer = lerp(R.input.steer, target, Math.min(1, dt * 16));
  R.update(dt);
  handleEvents();
  if (R.state === 'race' || R.state === 'countdown') Engine.set(clamp(R.player.speed / MAXV, 0, 1.4), R.player.boostT > 0);
  rumble();
  renderer.draw(R, dt, fx);
  updateHud(dt);
  if (finishTimer > 0) { finishTimer -= dt; if (finishTimer <= 0) afterFinish(); }
}

/** Grondements continus : dérapage qui se charge (de plus en plus vite), hors-piste, turbo. */
function rumble() {
  const p = R.player, live = R.state === 'race' && !p.finished;
  if (live && p.drifting && p.air <= 0 && p.spinT <= 0) {
    const lv = p.driftLv;
    if (lv === 0) Haptic.loop('drift', 'select', 300);
    else Haptic.loop('drift', lv === 3 ? 'medium' : 'light', lv === 1 ? 210 : lv === 2 ? 150 : 105);
  } else Haptic.stop('drift');
  if (live && Math.abs(p.x) > 1.06 && p.speed > 2200 && p.air <= 0 && p.boostT <= 0 && p.starT <= 0) Haptic.loop('road', 'light', 80);
  else Haptic.stop('road');
  if (live && (p.boostT > 0.2 || p.starT > 0) && !p.drifting) Haptic.loop('boost', 'select', 130);
  else Haptic.stop('boost');
}

function sfx(name, gap = 0) {
  const now = performance.now();
  if (gap && sfxGate[name] && now - sfxGate[name] < gap) return;
  sfxGate[name] = now; Audio.sfx(name);
}

function msg(text, cls = '', dur = 900) {
  const n = el(`<div class="m ${cls}">${text}</div>`);
  hud.msg.appendChild(n);
  setTimeout(() => n.classList.add('out'), dur);
  setTimeout(() => n.remove(), dur + 400);
}

function hint(key, flag, dur = 4200) {
  if (flag && S.data.tut[flag]) return;
  if (flag) { S.data.tut[flag] = 1; save(); }
  hud.hint.textContent = t(key); hud.hint.hidden = false;
  clearTimeout(hint._t); hint._t = setTimeout(() => { if (hud.hint) hud.hint.hidden = true; }, dur);
}

function handleEvents() {
  const p = R.player;
  for (const e of R.events) {
    switch (e.type) {
      case 'count': msg(String(e.n), 'm-count', 700); sfx('count'); Haptic.medium(); break;
      case 'go': msg(t('r_go'), 'm-go', 800); sfx('go'); Haptic.pattern([['heavy', 0], ['success', 90]]); Engine.start(); if (!S.data.tut.steer) hint('hint_steer', 'steer', 4500); break;
      case 'rocket': msg(t('r_rocket'), 'm-gold', 1100); sfx('rocket'); Haptic.boom(); break;
      case 'stall': msg(t('r_stall'), 'm-small', 900); sfx('error'); Haptic.error(); break;
      case 'lap': if (e.final) { msg(t('r_final'), 'm-gold', 1400); sfx('finalLap'); Audio.music('final'); Haptic.pattern([['warning', 0], ['heavy', 260]]); } else { msg(`${t('r_lap')} ${e.lap}/${R.laps}`, '', 1000); sfx('lap'); Haptic.pattern([['medium', 0], ['medium', 120]]); } break;
      case 'roll': rollT = 1.1; rollItem = e.item; break;
      case 'itemReady': sfx('item'); Haptic.pattern([['medium', 0], ['light', 80]]); hud.item.classList.add('pop'); setTimeout(() => hud.item && hud.item.classList.remove('pop'), 300); if (!S.data.tut.item) hint('hint_item', 'item', 5000); break;
      case 'use': if (e.who === p) { const it = e.item; sfx(it === 'turbo' || it === 'turbo3' || it === 'star' ? 'boost' : it === 'shield' ? 'shield' : it === 'storm' ? 'zap' : 'throw'); if (it === 'shield') Haptic.pattern([['medium', 0], ['select', 90]]); else if (it === 'storm') Haptic.boom(); else if (it !== 'turbo' && it !== 'turbo3' && it !== 'star') Haptic.light(); } else if (e.item === 'storm') sfx('zap'); break;
      case 'boost': sfx('boost', 150); if (e.lv >= 3) Haptic.boom(); else Haptic.surge(); break;
      case 'pad': msg(t('r_pad'), 'm-small', 600); break;
      case 'driftStart': sfx('skid', 300); Haptic.light(); if (!S.data.tut.drift && S.data.stats.races === 0) hint('hint_drift', 'drift', 4500); break;
      case 'driftLevel': sfx('drift' + e.lv); if (e.lv === 1) Haptic.light(); else if (e.lv === 2) Haptic.pattern([['medium', 0], ['light', 70]]); else Haptic.pattern([['heavy', 0], ['medium', 70], ['heavy', 140]]); break;
      case 'coin': sfx('coin', 70); Haptic.select(); break;
      case 'box': sfx('box', 80); Haptic.light(); break;
      case 'points': pointsPop(e); if (e.combo === 3 || e.combo === 5 || e.combo === 8 || e.combo === 11) Haptic.combo(e.combo); break;
      case 'hurt': sfx('hurt'); fx.flash = 1; fx.flashColor = '255,60,90'; fx.shake = 0.6; Haptic.hurt(); break;
      case 'hitRival': msg(t('r_hit'), 'm-hit', 700); sfx('hit', 100); Haptic.pattern([['medium', 0], ['light', 80]]); break;
      case 'shieldPop': sfx('block'); Haptic.pattern([['heavy', 0], ['select', 100]]); msg(t('r_shield'), 'm-small', 700); break;
      case 'blocked': msg(t('r_blocked'), 'm-small', 700); Haptic.light(); break;
      case 'crash': sfx('crash', 300); fx.shake = 0.5; Haptic.pattern([['heavy', 0], ['medium', 90]]); break;
      case 'bump': sfx('bump', 250); Haptic.medium(); break;
      case 'jump': sfx('jump'); Haptic.light(); if (!S.data.tut.jump) hint('hint_jump', 'jump', 3000); break;
      case 'trick': sfx('trick'); msg(t('r_trick'), 'm-gold', 700); Haptic.pattern([['select', 0], ['light', 60], ['medium', 120]]); break;
      case 'land': sfx('land', 200); Haptic.heavy(); break;
      case 'special': { sfx('ult'); const wd = byId(WEAPONS, e.weapon); msg(L(wd.name), 'm-special', 1100); fx.flash = 0.7; fx.flashColor = hexRgb(wd.color); Haptic.boom(); break; }
      case 'specialReady': sfx('ping'); Haptic.success(); hud.sp.classList.add('ready'); if (!S.data.tut.special) hint('hint_special', 'special', 4200); break;
      case 'zap': sfx('zap'); Haptic.pattern([['heavy', 0], ['warning', 90]]); fx.flash = 0.8; fx.flashColor = '200,170,255'; fx.shake = 0.4; break;
      case 'boom': { sfx('boom', 150); fx.shake = Math.max(fx.shake, 0.35); const near = Math.abs(wdiff(e.z, R.zOf(p), R.L)) < 4000; if (near) Haptic.boom(); else Haptic.light(); break; }
      case 'overtake': sfx('overtake', 200); Haptic.pattern([['light', 0], ['select', 70]]); break;
      case 'finish': onFinish(e); break;
      case 'timeup': msg(t('r_timeup'), 'm-gold', 1300); Engine.stop(); sfx('lose'); Haptic.stopAll(); Haptic.warning(); setTimeout(offerTime, 900); break;
      case 'extended': msg(t('r_go'), 'm-go', 800); sfx('revive'); Haptic.boom(); Engine.start(); hud.sp.classList.add('ready'); break;
      default:
    }
  }
  R.events.length = 0;
}

const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; };

function pointsPop(e) {
  const n = el(`<div class="pt">${t('pt_' + e.label) !== 'pt_' + e.label ? t('pt_' + e.label) : ''} <b>+${e.pts}</b></div>`);
  hud.points.prepend(n);
  while (hud.points.children.length > 4) hud.points.lastChild.remove();
  setTimeout(() => n.classList.add('out'), 900); setTimeout(() => n.remove(), 1300);
}

function updateHud(dt) {
  const p = R.player;
  const set = (key, node, v) => { if (node && hudCache[key] !== v) { hudCache[key] = v; node.textContent = v; } };
  set('coins', hud.coins, String(p.coinsTotal));
  if (hud.lap) set('lap', hud.lap, `${Math.min(R.laps, R.lapOf(p))}/${R.laps}`);
  if (hud.left) { set('left', hud.left, String(Math.ceil(R.timeLeft))); hud.left.classList.toggle('low', R.timeLeft < 10); }
  set('time', hud.time, fmtClock(R.raceTime));
  if (hud.place) { const pl = R.mode === 'race' || R.mode === 'duel' ? p.place : 1; set('place', hud.place, String(pl)); set('suf', hud.suf, placeStr(pl).replace(String(pl), '')); if (hudCache.pc !== pl) { hudCache.pc = pl; hud.place.parentNode.dataset.p = pl; } }
  set('score', hud.score, fmt(p.score));
  set('combo', hud.combo, p.combo > 1 && p.comboT > 0 ? '×' + (1 + Math.min(10, p.combo - 1) * 0.1).toFixed(1) : '');
  // objet / roulette
  let icon = '';
  if (rollT > 0) { rollT -= dt; const keysI = Object.keys(ITEMS); icon = keysI[Math.floor(performance.now() / 70) % keysI.length]; if (Math.floor(performance.now() / 70) !== hudCache.rollTick) { hudCache.rollTick = Math.floor(performance.now() / 70); sfx('roll'); if (hudCache.rollTick % 2 === 0) Haptic.select(); } }
  else icon = p.item || '';
  if (hudCache.icon !== icon) { hudCache.icon = icon; hud.itemIc.innerHTML = icon ? ITEM_IC[icon] : ''; hud.item.classList.toggle('has', !!icon); }
  set('uses', hud.uses, p.item && p.uses > 1 ? '×' + p.uses : '');
  const sp = Math.round(p.special);
  if (hudCache.sp !== sp) { hudCache.sp = sp; hud.spFill.style.height = sp + '%'; hud.sp.classList.toggle('ready', sp >= 100); }
}

/* ================================= commandes ================================= */
function bindInput() {
  const zone = $('#touch');
  const ptr = new Map();
  let steerId = null, originX = 0;
  const range = () => (innerWidth * 0.17) / (S.data.settings.sensitivity || 1);
  zone.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try { zone.setPointerCapture(e.pointerId); } catch { /* pointeur déjà relâché */ }
    ptr.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 });
    if (steerId === null) { steerId = e.pointerId; originX = e.clientX; }
  });
  zone.addEventListener('pointermove', (e) => {
    const s = ptr.get(e.pointerId); if (!s) return;
    s.moved = Math.max(s.moved, Math.hypot(e.clientX - s.x, e.clientY - s.y));
    if (e.pointerId !== steerId) return;
    const r = range();
    let dx = e.clientX - originX;
    if (dx > r) { originX = e.clientX - r; dx = r; } else if (dx < -r) { originX = e.clientX + r; dx = -r; }
    steerTarget = clamp(dx / r, -1, 1);
  });
  const up = (e) => {
    const s = ptr.get(e.pointerId); if (!s) return;
    ptr.delete(e.pointerId);
    const dt = performance.now() - s.t, dy = e.clientY - s.y, dx = e.clientX - s.x;
    if (e.type !== 'pointercancel') {
      if (dt < 260 && s.moved < 16) tap();
      else if (dt < 380 && Math.abs(dy) > 50 && Math.abs(dy) > Math.abs(dx) * 1.3) { R.input.useItem = true; R.input.back = dy > 0; }
    }
    if (e.pointerId === steerId) { steerId = null; steerTarget = 0; }
  };
  zone.addEventListener('pointerup', up); zone.addEventListener('pointercancel', up);
  const press = (node, fn) => node.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); fn(); });
  press(hud.item, () => { if (R.state === 'countdown') tap(); else R.input.useItem = true; });
  press(hud.sp, () => { R.input.special = true; });
  window.onkeydown = (e) => {
    if (!R) return;
    keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    if (e.key === ' ') { e.preventDefault(); if (R.state === 'countdown' || R.player.air > 0) tap(); else { R.input.useItem = true; R.input.back = keys.has('ArrowDown') || keys.has('s'); } }
    if (e.key === 'e' || e.key === 'Shift') R.input.special = true;
    if (e.key === 'Escape' || e.key === 'p') racePause();
  };
  window.onkeyup = (e) => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  window.onresize = () => { if (renderer && root) renderer.resize(root.clientWidth, root.clientHeight, S.data.settings.quality); };
}

function tap() {
  if (!R) return;
  if (R.state === 'countdown' || R.player.air > 0) R.input.tap = true;
  else if (R.state === 'race') R.input.useItem = true;
}

/* ================================== pause ================================== */
export function racePause() {
  if (!R || R.state === 'paused' || R.state === 'done' || R.state === 'decision') return;
  const prev = R.state; R.state = 'paused'; Engine.stop(); Haptic.stopAll();
  const m = modal({ cls: 'modal-pause', dismissible: true, onClose: () => { if (R && R.state === 'paused') { R.state = prev; last = performance.now(); if (prev === 'race') Engine.start(); } }, html: `
    <h2>${IC.pause} ${t('pause')}</h2>
    <button class="btn btn-primary btn-wide" data-act="close">${IC.play}${t('resume')}</button>
    <button class="btn btn-ghost btn-wide" data-act="restart">${t('restart')}</button>
    <button class="btn btn-ghost btn-wide" data-act="quit">${t('quit')}</button>`,
  actions: {
    restart: () => { m.close(); const e = ev; endRace(); startRace(e); },
    quit: () => { if (!window.confirm(t('quit_confirm'))) return; m.close(); endRace(); UI.onRaceExit('home'); },
  } });
}
export function raceResume() { /* la reprise se fait depuis la fenêtre de pause */ }
export function raceBack() { if (R && (R.state === 'race' || R.state === 'countdown')) racePause(); }

function endRace() {
  running = false; cancelAnimationFrame(raf); Engine.stop(); Haptic.stopAll(); podiumRun = false;
  window.onkeydown = null; window.onkeyup = null; window.onresize = null; keys.clear();
  R = null; if (root) { root.innerHTML = ''; root.hidden = true; }
}

/* ============================ arrivée / prolongation ============================ */
function onFinish(e) {
  Engine.stop();
  if (e.timeout) { finishTimer = 0.3; return; }
  const p = R.player, pl = p.place;
  const good = R.mode === 'race' ? pl <= 3 : R.mode === 'duel' ? pl === 1 : true;
  msg(t('r_finish'), good ? 'm-gold' : '', 1500);
  sfx(good ? 'win' : 'lose');
  Haptic.stopAll(); if (good) Haptic.celebrate(); else Haptic.fail();
  if (good) for (let i = 0; i < 60; i++) fx.spawn({ type: 'confetti', x: Math.random() * renderer.W, y: -20 - Math.random() * 200, vx: (Math.random() - 0.5) * 120, vy: 200 + Math.random() * 300, g: 120, life: 3, size: 6 * renderer.dpr, color: ['#ff5c9d', '#39e4ff', '#ffd24a', '#7be35a', '#a56bff'][i % 5], drag: 0.99 });
  finishTimer = 1.7;
}

function afterFinish() {
  if (!R) return;
  if (R.pendingDecision && R.mode === 'race') { R.state = 'decision'; offerExtend(); }
  else { R.state = 'done'; showResults(); }
}

function offerExtend() {
  const p = R.player, paid = session.paidExt || 0;
  const cost = CONFIG.economy.extendCosts[Math.min(paid, CONFIG.economy.extendCosts.length - 1)];
  const m = modal({ cls: 'modal-ext', dismissible: false, html: `
    <div class="ext-ic">${IC.flag}</div><h2>${t('ext_title')}</h2>
    <p>${t('ext_sub', { p: placeStr(p.place) })}</p>
    ${videoUsed ? '' : `<button class="btn btn-video btn-wide" data-act="video">${IC.video}${t('ext_video')}</button>`}
    <button class="btn btn-gem btn-wide" data-act="gem">${IC.gem}${cost} · ${t('ext_credits')}</button>
    <button class="btn btn-ghost" data-act="no">${t('ext_no')}</button>`,
  actions: {
    video: async () => { const ok = await Ads.showRewarded(t('ext_title')); if (!ok) return toast(t('ad_none')); videoUsed = true; m.close(); R.extendLap(); last = performance.now(); },
    gem: () => { if (!spend('credits', cost)) { Audio.sfx('error'); Haptic.error(); toast(t('no_credits'), IC.gem); return; } session.paidExt = paid + 1; m.close(); R.extendLap(); last = performance.now(); },
    no: () => { m.close(); R.state = 'done'; showResults(); },
  } });
}

function offerTime() {
  if (!R) return;
  const s = CONFIG.economy.addTimeSeconds, n = R.extensions;
  if (n >= 3) { R.endChallenge(); return; }
  const cost = CONFIG.economy.addTimeCosts[Math.min(n, CONFIG.economy.addTimeCosts.length - 1)];
  const m = modal({ cls: 'modal-ext', dismissible: false, html: `
    <div class="ext-ic">${IC.clock}</div><h2>${t('time_title')}</h2><p>${t('time_sub', { s })}</p>
    ${videoUsed ? '' : `<button class="btn btn-video btn-wide" data-act="video">${IC.video}${t('time_video', { s })}</button>`}
    <button class="btn btn-gem btn-wide" data-act="gem">${IC.gem}${cost} · ${t('time_credits', { s })}</button>
    <button class="btn btn-ghost" data-act="no">${t('ext_no')}</button>`,
  actions: {
    video: async () => { const ok = await Ads.showRewarded(t('time_title')); if (!ok) return toast(t('ad_none')); videoUsed = true; m.close(); R.addTime(s); last = performance.now(); },
    gem: () => { if (!spend('credits', cost)) { Audio.sfx('error'); Haptic.error(); toast(t('no_credits'), IC.gem); return; } m.close(); R.addTime(s); last = performance.now(); },
    no: () => { m.close(); R.endChallenge(); },
  } });
}

/* ================================== résultats ================================== */
function computeStars(res) {
  const th = starThresholds(ev.world);
  if (res.mode === 'race') return th.filter((v) => res.score >= v).length;
  if (res.mode === 'duel') return res.place === 1 ? 1 + th.slice(1).filter((v) => res.score >= v).length : 0;
  if (res.mode === 'coins') return ev.challenge.goal.filter((g) => res.coins >= g).length;
  if (res.mode === 'chrono') { if (!R.player.finished || res.timeLeft <= 0) return 0; const par = chronoPar(ev); return [1.12, 1.0, 0.92].filter((k) => res.time <= par * k).length; }
  return 0;
}

function showResults() {
  const d = S.data, res = R.result(), stars = computeStars(res);
  const w = WORLDS[ev.world], E = CONFIG.economy;
  const perk = byId(ACCESSORIES, d.equip.accessory).perk || {};
  // récompenses
  let base = res.mode === 'race' ? E.placeCoins[res.place - 1] : res.mode === 'duel' ? (res.place === 1 ? 320 : 70) : res.mode === 'chrono' ? (stars ? 220 : 60) : 80;
  const coins = Math.round((base + res.coins * E.coinValue) * (1 + ev.world * 0.3) * Flow.streakMul() * (1 + (perk.coins || 0)) / 5) * 5;
  const xp = Math.round((45 + (res.n - res.place) * 9 + ev.world * 12 + stars * 10) * (1 + (perk.xp || 0)));
  const prevStars = d.stars[ev.key] || 0, before = totalStars();
  if (stars > prevStars) d.stars[ev.key] = stars;
  const record = res.score > (d.best[ev.key] || 0);
  if (record) d.best[ev.key] = res.score;
  addCoins(coins);
  const ups = addXp(xp);
  const fr = Flow.record(res, ev, stars);
  // missions
  const st = res.stats, done = [];
  const prog = (id, n) => { const m = Flow.progress(id, n); if (m) done.push(m); };
  if (res.mode === 'race') { prog('podium', res.place <= 3 ? 1 : 0); prog('win', res.place === 1 ? 1 : 0); }
  prog('drift', st.drifts); prog('ultra', st.ultra); prog('hit', st.hits); prog('coins', st.coins); prog('special', st.specials); prog('trick', st.tricks); prog('overtake', st.overtakes);
  prog('stars', Math.max(0, stars - prevStars));
  const unlockedWorld = WORLD_UNLOCK.findIndex((n, i) => i > 0 && before < n && totalStars() >= n);
  const starItems = checkStarUnlocks();
  save(true);

  const win = res.mode === 'race' ? res.place === 1 : res.mode === 'duel' ? res.place === 1 : stars >= 1;
  const podium = res.mode === 'race' && res.place <= 3;
  const title = res.mode === 'duel' ? t(win ? 'res_duel_win' : 'res_duel_lose') : win ? t('res_win') : podium ? t('res_podium') : t('res_ok');
  const near = Flow.nearMiss(res);
  const tip = !fr.success ? Flow.tip(res) : null;
  const next = nextEventAfter(ev);
  const panel = el(`<div class="results ${win ? 'is-win' : ''}">
    <div class="res-head"><small>${t('h_cup', { w: L(w.name) })} · ${L(ev.name)}</small><h1>${title}</h1></div>
    ${res.mode === 'race' || res.mode === 'duel' ? '<canvas class="podium" id="podium"></canvas>' : `<div class="res-big">${res.mode === 'coins' ? IC.coin + `<b>${res.coins}</b>` : IC.clock + `<b>${R.player.finished && res.timeLeft > 0 ? fmtClock(res.time) : '—'}</b>`}</div>`}
    <div class="res-stars">${[0, 1, 2].map((i) => `<i class="st ${i < stars ? 'on' : ''}" style="--d:${0.25 + i * 0.22}s">${IC.star}</i>`).join('')}</div>
    <div class="res-score"><span>${t('res_score')}</span><b id="res-score">0</b>${record ? `<em>${t('res_best')}</em>` : ''}</div>
    <div class="res-break"><span>${t('res_position')} <b>${fmt(res.placePts)}</b></span><span>${t('res_actions')} <b>${fmt(res.actionPts)}</b></span></div>
    ${near ? `<div class="res-near">${IC.flame}${t('res_near', { g: near.gap.toFixed(1), p: placeStr(near.place) })}</div>` : ''}
    ${res.mode === 'race' ? `<ol class="res-table">${res.order.map((r, i) => `<li class="${r.isPlayer ? 'me' : ''}"><span class="rk">${i + 1}</span><span class="nm">${r.name}</span><span class="tm">${r.time ? fmtClock(r.time) : ''}</span></li>`).join('')}</ol>` : ''}
    <div class="res-rw"><span class="rw">${IC.coin}<b id="res-coins">+${fmt(coins)}</b></span><span class="rw">${IC.xp}<b>+${xp} XP</b></span>${Flow.streakMul() > 1 ? `<span class="mini mini-streak">${IC.flame}×${Flow.streakMul().toFixed(1)}</span>` : ''}</div>
    ${tip ? `<p class="res-tip">${t(tip)}</p>` : ''}
    <button class="btn btn-video" data-act="double">${IC.video}${t('res_double')} (+${fmt(coins)})</button>
    <div class="res-btns">
      <button class="btn btn-ghost" data-act="cups">${IC.trophy}</button>
      <button class="btn btn-ghost" data-act="replay">${t('res_replay')}</button>
      <button class="btn btn-play" data-act="next">${IC.flag}<span>${next.key === ev.key ? t('res_replay') : t('res_next')}</span></button>
    </div>
  </div>`);
  root.appendChild(panel);
  requestAnimationFrame(() => panel.classList.add('in'));
  countUp($('#res-score', panel), 0, res.score, 1100);
  if (stars) setTimeout(() => Audio.sfx('star'), 350);
  Haptic.pattern([[0.25, 0.47, 0.69].slice(0, stars).map((d, i) => [i === 2 ? 'heavy' : 'medium', Math.round(d * 1000)])].flat());
  if ($('#podium', panel)) drawPodium($('#podium', panel), res.order.slice(0, 3));
  let doubled = false;
  bindActions(panel, {
    double: async (n) => {
      if (doubled) return;
      const ok = await Ads.showRewarded(t('res_double'));
      if (!ok) return toast(t('ad_none'));
      doubled = true; addCoins(coins); Audio.sfx('coin'); Haptic.celebrate(); n.classList.add('is-disabled'); fly(n, $('#res-coins', panel), IC.coin, 8);
      $('#res-coins', panel).textContent = '+' + fmt(coins * 2);
    },
    next: () => leave(() => startRace(next)),
    replay: () => leave(() => startRace(ev)),
    cups: () => leave(() => UI.onRaceExit('cups')),
  });
  // fenêtres après la course
  const pops = [];
  for (const m of done) pops.push(() => { toast(t('mission_done'), IC.check); return Promise.resolve(); });
  pops.push(...UI.levelUps(ups));
  if (fr.sessionChest) pops.push(() => UI.showChest('res_chest', Flow.takeSessionChest()));
  if (unlockedWorld > 0) pops.push(() => { toast(t('res_unlock', { w: L(WORLDS[unlockedWorld].name) }), IC.trophy); Audio.sfx('levelup'); return Promise.resolve(); });
  for (const it of starItems) pops.push(() => { toast(L(it.name), IC.star); return Promise.resolve(); });
  if (d.stats.podiums >= 3) pops.push(() => UI.askNotifications());
  setTimeout(() => UI.queuePopups(pops), 1300);
}

async function leave(fn) {
  if (Flow.shouldShowInterstitial()) { const shown = await Ads.showInterstitial(); if (shown) Flow.markInterstitial(); }
  endRace(); fn();
}

function nextEventAfter(e) {
  const i = EVENTS.indexOf(e), n = EVENTS[i + 1];
  if (n && Flow.unlocked(n.world)) return n;
  return EVENTS.find((x) => Flow.unlocked(x.world) && (S.data.stars[x.key] || 0) < 3) || e;
}

function drawPodium(cv, top) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  podiumRun = true;
  const t0 = performance.now();
  const loop = (now) => {
    if (!podiumRun || !cv.isConnected) return;
    requestAnimationFrame(loop);
    const w = cv.clientWidth, h = cv.clientHeight; if (!w) return;
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
    const tt = (now - t0) / 1000;
    const slots = [[1, 0.18, 0.24], [2, 0.82, 0.16], [0, 0.5, 0.36]]; // [rang, x, hauteur du bloc]
    for (const [rank, fx0, bh] of slots) {
      const r = top[rank]; if (!r) continue;
      const x = w * fx0, by = h - h * bh, bw = w * 0.27;
      const g = c.createLinearGradient(0, by, 0, h); g.addColorStop(0, ['#ffd24a', '#dfe7ff', '#ffb17a'][rank]); g.addColorStop(1, ['#e09a10', '#9fb0d6', '#d6743a'][rank]);
      c.fillStyle = g; c.beginPath(); c.roundRect(x - bw / 2, by, bw, h - by + 10, 10); c.fill();
      c.fillStyle = 'rgba(255,255,255,.9)'; c.font = `800 ${Math.round(h * 0.12)}px "Fredoka Variable", Fredoka, sans-serif`; c.textAlign = 'center'; c.fillText(String(rank + 1), x, by + h * 0.13);
      const sc = (h * 0.5) / 200 * (rank === 0 ? 1.1 : 0.92);
      if (r.isPlayer) { const P = poseOf(rank === 0 ? 'cheer' : 'wave', tt, 0); drawLayjou(c, { x, y: by, scale: sc, pose: P, skin: S.data.equip.skin, accessory: S.data.equip.accessory, t: tt }); }
      else {
        const rv = RIVALS.find((q) => q.id === r.id) || RIVALS[0];
        const pal = MONSTER_PALS[r.palKey] || MONSTER_PALS[rv.pal];
        c.save(); c.translate(x, by); if (fx0 < 0.5) c.scale(-1, 1);
        drawMonster(c, rv.type, { x: 0, y: 0, scale: sc * 0.82, pal, t: tt + rank });
        c.restore();
      }
    }
  };
  requestAnimationFrame(loop);
}

export { TAU };

// Accès de test (développement uniquement)
if (import.meta.env.DEV) { window.__race = () => R; window.__steer = (v) => { steerTarget = v; }; }
