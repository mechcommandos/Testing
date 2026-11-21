/* Écrans : Boutique, Hangar (skins / accessoires / armes), Labo (améliorations), Carte des mondes. */
import { S, emit, save, spend, addCoins, owns, grant, equip, combatStats, powerScore } from '../core/state.js';
import { Flow } from '../core/retention.js';
import { Ads } from '../core/ads.js';
import { IAP } from '../core/iap.js';
import { Audio } from '../core/audio.js';
import { Native } from '../core/native.js';
import { Haptic } from '../core/haptics.js';
import { CONFIG } from '../core/config.js';
import { t, L } from '../core/i18n.js';
import { fmt } from '../core/util.js';
import { SKINS, ACCESSORIES, WEAPONS, UPGRADES, RARITY, WORLDS, STAGES, MONSTER_PALS, upgradeCost, upgradeCap, stageCoins, stageXp, byId } from '../game/data.js';
import { renderLayjouThumb, drawWeapon } from '../game/layjou.js';
import { renderMonsterThumb } from '../game/monsters.js';
import { worldCss } from '../game/backgrounds.js';
import { $, $$, UI, bindActions, modal, toast, fly } from './dom.js';
import { IC } from './icons.js';

/* ------------------------------ Boutique ------------------------------ */
export function renderShop(node, focus) {
  const prods = CONFIG.iap.products, packs = prods.filter((p) => p.type === 'consumable');
  const starterOwned = IAP.owned('starter_pack'), noAds = S.data.noAds;
  const left = Flow.freeCreditsLeft();
  node.innerHTML = `
    <div class="page">
      <h1>${IC.shop} ${t('tab_shop')}</h1>
      <h3>${t('s_offers')}</h3>
      <div class="offer offer-starter ${starterOwned ? 'is-owned' : ''}">
        <canvas class="offer-art" id="starter-art"></canvas>
        <div class="offer-txt"><span class="tag tag-hot">−70 %</span><b>${t('s_starter')}</b><small>${t('s_starter_desc')}</small></div>
        <button class="btn btn-gold" data-act="iap" data-id="starter_pack" ${starterOwned ? 'disabled' : ''}>${starterOwned ? IC.check + t('s_bought') : IAP.price('starter_pack')}</button>
      </div>
      <div class="offer offer-noads ${noAds ? 'is-owned' : ''}">
        <div class="offer-ic">${IC.noads}</div>
        <div class="offer-txt"><b>${t('s_noads')}</b><small>${t('s_noads_desc')}</small></div>
        <button class="btn btn-cyan" data-act="iap" data-id="remove_ads" ${noAds ? 'disabled' : ''}>${noAds ? IC.check + t('s_bought') : IAP.price('remove_ads')}</button>
      </div>

      <h3 id="shop-credits">${IC.gem} ${t('credits')}</h3>
      <div class="grid grid-3">
        ${packs.map((p, i) => `
          <button class="pack ${p.tag ? 'pack-' + p.tag : ''}" data-act="iap" data-id="${p.id}">
            ${p.tag ? `<span class="tag tag-${p.tag}">${t(p.tag === 'best' ? 's_best' : 's_popular')}</span>` : ''}
            <div class="pack-ic gems-${Math.min(5, i + 1)}">${IC.gem.repeat(Math.min(3, 1 + Math.floor(i / 2)))}</div>
            <b>${fmt(p.credits)}</b>${p.bonus ? `<small class="bonus">+${p.bonus} %</small>` : '<small>&nbsp;</small>'}
            <span class="price">${IAP.price(p.id)}</span>
          </button>`).join('')}
        <button class="pack pack-free ${left > 0 ? '' : 'is-disabled'}" data-act="freecredits">
          <span class="tag tag-free">${t('free')}</span>
          <div class="pack-ic">${IC.video}</div>
          <b>+${CONFIG.ads.freeCreditsAmount}</b><small>${left > 0 ? t('s_free_left', { n: left }) : t('s_free_none')}</small>
          <span class="price price-video">${IC.play}${t('free')}</span>
        </button>
      </div>

      <h3 id="shop-coins">${IC.coin} ${t('s_coins')}</h3>
      <div class="grid grid-3">
        ${CONFIG.economy.coinPacks.map((p, i) => `
          <button class="pack pack-coin" data-act="coinpack" data-i="${i}">
            <div class="pack-ic">${IC.coin.repeat(i + 1)}</div><b>${fmt(p.coins)}</b><small>&nbsp;</small>
            <span class="price price-gem">${IC.gem}${p.credits}</span>
          </button>`).join('')}
      </div>
      <button class="btn btn-ghost btn-wide" data-act="restore">${t('s_restore')}</button>
    </div>`;
  renderLayjouThumb($('#starter-art'), { skin: 'galaxy', weapon: 'saber', pose: 'proud' });
  if (focus) { const target = $('#shop-' + focus); if (target) setTimeout(() => target.scrollIntoView({ block: 'start', behavior: 'smooth' }), 60); }
  if (node.dataset.bound) return; node.dataset.bound = '1';
  bindActions(node, {
    iap: async (n) => {
      n.classList.add('is-busy');
      const r = await IAP.buy(n.dataset.id);
      n.classList.remove('is-busy');
      if (r.ok) { Audio.sfx('buy'); Haptic.celebrate(); toast(t('s_thanks'), IC.check); fly(n, $('#top-credits'), IC.gem, 10); renderShop(node); }
      else if (!r.cancelled) toast(t(r.error === 'pending' ? 's_pending' : 's_fail'));
    },
    freecredits: async (n) => {
      if (Flow.freeCreditsLeft() <= 0) return;
      if (await Ads.showRewarded(t('s_free'))) { Flow.takeFreeCredits(); Audio.sfx('coin'); Haptic.success(); fly(n, $('#top-credits'), IC.gem, 6); renderShop(node); } else toast(t('ad_none'));
    },
    coinpack: (n) => {
      const p = CONFIG.economy.coinPacks[+n.dataset.i];
      if (!spend('credits', p.credits)) { Audio.sfx('error'); Haptic.error(); toast(t('no_credits'), IC.gem); $('#shop-credits').scrollIntoView({ behavior: 'smooth' }); return; }
      addCoins(p.coins); Audio.sfx('buy'); Haptic.success(); fly(n, $('#top-coins'), IC.coin, 10);
    },
    restore: async () => { const n = await IAP.restore(); toast(t('s_restored', { n })); renderShop(node); },
  });
}

/* ------------------------------- Hangar ------------------------------- */
const LISTS = { skin: SKINS, accessory: ACCESSORIES, weapon: WEAPONS };
let hangarTab = 'skin', hangarSel = null;

function priceLabel(type, it) {
  const pr = it.price;
  if (owns(type, it.id)) return S.data.equip[type] === it.id ? `<span class="st st-eq">${IC.check}</span>` : '';
  if (!pr) return '';
  if (pr.coins) return `<span class="st">${IC.coin}${fmt(pr.coins)}</span>`;
  if (pr.credits) return `<span class="st">${IC.gem}${pr.credits}</span>`;
  if (pr.ads) return `<span class="st">${IC.video}${S.data.adProgress[it.id] || 0}/${pr.ads}</span>`;
  return `<span class="st">${IC.lock}</span>`;
}

function perkText(perk) {
  if (!perk) return t('perk_none');
  return Object.entries(perk).map(([k, v]) => t('perk_' + k, { n: Math.round(v * 100) })).join(' · ');
}

function weaponThumb(canvas, id) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w * dpr; canvas.height = h * dpr;
  const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.translate(w / 2, h / 2); ctx.rotate(-0.5); const s = w / 96; ctx.scale(s, s); ctx.translate(id === 'boomerang' ? -14 : -26, 4);
  drawWeapon(ctx, id, 0.4);
}

export function renderHangar(node, tab) {
  if (tab && LISTS[tab]) hangarTab = tab;
  const type = hangarTab, list = LISTS[type];
  if (!hangarSel || !list.find((x) => x.id === hangarSel)) hangarSel = S.data.equip[type];
  const it = byId(list, hangarSel), has = owns(type, it.id), eq = S.data.equip[type] === it.id, rar = RARITY[it.rarity];
  let action;
  if (has) action = eq ? `<button class="btn btn-ghost is-disabled">${IC.check}${t('equipped')}</button>` : `<button class="btn btn-primary" data-act="equip">${t('equip')}</button>`;
  else if (it.price.coins) action = `<button class="btn btn-primary" data-act="buy">${IC.coin}${fmt(it.price.coins)}</button>`;
  else if (it.price.credits) action = `<button class="btn btn-gold" data-act="buy">${IC.gem}${it.price.credits}</button>`;
  else if (it.price.ads) action = `<button class="btn btn-video" data-act="watch">${IC.video}${t('hg_watch', { p: S.data.adProgress[it.id] || 0, n: it.price.ads })}</button>`;
  else action = `<button class="btn btn-ghost is-disabled">${IC.lock}${t('hg_stage')}</button>`;
  const detail = type === 'weapon'
    ? `<div class="wstats">${[['w_dmg', it.dmg * (it.hits || 1) / 6], ['w_cd', 1 - it.cd / 5.5], ['w_stun', it.stagger / 55]].map(([k, v]) => `<div class="wstat"><small>${t(k)}</small><div class="bar"><i style="width:${Math.round(Math.min(1, v) * 100)}%"></i></div></div>`).join('')}</div><small class="muted">${L(it.desc)}</small>`
    : type === 'accessory' ? `<small class="perk">${IC.up}${perkText(it.perk)}</small>` : `<small class="muted" style="text-align:left">${t(it.rainbow ? 'sk_rainbow' : it.stars ? 'sk_stars' : 'sk_plain')}</small>`;
  node.innerHTML = `
    <div class="page page-hangar">
      <div class="hangar-top">
        <canvas id="hero-hangar"></canvas>
        <div class="hangar-info" style="--rc:${rar.color}">
          <span class="tag tag-rar">${L(rar)}</span>
          <b>${L(it.name)}</b>
          ${detail}
          ${action}
        </div>
      </div>
      <div class="seg seg-wide">${Object.keys(LISTS).map((k) => `<button data-act="tab" data-t="${k}" class="${k === type ? 'on' : ''}">${t('hg_' + k)}</button>`).join('')}</div>
      <div class="grid grid-3 items">
        ${list.map((x) => `<button class="item ${x.id === it.id ? 'sel' : ''} ${owns(type, x.id) ? 'has' : ''} r-${x.rarity}" data-act="sel" data-id="${x.id}" style="--rc:${RARITY[x.rarity].color}">
          <canvas data-thumb="${x.id}"></canvas><small>${L(x.name)}</small>${priceLabel(type, x)}</button>`).join('')}
      </div>
    </div>`;
  for (const c of $$('canvas[data-thumb]', node)) {
    const id = c.dataset.thumb;
    if (type === 'skin') renderLayjouThumb(c, { skin: id, pose: 'wave', headOnly: true, zoom: 0.92 });
    else if (type === 'accessory') renderLayjouThumb(c, { skin: S.data.equip.skin, accessory: id, pose: 'proud', headOnly: id !== 'cape' && id !== 'wings' && id !== 'bowtie' && id !== 'scarf', zoom: id === 'cape' || id === 'wings' ? 0.8 : 0.84 });
    else weaponThumb(c, id);
  }
  if (UI.heroHangar) UI.heroHangar.stop();
  UI.heroHangar = new UI.HeroView($('#hero-hangar'), () => ({ skin: type === 'skin' ? hangarSel : S.data.equip.skin, accessory: type === 'accessory' ? hangarSel : S.data.equip.accessory, weapon: type === 'weapon' ? hangarSel : S.data.equip.weapon, pose: 'proud' }));
  UI.heroHangar.start();
  if (node.dataset.bound) return; node.dataset.bound = '1';
  const unlocked = (n) => { Audio.sfx('buy'); Haptic.celebrate(); toast(t('hg_unlocked'), IC.check); renderHangar(node); };
  bindActions(node, {
    tab: (n) => { hangarTab = n.dataset.t; hangarSel = null; renderHangar(node); },
    sel: (n) => { hangarSel = n.dataset.id; renderHangar(node); },
    equip: () => { equip(hangarTab, hangarSel); Audio.sfx('star'); Haptic.medium(); renderHangar(node); },
    buy: (n) => {
      const item = byId(LISTS[hangarTab], hangarSel), pr = item.price, kind = pr.coins ? 'coins' : 'credits', cost = pr.coins || pr.credits;
      const pay = () => { if (!spend(kind, cost)) return; grant(hangarTab, item.id); equip(hangarTab, item.id); unlocked(n); };
      if (S.data[kind] < cost) { Audio.sfx('error'); Haptic.error(); toast(t(kind === 'coins' ? 'no_coins' : 'no_credits'), kind === 'coins' ? IC.coin : IC.gem); if (kind === 'credits') UI.go('shop', 'credits'); return; }
      if (kind === 'credits') modal({ cls: 'modal-confirm', html: `<h2>${L(item.name)}</h2><p class="confirm-price">${IC.gem}<b>${cost}</b></p><div class="row"><button class="btn btn-ghost" data-act="close">${t('cancel')}</button><button class="btn btn-gold" data-act="yes">${t('buy')}</button></div>`, actions: (m) => ({ yes: () => { m.close(); pay(); } }) });
      else pay();
    },
    watch: async (n) => {
      const item = byId(LISTS[hangarTab], hangarSel);
      if (!(await Ads.showRewarded(L(item.name)))) { toast(t('ad_none')); return; }
      const p = (S.data.adProgress[item.id] || 0) + 1; S.data.adProgress[item.id] = p; save();
      if (p >= item.price.ads) { grant(hangarTab, item.id); equip(hangarTab, item.id); unlocked(n); } else { Audio.sfx('coin'); renderHangar(node); }
    },
  });
}

/* -------------------------------- Labo -------------------------------- */
function statValue(id, lvl) {
  if (id === 'atk') return Math.round(10 * (1 + 0.1 * lvl));
  if (id === 'hp') return Math.round(100 * (1 + 0.12 * lvl));
  if (id === 'energy') return '+' + Math.round(8 * lvl) + ' %';
  return Math.round((0.05 + 0.02 * lvl) * 100) + ' %';
}
UI.labReady = () => UPGRADES.some((u) => S.data.up[u.id] < upgradeCap(u, S.data.level) && S.data.coins >= upgradeCost(u, S.data.up[u.id]));

export function renderLab(node) {
  const d = S.data, cs = combatStats();
  node.innerHTML = `
    <div class="page">
      <h1>${IC.flask} ${t('lab_title')}</h1>
      <div class="statline">
        <div><small>${t('lab_atk')}</small><b>${Math.round(cs.atk)}</b></div><div><small>${t('lab_hp')}</small><b>${cs.hp}</b></div>
        <div><small>${t('lab_crit')}</small><b>${Math.round(cs.crit * 100)} %</b></div><div><small>${t('lab_super')}</small><b>×${cs.energyGain.toFixed(2)}</b></div>
        <div class="statline-power">${IC.bolt}<b id="lab-power">${fmt(powerScore())}</b></div>
      </div>
      <div class="ups">
        ${UPGRADES.map((u) => {
    const lvl = d.up[u.id], cap = upgradeCap(u, d.level), cost = upgradeCost(u, lvl), maxed = lvl >= u.max, capped = !maxed && lvl >= cap, can = d.coins >= cost;
    return `<div class="up ${maxed ? 'is-max' : ''}">
            <div class="up-ic up-${u.id}">${IC[u.icon]}</div>
            <div class="up-main"><b>${L(u.name)} <em>${t('lv')} ${lvl}</em></b><small>${L(u.desc)}</small>
              <div class="up-val"><span>${statValue(u.id, lvl)}</span>${maxed ? '' : `${IC.arrow}<span class="next">${statValue(u.id, lvl + 1)}</span>`}</div>
              <div class="bar bar-thin"><i style="width:${Math.round((lvl / u.max) * 100)}%"></i></div></div>
            ${maxed ? `<span class="tag tag-max">${t('max')}</span>` : capped ? `<span class="up-cap">${IC.lock}<small>${t('lab_cap', { n: Math.ceil((lvl + 1 - 3) / 2) })}</small></span>` : `<button class="btn btn-small ${can ? 'btn-primary' : 'btn-ghost'}" data-act="up" data-id="${u.id}">${IC.coin}${fmt(cost)}</button>`}
          </div>`;
  }).join('')}
      </div>
    </div>`;
  if (node.dataset.bound) return; node.dataset.bound = '1';
  bindActions(node, {
    up: (n) => {
      const u = byId(UPGRADES, n.dataset.id), lvl = S.data.up[u.id], cost = upgradeCost(u, lvl);
      if (lvl >= upgradeCap(u, S.data.level)) return;
      if (!spend('coins', cost)) { Audio.sfx('error'); Haptic.error(); toast(t('no_coins'), IC.coin); return; }
      S.data.up[u.id]++; emit('up'); Flow.progress('upgrade'); Audio.sfx('levelup'); Haptic.celebrate();
      renderLab(node);
      const card = $(`.up .btn[data-id="${u.id}"]`, node); if (card) { const up = card.closest('.up'); up.classList.add('flash'); }
    },
  });
}

/* -------------------------------- Carte -------------------------------- */
export function renderMap(node) {
  const d = S.data;
  node.innerHTML = `
    <div class="page">
      <h1>${IC.map} ${t('map_title')}</h1>
      ${WORLDS.map((w, wi) => {
    const locked = d.stage < wi * 5;
    return `<div class="world ${locked ? 'is-locked' : ''}" style="background:${worldCss(w.id)};--wc:${w.color}">
          <div class="world-head"><b>${wi + 1}. ${L(w.name)}</b>${locked ? `<span class="tag">${IC.lock}${t('locked')}</span>` : `<span class="tag tag-stars">${IC.star}${w.stages.reduce((s, _, si) => s + (d.stars[wi * 5 + si] || 0), 0)}/15</span>`}</div>
          <div class="nodes">${w.stages.map((s, si) => {
    const idx = wi * 5 + si, state = idx < d.stage ? 'done' : idx === d.stage ? 'now' : 'lock', stars = d.stars[idx] || 0;
    return `<button class="node ${state} ${s.boss ? 'boss' : ''}" data-act="stage" data-i="${idx}">
              <canvas data-m="${idx}"></canvas>${state === 'lock' ? `<span class="node-lock">${IC.lock}</span>` : ''}
              <span class="node-stars">${[1, 2, 3].map((n) => `<i class="${n <= stars ? 'on' : ''}">${IC.star}</i>`).join('')}</span></button>`;
  }).join('')}</div>
        </div>`;
  }).join('')}
    </div>`;
  for (const c of $$('canvas[data-m]', node)) { const s = STAGES[+c.dataset.m]; renderMonsterThumb(c, s.m, MONSTER_PALS[s.pal]); }
  const now = $('.node.now', node); if (now) setTimeout(() => now.scrollIntoView({ block: 'center', behavior: 'smooth' }), 80);
  if (node.dataset.bound) return; node.dataset.bound = '1';
  bindActions(node, {
    stage: (n) => {
      const idx = +n.dataset.i, s = STAGES[idx];
      if (idx > S.data.stage) { Audio.sfx('error'); Haptic.error(); toast(t('map_locked'), IC.lock); return; }
      const first = idx === S.data.stage, coins = Math.round(stageCoins(idx, s.boss) * (first ? 2 : CONFIG.economy.replayCoinFactor));
      const m = modal({ cls: 'modal-stage', html: `
        <small>${t('h_stage', { w: s.world + 1, n: s.num })} · ${L(WORLDS[s.world].name)}</small>
        <h2>${s.name}${s.boss ? ` <span class="tag tag-boss">${IC.skull}${t('h_boss')}</span>` : ''}</h2>
        <div class="stage-art" style="background:${worldCss(s.worldId)}"><canvas id="stage-art"></canvas></div>
        <div class="rw-row"><span class="rw">${IC.coin}<b>${fmt(coins)}</b></span><span class="rw">${IC.xp}<b>${Math.round(stageXp(idx, s.boss) * (first ? 1 : 0.5))}</b></span>${first && s.boss ? `<span class="rw">${IC.gem}<b>${idx === 24 ? 50 : 15}</b></span>` : ''}</div>
        <button class="btn btn-play" data-act="go">${IC.swords}<span>${t('st_fight')}</span></button>`,
      actions: { go: () => { m.close(); UI.startStage(idx); } } });
      renderMonsterThumb($('#stage-art', m.el), s.m, MONSTER_PALS[s.pal], { zoom: 0.86 });
    },
  });
}
