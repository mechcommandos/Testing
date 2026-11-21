/* ------------------------------------------------------------------ *
 *  Layjou Kart — simulation de course.
 *
 *  Physique arcade (accélération automatique, dérapage → mini-turbo,
 *  hors-piste, tremplins), IA des rivaux, objets, armes spéciales,
 *  tours, classement, points d'action et « directeur de course »
 *  (élastique dynamique piloté par le Flow Engine).
 * ------------------------------------------------------------------ */
import { clamp, lerp } from '../core/util.js';
import { buildTrack, SEG, ROAD, START_SEG } from './track.js';
import { spriteMeta } from './scenery.js';
import { ITEMS, ITEM_ODDS, POINTS, RIVALS, WORLDS, KARTS, ACCESSORIES, WEAPONS, kartMods, byId } from './data.js';

export const MAXV = 9200;          // vitesse de pointe de base (unités / s)
const ACCEL = 5200;
const KART_W = 0.46;               // largeur d'un kart (en demi-routes)
const KART_L = 620;                // longueur d'un kart (unités)
const CENT = 0.3;                  // force centrifuge
const DRIFT_LV = [0.62, 1.3, 2.15]; // seuils de charge du mini-turbo (s)
const BOOST = [[0, 0], [0.55, 1.26], [1.0, 1.3], [1.6, 1.34]]; // [durée, puissance] par niveau

const wrap = (z, L) => ((z % L) + L) % L;
const wdiff = (a, b, L) => { let d = a - b; d -= Math.round(d / L) * L; return d; };

export class Race {
  /**
   * @param {object} o
   *  world, track, mode ('race'|'coins'|'chrono'|'duel'), laps,
   *  player: { skin, accessory, weapon, kart }, diff: {aiPace, rubber, aggro, luck, assistAi},
   *  rivalSprites: (rival, palKey) => sprites, assist: bool, challenge
   */
  constructor(o) {
    this.o = o;
    this.mode = o.mode || 'race';
    this.track = buildTrack(o.world, o.track);
    this.L = this.track.length;
    this.startZ = START_SEG * SEG;
    this.laps = o.laps || 3;
    this.diff = { aiPace: 0.95, rubber: 1, aggro: 1, luck: 0, ...o.diff };
    this.time = 0; this.raceTime = 0;
    this.state = 'countdown'; this.countdown = 3.4; this.lastCount = 4;
    this.events = [];
    this.projectiles = []; this.hazards = []; this.blasts = [];
    this.input = { steer: 0, useItem: false, special: false, back: false, tap: false, tapAt: -1 };
    this.assist = !!o.assist;
    this.extensions = 0;
    this.timeLeft = o.challenge && o.challenge.time ? o.challenge.time : 0;
    if (this.mode === 'chrono') this.timeLeft = Math.round(this.parTime() * 1.28);
    this.racers = [];
    this.makePlayer(o.player);
    if (this.mode === 'race') this.makeRivals(RIVALS.map((r) => r.id));
    else if (this.mode === 'duel') this.makeRivals([o.challenge.rival], o.challenge.boss);
    if (this.mode === 'coins') this.sprinkleCoins();
    this.grid();
    this.player.shieldT = this.player.perk.shieldStart ? 999 : 0;
  }

  parTime() { return (this.L * this.laps) / (MAXV * 0.9) + 3; }

  /* ------------------------------- pilotes ------------------------------- */
  baseRacer() {
    return {
      dist: 0, x: 0, vx: 0, speed: 0, steer: 0, steerVis: 0,
      drifting: 0, driftHold: 0, driftRel: 0, driftT: 0, driftLv: 0,
      boostT: 0, boostPow: 1, boostLv: 0, spinT: 0, slowT: 0, stallT: 0, air: 0, airT: 0, airDur: 0, airH: 0, trick: false, tricked: false,
      shieldT: 0, starT: 0, saberT: 0, magnetT: 0, item: null, uses: 0, rolling: 0, rollItem: null, special: 0,
      coinsHeld: 0, coinsTotal: 0, finished: false, finishTime: 0, place: 1, lastSeg: -1, bounce: 0, hitFlash: 0, crashT: 0, spinDir: 1,
      score: 0, combo: 0, comboT: 0, stats: { drifts: 0, ultra: 0, hits: 0, coins: 0, specials: 0, tricks: 0, overtakes: 0, hitsTaken: 0, offroad: 0, items: 0 },
    };
  }

  makePlayer(p) {
    const kart = byId(KARTS, p.kart), mods = kartMods(kart), acc = byId(ACCESSORIES, p.accessory), weapon = byId(WEAPONS, p.weapon);
    this.player = Object.assign(this.baseRacer(), {
      id: 'layjou', name: 'Layjou', isPlayer: true, type: 'layjou', skin: p.skin, accessory: p.accessory, weapon: weapon.id, weaponDef: weapon, kart: kart.id, shape: kart.shape,
      mods, perk: acc.perk || {}, pace: 1,
    });
    this.racers.push(this.player);
  }

  makeRivals(ids, boss) {
    const world = WORLDS[this.o.world];
    ids.forEach((id, i) => {
      const r = byId(RIVALS, id);
      const palKey = boss ? boss.pal : world.variants[id] || r.pal;
      const racer = Object.assign(this.baseRacer(), {
        id: r.id, name: boss ? boss.name : r.name, isPlayer: false, type: r.type, palKey, rival: r,
        pace: r.pace * (boss ? 1.035 : 1), corner: r.corner, aggro: r.aggro * (boss ? 1.4 : 1), fav: r.fav, heavy: !!r.heavy, boss: !!boss,
        mods: { speed: 1, accel: 1, handling: 1, drift: 1, offroad: 0 }, perk: {},
        ai: { laneOff: ((i % 3) - 1) * 0.32, target: 0, think: Math.random() * 0.2, useAt: 0, wobble: Math.random() * 10, curveT: 0, coinsGoal: 0 },
      });
      racer.sprites = this.o.rivalSprites ? this.o.rivalSprites(r, palKey) : null;
      this.racers.push(racer);
    });
  }

  grid() {
    // départ en dernière position, comme dans les grands jeux de kart : chaque dépassement compte
    const order = [...this.racers.filter((r) => !r.isPlayer), this.player];
    order.forEach((r, i) => {
      const row = Math.floor(i / 2);
      r.dist = -(row * 900 + 500) - (r.isPlayer ? 120 : 0);
      r.x = (i % 2 ? 0.42 : -0.42) * (this.racers.length === 1 ? 0 : 1);
      r.lastSeg = this.segIndex(r);
    });
    if (this.racers.length === 2) { this.racers[1].x = -0.4; this.player.x = 0.4; this.player.dist = this.racers[1].dist = -500; }
    this.updatePlaces();
  }

  sprinkleCoins() {
    const segs = this.track.segments;
    for (let i = START_SEG + 20; i < segs.length - 10; i += 9) {
      if (segs[i].items.some((it) => it.type === 'coin')) continue;
      const x = Math.sin(i * 0.07) * 0.65;
      segs[i].items.push({ type: 'coin', x, alive: true, t: 0 });
    }
  }

  /* -------------------------------- utilitaires -------------------------------- */
  zOf(r) { return wrap(this.startZ + r.dist, this.L); }
  segIndex(r) { return Math.floor(this.zOf(r) / SEG) % this.track.segments.length; }
  segOf(r) { return this.track.segments[this.segIndex(r)]; }
  lapOf(r) { return r.dist < 0 ? 1 : Math.min(this.laps, Math.floor(r.dist / this.L) + 1); }
  emit(type, data = {}) { this.events.push({ type, ...data }); }

  updatePlaces() {
    const sorted = [...this.racers].sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1; if (b.finished) return 1;
      return b.dist - a.dist;
    });
    sorted.forEach((r, i) => { r.place = i + 1; });
    this.order = sorted;
  }

  addPoints(r, pts, label) {
    if (!r.isPlayer) { r.score += pts; return; }
    r.combo = r.comboT > 0 ? r.combo + 1 : 1; r.comboT = 2.6;
    const mul = 1 + Math.min(10, r.combo - 1) * 0.1;
    const got = Math.round(pts * mul);
    r.score += got;
    this.emit('points', { pts: got, label, combo: r.combo });
  }

  /* ---------------------------------- boucle ---------------------------------- */
  update(dt) {
    dt = Math.min(dt, 1 / 30);
    this.time += dt;
    if (this.state === 'paused' || this.state === 'decision' || this.state === 'done') return;
    if (this.state === 'countdown') return this.updateCountdown(dt);
    this.raceTime += dt;
    if (this.timeLeft > 0 && (this.mode === 'coins' || this.mode === 'chrono')) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) { this.timeLeft = 0; this.state = 'decision'; this.emit('timeup'); return; }
    }
    for (const r of this.racers) this.updateRacer(r, dt);
    this.collideRacers();
    this.updateProjectiles(dt);
    this.updateHazards(dt);
    this.updateItemsRespawn(dt);
    for (const b of this.blasts) b.t += dt;
    this.blasts = this.blasts.filter((b) => b.t < 0.9);
    const prevPlace = this.player.place;
    this.updatePlaces();
    this.overtakes(prevPlace);
    if (this.state === 'race') this.director(dt);
  }

  updateCountdown(dt) {
    this.countdown -= dt;
    const n = Math.ceil(this.countdown);
    if (n < this.lastCount && n >= 1 && n <= 3) { this.lastCount = n; this.emit('count', { n }); }
    const inp = this.input;
    if (inp.tap) { inp.tap = false; if (inp.tapAt < 0) inp.tapAt = this.countdown; }
    // moteur qui chauffe
    for (const r of this.racers) { r.steerVis = lerp(r.steerVis, 0, 0.1); r.bounce = Math.sin(this.time * 30) * 0.6; }
    if (this.countdown <= 0) {
      this.state = 'race';
      this.emit('go');
      const p = this.player, at = inp.tapAt;
      if (at > 0.25 && at < 1.05) { this.boost(p, 2, 1.25); this.addPoints(p, POINTS.start, 'start'); this.emit('rocket'); }
      else if (at >= 1.6) { p.stallT = 0.7; this.emit('stall'); }
      for (const r of this.racers) if (!r.isPlayer && Math.random() < 0.45 * this.diff.aggro) this.boost(r, 1, 1);
    }
  }

  boost(r, lv, durMul = 1) {
    const [d, pw] = BOOST[lv];
    const dur = d * durMul * (1 + (r.perk.boost || 0));
    r.boostT = Math.max(r.boostT, dur); r.boostPow = Math.max(r.boostT > dur ? r.boostPow : 1, pw); r.boostLv = lv;
    if (r.isPlayer) this.emit('boost', { lv });
  }

  /* ---------------------------------- pilote ---------------------------------- */
  updateRacer(r, dt) {
    const seg = this.segOf(r);
    const prog = clamp(r.speed / MAXV, 0, 1.5);
    const ice = WORLDS[this.o.world].ice;

    // minuteurs
    for (const k of ['boostT', 'spinT', 'slowT', 'stallT', 'shieldT', 'starT', 'saberT', 'magnetT', 'hitFlash', 'crashT', 'comboT']) if (r[k] > 0) r[k] = Math.max(0, r[k] - dt);
    if (r.comboT <= 0) r.combo = 0;
    if (r.boostT <= 0) { r.boostPow = 1; r.boostLv = 0; }
    if (r.rolling > 0) { r.rolling -= dt; if (r.rolling <= 0) { r.item = r.rollItem; r.uses = (ITEMS[r.item] && ITEMS[r.item].uses) || 1; if (r.isPlayer) this.emit('itemReady', { item: r.item }); } }
    r.special = Math.min(100, r.special + dt * 1.6 * this.chargeMul(r));

    // contrôles
    let steer = 0;
    if (r.finished && r.isPlayer) steer = clamp(-r.x * 1.5, -0.6, 0.6);
    else if (r.isPlayer) steer = this.input.steer;
    else steer = this.aiSteer(r, dt, seg);
    if (r.spinT > 0 || r.crashT > 0) steer = 0;

    // vitesse cible
    const off = Math.abs(r.x) > 1.06;
    let vmax = MAXV * r.mods.speed * r.pace;
    if (r.isPlayer) vmax *= 1 + r.coinsHeld * 0.008;
    else vmax *= this.aiPaceMul(r, seg);
    if (r.boostT > 0) vmax *= r.boostPow;
    if (r.starT > 0) vmax *= 1.2;
    if (r.saberT > 0) vmax *= 1.08;
    if (r.magnetT > 0) vmax *= 1.04;
    if (r.slowT > 0) vmax *= 0.68;
    if (off && r.boostT <= 0 && r.starT <= 0 && r.air <= 0) { r.stats.offroad += dt; vmax = Math.min(vmax, MAXV * (0.42 + 0.3 * ((r.perk.offroad || 0) + r.mods.offroad))); }
    if (r.drifting) vmax *= 0.985;
    if (r.stallT > 0 || this.state === 'countdown') vmax = 0;
    if (r.finished) vmax = MAXV * 0.55;

    if (r.spinT > 0) r.speed = Math.max(0, r.speed - 9000 * dt);
    else if (r.speed < vmax) {
      const a = ACCEL * r.mods.accel * (1.15 - 0.55 * clamp(r.speed / MAXV)) * (r.boostT > 0 ? 3.2 : 1);
      r.speed = Math.min(vmax, r.speed + a * dt);
    } else r.speed = Math.max(vmax, r.speed - (off ? 7000 : 3000) * dt);

    // dérapage (mini-turbo)
    if (r.isPlayer) this.updateDrift(r, steer, dt, prog, off);
    let eff = steer;
    if (r.drifting) eff = clamp(r.drifting * 0.55 + steer * 0.62, -1.2, 1.2);

    // latéral : inertie + adhérence + force centrifuge
    const grip = (ice ? 3.6 : 9) * (r.drifting ? 0.75 : 1);
    const authority = r.isPlayer ? 1.95 * r.mods.handling : 2.2;
    const targetVx = eff * authority * (0.35 + 0.65 * Math.min(1, prog));
    r.vx += (targetVx - r.vx) * Math.min(1, grip * dt);
    let cent = seg.curve * prog * prog * CENT * (r.drifting ? 0.82 : 1);
    if (!r.isPlayer) cent *= 0.15; // l'IA anticipe ses trajectoires
    if (r.isPlayer && this.assist) {
      cent *= 0.45;
      if (Math.abs(r.x) > 0.82 && Math.sign(r.vx - cent) === Math.sign(r.x)) r.vx -= Math.sign(r.x) * 2.4 * dt * (Math.abs(r.x) - 0.8) * 10;
    }
    if (r.air > 0) { r.vx *= 0.995; cent *= 0.3; }
    r.x += (r.vx - cent) * dt;
    r.x = clamp(r.x, -2.05, 2.05);
    r.steerVis = lerp(r.steerVis, r.spinT > 0 ? 0 : clamp(r.drifting ? r.drifting * 0.9 + steer * 0.2 : steer, -1, 1), Math.min(1, dt * 10));
    r.bounce = off && r.air <= 0 ? Math.sin(this.time * 38 + r.dist * 0.01) * 2 : lerp(r.bounce, 0, 0.2);

    // saut
    if (r.air > 0) {
      r.airT += dt; r.airH = Math.sin(Math.PI * r.airT / r.airDur) * 520;
      if (r.isPlayer && (this.input.tap || this.input.useItem) && !r.tricked) { this.input.tap = false; r.tricked = true; r.trick = true; this.emit('trick'); }
      if (r.airT >= r.airDur) {
        r.air = 0; r.airH = 0;
        if (r.trick || (!r.isPlayer && Math.random() < 0.6)) { this.boost(r, 1, 1 + (r.perk.trick || 0) * 2); if (r.isPlayer) { r.stats.tricks++; this.addPoints(r, POINTS.trick, 'trick'); } }
        r.trick = false; r.tricked = false;
        if (r.isPlayer) this.emit('land');
      }
    }

    // avance
    const prevDist = r.dist;
    r.dist += r.speed * dt;

    // traversée des segments : objets, plaques, tremplins, obstacles
    const segs = this.track.segments, N = segs.length;
    const i0 = r.lastSeg, i1 = this.segIndex(r);
    let i = i0;
    for (let guard = 0; guard < 6 && i !== i1; guard++) { i = (i + 1) % N; this.touchSegment(r, segs[i]); }
    if (i0 === i1) this.touchSegment(r, segs[i1], true);
    r.lastSeg = i1;
    if (r.magnetT > 0) this.magnet(r);

    // collisions avec le décor (hors piste)
    if (Math.abs(r.x) > 1.12 && r.air <= 0 && r.crashT <= 0) {
      for (const s of segs[i1].sprites) {
        if (s.road) continue;
        const m = spriteMeta(s.kind); if (!m.solid || Math.abs(s.x) > 2.6) continue;
        if (Math.abs(s.x - r.x) < (m.ww / ROAD) * 0.5 + 0.16) { this.crash(r, s.x); break; }
      }
    }

    // tours
    if (!r.finished) {
      const lapPrev = prevDist < 0 ? 0 : Math.floor(prevDist / this.L), lapNow = r.dist < 0 ? 0 : Math.floor(r.dist / this.L);
      if (lapNow > lapPrev && prevDist >= 0) {
        if (lapNow >= this.laps && this.mode !== 'coins') this.finish(r);
        else if (r.isPlayer) { this.emit('lap', { lap: lapNow + 1, final: lapNow + 1 === this.laps }); }
      }
    }
    // l'IA utilise ses objets
    if (!r.isPlayer && !r.finished) this.aiItems(r, dt);
    if (r.isPlayer && !r.finished) this.playerActions(r);
  }

  chargeMul(r) { return (r.weaponDef ? r.weaponDef.charge : 1) * (1 + (r.perk.special || 0)); }
  charge(r, n) { if (!r.isPlayer) return; const was = r.special; r.special = Math.min(100, r.special + n * this.chargeMul(r)); if (was < 100 && r.special >= 100) this.emit('specialReady'); }

  updateDrift(r, steer, dt, prog, off) {
    const canDrift = prog > 0.5 && r.air <= 0 && r.spinT <= 0 && !off;
    if (!r.drifting) {
      if (canDrift && Math.abs(steer) > 0.58) { r.driftHold += dt; if (r.driftHold > 0.14) { r.drifting = Math.sign(steer); r.driftT = 0; r.driftLv = 0; r.bounce = -6; this.emit('driftStart'); } }
      else r.driftHold = 0;
      return;
    }
    const same = steer * r.drifting > 0;
    r.driftT += dt * r.mods.drift * (1 + (r.perk.drift || 0)) * (same ? 1 + 0.5 * Math.abs(steer) : 0.75);
    const lv = r.driftT >= DRIFT_LV[2] ? 3 : r.driftT >= DRIFT_LV[1] ? 2 : r.driftT >= DRIFT_LV[0] ? 1 : 0;
    if (lv > r.driftLv) { r.driftLv = lv; this.emit('driftLevel', { lv }); }
    if (steer * r.drifting < -0.25 || Math.abs(steer) < 0.2) r.driftRel += dt; else r.driftRel = 0;
    if (r.driftRel > 0.1 || !canDrift) {
      if (r.driftLv > 0 && canDrift) {
        this.boost(r, r.driftLv, 1);
        r.stats.drifts++; if (r.driftLv === 3) r.stats.ultra++;
        this.addPoints(r, POINTS.drift[r.driftLv - 1], 'drift' + r.driftLv);
        this.charge(r, [0, 10, 16, 24][r.driftLv]);
      }
      r.drifting = 0; r.driftT = 0; r.driftLv = 0; r.driftHold = 0; r.driftRel = 0;
    }
  }

  touchSegment(r, s) {
    if (s.boost !== null && s.boost !== undefined && Math.abs(r.x - s.boost) < 0.36 && r.air <= 0) { if (r.boostT < 0.3) { this.boost(r, 2, 1.1); if (r.isPlayer) this.emit('pad'); } }
    if (s.jump && r.air <= 0 && r.speed > MAXV * 0.45) { r.air = 1; r.airT = 0; r.airDur = 0.55 + 0.35 * clamp(r.speed / MAXV); if (r.isPlayer) this.emit('jump'); }
    for (const it of s.items) {
      if (!it.alive) continue;
      const dx = Math.abs(it.x - r.x);
      if (it.type === 'box' && dx < 0.3 && r.air <= 0.5) {
        it.alive = false; it.t = 2.6;
        this.blasts.push({ z: s.z1 + SEG / 2, x: it.x, t: 0, type: 'box' });
        if (!r.item && r.rolling <= 0) this.rollItem(r);
        if (r.isPlayer) { this.addPoints(r, POINTS.box, 'box'); this.charge(r, 4); this.emit('box'); }
      } else if (it.type === 'coin' && dx < 0.24 && (r.isPlayer || Math.random() < 0.5)) {
        it.alive = false; it.t = this.mode === 'coins' ? 999 : 9;
        r.coinsHeld = Math.min(10, r.coinsHeld + 1); r.coinsTotal++;
        if (r.isPlayer) { r.stats.coins++; this.addPoints(r, POINTS.coin, 'coin'); this.charge(r, 6); this.emit('coin'); }
      }
    }
    for (const sp of s.sprites) {
      if (!sp.road || r.air > 0 || r.crashT > 0 || r.spinT > 0) continue;
      if (Math.abs(sp.x - r.x) < 0.28) {
        if (r.starT > 0 || r.saberT > 0) continue;
        if (r.shieldT > 0 && r.shieldT < 900) { r.shieldT = 0; if (r.isPlayer) this.emit('shieldPop'); continue; }
        const side = Math.sign(r.x - sp.x) || 1;
        r.speed *= 0.45; r.crashT = 0.6; r.vx = side * 2.4; r.x = sp.x + side * 0.3; r.bounce = -8; r.drifting = 0; r.driftT = 0;
        if (r.isPlayer) this.emit('crash');
      }
    }
  }

  magnet(r) {
    const segs = this.track.segments, N = segs.length, i0 = this.segIndex(r);
    for (let k = 0; k < 8; k++) for (const it of segs[(i0 + k) % N].items) if (it.alive && it.type === 'coin' && Math.abs(it.x - r.x) < 1.0) it.x = lerp(it.x, r.x, 0.25);
  }

  crash(r, sx) {
    r.crashT = 0.5; r.speed *= 0.35; r.x -= Math.sign(r.x - sx || r.x) * -0.12; r.x = clamp(r.x, -1.95, 1.95); r.vx = -Math.sign(r.x) * 1.2; r.bounce = -10;
    r.drifting = 0; r.driftT = 0;
    if (r.isPlayer) this.emit('crash');
  }

  /* ---------------------------------- objets ---------------------------------- */
  rollItem(r) {
    const n = this.racers.length;
    const bucket = n <= 2 ? (r.place === 1 ? 0 : 2) : r.place === 1 ? 0 : r.place <= 3 ? 1 : r.place <= 5 ? 2 : 3;
    let b = bucket;
    if (r.isPlayer) { const luck = this.diff.luck + (r.perk.luck || 0); if (luck > 0.12 && b < 3 && Math.random() < luck) b++; }
    const odds = { ...ITEM_ODDS[b] };
    if (!r.isPlayer && r.fav && odds[r.fav] !== undefined) odds[r.fav] += 12;
    if (this.mode === 'coins' || this.mode === 'chrono') { for (const k of Object.keys(odds)) odds[k] = 0; odds.turbo = 6; odds.turbo3 = 2; odds.magnet = this.mode === 'coins' ? 5 : 0; }
    const total = Object.values(odds).reduce((a, v) => a + v, 0);
    let x = Math.random() * total, pick = 'turbo';
    for (const [k, v] of Object.entries(odds)) { x -= v; if (x <= 0) { pick = k; break; } }
    r.rollItem = pick; r.rolling = r.isPlayer ? 1.1 : 0.7;
    if (r.isPlayer) this.emit('roll', { item: pick });
  }

  playerActions(r) {
    const inp = this.input;
    if (inp.useItem) { inp.useItem = false; if (r.item && r.air <= 0) this.useItem(r, inp.back); inp.back = false; }
    if (inp.special) { inp.special = false; if (r.special >= 100) this.useSpecial(r); }
    inp.tap = false;
  }

  useItem(r, back = false) {
    const it = r.item; if (!it) return;
    r.uses--; if (r.uses <= 0) { r.item = null; r.uses = 0; }
    r.stats.items++;
    const z = this.zOf(r);
    switch (it) {
      case 'turbo': case 'turbo3': this.boost(r, 2, 1.15); break;
      case 'slime': this.hazards.push({ type: 'slime', z: wrap(z + (back ? -700 : 2600), this.L), x: r.x, t: 0, life: 30, owner: r, r: 0.32, arm: back ? 0 : 0.35, fly: back ? 0 : 0.35 }); break;
      case 'shield': r.shieldT = 9; break;
      case 'magnet': r.magnetT = 8; break;
      case 'star': r.starT = 6.5; this.boost(r, 2, 1); break;
      case 'storm': this.zapAhead(r, 'storm'); break;
      case 'heart': this.fire(r, 'heart', back); break;
      case 'bolt3': this.fire(r, 'bolt', back); break;
      case 'bomb': this.fire(r, 'bomb', back); break;
      default:
    }
    this.emit('use', { who: r, item: it });
  }

  fire(r, type, back = false, opts = {}) {
    const z = this.zOf(r);
    const dir = back ? -1 : 1;
    const target = back ? null : opts.target || this.racerAhead(r, 1);
    const p = { type, z: wrap(z + dir * 500, this.L), x: r.x + (opts.dx || 0), dir, vz: dir * (type === 'bomb' ? 4200 : type === 'plasma' ? 7000 : 13500) + (back ? 0 : r.speed), owner: r, target, life: type === 'bomb' ? 0.75 : type === 'boomerang' ? 2.6 : 3.4, t: 0, hits: new Set(), left: type === 'rocket' ? 2 : 1, homing: type === 'heart' || type === 'heartshot' || type === 'rocket' || type === 'plasma' ? 1 : 0 };
    if (type === 'heartshot') { p.homing = 0.5; p.life = 2.2; }
    this.projectiles.push(p);
    return p;
  }

  racerAhead(r, k = 1) {
    const idx = this.order.indexOf(r);
    const t = this.order[idx - k];
    return t && !t.finished ? t : null;
  }

  useSpecial(r) {
    r.special = 0; r.stats.specials++;
    const w = r.weapon;
    this.emit('special', { weapon: w });
    switch (w) {
      case 'saber': r.saberT = 4.5; break;
      case 'boomerang': this.fire(r, 'boomerang'); break;
      case 'hammer': {
        const z = this.zOf(r);
        for (const o of this.racers) if (o !== r && Math.abs(wdiff(this.zOf(o), z, this.L)) < 2400) this.hit(o, r, 'hammer');
        this.hazards = this.hazards.filter((h) => Math.abs(wdiff(h.z, z, this.L)) > 3000);
        this.blasts.push({ z, x: r.x, t: 0, type: 'quake' });
        break;
      }
      case 'plasma': this.fire(r, 'plasma'); break;
      case 'rocket': this.fire(r, 'rocket'); break;
      case 'thunder': this.zapAhead(r, 'thunder'); break;
      default: // blaster : 3 tirs cœur
        for (const dx of [-0.32, 0, 0.32]) this.fire(r, 'heartshot', false, { dx, target: this.racerAhead(r, dx === 0 ? 1 : dx < 0 ? 2 : 1) });
    }
    this.addPoints(r, 30, 'special');
  }

  zapAhead(r, kind) {
    for (const o of this.racers) if (o !== r && !o.finished && o.dist > r.dist) { if (this.hit(o, r, kind)) o.slowT = 2.6; }
    this.emit('zap', { by: r });
  }

  /** @returns {boolean} true si la cible est touchée */
  hit(v, by, kind) {
    if (v.finished) return false;
    if (v.starT > 0 || (v.saberT > 0 && kind !== 'thunder')) return false;
    if (v.shieldT > 0) { v.shieldT = 0; if (v.isPlayer) this.emit('shieldPop'); if (by && by.isPlayer) this.emit('blocked'); return false; }
    v.spinT = kind === 'obstacle' ? 0.7 : 1.15; v.spinDir = Math.random() < 0.5 ? -1 : 1; v.hitFlash = 0.4;
    v.speed *= kind === 'obstacle' ? 0.55 : 0.4; v.drifting = 0; v.driftT = 0; v.driftLv = 0; v.boostT = 0;
    const lost = Math.min(v.coinsHeld, 3); v.coinsHeld -= lost;
    v.stats.hitsTaken++;
    if (v.isPlayer) this.emit('hurt', { by, kind, lost });
    if (by && by.isPlayer && v !== by) {
      by.stats.hits++;
      this.addPoints(by, kind === 'hammer' || kind === 'thunder' || kind === 'saber' || kind === 'boomerang' || kind === 'plasma' || kind === 'rocket' || kind === 'heartshot' ? POINTS.special : POINTS.hit, 'hit');
      this.charge(by, 12);
      this.emit('hitRival', { victim: v });
    }
    this.blasts.push({ z: this.zOf(v), x: v.x, t: 0, type: 'hit' });
    return true;
  }

  updateProjectiles(dt) {
    const L = this.L;
    for (const p of this.projectiles) {
      p.t += dt;
      if (p.type === 'boomerang') {
        const back = p.t > p.life * 0.45;
        if (back && p.dir > 0) { p.dir = -1; p.hits.clear(); }
        const own = this.zOf(p.owner);
        p.vz = p.dir > 0 ? 15000 : 0;
        if (p.dir < 0) { const d = wdiff(own, p.z, L); p.z = wrap(p.z + Math.sign(d) * Math.min(Math.abs(d), 15000 * dt) + p.owner.speed * dt * 0, L); p.x = lerp(p.x, p.owner.x, 0.08); if (Math.abs(d) < 300) p.t = p.life; }
        else p.z = wrap(p.z + p.vz * dt, L);
        p.spin = (p.spin || 0) + dt * 18;
      } else if (p.type === 'bomb') {
        p.z = wrap(p.z + p.vz * dt, L);
        if (p.t >= p.life) { this.explode(p.z, p.x, 0.75, 900, p.owner); }
      } else {
        p.z = wrap(p.z + p.vz * dt, L);
        if (p.homing && p.target && !p.target.finished) {
          const tz = this.zOf(p.target), d = wdiff(tz, p.z, L);
          if (d > -200 && d < 9000) { p.x = lerp(p.x, p.target.x, Math.min(1, dt * 6 * p.homing)); if (d < 3000) p.vz = Math.max(p.vz, p.target.speed + 9000); }
        }
        if (p.type === 'rocket' || p.type === 'plasma') p.life += 0; // vivent jusqu'à l'impact
      }
      // impacts
      for (const r of this.racers) {
        if (p.dead || r.finished || p.hits.has(r)) continue;
        if (r === p.owner && !(p.type === 'boomerang' && p.dir < 0 && false)) continue;
        if (r.air > 0 && p.type !== 'rocket') continue;
        const dz = wdiff(this.zOf(r), p.z, L);
        if (Math.abs(dz) < 420 && Math.abs(r.x - p.x) < 0.34) {
          p.hits.add(r);
          if (p.type === 'plasma') { this.explode(p.z, p.x, 0.9, 1100, p.owner); break; }
          this.hit(r, p.owner, p.type === 'bolt' ? 'bolt' : p.type);
          if (p.type === 'rocket' && --p.left > 0) { p.target = this.racerAhead(r, 1); p.vz = Math.max(p.vz, 12000); continue; }
          if (p.type !== 'boomerang') { p.dead = true; this.blasts.push({ z: p.z, x: p.x, t: 0, type: 'pop' }); }
        }
      }
      // collisions projectile / pièges
      if (!p.dead && p.type !== 'boomerang') for (const h of this.hazards) if (!h.dead && Math.abs(wdiff(h.z, p.z, L)) < 300 && Math.abs(h.x - p.x) < 0.35) { h.dead = true; p.dead = true; this.blasts.push({ z: p.z, x: p.x, t: 0, type: 'pop' }); }
      if (Math.abs(p.x) > 2.2) p.dead = true;
      if (p.t >= (p.type === 'rocket' || p.type === 'plasma' || p.type === 'heart' ? 5 : p.life)) p.dead = true;
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead);
  }

  explode(z, x, rx, rz, owner) {
    this.blasts.push({ z, x, t: 0, type: 'boom' });
    for (const r of this.racers) if (Math.abs(wdiff(this.zOf(r), z, this.L)) < rz && Math.abs(r.x - x) < rx) this.hit(r, owner, 'bomb');
    this.emit('boom', { z });
    for (const p of this.projectiles) if (p.type === 'bomb' && Math.abs(wdiff(p.z, z, this.L)) < 50) p.dead = true;
  }

  updateHazards(dt) {
    for (const h of this.hazards) {
      h.t += dt;
      if (h.fly > 0) { h.fly -= dt; continue; }
      if (h.t > h.life) { h.dead = true; continue; }
      for (const r of this.racers) {
        if (r.finished || r.air > 0) continue;
        if (r === h.owner && h.t < 1.2) continue;
        if (Math.abs(wdiff(this.zOf(r), h.z, this.L)) < 330 && Math.abs(r.x - h.x) < h.r) {
          if (this.hit(r, h.owner, 'slime')) this.blasts.push({ z: h.z, x: h.x, t: 0, type: 'splash' });
          h.dead = true; break;
        }
      }
    }
    this.hazards = this.hazards.filter((h) => !h.dead);
  }

  updateItemsRespawn(dt) {
    if (Math.floor(this.time * 4) === Math.floor((this.time - dt) * 4)) return; // 4 fois par seconde suffit
    for (const s of this.track.segments) for (const it of s.items) if (!it.alive) { it.t -= 0.25; if (it.t <= 0) it.alive = true; }
  }

  /* ------------------------------- collisions karts ------------------------------- */
  collideRacers() {
    const rs = this.racers, L = this.L;
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
      const a = rs[i], b = rs[j];
      if (a.air > 0 || b.air > 0) continue;
      const dz = wdiff(this.zOf(a), this.zOf(b), L), dx = a.x - b.x;
      if (Math.abs(dz) > KART_L || Math.abs(dx) > KART_W) continue;
      // invincibles : renversent l'autre
      const aInv = a.starT > 0 || a.saberT > 0, bInv = b.starT > 0 || b.saberT > 0;
      if (aInv && !bInv) { this.hit(b, a, 'saber'); continue; }
      if (bInv && !aInv) { this.hit(a, b, 'saber'); continue; }
      const push = (KART_W - Math.abs(dx)) * 0.5 + 0.02, s = dx >= 0 ? 1 : -1;
      const wa = a.heavy ? 0.35 : 0.65, wb = b.heavy ? 0.35 : 0.65;
      a.x += s * push * (wb / (wa + wb)) * 2 * 0.6; b.x -= s * push * (wa / (wa + wb)) * 2 * 0.6;
      a.vx = s * 0.9; b.vx = -s * 0.9;
      const behind = dz < 0 ? a : b, front = dz < 0 ? b : a;
      if (behind.speed > front.speed) behind.speed = front.speed * 0.97;
      if (a.isPlayer || b.isPlayer) this.emit('bump');
    }
  }

  /* ----------------------------------- IA ----------------------------------- */
  aiPaceMul(r, seg) {
    const curve = Math.abs(seg.curve);
    const curveSlow = 1 - Math.max(0, curve - 2.5) * 0.02 * (2 - r.corner);
    return this.diff.aiPace * curveSlow * (r.rb || 1);
  }

  aiSteer(r, dt, seg) {
    const ai = r.ai;
    ai.think -= dt;
    if (ai.think <= 0) {
      ai.think = 0.12 + Math.random() * 0.1;
      const segs = this.track.segments, N = segs.length, i0 = this.segIndex(r);
      // trajectoire : intérieur des virages à venir
      let c = 0; for (let k = 4; k < 30; k += 4) c += segs[(i0 + k) % N].curve; c /= 7;
      let target = clamp(-c * 0.11, -0.55, 0.55) + ai.laneOff + Math.sin(this.time * 0.6 + ai.wobble) * 0.12;
      // aller chercher une boîte
      if (!r.item && r.rolling <= 0) for (let k = 3; k < 14; k++) { const s = segs[(i0 + k) % N]; const box = s.items.find((it) => it.type === 'box' && it.alive); if (box) { target = box.x; break; } }
      // éviter les pièges
      for (const h of this.hazards) { const d = wdiff(h.z, this.zOf(r), this.L); if (d > 0 && d < 2200 && Math.abs(h.x - target) < 0.4) target = h.x + (h.x > 0 ? -0.55 : 0.55); }
      for (const s of [segs[(i0 + 5) % N], segs[(i0 + 8) % N]]) for (const sp of s.sprites) if (sp.road && Math.abs(sp.x - target) < 0.35) target = sp.x + (sp.x > 0 ? -0.5 : 0.5);
      // dépasser
      for (const o of this.racers) {
        if (o === r) continue;
        const d = wdiff(this.zOf(o), this.zOf(r), this.L);
        if (d > 0 && d < 1500 && Math.abs(o.x - target) < 0.45 && o.speed < r.speed) target = o.x + (o.x > target ? -0.5 : 0.5);
      }
      ai.target = clamp(target, -0.85, 0.85);
      // turbo de sortie de virage
      if (Math.abs(seg.curve) > 3) ai.curveT += 0.15; else { if (ai.curveT > 1.2 && Math.random() < 0.35 + 0.3 * this.diff.aggro) this.boost(r, ai.curveT > 2.4 ? 2 : 1); ai.curveT = 0; }
    }
    const err = ai.target - r.x;
    const steer = clamp(err * 2.4, -1, 1);
    r.driftVis = Math.abs(seg.curve) > 3.2;
    return steer;
  }

  aiItems(r, dt) {
    if (!r.item) return;
    r.ai.useAt -= dt;
    if (r.ai.useAt > 0) return;
    r.ai.useAt = 0.3 + Math.random() * 0.4;
    const L = this.L, z = this.zOf(r), aggro = r.aggro * this.diff.aggro;
    const ahead = this.racers.find((o) => o !== r && !o.finished && wdiff(this.zOf(o), z, L) > 300 && wdiff(this.zOf(o), z, L) < 5000 && Math.abs(o.x - r.x) < 0.5);
    const behind = this.racers.find((o) => o !== r && !o.finished && wdiff(z, this.zOf(o), L) > 300 && wdiff(z, this.zOf(o), L) < 2500);
    const it = r.item;
    let use = false, back = false;
    if (it === 'turbo' || it === 'turbo3') use = Math.abs(this.segOf(r).curve) < 2;
    else if (it === 'slime' || it === 'bomb') { if (behind && Math.random() < aggro) { use = true; back = true; } else if (it === 'bomb' && ahead && Math.random() < aggro * 0.6) use = true; }
    else if (it === 'heart') use = !!this.racerAhead(r, 1) && Math.random() < aggro * 0.8;
    else if (it === 'bolt3') use = !!ahead && Math.random() < aggro;
    else if (it === 'shield') use = this.projectiles.some((p) => p.target === r) || Math.random() < 0.12;
    else use = Math.random() < 0.5;
    // ne pas s'acharner sur un joueur en difficulté (garde-fou anti-frustration)
    if (use && this.diff.mercy && (ahead === this.player || behind === this.player || it === 'heart') && Math.random() < this.diff.mercy) use = false;
    if (use) this.useItem(r, back);
  }

  /* --------------------------- directeur de course --------------------------- */
  /**
   * Élastique dynamique : rapproche le peloton du joueur pour garder la course
   * serrée et lisible, sans jamais téléporter personne. L'intensité vient du
   * Flow Engine (diff.rubber) et augmente au dernier tour (« photo-finish »).
   */
  director() {
    const p = this.player, lastLap = this.lapOf(p) === this.laps;
    const k = this.diff.rubber * (lastLap ? 1.25 : 1);
    // les 3 rivaux les plus proches derrière le joueur sont ses « challengers » : ils s'accrochent
    const behind = this.racers.filter((r) => !r.isPlayer && r.dist < p.dist).sort((a, b) => b.dist - a.dist);
    const contenders = new Set(behind.slice(0, 3));
    for (const r of this.racers) {
      if (r.isPlayer) continue;
      const gap = (r.dist - p.dist) / MAXV; // secondes d'avance sur le joueur
      let rb = 1;
      if (gap > 1.0) rb -= Math.min(0.13, (gap - 1.0) * 0.035) * k;                       // trop loin devant : il lève le pied
      else if (gap < -0.8) rb += Math.min(contenders.has(r) ? 0.2 : 0.06, (-gap - 0.8) * 0.05) * k; // derrière : il revient
      if (p.place === 1 && r.place === 2 && gap > -2.5) rb += 0.03 * k;                    // pression constante sur le leader
      if (r.boss) rb += 0.02;
      r.rb = lerp(r.rb || 1, rb, 0.05);
    }
  }

  overtakes(prevPlace) {
    const p = this.player;
    if (this.state !== 'race' || p.finished) return;
    if (p.place < prevPlace && this.raceTime > 2) {
      const n = prevPlace - p.place;
      p.stats.overtakes += n;
      this.addPoints(p, POINTS.overtake * n, 'overtake');
      this.emit('overtake', { place: p.place });
    }
  }

  /* ---------------------------------- arrivée ---------------------------------- */
  finish(r) {
    r.finished = true; r.finishTime = this.raceTime;
    if (!r.isPlayer) return;
    this.updatePlaces();
    // classement final : les rivaux restants sont estimés à leur rythme actuel
    for (const o of this.racers) if (!o.finished) { const left = this.laps * this.L - o.dist; o.estTime = this.raceTime + left / Math.max(3000, o.speed * 0.95); }
    this.emit('finish', { place: r.place });
    this.pendingDecision = this.offerContinue();
    this.state = 'cooldown'; // les rivaux continuent de rouler pendant la célébration
  }

  /** Prolongation : proposée quand le joueur finit hors du podium (une fois par course). */
  offerContinue() {
    return this.mode === 'race' && this.player.place > 3 && this.extensions === 0;
  }

  /** +1 tour pour tout le monde, Turbo Cœur et jauge pleine pour le joueur. */
  extendLap() {
    this.extensions++;
    this.laps++; this.pendingDecision = false;
    for (const r of this.racers) { r.finished = false; r.finishTime = 0; r.estTime = 0; }
    const p = this.player;
    this.boost(p, 3, 1.8); p.special = 100; p.shieldT = Math.max(p.shieldT, 4);
    if (!p.item) { p.item = 'turbo3'; p.uses = 3; }
    this.state = 'race';
    this.emit('extended');
  }

  /** Défis chronométrés : +temps. */
  addTime(s) { this.timeLeft += s; this.extensions++; this.state = 'race'; this.emit('extended'); }

  /** Termine un défi (temps écoulé refusé). */
  endChallenge() { this.player.finished = true; this.player.finishTime = this.raceTime; this.pendingDecision = false; this.state = 'cooldown'; this.emit('finish', { place: this.player.place, timeout: true }); }

  finalOrder() {
    return [...this.racers].sort((a, b) => (a.finished ? a.finishTime : a.estTime || 1e9) - (b.finished ? b.finishTime : b.estTime || 1e9));
  }

  /** Résultat transmis à l'écran de fin et au Flow Engine. */
  result() {
    const p = this.player, order = this.finalOrder(), place = order.indexOf(p) + 1;
    const n = this.racers.length;
    let placePts = 0;
    if (this.mode === 'race') placePts = POINTS.place[place - 1] || 0;
    else if (this.mode === 'duel') placePts = place === 1 ? 2000 : 500;
    else if (this.mode === 'chrono') placePts = p.finished && this.timeLeft > 0 ? 1500 + Math.round(this.timeLeft * 40) : 400;
    else if (this.mode === 'coins') placePts = p.coinsTotal * 30;
    const leader = order[0];
    const nextAhead = order[place - 2];
    const gapAhead = nextAhead ? Math.max(0, (p.finishTime || this.raceTime) - (nextAhead.finished ? nextAhead.finishTime : nextAhead.estTime || this.raceTime)) : 0;
    return {
      mode: this.mode, place, n, order: order.map((r) => ({ id: r.id, name: r.name, type: r.type, palKey: r.palKey, isPlayer: !!r.isPlayer, time: r.finished ? r.finishTime : r.estTime || 0, boss: !!r.boss })),
      time: p.finishTime || this.raceTime, score: p.score + placePts, placePts, actionPts: p.score, coins: p.coinsTotal, stats: { ...p.stats },
      extensions: this.extensions, gapAhead, leaderGap: leader === p ? 0 : (p.finishTime || this.raceTime) - (leader.finishTime || leader.estTime || 0),
      timeLeft: this.timeLeft, laps: this.laps,
    };
  }
}

export { wrap, wdiff };
