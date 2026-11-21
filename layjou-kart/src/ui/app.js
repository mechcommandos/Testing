/* Coque de l'application : barre du haut, onglets, accueil et fenêtres (cadeau, missions, roue, coffres, réglages). */
import { S, onChange, emit, save, addCoins, addCredits, totalStars, nextEvent } from '../core/state.js';
import { Flow, session } from '../core/retention.js';
import { Ads } from '../core/ads.js';
import { IAP } from '../core/iap.js';
import { Audio } from '../core/audio.js';
import { Native } from '../core/native.js';
import { Haptic } from '../core/haptics.js';
import { CONFIG } from '../core/config.js';
import { t, L, lang } from '../core/i18n.js';
import { fmt, fmtTime, TAU } from '../core/util.js';
import { WORLDS, DAILY_REWARDS, WHEEL, MISSIONS, KARTS, xpForLevel, byId } from '../game/data.js';
import { drawKartFront } from '../game/kart-art.js';
import { $, $$, el, UI, bindActions, modal, toast, fly, reward, closeTopModal, hasModal } from './dom.js';
import { IC } from './icons.js';
import { renderShop, renderGarage, renderCups, openPreRace } from './screens.js';
import { raceBack, racePause, raceResume, inRace } from './race-ui.js';

/* ------------------------- kart animé (menus) ------------------------- */
export class KartView {
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
    const lk = this.look(), sc = Math.min(h / 200, w / 190), gy = h - 14 * sc;
    // socle lumineux + lignes de vitesse
    const g = ctx.createRadialGradient(w / 2, gy, 4, w / 2, gy, w * 0.5); g.addColorStop(0, 'rgba(255,214,90,0.55)'); g.addColorStop(0.6, 'rgba(255,92,157,0.2)'); g.addColorStop(1, 'rgba(255,92,157,0)');
    ctx.save(); ctx.translate(w / 2, gy); ctx.scale(1, 0.22); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, w * 0.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, w * 0.34 + Math.sin(this.t * 2) * 4, 0, TAU); ctx.stroke(); ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) { const y = gy - (30 + i * 22) * sc, x = ((this.t * 380 + i * 97) % (w + 120)) - 60; ctx.lineWidth = 2 + (i % 2); ctx.beginPath(); ctx.moveTo(w - x, y); ctx.lineTo(w - x + 40 + i * 6, y); ctx.stroke(); }
    const steer = Math.sin(this.t * 0.9) * 0.6;
    ctx.save(); ctx.translate(w / 2, gy + Math.sin(this.t * 14) * 0.8); ctx.scale(sc, sc);
    drawKartFront(ctx, { shape: byId(KARTS, lk.kart).shape, skin: lk.skin, accessory: lk.accessory, t: this.t, steer });
    ctx.restore();
  }
}

/* ------------------------------- coque ------------------------------- */
let current = 'home', heroHome = null, homeTimer = null;
const SCREENS = ['shop', 'garage', 'home', 'cups'];
const TAB_IC = { shop: IC.shop, garage: IC.kart, home: IC.flag, cups: IC.trophy };
const TAB_KEY = { shop: 'tab_shop', garage: 'tab_garage', home: 'tab_race', cups: 'tab_cups' };

export function initApp() {
  const app = $('#app');
  app.innerHTML = `
    <div id="menu">
      <div id="menu-bg"><i class="orb o1"></i><i class="orb o2"></i><i class="orb o3"></i><div class="stripes"></div></div>
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
    </div>
    <section id="race" hidden></section>
    <div id="modal-root"></div><div id="toast-root"></div>`;
  bindActions($('#topbar'), { coins: () => go('shop', 'coins'), credits: () => go('shop', 'credits'), settings: openSettings });
  $('#tabbar').addEventListener('click', (ev) => { const b = ev.target.closest('[data-tab]'); if (b) { Audio.sfx('tab'); go(b.dataset.tab); } });
  onChange(refreshTop);
  Object.assign(UI, { go, refreshTop, showChest, openDaily, openMissions, openWheel, queuePopups, levelUps, KartView, raceNext, current: () => current, onRaceExit, askNotifications });
  refreshTop(); go('home');
}

export function refreshTop() {
  const d = S.data;
  const set = (id, v) => { const n = $(id); if (n && n.textContent !== v) n.textContent = v; };
  set('#top-coins', fmt(d.coins)); set('#top-credits', fmt(d.credits)); set('#top-level', String(d.level));
  const xp = $('#top-xp'); if (xp) xp.style.width = Math.round((d.xp / xpForLevel(d.level)) * 100) + '%';
  const dots = { home: Flow.dailyStatus().claimable || Flow.missionsBadge() > 0 || Flow.chestReadyIn() === 0, garage: UI.garageReady ? UI.garageReady() : false };
  for (const b of $$('#tabbar .tab')) { const dot = $('.dot', b); if (dot) dot.hidden = !dots[b.dataset.tab]; }
}

export function go(name, arg) {
  current = name;
  $('#menu').hidden = false; $('#race').hidden = true;
  for (const s of SCREENS) $('#scr-' + s).hidden = s !== name;
  for (const b of $$('#tabbar .tab')) b.classList.toggle('on', b.dataset.tab === name);
  if (heroHome) heroHome.stop(); clearInterval(homeTimer);
  if (UI.heroGarage) UI.heroGarage.stop();
  const node = $('#scr-' + name);
  if (name === 'home') renderHome(node);
  else if (name === 'shop') renderShop(node, arg);
  else if (name === 'garage') renderGarage(node, arg);
  else if (name === 'cups') renderCups(node, arg);
  node.scrollTop = 0;
  Audio.music('menu');
  refreshTop();
}
export const currentScreen = () => current;

/* ------------------------------ accueil ------------------------------ */
const upcoming = () => nextEvent((w) => Flow.unlocked(w));

function renderHome(node) {
  const d = S.data, ev = upcoming(), w = WORLDS[ev.world];
  const goal = Flow.nextGoals()[0];
  const stars = d.stars[ev.key] || 0;
  node.innerHTML = `
    <div class="home">
      <div class="logo"><img class="logo-a" src="./layjou-logo.png" alt="Layjou" draggable="false"><span class="logo-b">KART</span></div>
      <div class="home-mid">
        <div class="side">
          <button class="side-btn" data-act="daily">${IC.gift}<span>${t('h_daily')}</span><i class="dot" id="dot-daily" hidden></i></button>
          <button class="side-btn" data-act="wheel">${IC.wheel}<span>${t('h_wheel')}</span><i class="dot" id="dot-wheel" hidden></i></button>
        </div>
        <div class="hero-wrap"><canvas id="hero-home"></canvas></div>
        <div class="side">
          <button class="side-btn" data-act="missions">${IC.list}<span>${t('h_missions')}</span><i class="dot" id="dot-missions" hidden></i></button>
          <button class="side-btn" data-act="chest">${IC.chest}<span id="chest-label">${t('h_chest')}</span><i class="dot" id="dot-chest" hidden></i></button>
        </div>
      </div>
      ${goal ? `<button class="goal" data-act="goal" data-go="${goal.go}">${IC.target}<span>${goalText(goal)}</span>${IC.arrow}</button>` : ''}
      <div class="event-card" data-act="cups" style="--wc:${w.color}">
        <div class="event-badge">${ev.kind === 'race' ? IC.flag : ev.kind === 'duel' ? IC.skull : IC.clock}</div>
        <div class="event-info">
          <small>${t('h_cup', { w: L(w.name) })} · ${t(ev.kind === 'race' ? 'ev_race' : 'ev_' + ev.kind)}</small>
          <b>${L(ev.name)}</b>
          <div class="stars-row">${[0, 1, 2].map((i) => `<i class="st ${i < stars ? 'on' : ''}">${IC.star}</i>`).join('')}<span class="muted">${t('h_stars', { n: totalStars() })}</span></div>
        </div>
        ${IC.arrow}
      </div>
      <button class="btn btn-play" data-act="race">${IC.flag}<span>${t('play')}</span></button>
      <div class="mini-chips">
        ${session.streak > 0 ? `<span class="mini mini-streak">${IC.flame}${t('h_streak', { m: Flow.streakMul().toFixed(1) })}</span>` : ''}
        ${d.turbos > 0 ? `<span class="mini mini-boost" data-act="turbo">${IC.bolt}${t('h_turbo')} ×${d.turbos}</span>` : ''}
      </div>
    </div>`;
  heroHome = new KartView($('#hero-home'), () => S.data.equip); heroHome.start();
  if (!node.dataset.bound) {
    node.dataset.bound = '1';
    bindActions(node, {
      race: raceNext, cups: () => go('cups'), daily: openDaily, wheel: openWheel, missions: openMissions,
      chest: () => { const r = Flow.openFreeChest(); if (r) showChest('c_title', r).then(() => go('home')); else openChestWait(); },
      goal: (n) => { const g = n.dataset.go; if (g === 'missions') openMissions(); else if (g === 'race') raceNext(); else go(g); },
      turbo: () => toast(t('h_turbo_tip'), IC.bolt),
    });
  }
  const tick = () => {
    const ms = Flow.chestReadyIn(), lab = $('#chest-label');
    if (lab) lab.textContent = ms > 0 ? fmtTime(ms) : t('h_ready');
    const dot = (id, on) => { const n = $(id); if (n) n.hidden = !on; };
    dot('#dot-chest', ms === 0); dot('#dot-daily', Flow.dailyStatus().claimable); dot('#dot-missions', Flow.missionsBadge() > 0);
    dot('#dot-wheel', Flow.wheelStatus().free);
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

export function raceNext() { openPreRace(upcoming()); }

/** Retour au menu après une course. */
export function onRaceExit(to = 'home') { go(to); }

/* ------------------------------ fenêtres ------------------------------ */
export async function queuePopups(list) { for (const fn of list) await fn(); }

export function showChest(titleKey, r) {
  return new Promise((resolve) => {
    Audio.sfx('chest'); Haptic.boom(); setTimeout(() => Haptic.celebrate(), 300);
    modal({ cls: 'modal-chest', dismissible: false, onClose: resolve, html: `
      <div class="burst"></div><div class="chest-ic">${IC.chest}</div>
      <h2>${t(titleKey)}</h2><div class="rw-row big">${reward(r)}</div>
      <button class="btn btn-primary" data-act="close">${t('claim')}</button>` });
  });
}

function openChestWait() {
  const ms = Flow.chestReadyIn();
  const cost = Math.max(5, Math.ceil(ms / 600000) * 2);
  const m = modal({ cls: 'modal-chest', html: `
    <div class="chest-ic">${IC.chest}</div><h2>${t('c_title')}</h2><p>${t('c_in', { t: fmtTime(ms) })}</p>
    <button class="btn btn-video" data-act="ad">${IC.video}${t('c_skip')}</button>
    <button class="btn btn-gem" data-act="gem">${IC.gem}${cost}</button>`,
  actions: {
    ad: async () => { const ok = await Ads.showRewarded(t('c_title')); if (!ok) return toast(t('ad_none')); S.data.daily.chestAt = Date.now(); m.close(); const r = Flow.openFreeChest(); if (r) showChest('c_title', r).then(() => go('home')); },
    gem: () => { if (S.data.credits < cost) return toast(t('no_credits'), IC.gem); addCredits(-cost); S.data.stats.spent += cost; S.data.daily.chestAt = Date.now(); m.close(); const r = Flow.openFreeChest(); if (r) showChest('c_title', r).then(() => go('home')); },
  } });
}

export function levelUps(levels) {
  return levels.map((lvl) => () => new Promise((resolve) => {
    const coins = 150 * lvl, credits = 5 + Math.floor(lvl / 5) * 5; addCoins(coins); addCredits(credits); Audio.sfx('levelup'); Haptic.celebrate();
    modal({ cls: 'modal-level', dismissible: false, onClose: resolve, html: `
      <div class="burst"></div><div class="lvl-badge big"><span>${lvl}</span></div>
      <h2>${t('lv_title')}</h2><p>${t('lv_sub')}</p><div class="rw-row big">${reward({ coins, credits })}</div>
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
    <h2>${IC.gift} ${t('d_title')}</h2>
    <div class="days">${DAILY_REWARDS.map(cell).join('')}</div>
    <button class="btn btn-primary ${st.claimable ? '' : 'is-disabled'}" data-act="take">${st.claimable ? t('claim') : t('d_come')}</button>`,
  actions: { take: (n) => {
    const r = Flow.claimDaily(); if (!r) return;
    Audio.sfx('coin'); Haptic.success(); fly(n, $(r.credits ? '#top-credits' : '#top-coins'), r.credits ? IC.gem : IC.coin);
    m.close(); const after = () => { if (current === 'home') go('home'); };
    if (r.chest) showChest('d_title', r.chest).then(after); else after();
  } } });
}

export function openMissions() {
  Flow.ensureDaily();
  const tpl = (id) => MISSIONS.find((x) => x.id === id);
  const draw = () => {
    const ms = S.data.daily.missions, bonus = Flow.missionsBonusReady(), bonusDone = S.data.daily.bonusClaimed;
    return `<h2>${IC.list} ${t('m_title')}</h2>
      <div class="missions">${ms.map((m, i) => `
        <div class="mission ${m.claimed ? 'done' : ''}">
          <div class="mission-main"><b>${L(tpl(m.id).text).replace('{n}', m.n)}</b><div class="bar"><i style="width:${Math.round((m.p / m.n) * 100)}%"></i><span>${m.p}/${m.n}</span></div></div>
          ${m.claimed ? `<span class="mission-ok">${IC.check}</span>` : `<button class="btn btn-small ${m.p >= m.n ? 'btn-primary' : 'btn-ghost is-disabled'}" data-act="claim" data-i="${i}">${IC.coin}${fmt(m.reward)}</button>`}
        </div>`).join('')}
        <div class="mission mission-bonus ${bonusDone ? 'done' : ''}"><div class="mission-main"><b>${t('m_bonus')}</b><small>${IC.gem} 12 + ${t('h_chest')}</small></div>
          ${bonusDone ? `<span class="mission-ok">${IC.check}</span>` : `<button class="btn btn-small ${bonus ? 'btn-gold' : 'btn-ghost is-disabled'}" data-act="bonus">${t('claim')}</button>`}</div>
      </div><p class="muted">${t('m_reset')}</p>`;
  };
  const m = modal({ cls: 'modal-missions', html: `<div id="missions-body">${draw()}</div>`, actions: {
    claim: (n) => { const r = Flow.claimMission(+n.dataset.i); if (r) { Audio.sfx('coin'); Haptic.success(); fly(n, $('#top-coins'), IC.coin); $('#missions-body', m.el).innerHTML = draw(); } },
    bonus: () => { const r = Flow.claimMissionsBonus(); if (r) { m.close(); showChest('m_bonus', { ...r.chest, credits: (r.chest.credits || 0) + r.credits }).then(() => current === 'home' && go('home')); } },
  }, onClose: () => current === 'home' && go('home') });
}

export function openWheel() {
  const n = WHEEL.length, seg = 360 / n;
  const colors = ['#39e4ff', '#ff5c9d', '#8f5bff', '#ffd24a', '#3ddc97', '#ff8a3d', '#4aa8ff', '#ff4f6b'];
  const label = (w) => (w.coins ? `${IC.coin}<b>${fmt(Math.round(w.coins * (1 + S.data.level * 0.06) / 5) * 5)}</b>` : w.credits ? `${IC.gem}<b>${w.credits}</b>` : `${IC.bolt}<b>×1</b>`);
  let spinning = false, rot = 0;
  const btns = () => { const ws = Flow.wheelStatus(); return ws.free ? `<button class="btn btn-primary" data-act="spin">${t('w_spin')}</button>` : ws.adsLeft > 0 ? `<button class="btn btn-video" data-act="spinad">${IC.video}${t('w_spin_ad')} (${ws.adsLeft})</button>` : `<button class="btn btn-ghost is-disabled">${t('d_come')}</button>`; };
  const m = modal({ cls: 'modal-wheel', html: `
    <h2>${IC.wheel} ${t('w_title')}</h2>
    <div class="wheel-box"><div class="wheel-pin"></div>
      <div class="wheel" id="wheel" style="background:conic-gradient(${colors.map((c, i) => `${c} ${i * seg}deg ${(i + 1) * seg}deg`).join(',')})">
        ${WHEEL.map((w, i) => `<div class="wheel-seg" style="transform:rotate(${i * seg + seg / 2}deg)"><span>${label(w)}</span></div>`).join('')}
      </div><div class="wheel-hub">${IC.heart}</div></div>
    <div id="wheel-actions">${btns()}</div>`,
  actions: {
    spin: () => doSpin(false),
    spinad: async () => { if (spinning) return; const ok = await Ads.showRewarded(t('w_title')); if (ok) doSpin(true); else toast(t('ad_none')); },
  }, onClose: () => current === 'home' && go('home') });
  function doSpin(viaAd) {
    if (spinning) return; spinning = true;
    const { index, prize } = Flow.spinWheel(viaAd);
    const wheel = $('#wheel', m.el); $('#wheel-actions', m.el).innerHTML = '';
    rot = Math.ceil(rot / 360) * 360 + 360 * 5 + (360 - (index * seg + seg / 2));
    wheel.style.transition = 'transform 4.2s cubic-bezier(.12,.72,.1,1)'; wheel.style.transform = `rotate(${rot}deg)`;
    let ticks = 0; const iv = setInterval(() => { Audio.sfx('spin'); Haptic.select(); if (++ticks > 26) clearInterval(iv); }, 140);
    setTimeout(() => {
      clearInterval(iv); Flow.grantWheel(prize); Audio.sfx('buy'); Haptic.celebrate(); spinning = false;
      toast(prize.turbo ? `+1 ${t('w_turbo')}` : prize.credits ? `+${prize.credits} ${t('credits')}` : `+${fmt(prize.coins)} ${t('coins')}`, prize.turbo ? IC.bolt : prize.credits ? IC.gem : IC.coin);
      if (m.el.isConnected) $('#wheel-actions', m.el).innerHTML = btns();
    }, 4400);
  }
}

function openSettings() {
  const s = S.data.settings;
  const row = (key, label, sub = '') => `<label class="set-row"><span>${label}${sub ? `<small>${sub}</small>` : ''}</span><button class="switch ${s[key] ? 'on' : ''}" data-act="toggle" data-key="${key}"><i></i></button></label>`;
  const m = modal({ cls: 'modal-settings', html: `
    <h2>${IC.gear} ${t('set_title')}</h2>
    ${row('assist', t('set_assist'), t('set_assist_sub'))}
    <div class="set-row"><span>${t('set_sens')}</span><div class="seg">${[0.75, 1, 1.35].map((v, i) => `<button data-act="sens" data-v="${v}" class="${Math.abs(s.sensitivity - v) < 0.01 ? 'on' : ''}">${['−', '•', '+'][i]}</button>`).join('')}</div></div>
    ${row('sfx', t('set_sfx'))}${row('music', t('set_music'))}${row('haptics', t('set_haptics'))}${Native.native ? row('notif', t('set_notif')) : ''}
    <div class="set-row"><span>${t('set_quality')}</span><div class="seg"><button data-act="quality" data-v="1" class="${s.quality >= 1 ? 'on' : ''}">${t('set_q_high')}</button><button data-act="quality" data-v="0.6" class="${s.quality < 1 ? 'on' : ''}">${t('set_q_low')}</button></div></div>
    <div class="set-row"><span>${t('set_lang')}</span><div class="seg"><button data-act="lang" data-l="fr" class="${lang() === 'fr' ? 'on' : ''}">FR</button><button data-act="lang" data-l="en" class="${lang() === 'en' ? 'on' : ''}">EN</button></div></div>
    <button class="btn btn-ghost btn-wide" data-act="restore">${t('set_restore')}</button>
    ${Native.native ? `<button class="btn btn-ghost btn-wide" data-act="privacy">${t('set_privacy')}</button>` : ''}
    <button class="btn btn-ghost btn-wide" data-act="policy">${t('set_policy')}</button>
    <p class="muted">Layjou Kart · ${t('set_version', { v: CONFIG.version })}</p>`,
  actions: {
    toggle: async (n) => {
      const k = n.dataset.key;
      if (k === 'notif' && !s.notif) { const ok = await Native.enableNotifications(); n.classList.toggle('on', ok); return; }
      s[k] = !s[k]; n.classList.toggle('on', s[k]); save();
      if (k === 'music') Audio.refresh(); if (k === 'notif' && !s.notif) Native.clearReminders();
    },
    sens: (n) => { s.sensitivity = Number(n.dataset.v); save(); $$('[data-act="sens"]', m.el).forEach((b) => b.classList.toggle('on', b === n)); },
    quality: (n) => { s.quality = Number(n.dataset.v); save(); $$('[data-act="quality"]', m.el).forEach((b) => b.classList.toggle('on', b === n)); },
    lang: (n) => { s.lang = n.dataset.l; save(); m.close(); initApp(); },
    restore: async () => { const n = await IAP.restore(); toast(t('s_restored', { n })); },
    privacy: () => Ads.privacyOptions(),
    policy: () => window.open(CONFIG.privacyUrl, '_blank'),
  } });
}

/** Demande des rappels (après le 3ᵉ podium, jamais au lancement). */
export function askNotifications() {
  const s = S.data.settings;
  if (!Native.native || s.notif || s.notifAsked) return Promise.resolve();
  s.notifAsked = true; save();
  return new Promise((resolve) => {
    const m = modal({ cls: 'modal-chest', onClose: resolve, html: `<div class="chest-ic">${IC.clock}</div><h2>${t('n_ask_title')}</h2><p>${t('n_ask_sub')}</p>
      <button class="btn btn-primary" data-act="yes">${t('ok')}</button><button class="btn btn-ghost" data-act="close">${t('later')}</button>`,
    actions: { yes: async () => { await Native.enableNotifications(); m.close(); } } });
  });
}

/** Cadeau de retour puis cadeau du jour à l'ouverture de l'app. */
export async function onAppOpen() {
  const gift = Flow.comebackGift();
  if (gift) await new Promise((resolve) => modal({ cls: 'modal-chest', dismissible: false, onClose: resolve, html: `<div class="burst"></div><div class="chest-ic">${IC.gift}</div><h2>${t('cb_title')}</h2><p>${t('cb_sub')}</p><div class="rw-row big">${reward(gift)}</div><button class="btn btn-primary" data-act="close">${t('claim')}</button>` }));
  if (S.data.stats.races > 0 && Flow.dailyStatus().claimable) openDaily();
  if (current === 'home' && !inRace()) go('home');
}

/** Bouton retour Android. @returns {boolean} false → l'app peut se mettre en arrière-plan */
export function handleBack() {
  if (closeTopModal()) return true;
  if (inRace()) { raceBack(); return true; }
  if (current !== 'home') { go('home'); return true; }
  return false;
}

export function appPause() { Haptic.stopAll(); if (inRace()) racePause(); Audio.mute(true); save(true); Native.scheduleReminders(); }
export function appResume() {
  Audio.mute(false); Native.clearReminders();
  if (Date.now() - (S.data.lastSeen || 0) > 30 * 60000) { Flow.sessionStart(); if (!inRace() && !hasModal()) onAppOpen(); }
  else if (inRace()) raceResume();
  emit('resume');
}

export { el };
