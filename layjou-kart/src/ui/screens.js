/* Écrans : Coupes (choix des épreuves), avant-course, Garage (skins, accessoires, armes, karts), Boutique. */
import { S, save, emit, addCoins, spend, owns, grant, equip, totalStars, worldStars } from '../core/state.js';
import { Flow } from '../core/retention.js';
import { Ads } from '../core/ads.js';
import { IAP } from '../core/iap.js';
import { Audio } from '../core/audio.js';
import { CONFIG } from '../core/config.js';
import { t, L } from '../core/i18n.js';
import { fmt, fmtTime, TAU } from '../core/util.js';
import { WORLDS, EVENTS, SKINS, ACCESSORIES, WEAPONS, KARTS, RIVALS, MONSTER_PALS, RARITY, WORLD_UNLOCK, starThresholds, byId } from '../game/data.js';
import { renderLayjouThumb, drawWeapon } from '../game/layjou.js';
import { renderMonsterThumb } from '../game/monsters.js';
import { drawKartFront } from '../game/kart-art.js';
import { buildTrack } from '../game/track.js';
import { MAXV } from '../game/race.js';
import { $, $$, UI, bindActions, modal, toast, fly } from './dom.js';
import { IC } from './icons.js';
import { startRace } from './race-ui.js';

const starsHtml = (n, cls = '') => `<span class="stars ${cls}">${[0, 1, 2].map((i) => `<i class="st ${i < n ? 'on' : ''}">${IC.star}</i>`).join('')}</span>`;
const evIcon = (ev) => (ev.kind === 'race' ? IC.flag : ev.kind === 'duel' ? IC.skull : ev.kind === 'coins' ? IC.coin : IC.clock);

/* ================================== Coupes ================================== */
export function renderCups(node) {
  const total = totalStars();
  node.innerHTML = `
    <div class="page">
      <h1 class="page-title">${IC.trophy} ${t('cups_title')} <small>${IC.star} ${total}</small></h1>
      ${WORLDS.map((w, wi) => {
        const open = Flow.unlocked(wi), ws = worldStars(wi), evs = EVENTS.filter((e) => e.world === wi);
        return `<div class="cup ${open ? '' : 'is-locked'}" style="--wc:${w.color}">
          <div class="cup-head"><canvas class="cup-art" data-world="${wi}"></canvas><div><small>${t('h_cup', { w: '' }).trim()} ${wi + 1}</small><b>${L(w.name)}</b></div><span class="cup-stars">${IC.star}${ws}/${evs.length * 3}</span></div>
          <div class="cup-events">${evs.map((e) => `
            <button class="ev ${e.kind !== 'race' ? 'ev-x' : ''}" data-act="ev" data-key="${e.key}" ${open ? '' : 'disabled'}>
              <span class="ev-ic">${evIcon(e)}</span><span class="ev-name">${L(e.name)}</span>${starsHtml(S.data.stars[e.key] || 0, 'sm')}
            </button>`).join('')}</div>
          ${open ? '' : `<div class="cup-lock">${IC.lock}<span>${t('cup_locked', { n: WORLD_UNLOCK[wi] - total })}</span></div>`}
        </div>`;
      }).join('')}
    </div>`;
  for (const c of $$('.cup-art', node)) {
    const wi = +c.dataset.world, r = RIVALS[[0, 4, 2, 5, 6][wi]];
    renderMonsterThumb(c, r.type, MONSTER_PALS[WORLDS[wi].variants[r.id]], { zoom: 1.05 });
  }
  if (!node.dataset.bound) {
    node.dataset.bound = '1';
    bindActions(node, { ev: (n) => openPreRace(EVENTS.find((e) => e.key === n.dataset.key)) });
  }
}

/* =============================== avant-course =============================== */
export function openPreRace(ev) {
  const w = WORLDS[ev.world], th = starThresholds(ev.world), stars = S.data.stars[ev.key] || 0;
  const best = S.data.best[ev.key];
  let goals = '';
  if (ev.kind === 'race') goals = th.map((v, i) => `<li>${starsHtml(i + 1, 'sm')}<span>${t('goal_score', { n: fmt(v) })}</span></li>`).join('');
  else if (ev.kind === 'coins') goals = ev.challenge.goal.map((v, i) => `<li>${starsHtml(i + 1, 'sm')}<span>${t('goal_coins', { n: v })}</span></li>`).join('');
  else if (ev.kind === 'chrono') { const par = chronoPar(ev); goals = [1.12, 1.0, 0.92].map((k, i) => `<li>${starsHtml(i + 1, 'sm')}<span>${t('goal_time', { t: fmtClock(par * k) })}</span></li>`).join(''); }
  else goals = `<li>${starsHtml(1, 'sm')}<span>${t('goal_win')}</span></li>` + th.slice(1).map((v, i) => `<li>${starsHtml(i + 2, 'sm')}<span>${t('goal_win')} · ${t('goal_score', { n: fmt(v) })}</span></li>`).join('');
  const rivals = ev.kind === 'race' ? RIVALS : ev.kind === 'duel' ? [byId(RIVALS, ev.challenge.rival)] : [];
  const m = modal({ cls: 'modal-pre', html: `
    <div class="pre-head" style="--wc:${w.color}"><small>${t('h_cup', { w: L(w.name) })}</small><h2>${L(ev.name)}</h2>${starsHtml(stars)}</div>
    <div class="pre-body">
      <canvas class="pre-map" id="pre-map"></canvas>
      <div class="pre-goals"><b>${t('pre_goal')}</b><ul>${goals}</ul>${best ? `<small class="muted">${IC.trophy} ${fmt(best)}</small>` : ''}</div>
    </div>
    ${rivals.length ? `<b class="pre-sub">${ev.kind === 'duel' ? IC.skull + ' ' + ev.challenge.boss.name : t('pre_rivals')}</b>
    <div class="pre-rivals ${ev.kind === 'duel' ? 'is-duel' : ''}">${rivals.map((r) => `<div class="riv"><canvas data-type="${r.type}" data-pal="${ev.kind === 'duel' ? ev.challenge.boss.pal : w.variants[r.id]}"></canvas><span>${ev.kind === 'duel' ? ev.challenge.boss.name : r.name}</span></div>`).join('')}</div>` : `<p class="pre-desc">${t(ev.kind === 'coins' ? 'ch_coins' : 'ch_chrono')}</p>`}
    ${ev.kind === 'duel' ? `<p class="pre-desc">${t('ch_duel')}</p>` : ''}
    <div class="pre-meta"><span>${IC.flag}${t('pre_laps', { n: ev.kind === 'coins' ? '∞' : ev.laps })}</span>${S.data.turbos > 0 ? `<span class="mini mini-boost">${IC.bolt}${t('h_turbo')}</span>` : ''}</div>
    <button class="btn btn-play" data-act="go">${IC.flag}<span>${t('pre_start')}</span></button>`,
  actions: { go: () => { m.close(); startRace(ev); } } });
  // mini-carte du circuit
  const track = buildTrack(ev.world, ev.track), cv = $('#pre-map', m.el);
  requestAnimationFrame(() => drawMapPreview(cv, track, w.color));
  for (const c of $$('.pre-rivals canvas', m.el)) renderMonsterThumb(c, c.dataset.type, MONSTER_PALS[c.dataset.pal]);
}

export function chronoPar(ev) { const tr = buildTrack(ev.world, ev.track); return (tr.length * ev.laps) / (MAXV * 0.9) + 3; }
export const fmtClock = (s) => { const m = Math.floor(s / 60), r = s - m * 60; return `${m}:${r.toFixed(1).padStart(4, '0')}`; };

function drawMapPreview(cv, track, color) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
  cv.width = w * dpr; cv.height = h * dpr;
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const pad = 10, k = Math.min(w, h) - pad * 2, ox = (w - k) / 2, oy = (h - k) / 2;
  c.lineJoin = 'round'; c.lineCap = 'round';
  const path = () => { c.beginPath(); track.map.forEach(([x, y], i) => (i ? c.lineTo(ox + x * k, oy + y * k) : c.moveTo(ox + x * k, oy + y * k))); c.closePath(); };
  path(); c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 11; c.stroke();
  path(); c.strokeStyle = color; c.lineWidth = 7; c.stroke();
  path(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.setLineDash([4, 6]); c.stroke(); c.setLineDash([]);
  const [x0, y0] = track.map[14];
  c.fillStyle = '#fff'; c.beginPath(); c.arc(ox + x0 * k, oy + y0 * k, 5, 0, TAU); c.fill(); c.fillStyle = '#ff5c9d'; c.beginPath(); c.arc(ox + x0 * k, oy + y0 * k, 3, 0, TAU); c.fill();
}

/* ================================== Garage ================================== */
const TYPES = [['skin', SKINS, 'g_skins'], ['accessory', ACCESSORIES, 'g_acc'], ['weapon', WEAPONS, 'g_weapons'], ['kart', KARTS, 'g_karts']];
let gTab = 'skin', gSel = null;

UI.garageReady = () => TYPES.some(([type, list]) => list.some((it) => !owns(type, it.id) && it.price && it.price.coins && S.data.coins >= it.price.coins));

export function renderGarage(node, arg) {
  if (arg) gTab = arg;
  const [, list] = TYPES.find((x) => x[0] === gTab);
  if (!gSel || !list.find((x) => x.id === gSel)) gSel = S.data.equip[gTab];
  node.innerHTML = `
    <div class="page garage">
      <div class="garage-stage"><canvas id="garage-hero"></canvas><div class="garage-name" id="g-name"></div></div>
      <div class="seg seg-tabs">${TYPES.map(([type, , key]) => `<button data-act="tab" data-t="${type}" class="${type === gTab ? 'on' : ''}">${t(key)}</button>`).join('')}</div>
      <div class="detail" id="g-detail"></div>
      <div class="grid" id="g-grid">${list.map((it) => `
        <button class="card r-${it.rarity} ${it.id === gSel ? 'sel' : ''} ${owns(gTab, it.id) ? 'own' : ''}" data-act="pick" data-id="${it.id}">
          <canvas class="thumb" data-id="${it.id}"></canvas>
          ${S.data.equip[gTab] === it.id ? `<span class="badge-eq">${IC.check}</span>` : owns(gTab, it.id) ? '' : `<span class="price-tag">${priceHtml(it.price, gTab, it.id)}</span>`}
        </button>`).join('')}</div>
    </div>`;
  const preview = () => {
    const e = { ...S.data.equip }; if (gTab !== 'weapon') e[gTab] = gSel;
    return { ...e, showWeapon: gTab === 'weapon' ? gSel : null };
  };
  UI.heroGarage = new GarageView($('#garage-hero', node), preview); UI.heroGarage.start();
  drawThumbs(node);
  drawDetail(node);
  if (!node.dataset.bound) {
    node.dataset.bound = '1';
    bindActions(node, {
      tab: (n) => { gTab = n.dataset.t; gSel = null; Audio.sfx('tab'); renderGarage(node); },
      pick: (n) => { gSel = n.dataset.id; for (const c of $$('.card', node)) c.classList.toggle('sel', c.dataset.id === gSel); drawDetail(node); },
      equip: () => { equip(gTab, gSel); Audio.sfx('buy'); renderGarage(node); },
      buy: (n) => buyItem(node, n),
      ad: (n) => adItem(node, n),
    });
  }
}

class GarageView {
  constructor(cv, look) { this.cv = cv; this.look = look; this.t = 0; this.run = false; this._f = (n) => this.frame(n); }
  start() { this.run = true; this.last = performance.now(); requestAnimationFrame(this._f); }
  stop() { this.run = false; }
  frame(now) {
    if (!this.run || !this.cv.isConnected) return;
    requestAnimationFrame(this._f);
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; this.t += dt;
    const cv = this.cv, w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    const lk = this.look(), sc = Math.min(h / 205, w / 230), gy = h - 10 * sc;
    const g = ctx.createRadialGradient(w / 2, gy, 2, w / 2, gy, w * 0.45); g.addColorStop(0, 'rgba(57,228,255,.5)'); g.addColorStop(1, 'rgba(57,228,255,0)');
    ctx.save(); ctx.translate(w / 2, gy); ctx.scale(1, 0.2); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, w * 0.45, 0, TAU); ctx.fill(); ctx.restore();
    const wx = lk.showWeapon ? -30 * sc : 0;
    ctx.save(); ctx.translate(w / 2 + wx, gy); ctx.scale(sc, sc);
    drawKartFront(ctx, { shape: byId(KARTS, lk.kart).shape, skin: lk.skin, accessory: lk.accessory, t: this.t, steer: Math.sin(this.t * 0.8) * 0.4 });
    ctx.restore();
    if (lk.showWeapon) {
      const wd = byId(WEAPONS, lk.showWeapon);
      ctx.save(); ctx.translate(w / 2 + 70 * sc, gy - 110 * sc + Math.sin(this.t * 2) * 5 * sc);
      const gg = ctx.createRadialGradient(0, 0, 2, 0, 0, 60 * sc); gg.addColorStop(0, wd.color + 'aa'); gg.addColorStop(1, wd.color + '00');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(0, 0, 60 * sc, 0, TAU); ctx.fill();
      ctx.rotate(-0.35 + Math.sin(this.t * 1.3) * 0.1); ctx.scale(sc * 1.6, sc * 1.6); ctx.translate(-22, 0);
      drawWeapon(ctx, wd.id, this.t, wd.color); ctx.restore();
    }
  }
}

function drawThumbs(node) {
  const e = S.data.equip;
  for (const c of $$('.thumb', node)) {
    const id = c.dataset.id;
    if (gTab === 'skin') renderLayjouThumb(c, { skin: id, accessory: 'none', pose: 'wave', headOnly: true });
    else if (gTab === 'accessory') renderLayjouThumb(c, { skin: e.skin, accessory: id, pose: 'wave', headOnly: id !== 'cape' && id !== 'wings' && id !== 'scarf' && id !== 'bowtie' });
    else {
      const dpr = Math.min(2, window.devicePixelRatio || 1), w = c.clientWidth, h = c.clientHeight;
      c.width = w * dpr; c.height = h * dpr; const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (gTab === 'weapon') { const wd = byId(WEAPONS, id); ctx.translate(w / 2 - 6, h / 2 + 4); ctx.rotate(-0.3); ctx.scale(w / 70, w / 70); ctx.translate(-14, 0); drawWeapon(ctx, id, 0.4, wd.color); }
      else { const k = byId(KARTS, id), sc = Math.min(w / 150, h / 170); ctx.translate(w / 2, h - 4); ctx.scale(sc, sc); drawKartFront(ctx, { shape: k.shape, skin: e.skin, accessory: e.accessory, t: 0.4 }); }
    }
  }
}

function priceHtml(p, type, id) {
  if (!p) return t('free');
  if (p.coins) return `${IC.coin}${fmt(p.coins)}`;
  if (p.credits) return `${IC.gem}${p.credits}`;
  if (p.ads) return `${IC.video}${S.data.adProgress[type + ':' + id] || 0}/${p.ads}`;
  if (p.stars) return `${IC.star}${p.stars}`;
  return '';
}

function perkText(perk) {
  if (!perk) return t('perk_none');
  return Object.entries(perk).map(([k, v]) => t('perk_' + k, { v: Math.round(v * 100) })).join(' · ');
}

function drawDetail(node) {
  const [type, list] = TYPES.find((x) => x[0] === gTab);
  const it = byId(list, gSel), r = RARITY[it.rarity];
  const own = owns(type, it.id), eq = S.data.equip[type] === it.id;
  $('#g-name', node).innerHTML = `<b>${L(it.name)}</b><span style="color:${r.color}">${L(r)}</span>`;
  let info = '';
  if (type === 'skin') info = `<p>${t(it.rainbow ? 'sk_rainbow' : it.stars ? 'sk_stars' : 'sk_plain')}</p>`;
  else if (type === 'accessory') info = `<p>${perkText(it.perk)}</p>`;
  else if (type === 'weapon') info = `<p>${L(it.desc)}</p><small class="muted">${t('w_charge', { v: it.charge.toFixed(2) })}</small>`;
  else info = `<div class="kstats">${['speed', 'accel', 'handling', 'drift'].map((k) => `<div class="kst"><span>${t('st_' + k)}</span><div class="pips">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= it.stats[k] ? 'on' : ''}"></i>`).join('')}</div></div>`).join('')}</div>`;
  let btn;
  if (eq) btn = `<button class="btn btn-ghost is-disabled">${IC.check}${t('equipped')}</button>`;
  else if (own) btn = `<button class="btn btn-primary" data-act="equip">${t('equip')}</button>`;
  else if (it.price.coins) btn = `<button class="btn btn-gold" data-act="buy">${IC.coin}${fmt(it.price.coins)}</button>`;
  else if (it.price.credits) btn = `<button class="btn btn-gem" data-act="buy">${IC.gem}${it.price.credits}</button>`;
  else if (it.price.ads) btn = `<button class="btn btn-video" data-act="ad">${IC.video}${t('videos', { n: S.data.adProgress[type + ':' + it.id] || 0, m: it.price.ads })}</button>`;
  else if (it.price.stars) btn = `<button class="btn btn-ghost is-disabled">${IC.star}${t('unlock_stars', { n: it.price.stars })} (${totalStars()})</button>`;
  $('#g-detail', node).innerHTML = `<div class="detail-info">${info}</div>${btn}`;
}

function buyItem(node, btn) {
  const [type, list] = TYPES.find((x) => x[0] === gTab);
  const it = byId(list, gSel), p = it.price;
  const kind = p.coins ? 'coins' : 'credits', cost = p.coins || p.credits;
  if (!spend(kind, cost)) { Audio.sfx('error'); toast(t(kind === 'coins' ? 'no_coins' : 'no_credits'), kind === 'coins' ? IC.coin : IC.gem); if (kind === 'credits') UI.go('shop', 'credits'); return; }
  grant(type, it.id); equip(type, it.id); Audio.sfx('buy');
  toast(L(it.name), IC.check);
  renderGarage(node);
}

async function adItem(node) {
  const [type, list] = TYPES.find((x) => x[0] === gTab);
  const it = byId(list, gSel), key = type + ':' + it.id;
  const ok = await Ads.showRewarded(L(it.name));
  if (!ok) return toast(t('ad_none'));
  S.data.adProgress[key] = (S.data.adProgress[key] || 0) + 1;
  if (S.data.adProgress[key] >= it.price.ads) { grant(type, it.id); equip(type, it.id); Audio.sfx('buy'); toast(L(it.name), IC.check); }
  save(); renderGarage(node);
}

/** Déblocage automatique des objets à étoiles. */
export function checkStarUnlocks() {
  const out = [];
  for (const [type, list] of TYPES) for (const it of list) if (it.price && it.price.stars && !owns(type, it.id) && totalStars() >= it.price.stars) { grant(type, it.id); out.push(it); }
  return out;
}

/* ================================= Boutique ================================= */
export function renderShop(node, arg) {
  const P = CONFIG.iap.products, d = S.data;
  const pack = (id) => P.find((p) => p.id === id);
  const left = Flow.freeCreditsLeft();
  node.innerHTML = `
    <div class="page shop">
      <h1 class="page-title">${IC.shop} ${t('s_title')}</h1>
      <button class="offer offer-free ${left > 0 ? '' : 'is-disabled'}" data-act="free">
        <span class="offer-ic">${IC.video}</span><span class="offer-txt"><b>${t('s_free')}</b><small>${t('s_free_sub', { n: CONFIG.ads.freeCreditsAmount, left })}</small></span><span class="offer-price">${IC.gem}+${CONFIG.ads.freeCreditsAmount}</span>
      </button>
      ${IAP.owned('starter_pack') ? '' : `<button class="offer offer-starter" data-act="iap" data-id="starter_pack">
        <span class="offer-ic">${IC.gift}</span><span class="offer-txt"><b>${t('s_starter')}</b><small>${t('s_starter_sub')}</small></span><span class="offer-price">${IAP.price('starter_pack')}</span>
      </button>`}
      <h3 id="credits">${IC.gem} ${t('s_credits')}</h3>
      <div class="packs">${['credits_80', 'credits_450', 'credits_1000', 'credits_2200', 'credits_6000'].map((id, i) => { const p = pack(id); return `
        <button class="pack ${p.tag ? 'pack-' + p.tag : ''}" data-act="iap" data-id="${id}">
          ${p.tag ? `<span class="pack-tag">${t(p.tag === 'popular' ? 's_popular' : 's_best')}</span>` : ''}
          <span class="pack-gems">${IC.gem.repeat(Math.min(3, i + 1))}</span><b>${fmt(p.credits)}</b>${p.bonus ? `<small>${t('s_bonus', { n: p.bonus })}</small>` : '<small>&nbsp;</small>'}
          <span class="pack-price">${IAP.price(id)}</span>
        </button>`; }).join('')}</div>
      ${d.noAds ? '' : `<button class="offer" data-act="iap" data-id="remove_ads"><span class="offer-ic">${IC.noads}</span><span class="offer-txt"><b>${t('s_noads')}</b><small>${t('s_noads_sub')}</small></span><span class="offer-price">${IAP.price('remove_ads')}</span></button>`}
      <h3 id="coins">${IC.coin} ${t('s_coins')}</h3>
      <div class="packs packs-3">${CONFIG.economy.coinPacks.map((c, i) => `
        <button class="pack pack-coins" data-act="coins" data-i="${i}"><span class="pack-gems">${IC.coin.repeat(i + 1)}</span><b>${fmt(c.coins)}</b><small>&nbsp;</small><span class="pack-price">${IC.gem}${c.credits}</span></button>`).join('')}</div>
      <button class="btn btn-ghost btn-wide" data-act="restore">${t('s_restore')}</button>
    </div>`;
  if (arg) requestAnimationFrame(() => { const a = $('#' + arg, node); if (a) a.scrollIntoView({ block: 'start' }); });
  if (!node.dataset.bound) {
    node.dataset.bound = '1';
    bindActions(node, {
      free: async (n) => {
        if (Flow.freeCreditsLeft() <= 0) return;
        const ok = await Ads.showRewarded(t('s_free'));
        if (!ok) return toast(t('ad_none'));
        Flow.takeFreeCredits(); Audio.sfx('coin'); fly(n, $('#top-credits'), IC.gem, 6); renderShop(node);
      },
      iap: async (n) => {
        const id = n.dataset.id;
        const r = await IAP.buy(id);
        if (r.ok) { Audio.sfx('buy'); toast(t('s_thanks'), IC.check); fly(n, $('#top-credits'), IC.gem, 10); renderShop(node); }
        else if (r.error === 'pending') toast(t('s_pending'));
        else if (!r.cancelled) toast(t('s_fail'));
      },
      coins: (n) => {
        const c = CONFIG.economy.coinPacks[+n.dataset.i];
        if (!spend('credits', c.credits)) { Audio.sfx('error'); toast(t('no_credits'), IC.gem); return; }
        addCoins(c.coins); Audio.sfx('buy'); fly(n, $('#top-coins'), IC.coin, 10);
      },
      restore: async () => { const k = await IAP.restore(); toast(t('s_restored', { n: k })); renderShop(node); },
    });
  }
}

export { emit };
