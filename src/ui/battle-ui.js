/* Écran de combat : HUD, commandes tactiles, pause, « Continuer ? » (vidéo / crédits) et écran de résultat. */
import { S, save, spend, addCoins, addCredits, addXp, combatStats, grant } from '../core/state.js';
import { Flow, session } from '../core/retention.js';
import { Ads } from '../core/ads.js';
import { Audio } from '../core/audio.js';
import { Native } from '../core/native.js';
import { CONFIG } from '../core/config.js';
import { t, L } from '../core/i18n.js';
import { fmt, clamp } from '../core/util.js';
import { STAGES, WEAPONS, stageCoins, stageXp, xpForLevel, byId } from '../game/data.js';
import { drawWeapon } from '../game/layjou.js';
import { Battle } from '../game/battle.js';
import { $, $$, el, UI, bindActions, modal, toast, countUp, fly, reward } from './dom.js';
import { IC } from './icons.js';
import { goalText } from './app.js';

let battle = null, cfg = null, videoReviveUsed = false, reviveCount = 0, pauseModal = null, keyHandlers = null, resultOpen = false;

export const inBattle = () => !!battle;
export function battlePause() { if (battle && !resultOpen && battle.state !== 'down' && !pauseModal) openPause(); }
export function battleResume() { /* la reprise passe par la fenêtre de pause */ }
export function battleBack() { if (!resultOpen) battlePause(); }

export function startBattle(o) {
  cfg = o; videoReviveUsed = false; reviveCount = 0; resultOpen = false;
  const app = $('#app'), scr = $('#scr-battle'), weapon = byId(WEAPONS, S.data.equip.weapon);
  app.classList.add('in-battle'); scr.hidden = false;
  scr.innerHTML = `
    <canvas id="battle-cv"></canvas>
    <div class="vignette"></div>
    <div class="hud-top">
      <button class="icon-btn" id="b-pause" aria-label="pause">${IC.pause}</button>
      <div class="foe">
        <div class="foe-name"><b id="foe-name"></b><span class="tag tag-boss" id="foe-boss" hidden>${IC.skull}${t('h_boss')}</span><span class="foe-wave" id="foe-wave"></span></div>
        <div class="bar bar-foe"><i id="foe-hp"></i></div>
        <div class="bar bar-stagger"><i id="foe-stagger"></i></div>
      </div>
    </div>
    <div class="combo" id="combo" hidden><b>0</b><small>${t('combo')}</small></div>
    <div class="hint" id="hint" hidden><span></span></div>
    <div class="hud-bottom">
      <div class="me">
        <div class="me-row">${IC.heart}<div class="bar bar-me"><i id="me-hp"></i><span id="me-hp-txt"></span></div></div>
        <div class="me-row me-energy">${IC.bolt}<div class="bar bar-energy"><i id="me-en"></i></div></div>
      </div>
      <div class="pad">
        <div class="pad-left">
          <button class="ctl ctl-dodge" data-c="dodge">${IC.dash}<small>${t('c_dodge')}</small><i class="cd"></i></button>
          <button class="ctl ctl-block" data-c="block">${IC.shield}<small>${t('c_block')}</small></button>
        </div>
        <div class="pad-right">
          <button class="ctl ctl-ult" data-c="ult"><i class="ring"></i>${IC.heart}<small>${t('c_ult')}</small></button>
          <button class="ctl ctl-weapon" data-c="weapon"><canvas id="ctl-weapon-cv" width="96" height="96"></canvas><small>${t('c_weapon')}</small><i class="cd"></i></button>
          <button class="ctl ctl-punch" data-c="punch">${IC.fist}<small>${t('c_punch')}</small></button>
        </div>
      </div>
    </div>`;
  // icône de l'arme équipée
  { const c = $('#ctl-weapon-cv'), x = c.getContext('2d'); x.translate(48, 50); x.rotate(-0.55); x.scale(1.25, 1.25); x.translate(weapon.id === 'boomerang' ? -14 : -24, 4); drawWeapon(x, weapon.id, 0.4); }

  const ref = { foeHp: $('#foe-hp'), foeSt: $('#foe-stagger'), meHp: $('#me-hp'), meTxt: $('#me-hp-txt'), meEn: $('#me-en'), ult: $('.ctl-ult'), wcd: $('.ctl-weapon .cd'), dcd: $('.ctl-dodge .cd'), combo: $('#combo'), hint: $('#hint') };
  const hud = {
    enemy(pct, name, boss, wave) { $('#foe-name').textContent = name; $('#foe-boss').hidden = !boss; $('#foe-wave').textContent = cfg.mode === 'arena' ? t('wave_n', { n: wave }) : ''; ref.foeHp.style.width = '100%'; },
    enemyHp(pct, enraged) { ref.foeHp.style.width = pct * 100 + '%'; ref.foeHp.classList.toggle('rage', enraged); },
    stagger(pct, stunned) { ref.foeSt.style.width = pct * 100 + '%'; ref.foeSt.classList.toggle('stun', stunned); },
    player(pct, hp) { ref.meHp.style.width = pct * 100 + '%'; ref.meHp.classList.toggle('low', pct < 0.3); ref.meTxt.textContent = hp; },
    energy(pct) { ref.meEn.style.width = pct * 100 + '%'; ref.ult.style.setProperty('--en', pct); ref.ult.classList.toggle('ready', pct >= 1); },
    cd(which, pct) { (which === 'weapon' ? ref.wcd : ref.dcd).style.setProperty('--cd', clamp(pct)); (which === 'weapon' ? ref.wcd : ref.dcd).parentElement.classList.toggle('cooling', pct > 0.02); },
    telegraph(type) { $('.ctl-block').classList.toggle('alert', type === 'block'); $('.ctl-dodge').classList.toggle('alert', type === 'dodge'); },
    combo(n) { ref.combo.hidden = n < 3; if (n >= 3) { ref.combo.firstElementChild.textContent = n; ref.combo.classList.remove('pop'); void ref.combo.offsetWidth; ref.combo.classList.add('pop'); } },
    hint(key) { ref.hint.hidden = !key; if (key) { ref.hint.className = 'hint hint-' + key; ref.hint.firstElementChild.textContent = t('hint_' + key); } for (const c of $$('.ctl')) c.classList.toggle('guide', !!key && c.dataset.c === key); },
  };

  const stats = combatStats();
  battle = new Battle($('#battle-cv'), {
    enemy: o.enemy, worldId: o.worldId, mode: o.mode, nextWave: o.nextWave,
    loadout: { ...S.data.equip }, stats, diff: Flow.difficulty(o.stageIndex, o.mode), hud,
    tr: t, sfx: (n) => Audio.sfx(n), buzz: (k) => Native.buzz(k),
    tutorial: S.data.tut, gentleStart: S.data.stats.battles < 2, startEnergy: o.startEnergy,
    onEvent(name, arg) {
      if (name === 'tut') { S.data.tut[arg] = true; save(); return; }
      const done = Flow.progress(name === 'arenaWave' ? 'arena' : name);
      if (done) { toast(t('mission_done'), IC.check); Audio.sfx('star'); }
    },
    onDown: openRevive,
    onEnd: finishBattle,
  });
  Audio.music(o.enemy.boss ? 'boss' : 'battle');
  if (import.meta.env.DEV) window.__battle = battle;

  // commandes tactiles (pointerdown : réponse immédiate, multi-touch natif)
  for (const b of $$('.ctl', scr)) {
    const c = b.dataset.c;
    b.addEventListener('pointerdown', (ev) => {
      ev.preventDefault(); Audio.unlock();
      b.classList.add('down');
      if (c === 'block') { try { b.setPointerCapture(ev.pointerId); } catch { /* ancien WebView */ } battle && battle.input('blockDown'); } else battle && battle.input(c);
    });
    const up = () => { b.classList.remove('down'); if (c === 'block' && battle) battle.input('blockUp'); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', () => { if (c !== 'block') b.classList.remove('down'); });
    b.addEventListener('contextmenu', (ev) => ev.preventDefault());
  }
  $('#b-pause').addEventListener('click', () => { Audio.sfx('click'); battlePause(); });
  // clavier (tests sur ordinateur) : J frappe · K arme · L super · Espace parer · A esquive
  const map = { j: 'punch', k: 'weapon', l: 'ult', a: 'dodge' };
  keyHandlers = {
    down: (ev) => { if (!battle || ev.repeat) return; const k = ev.key.toLowerCase(); if (map[k]) battle.input(map[k]); else if (k === ' ' || k === 's') { ev.preventDefault(); battle.input('blockDown'); } else if (k === 'escape') battlePause(); },
    up: (ev) => { const k = ev.key.toLowerCase(); if (battle && (k === ' ' || k === 's')) battle.input('blockUp'); },
  };
  window.addEventListener('keydown', keyHandlers.down); window.addEventListener('keyup', keyHandlers.up);
}

function teardown() {
  if (battle) { battle.destroy(); battle = null; }
  if (keyHandlers) { window.removeEventListener('keydown', keyHandlers.down); window.removeEventListener('keyup', keyHandlers.up); keyHandlers = null; }
  if (UI.heroResult) { UI.heroResult.stop(); UI.heroResult = null; }
  const scr = $('#scr-battle'); scr.hidden = true; scr.innerHTML = '';
  $('#app').classList.remove('in-battle'); resultOpen = false; pauseModal = null;
}

function openPause() {
  battle.pause(); if (battle.p.blocking) battle.input('blockUp');
  pauseModal = modal({ cls: 'modal-pause', dismissible: false, html: `
    <h2>${IC.pause} ${t('pause')}</h2>
    <button class="btn btn-primary btn-wide" data-act="resume">${IC.play}${t('resume')}</button>
    <button class="btn btn-ghost btn-wide" data-act="quit">${t('quit')}</button>`,
  actions: (m) => ({
    resume: () => { m.close(); pauseModal = null; battle && battle.resume(); },
    quit: () => { m.close(); pauseModal = null; if (battle) { battle.resume(); battle.giveUp(); } },
  }) });
}

/* ----------------------- « Continuer ? » après un K.O. ----------------------- */
function openRevive(b) {
  const cost = CONFIG.economy.reviveCosts[Math.min(reviveCount, CONFIG.economy.reviveCosts.length - 1)];
  const pct = Math.round(CONFIG.economy.reviveHpPct * 100);
  let left = 9, iv = null, busy = false;
  const m = modal({ cls: 'modal-revive', dismissible: false, html: `
    <div class="revive-heart"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" class="ring-bg"/><circle cx="50" cy="50" r="45" class="ring-fg" id="rv-ring"/></svg>${IC.heart}<b id="rv-count">${left}</b></div>
    <h2>${t('rv_title')}</h2><p>${t('rv_sub', { pct })}</p>
    ${videoReviveUsed ? '' : `<button class="btn btn-video btn-wide" data-act="video">${IC.video}${t('rv_video')}</button>`}
    <button class="btn btn-gold btn-wide" data-act="pay">${IC.gem}${cost}<small>(${fmt(S.data.credits)})</small></button>
    <button class="btn btn-link" data-act="no">${t('rv_no')}</button>`,
  actions: (mm) => ({
    video: async () => {
      if (busy) return; busy = true; clearInterval(iv);
      const ok = await Ads.showRewarded(t('rv_title'));
      busy = false;
      if (ok) { videoReviveUsed = true; reviveCount++; mm.close(); b.revive(CONFIG.economy.reviveHpPct); Audio.music(cfg.enemy.boss ? 'boss' : 'battle', true); }
      else { toast(t('ad_none')); tick(); iv = setInterval(tick, 1000); }
    },
    pay: () => {
      if (busy) return;
      if (!spend('credits', cost)) { Audio.sfx('error'); toast(t('no_credits'), IC.gem); return; }
      clearInterval(iv); reviveCount++; mm.close(); b.revive(CONFIG.economy.reviveHpPct);
    },
    no: () => { if (busy) return; clearInterval(iv); mm.close(); b.paused = false; b.giveUp(); },
  }) });
  const ring = $('#rv-ring', m.el), C = 2 * Math.PI * 45; ring.style.strokeDasharray = C;
  const tick = () => {
    $('#rv-count', m.el).textContent = left; ring.style.strokeDashoffset = C * (1 - left / 9); Audio.sfx('tick');
    if (left-- <= 0) { clearInterval(iv); m.close(); b.paused = false; b.giveUp(); }
  };
  tick(); iv = setInterval(tick, 1000);
}

/* ------------------------------ fin du combat ------------------------------ */
function finishBattle(res) {
  const d = S.data, o = cfg, st = o.enemy, cs = combatStats(), idx = o.stageIndex;
  const mul = Flow.streakMul(session.streak);
  let coins = 0, xp = 0, credits = 0, stars = 0, first = false, newWorld = false, arenaUnlock = false, record = false, champion = false;
  if (o.mode === 'stage') {
    if (res.win) {
      first = idx === d.stage;
      coins = stageCoins(idx, st.boss) * (first ? 2 : CONFIG.economy.replayCoinFactor);
      xp = stageXp(idx, st.boss) * (first ? 1 : 0.5);
      stars = res.hpPct >= 0.6 ? 3 : res.hpPct >= 0.3 ? 2 : 1; if (res.revives) stars = Math.min(stars, 2);
      const prev = d.stars[idx] || 0; if (stars > prev) { d.stars[idx] = stars; Flow.progress('stars', stars - prev); }
      if (first) {
        d.stage++;
        if (st.boss) { credits = idx === STAGES.length - 1 ? 50 : 15; newWorld = idx < STAGES.length - 1; arenaUnlock = idx === 4; if (idx === STAGES.length - 1) { grant('skin', 'champion'); champion = true; } }
      }
      Flow.progress('win');
    } else {
      const prog = 1 - res.enemyHpPct;
      coins = 10 + stageCoins(idx, st.boss) * 0.15 * prog; xp = stageXp(idx, st.boss) * 0.25 * prog;
    }
  } else {
    for (let k = 1; k <= res.waves; k++) { const p = o.arenaPower + (k - 1) * 1.4; coins += stageCoins(p, k % 5 === 0) * 0.45; xp += stageXp(p, k % 5 === 0) * 0.4; }
    coins += 10;
    if (res.waves > d.arenaBest) { d.arenaBest = res.waves; record = true; }
    if (res.waves > 0) Flow.progress('win');
  }
  coins = Math.round(coins * mul * cs.coinMul); xp = Math.round(xp * cs.xpMul);
  const xpBefore = { level: d.level, pct: d.xp / xpForLevel(d.level) };
  const flow = Flow.record(res, { stageIndex: idx, mode: o.mode });
  addCoins(coins); if (credits) addCredits(credits);
  const ups = addXp(xp);
  save(true);
  showResult({ res, coins, xp, credits, stars, first, newWorld, arenaUnlock, record, champion, ups, flow, mul, xpBefore });
}

function showResult(r) {
  resultOpen = true;
  const o = cfg, d = S.data, win = o.mode === 'stage' ? r.res.win : r.res.waves > 0, arena = o.mode === 'arena';
  Audio.music(null); Audio.sfx(win ? 'win' : 'lose');
  const goals = Flow.nextGoals().slice(0, 2);
  const nextMul = Flow.streakMul(session.streak);
  const hasNext = o.mode === 'stage' && win && d.stage < STAGES.length;
  const node = el(`
    <div class="result ${win ? 'win' : 'lose'}">
      <div class="result-card">
        ${win ? '<div class="rays"></div>' : ''}
        <h1>${arena ? t('r_arena') : win ? t('r_victory') : t('r_defeat')}</h1>
        ${arena ? `<p class="result-sub">${t('r_waves', { n: r.res.waves })}${r.record ? ` <span class="tag tag-hot">${t('r_record')}</span>` : ''}</p>` : ''}
        ${!arena && win ? `<div class="stars3">${[1, 2, 3].map((n) => `<i class="${n <= r.stars ? 'on' : ''}" style="--i:${n}">${IC.star}</i>`).join('')}</div>` : ''}
        <canvas class="result-hero" id="result-hero"></canvas>
        ${!win && !arena ? `<p class="tip">${t(Flow.defeatTip(r.res))}</p>` : ''}
        <div class="rw-row big" id="rw-row">
          <span class="rw">${IC.coin}<b id="rw-coins">0</b></span><span class="rw">${IC.xp}<b id="rw-xp">0</b></span>${r.credits ? `<span class="rw">${IC.gem}<b>+${r.credits}</b></span>` : ''}
        </div>
        <div class="result-tags">
          ${r.first ? `<span class="mini mini-first">${IC.star}${t('r_first')}</span>` : ''}
          ${r.mul > 1 ? `<span class="mini mini-streak">${IC.flame}${t('r_streak', { m: r.mul.toFixed(1) })}</span>` : ''}
          ${!win && !arena ? `<span class="mini">${t('r_consolation')}</span>` : ''}
        </div>
        <div class="xpline"><div class="lvl-badge"><span id="res-lvl">${r.xpBefore.level}</span></div><div class="bar bar-xp"><i id="res-xp" style="width:${Math.round(r.xpBefore.pct * 100)}%"></i></div></div>
        ${r.coins > 0 ? `<button class="btn btn-video btn-wide" data-act="double">${IC.video}${t('r_double')} <b>+${fmt(r.coins)}</b>${IC.coin}</button>` : ''}
        ${goals.length ? `<div class="goals"><small>${t('r_goal')}</small>${goals.map((g) => `<div class="goal-line"><span>${goalText(g)}</span><div class="bar bar-thin"><i style="width:${Math.round(Math.min(1, g.pct) * 100)}%"></i></div></div>`).join('')}</div>` : ''}
        <div class="row">
          <button class="btn btn-ghost" data-act="home">${t('home')}</button>
          ${hasNext ? `<button class="btn btn-play" data-act="next">${t('next_stage')}${IC.arrow}</button>`
    : win && !arena ? `<button class="btn btn-play" data-act="home">${t('cont')}</button>`
      : `<button class="btn btn-play" data-act="retry">${IC.swords}${t('retry')}</button>`}
        </div>
        ${!win && !arena ? `<button class="btn btn-cyan btn-wide" data-act="lab">${IC.up}${t('r_upgrade')}</button>` : ''}
        ${nextMul < 1.5 ? `<small class="streak-next">${IC.flame}${t('r_streak_next', { m: (nextMul + 0.0001).toFixed(1) })}</small>` : ''}
      </div>
    </div>`);
  $('#scr-battle').appendChild(node);
  requestAnimationFrame(() => node.classList.add('in'));
  UI.heroResult = new UI.HeroView($('#result-hero', node), () => ({ skin: d.equip.skin, accessory: d.equip.accessory, weapon: null, pose: win ? 'victory' : 'break' })); UI.heroResult.start();
  setTimeout(() => { countUp($('#rw-coins', node), 0, r.coins, 800, '+'); countUp($('#rw-xp', node), 0, r.xp, 800, '+'); if (r.coins) Audio.sfx('coin'); }, 350);
  if (win && !arena) for (let n = 1; n <= r.stars; n++) setTimeout(() => Audio.sfx('star'), 250 + n * 260);
  setTimeout(() => { const bar = $('#res-xp', node); if (bar) { bar.style.width = (r.ups.length ? 100 : Math.round((d.xp / xpForLevel(d.level)) * 100)) + '%'; if (r.ups.length) setTimeout(() => { $('#res-lvl', node).textContent = d.level; bar.style.transition = 'none'; bar.style.width = '0%'; void bar.offsetWidth; bar.style.transition = ''; bar.style.width = Math.round((d.xp / xpForLevel(d.level)) * 100) + '%'; Audio.sfx('levelup'); }, 700); } }, 900);

  let leaving = false;
  const leave = async (dest) => {
    if (leaving) return; leaving = true;
    const again = { ...cfg };
    teardown();
    if (Flow.shouldShowInterstitial() && (await Ads.showInterstitial())) Flow.markInterstitial();
    const pops = [...UI.levelUps(r.ups)];
    if (r.flow.sessionChest) { const c = Flow.takeSessionChest(); if (c) pops.push(() => UI.showChest('ch_session', c)); }
    if (r.champion) pops.push(() => info(IC.crown, t('r_champion')));
    else if (r.arenaUnlock) pops.push(() => info(IC.flame, t('r_arena_unlock')));
    else if (r.newWorld) pops.push(() => info(IC.map, t('r_world')));
    if (Native.native && !d.settings.notifAsked && d.stats.wins >= 3) pops.push(askNotifications);
    await UI.queuePopups(pops);
    if (dest === 'next') UI.fightNext();
    else if (dest === 'retry') { if (again.mode === 'arena') UI.startArena(); else UI.startStage(again.stageIndex); }
    else UI.go(dest === 'lab' ? 'lab' : 'home');
  };
  bindActions(node, {
    home: () => leave('home'), next: () => leave('next'), retry: () => leave('retry'), lab: () => leave('lab'),
    double: async (n) => {
      if (n.classList.contains('is-disabled')) return;
      n.classList.add('is-disabled');
      if (await Ads.showRewarded(t('r_double'))) {
        addCoins(r.coins); countUp($('#rw-coins', node), r.coins, r.coins * 2, 600, '+'); Audio.sfx('buy'); fly(n, $('#rw-coins', node), IC.coin, 8);
        n.innerHTML = `${IC.check}${t('r_doubled')}`;
      } else { n.classList.remove('is-disabled'); toast(t('ad_none')); }
    },
  });
}

const info = (icon, text) => new Promise((resolve) => modal({ cls: 'modal-chest', dismissible: false, onClose: resolve, html: `<div class="burst"></div><div class="chest-ic">${icon}</div><h2>${text}</h2><button class="btn btn-primary" data-act="close">${t('ok')}</button>` }));

const askNotifications = () => new Promise((resolve) => {
  S.data.settings.notifAsked = true; save();
  modal({ cls: 'modal-chest', dismissible: false, onClose: resolve, html: `<div class="chest-ic">${IC.gift}</div><h2>${t('np_title')}</h2><p>${t('np_sub')}</p><div class="row"><button class="btn btn-ghost" data-act="close">${t('later')}</button><button class="btn btn-primary" data-act="yes">${t('np_yes')}</button></div>`,
    actions: (m) => ({ yes: async () => { await Native.enableNotifications(); m.close(); } }) });
});
