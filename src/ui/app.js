/* Coque de l'application : barre du haut, onglets, accueil et fenêtres (cadeau, missions, roue, coffres, réglages). */
import { S, onChange, emit, save, addCoins, addCredits, powerScore } from '../core/state.js';
import { Flow, session } from '../core/retention.js';
import { Ads } from '../core/ads.js';
import { IAP } from '../core/iap.js';
import { Audio } from '../core/audio.js';
import { Native } from '../core/native.js';
import { CONFIG } from '../core/config.js';
import { t, L, lang } from '../core/i18n.js';
import { fmt, fmtTime, TAU } from '../core/util.js';
import { STAGES, WORLDS, MONSTER_PALS, DAILY_REWARDS, WHEEL, MISSIONS, xpForLevel, stageCoins, stageXp, byId } from '../game/data.js';
import { drawLayjou, poseOf } from '../game/layjou.js';
import { renderMonsterThumb } from '../game/monsters.js';
import { $, $$, el, UI, bindActions, modal, toast, fly, reward, closeTopModal, hasModal } from './dom.js';
import { IC } from './icons.js';
import { renderShop, renderHangar, renderLab, renderMap } from './screens.js';
import { startBattle, battleBack, battlePause, battleResume, inBattle } from './battle-ui.js';

/* ------------------------- héros animé (menus) ------------------------- */
export class HeroView {
  constructor(canvas, look) { this.cv = canvas; this.look = look; this.run = false; this.t = 0; this._f = (n) => this.frame(n); }
  start() { if (this.run) return; this.run = true; this.last = performance.now(); requestAnimationFrame(this._f); }
  stop() { this.run = false; }
  frame(now) {
    if (!this.run || !this.cv.isConnected) { this.run = false; return; }
    requestAnimationFrame(this._f);
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; this.t += dt;
    const cv = this.cv, w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    const lk = this.look(), sc = (h - 34) / 208, gy = h - 24;
    // socle lumineux
    const g = ctx.createRadialGradient(w / 2, gy, 4, w / 2, gy, w * 0.46); g.addColorStop(0, 'rgba(86,214,245,0.55)'); g.addColorStop(0.6, 'rgba(255,92,157,0.18)'); g.addColorStop(1, 'rgba(255,92,157,0)');
    ctx.save(); ctx.translate(w / 2, gy); ctx.scale(1, 0.24); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, w * 0.46, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, w * 0.3 + Math.sin(this.t * 2) * 4, 0, TAU); ctx.stroke(); ctx.restore();
    ctx.fillStyle = 'rgba(5,8,30,0.35)'; ctx.beginPath(); ctx.ellipse(w / 2, gy + 1, 40 * sc, 8 * sc, 0, 0, TAU); ctx.fill();
    drawLayjou(ctx, { x: w / 2 - (lk.weapon ? 10 * sc : 0), y: gy, scale: sc, pose: poseOf(lk.pose || 'wave', this.t, 0), skin: lk.skin, accessory: lk.accessory, weapon: lk.weapon, t: this.t });
  }
}

/* ------------------------------- coque ------------------------------- */
let current = 'home', heroHome = null, homeTimer = null;
const SCREENS = ['shop', 'hangar', 'home', 'lab', 'map'];
const TAB_IC = { shop: IC.shop, hangar: IC.hanger, home: IC.swords, lab: IC.flask, map: IC.map };
const TAB_KEY = { shop: 'tab_shop', hangar: 'tab_hangar', home: 'tab_fight', lab: 'tab_lab', map: 'tab_map' };

export function initApp() {
  const app = $('#app');
  app.innerHTML = `
    <div id="menu-bg"><i class="orb o1"></i><i class="orb o2"></i><i class="orb o3"></i><div class="dots"></div></div>
    <header id="topbar">
      <div class="lvl" id="top-lvl"><div class="lvl-badge"><span id="top-level">1</span></div><div class="lvl-meta"><small>${t('level')}</small><div class="bar bar-xp"><i id="top-xp"></i></div></div></div>
      <div class="chips">
        <button class="chip" data-act="coins">${IC.coin}<b id="top-coins">0</b></button>
        <button class="chip chip-gem" data-act="credits">${IC.gem}<b id="top-credits">0</b><span class="chip-plus">${IC.plus}</span></button>
        <button class="icon-btn" data-act="settings" aria-label="settings">${IC.gear}</button>
      </div>
    </header>
    <main id="screens">${SCREENS.map((s) => `<section class="screen" id="scr-${s}" hidden></section>`).join('')}</main>
    <nav id="tabbar">${SCREENS.map((s) => `<button class="tab ${s === 'home' ? 'tab-main' : ''}" data-tab="${s}">${TAB_IC[s]}<span>${t(TAB_KEY[s])}</span><i class="dot" hidden></i></button>`).join('')}</nav>
    <section id="scr-battle" hidden></section>
    <div id="modal-root"></div><div id="toast-root"></div>`;
  bindActions($('#topbar'), { coins: () => go('shop', 'coins'), credits: () => go('shop', 'credits'), settings: openSettings });
  $('#tabbar').addEventListener('click', (ev) => { const b = ev.target.closest('[data-tab]'); if (b) { Audio.sfx('tab'); go(b.dataset.tab); } });
  onChange(refreshTop);
  Object.assign(UI, { go, refreshTop, showChest, openDaily, openMissions, openWheel, queuePopups, levelUps, HeroView, fightNext, startStage, startArena });
  refreshTop(); go('home');
}

export function refreshTop() {
  const d = S.data;
  const set = (id, v) => { const n = $(id); if (n && n.textContent !== v) n.textContent = v; };
  set('#top-coins', fmt(d.coins)); set('#top-credits', fmt(d.credits)); set('#top-level', String(d.level));
  const xp = $('#top-xp'); if (xp) xp.style.width = Math.round((d.xp / xpForLevel(d.level)) * 100) + '%';
  // pastilles de notification des onglets
  const dots = { home: Flow.dailyStatus().claimable || Flow.missionsBadge() > 0 || Flow.chestReadyIn() === 0, lab: UI.labReady ? UI.labReady() : false };
  for (const b of $$('#tabbar .tab')) { const dot = $('.dot', b); if (dot) dot.hidden = !dots[b.dataset.tab]; }
}

export function go(name, arg) {
  current = name;
  for (const s of SCREENS) $('#scr-' + s).hidden = s !== name;
  for (const b of $$('#tabbar .tab')) b.classList.toggle('on', b.dataset.tab === name);
  if (heroHome) heroHome.stop(); clearInterval(homeTimer);
  if (UI.heroHangar) UI.heroHangar.stop();
  const node = $('#scr-' + name);
  if (name === 'home') renderHome(node);
  else if (name === 'shop') renderShop(node, arg);
  else if (name === 'hangar') renderHangar(node, arg);
  else if (name === 'lab') renderLab(node);
  else if (name === 'map') renderMap(node);
  node.scrollTop = 0;
  Audio.music('menu');
  refreshTop();
}
export const currentScreen = () => current;

/* ------------------------------ accueil ------------------------------ */
function nextStageSpec() {
  const i = Math.min(S.data.stage, STAGES.length - 1);
  return STAGES[i];
}

function renderHome(node) {
  const d = S.data, st = nextStageSpec(), allClear = d.stage >= STAGES.length, w = WORLDS[st.world];
  const arenaOpen = d.stage >= 5;
  const goal = Flow.nextGoals()[0];
  node.innerHTML = `
    <div class="home">
      <div class="logo"><span class="logo-a">Lay<i>J</i>ou</span><span class="logo-b">BATTLE</span></div>
      <div class="home-mid">
        <div class="side">
          <button class="side-btn" data-act="daily">${IC.gift}<span>${t('h_daily')}</span><i class="dot" id="dot-daily" hidden></i></button>
          <button class="side-btn" data-act="wheel">${IC.wheel}<span>${t('h_wheel')}</span><i class="dot" id="dot-wheel" hidden></i></button>
        </div>
        <div class="hero-wrap"><canvas id="hero-home"></canvas><div class="power">${IC.bolt}<span>${t('h_power')}</span><b>${fmt(powerScore())}</b></div></div>
        <div class="side">
          <button class="side-btn" data-act="missions">${IC.list}<span>${t('h_missions')}</span><i class="dot" id="dot-missions" hidden></i></button>
          <button class="side-btn" data-act="chest">${IC.chest}<span id="chest-label">${t('h_chest')}</span><i class="dot" id="dot-chest" hidden></i></button>
        </div>
      </div>
      ${goal ? `<button class="goal" data-act="goal" data-go="${goal.go}">${IC.target}<span>${goalText(goal)}</span>${IC.arrow}</button>` : ''}
      <div class="stage-card ${st.boss ? 'is-boss' : ''}" data-act="map" style="--wc:${w.color}">
        <canvas class="stage-thumb" id="home-thumb"></canvas>
        <div class="stage-info">
          <small>${allClear ? t('h_clear') : t('h_stage', { w: st.world + 1, n: st.num })} · ${L(w.name)}</small>
          <b>${st.name}</b>
          <div class="stage-rw">${IC.coin}<span>${fmt(stageCoins(st.index, st.boss) * (allClear ? CONFIG.economy.replayCoinFactor : 2))}</span>${IC.xp}<span>${stageXp(st.index, st.boss)}</span></div>
        </div>
        ${st.boss ? `<span class="tag tag-boss">${IC.skull}${t('h_boss')}</span>` : ''}
      </div>
      <button class="btn btn-play" data-act="fight">${IC.swords}<span>${allClear ? t('h_replay') : t('play')}</span></button>
      <div class="home-row">
        <button class="btn-arena ${arenaOpen ? '' : 'is-locked'}" data-act="arena">${arenaOpen ? IC.flame : IC.lock}<span><b>${t('h_arena')}</b><small>${arenaOpen ? t('h_arena_best', { n: d.arenaBest }) : t('h_arena_lock')}</small></span></button>
        <div class="mini-chips">
          ${session.streak > 0 ? `<span class="mini mini-streak">${IC.flame}${t('h_streak', { m: Flow.streakMul().toFixed(1) })}</span>` : ''}
          ${d.boosts > 0 ? `<span class="mini mini-boost" data-act="boost">${IC.bolt}${t('h_boost')} ×${d.boosts}</span>` : ''}
        </div>
      </div>
    </div>`;
  renderMonsterThumb($('#home-thumb'), st.m, MONSTER_PALS[st.pal]);
  heroHome = new HeroView($('#hero-home'), () => ({ ...S.data.equip, weapon: null, pose: 'wave' })); heroHome.start();
  if (!node.dataset.bound) {
    node.dataset.bound = '1';
    bindActions(node, {
      fight: fightNext, map: () => go('map'), daily: openDaily, wheel: openWheel, missions: openMissions,
      chest: () => { const r = Flow.openFreeChest(); if (r) showChest('ch_free', r).then(() => go('home')); else toast(fmtTime(Flow.chestReadyIn()), IC.clock); },
      arena: () => { if (S.data.stage >= 5) startArena(); else toast(t('h_arena_lock'), IC.lock); },
      goal: (n) => { const g = n.dataset.go; if (g === 'missions') openMissions(); else if (g === 'fight') fightNext(); else go(g); },
      boost: () => toast(t('h_boost_tip'), IC.bolt),
    });
  }
  const tick = () => {
    const ms = Flow.chestReadyIn(), lab = $('#chest-label');
    if (lab) lab.textContent = ms > 0 ? fmtTime(ms) : t('h_ready');
    const dot = (id, on) => { const n = $(id); if (n) n.hidden = !on; };
    dot('#dot-chest', ms === 0); dot('#dot-daily', Flow.dailyStatus().claimable); dot('#dot-missions', Flow.missionsBadge() > 0);
    const ws = Flow.wheelStatus(); dot('#dot-wheel', ws.free);
    const sb = $('.side-btn[data-act="chest"]'); if (sb) sb.classList.toggle('is-ready', ms === 0);
  };
  tick(); homeTimer = setInterval(tick, 1000);
}

export function goalText(g) {
  const v = { ...g.vars };
  if (v.name) v.name = L(v.name);
  if (v.left !== undefined) v.left = fmt(v.left);
  return t(g.key, v);
}

/* ------------------------- lancement des combats ------------------------- */
export function fightNext() { startStage(nextStageSpec().index); }

export function startStage(index) {
  const st = STAGES[index];
  const boost = S.data.boosts > 0;
  if (boost) { S.data.boosts--; save(); toast(t('boost_on'), IC.bolt); }
  if (heroHome) heroHome.stop(); clearInterval(homeTimer);
  startBattle({ mode: 'stage', enemy: { ...st, power: st.index }, worldId: st.worldId, stageIndex: index, startEnergy: boost ? 100 : 0 });
}

export function startArena() {
  const d = S.data, p0 = Math.max(0, Math.min(d.stage, STAGES.length) - 4);
  const pool = STAGES.filter((s) => s.index <= Math.min(STAGES.length - 2, d.stage + 1) && s.m !== 'antijou');
  const mk = (n) => { const s = pool[Math.floor(Math.random() * pool.length)]; return { ...s, boss: n % 5 === 0, scale: s.scale || 1, power: p0 + (n - 1) * 1.4, name: s.name }; };
  const boost = d.boosts > 0; if (boost) { d.boosts--; save(); toast(t('boost_on'), IC.bolt); }
  if (heroHome) heroHome.stop(); clearInterval(homeTimer);
  const worldId = WORLDS[Math.min(WORLDS.length - 1, Math.floor(Math.min(d.stage, STAGES.length - 1) / 5))].id;
  startBattle({ mode: 'arena', enemy: mk(1), nextWave: mk, worldId, stageIndex: -1, startEnergy: boost ? 100 : 0, arenaPower: p0 });
}

/* ------------------------------ fenêtres ------------------------------ */
/** File de fenêtres affichées l'une après l'autre (montée de niveau, coffres…). */
export async function queuePopups(list) { for (const fn of list) await fn(); }

export function showChest(titleKey, r) {
  return new Promise((resolve) => {
    Audio.sfx('chest');
    modal({ cls: 'modal-chest', dismissible: false, onClose: resolve, html: `
      <div class="burst"></div><div class="chest-ic">${IC.chest}</div>
      <h2>${t(titleKey)}</h2><div class="rw-row big">${reward(r)}</div>
      <button class="btn btn-primary" data-act="close">${t('claim')}</button>` });
  });
}

/** Récompenses de montée de niveau. */
export function levelUps(levels) {
  return levels.map((lvl) => () => new Promise((resolve) => {
    const coins = 100 * lvl, credits = 5; addCoins(coins); addCredits(credits); Audio.sfx('levelup');
    modal({ cls: 'modal-level', dismissible: false, onClose: resolve, html: `
      <div class="burst"></div><div class="lvl-badge big"><span>${lvl}</span></div>
      <h2>${t('lu_title', { n: lvl })}</h2><p>${t('lu_sub')}</p><div class="rw-row big">${reward({ coins, credits })}</div>
      <button class="btn btn-primary" data-act="close">${t('claim')}</button>` });
  }));
}

export function openDaily() {
  const st = Flow.dailyStatus();
  const cell = (r, i) => {
    const state = i < st.index || (!st.claimable && i === st.index) ? 'done' : i === st.index ? 'now' : '';
    return `<div class="day ${state} ${i === 6 ? 'day-big' : ''}"><small>${t('d_day', { n: i + 1 })}</small><div class="day-ic">${r.chest ? IC.chest : r.credits ? IC.gem : IC.coin}</div><b>${r.credits ? r.credits : fmt(Math.round(r.coins * (1 + S.data.level * 0.05)))}</b>${state === 'done' ? `<span class="day-ok">${IC.check}</span>` : ''}</div>`;
  };
  const m = modal({ cls: 'modal-daily', html: `
    <h2>${IC.gift} ${t('d_title')}</h2><p>${t('d_sub')}</p>
    <div class="days">${DAILY_REWARDS.map(cell).join('')}</div>
    <button class="btn btn-primary ${st.claimable ? '' : 'is-disabled'}" data-act="take">${st.claimable ? t('claim') : t('d_done')}</button>`,
  actions: { take: (n) => {
    const r = Flow.claimDaily(); if (!r) return;
    Audio.sfx('coin'); fly(n, $(r.credits ? '#top-credits' : '#top-coins'), r.credits ? IC.gem : IC.coin);
    m.close(); const after = () => { if (current === 'home') go('home'); };
    if (r.chest) showChest('ch_mega', r.chest).then(after); else after();
  } } });
}

export function openMissions() {
  Flow.ensureDaily();
  const tpl = (id) => MISSIONS.find((x) => x.id === id);
  const next = new Date(); next.setHours(24, 0, 0, 0);
  const draw = () => {
    const ms = S.data.daily.missions, bonus = Flow.missionsBonusReady(), bonusDone = S.data.daily.bonusClaimed;
    return `<h2>${IC.list} ${t('m_title')}</h2>
      <div class="missions">${ms.map((m, i) => `
        <div class="mission ${m.claimed ? 'done' : ''}">
          <div class="mission-main"><b>${L(tpl(m.id).text).replace('{n}', m.n)}</b><div class="bar"><i style="width:${Math.round((m.p / m.n) * 100)}%"></i><span>${m.p}/${m.n}</span></div></div>
          ${m.claimed ? `<span class="mission-ok">${IC.check}</span>` : `<button class="btn btn-small ${m.p >= m.n ? 'btn-primary' : 'btn-ghost is-disabled'}" data-act="claim" data-i="${i}">${IC.coin}${fmt(m.reward)}</button>`}
        </div>`).join('')}
        <div class="mission mission-bonus ${bonusDone ? 'done' : ''}"><div class="mission-main"><b>${t('m_bonus')}</b><small>${IC.gem} 10 + ${t('h_chest')}</small></div>
          ${bonusDone ? `<span class="mission-ok">${IC.check}</span>` : `<button class="btn btn-small ${bonus ? 'btn-gold' : 'btn-ghost is-disabled'}" data-act="bonus">${t('claim')}</button>`}</div>
      </div><p class="muted">${t('m_reset', { t: fmtTime(next - Date.now()) })}</p>`;
  };
  const m = modal({ cls: 'modal-missions', html: `<div id="missions-body">${draw()}</div>`, actions: {
    claim: (n) => { const r = Flow.claimMission(+n.dataset.i); if (r) { Audio.sfx('coin'); fly(n, $('#top-coins'), IC.coin); $('#missions-body', m.el).innerHTML = draw(); } },
    bonus: () => { const r = Flow.claimMissionsBonus(); if (r) { m.close(); showChest('ch_missions', { ...r.chest, credits: (r.chest.credits || 0) + r.credits }).then(() => current === 'home' && go('home')); } },
  }, onClose: () => current === 'home' && go('home') });
}

export function openWheel() {
  const n = WHEEL.length, seg = 360 / n;
  const colors = ['#39e4ff', '#ff5c9d', '#8f5bff', '#ffd24a', '#3ddc97', '#ff8a3d', '#4aa8ff', '#ff4f6b'];
  const label = (w) => (w.coins ? `${IC.coin}<b>${fmt(Math.round(w.coins * (1 + S.data.level * 0.06) / 5) * 5)}</b>` : w.credits ? `${IC.gem}<b>${w.credits}</b>` : `${IC.bolt}<b>×1</b>`);
  let spinning = false, rot = 0;
  const btns = () => { const ws = Flow.wheelStatus(); return ws.free ? `<button class="btn btn-primary" data-act="spin">${t('wh_free')}</button>` : ws.adsLeft > 0 ? `<button class="btn btn-video" data-act="spinad">${IC.video}${t('wh_ad', { n: ws.adsLeft })}</button>` : `<button class="btn btn-ghost is-disabled">${t('wh_none')}</button>`; };
  const m = modal({ cls: 'modal-wheel', html: `
    <h2>${IC.wheel} ${t('wh_title')}</h2>
    <div class="wheel-box"><div class="wheel-pin"></div>
      <div class="wheel" id="wheel" style="background:conic-gradient(${colors.map((c, i) => `${c} ${i * seg}deg ${(i + 1) * seg}deg`).join(',')})">
        ${WHEEL.map((w, i) => `<div class="wheel-seg" style="transform:rotate(${i * seg + seg / 2}deg)"><span>${label(w)}</span></div>`).join('')}
      </div><div class="wheel-hub">${IC.heart}</div></div>
    <div id="wheel-actions">${btns()}</div>`,
  actions: {
    spin: () => doSpin(false),
    spinad: async () => { if (spinning) return; const ok = await Ads.showRewarded(t('wh_title')); if (ok) doSpin(true); else toast(t('ad_none')); },
  }, onClose: () => current === 'home' && go('home') });
  function doSpin(viaAd) {
    if (spinning) return; spinning = true;
    const { index, prize } = Flow.spinWheel(viaAd);
    const wheel = $('#wheel', m.el); $('#wheel-actions', m.el).innerHTML = '';
    rot = Math.ceil(rot / 360) * 360 + 360 * 5 + (360 - (index * seg + seg / 2));
    wheel.style.transition = 'transform 4.2s cubic-bezier(.12,.72,.1,1)'; wheel.style.transform = `rotate(${rot}deg)`;
    let ticks = 0; const iv = setInterval(() => { Audio.sfx('spin'); if (++ticks > 26) clearInterval(iv); }, 140);
    setTimeout(() => {
      clearInterval(iv); Flow.grantWheel(prize); Audio.sfx('buy'); spinning = false;
      toast(prize.boost ? `+1 ${t('wh_boost')}` : prize.credits ? `+${prize.credits} ${t('credits')}` : `+${fmt(prize.coins)} ${t('coins')}`, prize.boost ? IC.bolt : prize.credits ? IC.gem : IC.coin);
      if (m.el.isConnected) $('#wheel-actions', m.el).innerHTML = btns();
    }, 4400);
  }
}

function openSettings() {
  const s = S.data.settings;
  const row = (key, label) => `<label class="set-row"><span>${label}</span><button class="switch ${s[key] ? 'on' : ''}" data-act="toggle" data-key="${key}"><i></i></button></label>`;
  const m = modal({ cls: 'modal-settings', html: `
    <h2>${IC.gear} ${t('set_title')}</h2>
    ${row('sfx', t('set_sfx'))}${row('music', t('set_music'))}${row('haptics', t('set_haptics'))}${Native.native ? row('notif', t('set_notif')) : ''}
    <div class="set-row"><span>${t('set_lang')}</span><div class="seg"><button data-act="lang" data-l="fr" class="${lang() === 'fr' ? 'on' : ''}">FR</button><button data-act="lang" data-l="en" class="${lang() === 'en' ? 'on' : ''}">EN</button></div></div>
    <button class="btn btn-ghost btn-wide" data-act="restore">${t('s_restore')}</button>
    ${Native.native ? `<button class="btn btn-ghost btn-wide" data-act="privacy">${t('set_privacy')}</button>` : ''}
    <p class="muted">LayJou Battle v${CONFIG.version}</p>`,
  actions: {
    toggle: async (n) => {
      const k = n.dataset.key;
      if (k === 'notif' && !s.notif) { const ok = await Native.enableNotifications(); n.classList.toggle('on', ok); return; }
      s[k] = !s[k]; n.classList.toggle('on', s[k]); save();
      if (k === 'music') Audio.refresh(); if (k === 'notif' && !s.notif) Native.clearReminders();
    },
    lang: (n) => { s.lang = n.dataset.l; save(); m.close(); initApp(); },
    restore: async () => { const n = await IAP.restore(); toast(t('s_restored', { n })); },
    privacy: () => Ads.privacyOptions(),
  } });
}

/** Cadeau de retour puis cadeau du jour à l'ouverture de l'app. */
export async function onAppOpen() {
  const gift = Flow.comebackGift();
  if (gift) await new Promise((resolve) => modal({ cls: 'modal-chest', dismissible: false, onClose: resolve, html: `<div class="burst"></div><div class="chest-ic">${IC.gift}</div><h2>${t('cb_title')}</h2><p>${t('cb_sub')}</p><div class="rw-row big">${reward(gift)}</div><button class="btn btn-primary" data-act="close">${t('claim')}</button>` }));
  if (S.data.stats.battles > 0 && Flow.dailyStatus().claimable) openDaily();
  if (current === 'home') go('home');
}

/** Bouton retour Android. @returns {boolean} false → l'app peut se mettre en arrière-plan */
export function handleBack() {
  if (closeTopModal()) return true;
  if (inBattle()) { battleBack(); return true; }
  if (current !== 'home') { go('home'); return true; }
  return false;
}

export function appPause() { if (inBattle()) battlePause(); Audio.mute(true); save(true); Native.scheduleReminders(); }
export function appResume() {
  Audio.mute(false); Native.clearReminders();
  // au-delà de 30 min d'absence, on démarre une nouvelle session (série remise à zéro)
  if (Date.now() - (S.data.lastSeen || 0) > 30 * 60000) { Flow.sessionStart(); if (!inBattle() && !hasModal()) onAppOpen(); }
  else if (inBattle()) battleResume();
  emit('resume');
}
