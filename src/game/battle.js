/* ------------------------------------------------------------------ *
 *  Moteur de combat temps réel.
 *  Unités virtuelles : largeur 400, hauteur selon le ratio de l'écran.
 * ------------------------------------------------------------------ */
import { TAU, clamp, lerp, rand, pick, arc, easeOut, easeIn, easeBack } from '../core/util.js';
import { ATTACKS, ARCHETYPES, MONSTER_PALS, WEAPONS, byId, stageEnemyHp, stageEnemyDmg } from './data.js';
import { drawLayjou, poseOf, blendPose, heartPath, drawWeapon, starPath } from './layjou.js';
import { drawMonster, MONSTER_META } from './monsters.js';
import { makeBackground } from './backgrounds.js';
import { Fx } from './fx.js';

const VW = 400;
const HOME = 92;
const PSCALE = 0.62;
const PERFECT_WINDOW = 0.32;
const DODGE_TIME = 0.62, DODGE_IFRAMES = 0.55;
const REACH = { blob: 96, crab: 168, wasp: 104, golem: 176, octo: 190, dragon: 168, antijou: 92 };

export class Battle {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} o  { enemy, worldId, mode, loadout, stats, diff, hud, tr, sfx, buzz, tutorial, startEnergy, nextWave, onEnd, onDown, onEvent }
   */
  constructor(canvas, o) {
    this.cv = canvas; this.ctx = canvas.getContext('2d'); this.o = o;
    this.fx = new Fx();
    this.t = 0; this.state = 'intro'; this.stateT = 0; this.hitstop = 0; this.paused = false; this.dead = false;
    this.proj = []; this.waves = []; this.bolts = []; this.timers = []; this.weak = null; this.weakCD = rand(3, 5);
    this.wave = 1; this.ult = null; this.beam = null; this.tele = null; this.hintKey = null;
    this.stats = { perfects: 0, dodges: 0, weak: 0, ults: 0, stuns: 0, maxChain: 0, chainHits: 0, hitsTaken: 0, revives: 0, time: 0, waves: 0, dmgDealt: 0 };
    this.tut = { ...(o.tutorial || {}) };
    this.weapon = byId(WEAPONS, o.loadout.weapon);
    const st = o.stats;
    this.p = { hp: st.hp, maxHp: st.hp, energy: clamp(o.startEnergy || 0, 0, 100), x: HOME, pose: poseOf('idle', 0, 0), act: null, queued: null,
      blocking: false, blockStart: -9, blockLock: 0, dodgeT: 0, dodgeCD: 0, weaponCD: 0, hitT: 0, breakT: 0, combo: 0, comboT: 0, chain: 0, chainT: 0, engageT: 0, koT: 0, trail: [] };
    this.resize();
    this.spawnEnemy(o.enemy);
    this._onPointer = (ev) => this.pointer(ev);
    canvas.addEventListener('pointerdown', this._onPointer);
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    this.last = performance.now();
    this._loop = (now) => this.loop(now);
    this.raf = requestAnimationFrame(this._loop);
    this.syncHud(true);
  }

  destroy() {
    this.dead = true; cancelAnimationFrame(this.raf);
    this.cv.removeEventListener('pointerdown', this._onPointer); window.removeEventListener('resize', this._onResize);
  }

  resize() {
    const cw = this.cv.clientWidth || 400, ch = this.cv.clientHeight || 800;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cv.width = Math.round(cw * this.dpr); this.cv.height = Math.round(ch * this.dpr);
    this.s = cw / VW; this.W = VW; this.H = ch / this.s;
    this.gy = Math.max(300, this.H - 262);
    this.zoom = clamp((this.gy - 110) / 400, 0.58, 1.2);
    this.px = this.zoom > 1 ? 300 : this.W / 2; // pivot du zoom : cadre les deux combattants
    this.bg = makeBackground(this.o.worldId, this.W, this.H, this.gy, this.dpr * this.s > 2.5 ? 2 : Math.min(2, this.dpr * this.s));
  }

  /* ------------------------------ ennemi ------------------------------ */

  spawnEnemy(spec) {
    const arch = ARCHETYPES[spec.m], d = this.o.diff, meta = MONSTER_META[spec.m];
    const scale = (spec.scale || 1) * (spec.boss ? 1.28 : 1) * (spec.m === 'antijou' ? 0.86 : 1);
    const hp = Math.round(stageEnemyHp(spec.power, spec.boss) * arch.hp * d.hp);
    const baseX = 296 - Math.max(0, scale - 1) * 40; // les géants reculent moins : leur tête reste dans le cadre
    this.e = { spec, type: spec.m, arch, meta, pal: MONSTER_PALS[spec.pal] || MONSTER_PALS.grape, scale, baseX, x: this.W + 240,
      hp, maxHp: hp, dmg: stageEnemyDmg(spec.power, spec.boss) * arch.dmg * d.dmg, stagger: 0, staggerIdle: 0,
      state: 'enter', t: 0, dur: 0.9, atk: null, wind: 0, strike: 0, hurt: 0, enraged: false, gapT: 1.2, ox: 0, oy: 0, rot: 0,
      burnT: 0, burnDps: 0, freezeT: 0, fired: 0, lastAtk: null, count: 0, L: 0, stunLock: 0 };
    this.o.hud.enemy(1, spec.name, !!spec.boss, this.wave);
  }

  chooseAttack() {
    const e = this.e;
    let pool = e.arch.attacks.filter(([id, , enr]) => (!enr || e.enraged));
    if (e.count < 2 && this.o.gentleStart) pool = pool.filter(([id]) => ATTACKS[id].block);
    if (e.lastAtk && !ATTACKS[e.lastAtk].block) pool = pool.filter(([id]) => ATTACKS[id].block); // jamais deux imparables d'affilée
    if (!pool.length) pool = e.arch.attacks;
    const total = pool.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    for (const [id, w] of pool) { r -= w; if (r <= 0) return id; }
    return pool[0][0];
  }

  startAttack() {
    const e = this.e, id = this.chooseAttack(), a = ATTACKS[id];
    e.atk = { id, ...a }; e.lastAtk = id; e.count++;
    e.state = 'windup'; e.t = 0; e.dur = a.wind * this.o.diff.wind * (e.enraged ? 0.85 : 1); e.wind = 0; e.strike = 0; e.fired = 0;
    e.L = Math.max(18, (e.baseX - REACH[e.type] * e.scale) - (HOME + 30)) + (id === 'rush' ? 26 : 0); e.holdT = 0;
    this.tele = a.block ? 'block' : 'dodge';
    this.o.hud.telegraph(this.tele);
    this.o.sfx(a.block ? 'warn' : 'danger');
  }

  endAttack() {
    const e = this.e;
    if (!e.atk) return; // l'attaque a déjà été annulée (joueur K.O., étourdissement…)
    e.state = 'recover'; e.t = 0; e.dur = e.atk.recover; this.tele = null; this.beam = null; this.o.hud.telegraph(null);
  }

  toIdle(gapScale = 1) {
    const e = this.e, [g0, g1] = e.arch.gap;
    e.state = 'idle'; e.t = 0; e.atk = null; e.wind = 0; e.strike = 0;
    e.gapT = rand(g0, g1) * this.o.diff.gap * (e.enraged ? 0.7 : 1) * gapScale;
  }

  stunEnemy(dur = 2.6) {
    const e = this.e;
    if (e.state === 'dead' || e.state === 'roar' || e.state === 'enter') return;
    e.state = 'stunned'; e.t = 0; e.dur = dur; e.atk = null; e.wind = 0; e.strike = 0; e.stagger = 100;
    this.tele = null; this.beam = null; this.o.hud.telegraph(null);
    this.stats.stuns++; this.o.onEvent('stun');
    const [cx, cy] = this.enemyPoint(0, -e.meta.h * 0.9);
    this.fx.text(cx, cy - 20, this.o.tr('b_stun'), '#ffe14a', 26, 1.1); this.fx.burst(cx, cy, ['#ffe14a', '#fff'], 10, 200, 'star', 5);
    this.o.sfx('stun'); this.o.buzz('medium');
    this.weakCD = Math.min(this.weakCD, 0.3);
  }

  enemyPoint(lx, ly) {
    const e = this.e;
    return [e.x + e.ox + lx * e.scale, this.gy + e.oy + ly * e.scale];
  }

  hitEnemy(dmg, { stagger = 0, crit = false, x, y, color = '#fff', big = false, silent = false } = {}) {
    const e = this.e, p = this.p;
    if (e.state === 'dead' || e.state === 'enter' || e.state === 'roar' || this.state === 'intro') return;
    if (e.state === 'stunned') dmg *= 1.5;
    else if (e.state === 'recover') dmg *= 1.15;
    dmg = Math.max(1, Math.round(dmg));
    e.hp -= dmg; e.hurt = 1; this.stats.dmgDealt += dmg;
    const [cx, cy] = x !== undefined ? [x, y] : this.enemyPoint(e.meta.core[0] - 30, e.meta.core[1]);
    if (!silent) {
      this.fx.text(cx + rand(-14, 14), cy - 26 - rand(0, 16), (crit ? '✦ ' : '') + dmg, crit ? '#ffe14a' : color, crit || big ? 28 : 20);
      this.fx.burst(cx, cy, [color, '#fff'], big ? 14 : 7, big ? 300 : 220, 'spark', 4);
      if (big || crit) { this.fx.ring(cx, cy, color, 8, 60, 0.3, 5); this.fx.quake(big ? 9 : 5); this.hitstop = Math.max(this.hitstop, big ? 0.07 : 0.04); }
    }
    this.addEnergy(dmg / p.atkRef * 2.4);
    if (e.state !== 'stunned' && e.stunLock <= 0) { e.stagger = Math.min(100, e.stagger + stagger * (e.spec.boss ? 0.6 : 1)); e.staggerIdle = 0; }
    if (e.hp <= 0) { this.killEnemy(); return; }
    if (e.spec.boss && !e.enraged && e.hp < e.maxHp * 0.5) { this.enrage(); return; }
    if (e.stagger >= 100 && e.state !== 'stunned') this.stunEnemy();
  }

  enrage() {
    const e = this.e;
    e.enraged = true; e.state = 'roar'; e.t = 0; e.dur = 1.15; e.atk = null; e.wind = 0; e.strike = 0; e.stagger = 0;
    this.tele = null; this.beam = null; this.o.hud.telegraph(null);
    const [cx, cy] = this.enemyPoint(0, -e.meta.h * 0.6);
    this.fx.text(this.W / 2, this.gy - 250 * this.zoom, this.o.tr('b_enrage'), '#ff4f6b', 30, 1.3);
    this.fx.ring(cx, cy, '#ff4f6b', 20, 220, 0.6, 10); this.fx.quake(14); this.o.sfx('roar'); this.o.buzz('heavy');
  }

  killEnemy() {
    const e = this.e;
    e.hp = 0; e.state = 'dead'; e.t = 0; e.atk = null; this.tele = null; this.beam = null; this.weak = null; this.proj = this.proj.filter((q) => q.from === 'p'); this.waves = [];
    this.o.hud.telegraph(null);
    this.state = 'won'; this.stateT = 0; this.hitstop = 0.12; this.stats.waves = this.wave;
    this.fx.quake(16); this.fx.blink('#fff', 0.6); this.o.sfx('boom'); this.o.buzz('heavy');
  }

  /* ------------------------------ joueur ------------------------------ */

  addEnergy(v) { const p = this.p; p.energy = clamp(p.energy + v * this.o.stats.energyGain, 0, 100); }

  canAct() {
    const p = this.p;
    return this.state === 'fight' && p.hitT <= 0 && p.breakT <= 0 && p.dodgeT <= 0 && !p.blocking;
  }

  input(name) {
    if (this.paused || this.dead) return;
    const p = this.p;
    switch (name) {
      case 'punch':
        if (!this.canAct()) return;
        if (p.act) { if (p.act.t > p.act.dur * 0.35) p.queued = 'punch'; return; }
        this.startPunch(); break;
      case 'weapon':
        if (!this.canAct() || p.weaponCD > 0) return;
        if (p.act) { p.queued = 'weapon'; return; }
        this.startWeapon(); break;
      case 'ult':
        if (this.state !== 'fight' || p.energy < 100 || p.breakT > 0 || p.hitT > 0) return;
        this.startUlt(); break;
      case 'dodge':
        if (this.state !== 'fight' || p.dodgeCD > 0 || p.breakT > 0) return;
        p.dodgeT = DODGE_TIME; p.dodgeCD = this.o.stats.dodgeCd; p.act = null; p.queued = null; p.blocking = false; p.trail = [];
        this.o.sfx('dash'); this.fx.puff(p.x, this.gy - 4, 'rgba(255,255,255,0.8)', 5);
        break;
      case 'blockDown':
        if (this.state !== 'fight' || p.breakT > 0 || p.dodgeT > 0 || p.blockLock > 0 || p.blocking) return;
        p.blocking = true; p.blockStart = this.t; p.act = null; p.queued = null; this.o.sfx('shield');
        break;
      case 'blockUp':
        if (p.blocking) { p.blocking = false; p.blockLock = 0.3; }
        break;
      default:
    }
  }

  startPunch() {
    const p = this.p;
    p.combo = p.comboT > 0 ? (p.combo % 3) + 1 : 1;
    const heavy = p.combo === 3;
    p.act = { name: 'punch' + p.combo, t: 0, dur: heavy ? 0.42 : 0.25, hitAt: heavy ? 0.2 : 0.1, done: false, kind: 'punch', heavy };
    p.comboT = 1.0; p.engageT = 1.0; this.o.sfx('swing');
    if (this.hintKey === 'punch' && ++this.tutPunches >= 3) { this.setHint(null); }
  }

  startWeapon() {
    const p = this.p, w = this.weapon;
    p.act = { name: w.kind === 'melee' ? 'slash' : 'shoot', t: 0, dur: w.kind === 'melee' ? 0.5 : 0.4, hitAt: w.kind === 'melee' ? 0.2 : 0.08, done: false, kind: 'weapon' };
    p.weaponCD = w.cd; p.engageT = w.kind === 'melee' ? 1.0 : 0; this.o.sfx(w.kind === 'melee' ? 'swing' : 'shoot');
  }

  startUlt() {
    const p = this.p, e = this.e;
    p.energy = 0; p.act = null; p.queued = null; p.blocking = false; p.dodgeT = 0;
    this.state = 'ult'; this.ult = { t: 0, ticks: 0 }; this.stats.ults++; this.o.onEvent('ult');
    if (e.state === 'windup' || e.state === 'strike') this.endAttack();
    this.proj = this.proj.filter((q) => q.from === 'p'); this.waves = [];
    this.fx.text(this.W / 2, this.gy - 240 * this.zoom, this.o.tr('b_ult'), '#ff8fc0', 32, 1.4);
    this.o.sfx('ult'); this.o.buzz('heavy');
    if (this.hintKey === 'ult') { this.tut.ult = true; this.o.onEvent('tut', 'ult'); this.setHint(null); }
  }

  rollCrit() { return Math.random() < this.o.stats.crit; }

  playerStrike(act) {
    const p = this.p, e = this.e, st = this.o.stats, w = this.weapon;
    const chainBonus = 1 + Math.min(0.3, p.chain * 0.02);
    if (act.kind === 'punch') {
      const crit = this.rollCrit();
      const dmg = st.atk * (act.heavy ? 1.25 : 0.6) * chainBonus * (crit ? 1.8 : 1);
      const [cx, cy] = this.enemyPoint(-e.meta.w * 0.3, e.meta.core[1] + rand(-22, 22));
      this.hitEnemy(dmg, { stagger: act.heavy ? 6 : 2.5, crit, x: cx, y: cy, color: '#fff', big: act.heavy });
      p.chain++; p.chainT = 1.6; this.stats.chainHits++; this.stats.maxChain = Math.max(this.stats.maxChain, p.chain);
      this.o.onEvent('combo'); this.o.hud.combo(p.chain);
      this.o.sfx(act.heavy ? 'hitHeavy' : 'hit'); this.o.buzz(act.heavy ? 'medium' : 'light');
    } else if (w.kind === 'melee') {
      const n = w.id === 'saber' ? 3 : 1;
      for (let i = 0; i < n; i++) this.after(i * 0.09, () => {
        const crit = this.rollCrit();
        const [cx, cy] = this.enemyPoint(-e.meta.w * 0.28 + rand(-10, 10), e.meta.core[1] + (i - 1) * 26);
        this.hitEnemy(st.atk * w.dmg / n * (crit ? 1.8 : 1), { stagger: w.stagger / n, crit, x: cx, y: cy, color: w.color, big: n === 1 });
        this.o.sfx(n === 1 ? 'hitHeavy' : 'slash'); this.o.buzz(n === 1 ? 'heavy' : 'light');
        if (n === 1) { this.fx.quake(14); this.fx.ring(cx, this.gy, w.color, 10, 120, 0.4, 7); }
      });
    } else {
      const hx = p.x + (p.pose.hfx + 40) * PSCALE, hy = this.gy + (p.pose.hfy + p.pose.rootY) * PSCALE;
      const [tx, ty] = this.enemyPoint(e.meta.core[0] - 20, e.meta.core[1]);
      if (w.id === 'thunder') {
        this.bolts.push({ x0: hx, y0: hy, x1: tx, y1: ty, t: 0.22, color: w.color });
        this.weaponHit(tx, ty);
      } else {
        this.proj.push({ from: 'p', kind: w.id, x: hx, y: hy, sx: hx, sy: hy, tx, ty, t: 0, dur: w.id === 'rocket' ? 0.34 : 0.2, color: w.color, hits: w.hits || 1 });
      }
      this.fx.burst(hx, hy, [w.color, '#fff'], 5, 150, 'spark', 3);
    }
  }

  weaponHit(x, y, second = false) {
    const w = this.weapon, st = this.o.stats, e = this.e, crit = this.rollCrit();
    this.hitEnemy(st.atk * w.dmg * (crit ? 1.8 : 1), { stagger: w.stagger, crit, x, y, color: w.color, big: w.id === 'rocket' || w.id === 'thunder' });
    if (w.id === 'rocket') { this.fx.burst(x, y, ['#ff4f4f', '#ffd24a', '#fff'], 22, 340, 'dot', 6); this.fx.puff(x, y, 'rgba(80,80,110,0.7)', 8); this.fx.ring(x, y, '#ffd24a', 10, 110, 0.4, 9); this.fx.quake(16); this.o.sfx('boom'); this.o.buzz('heavy'); }
    else { this.o.sfx(w.id === 'thunder' ? 'zap' : 'hit'); this.o.buzz('light'); }
    if (w.burn && e.state !== 'dead') { e.burnT = 3; e.burnDps = st.atk * w.dmg * w.burn / 3; }
    if (w.shock && e.state !== 'dead' && e.state !== 'roar' && e.state !== 'enter') e.freezeT = w.shock;
  }

  hitPlayer(dmg, blockable, heavy, srcX) {
    const p = this.p;
    if (this.state !== 'fight') return 'none';
    const ix = p.x + 20, iy = this.gy - 70;
    if (p.dodgeT > DODGE_TIME - DODGE_IFRAMES) {
      this.fx.text(p.x, this.gy - 150, this.o.tr('b_dodge'), '#7dffb0', 22); this.addEnergy(9); this.stats.dodges++; this.o.onEvent('dodge'); this.o.sfx('dodgeOk');
      return 'dodge';
    }
    if (p.blocking) {
      if (blockable) {
        if (this.t - p.blockStart <= PERFECT_WINDOW) {
          this.fx.text(p.x + 20, this.gy - 160, this.o.tr('b_perfect'), '#7df3ff', 26, 1.0); this.fx.ring(ix + 26, iy - 20, '#aef6ff', 14, 96, 0.35, 8);
          this.fx.burst(ix + 26, iy - 20, ['#aef6ff', '#fff'], 12, 260, 'spark', 4); this.fx.blink('#aef6ff', 0.25);
          this.addEnergy(15); this.stats.perfects++; this.o.onEvent('perfect'); this.o.sfx('perfect'); this.o.buzz('medium'); this.hitstop = 0.06;
          if (this.e.state !== 'stunned' && this.e.stunLock <= 0) { this.e.stagger = Math.min(100, this.e.stagger + 30); this.e.staggerIdle = 0; if (this.e.stagger >= 100) this.stunEnemy(2.2); }
          return 'perfect';
        }
        dmg *= 0.25; this.fx.text(p.x + 16, this.gy - 150, this.o.tr('b_block'), '#cfefff', 18); this.fx.burst(ix + 26, iy - 20, '#aef6ff', 6, 180, 'spark', 3);
        this.o.sfx('block'); this.o.buzz('light'); this.addEnergy(3);
      } else {
        dmg *= 0.8; p.blocking = false; p.breakT = 0.95; p.blockLock = 1.0;
        this.fx.text(p.x + 10, this.gy - 160, this.o.tr('b_break'), '#ff7a8a', 22, 1.1); this.fx.burst(ix + 26, iy - 20, ['#aef6ff', '#ff7a8a'], 16, 300, 'shard', 5);
        this.o.sfx('break'); this.o.buzz('heavy'); this.fx.quake(12);
      }
    } else {
      p.hitT = heavy ? 0.42 : 0.3; p.act = null; p.queued = null; this.fx.quake(heavy ? 13 : 8); this.o.sfx('hurt'); this.o.buzz(heavy ? 'heavy' : 'medium');
      this.fx.blink('#ff3b5c', heavy ? 0.3 : 0.18);
    }
    dmg = Math.max(1, Math.round(dmg));
    p.hp -= dmg; p.chain = 0; this.o.hud.combo(0); this.stats.hitsTaken++;
    this.fx.text(p.x, this.gy - 130, '-' + dmg, '#ff6b81', heavy ? 26 : 22); this.fx.burst(ix, iy, ['#ff6b81', '#fff'], 8, 220, 'spark', 4);
    if (p.hp <= 0) { p.hp = 0; this.playerDown(); }
    return 'hit';
  }

  playerDown() {
    const p = this.p;
    this.state = 'down'; this.stateT = 0; p.koT = 0; p.act = null; p.blocking = false; p.dodgeT = 0; this.tele = null; this.beam = null;
    this.o.hud.telegraph(null); this.setHint(null);
    if (this.e.state === 'windup' || this.e.state === 'strike') { this.e.atk = null; this.e.state = 'idle'; this.e.gapT = 99; this.e.wind = 0; this.e.strike = 0; }
    this.proj = []; this.waves = []; this.hitstop = 0.12; this.o.sfx('ko'); this.o.buzz('heavy'); this.downSent = false;
  }

  /** Reprise après « Continuer » (vidéo ou crédits). */
  revive(pct = 0.6) {
    const p = this.p;
    p.hp = Math.round(p.maxHp * pct); p.energy = 100; p.hitT = 0; p.breakT = 0; p.koT = 0; this.stats.revives++;
    this.state = 'fight'; this.paused = false; this.last = performance.now();
    this.fx.ring(p.x, this.gy - 60, '#ff8fc0', 20, 200, 0.6, 10); this.fx.burst(p.x, this.gy - 70, ['#ff8fc0', '#fff', '#7df3ff'], 26, 300, 'heart', 6);
    this.fx.blink('#ffd0e6', 0.5); this.o.sfx('revive');
    if (this.e.state !== 'dead') { this.e.state = 'stunned'; this.e.t = 0; this.e.dur = 2.2; this.e.stagger = 100; }
    this.syncHud(true);
  }

  after(delay, fn) { this.timers.push({ t: delay, fn }); }

  setHint(key) { if (this.hintKey !== key) { this.hintKey = key; this.o.hud.hint(key); } }

  pointer(ev) {
    if (this.state !== 'fight' || !this.weak || this.paused) return;
    const r = this.cv.getBoundingClientRect();
    let x = (ev.clientX - r.left) / this.s, y = (ev.clientY - r.top) / this.s;
    x = (x - this.px) / this.zoom + this.px; y = (y - this.gy) / this.zoom + this.gy;
    const [wx, wy] = this.enemyPoint(...this.e.meta.weak[this.weak.i]);
    if (Math.hypot(x - wx, y - wy) < 40) {
      this.weak = null; this.weakCD = rand(3.2, 5.5);
      this.stats.weak++; this.o.onEvent('weak');
      this.fx.text(wx, wy - 34, this.o.tr('b_weak'), '#ffe14a', 22, 1.0); this.fx.burst(wx, wy, ['#ffe14a', '#fff'], 14, 280, 'star', 5);
      this.hitEnemy(this.o.stats.atk * 2.4, { stagger: 22, crit: true, x: wx, y: wy, color: '#ffe14a', big: true });
      this.addEnergy(8); this.o.sfx('weak'); this.o.buzz('medium');
    }
  }

  /* ------------------------------ boucle ------------------------------ */

  pause() { this.paused = true; }
  resume() { this.paused = false; this.last = performance.now(); }

  loop(now) {
    if (this.dead) return;
    this.raf = requestAnimationFrame(this._loop);
    let dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    if (this.paused) { return; }
    if (this.hitstop > 0) { this.hitstop -= dt; this.fx.update(dt * 0.3); this.draw(); return; }
    this.update(dt); this.draw();
  }

  update(dt) {
    this.t += dt; this.stateT += dt;
    const p = this.p, e = this.e;
    p.atkRef = this.o.stats.atk;
    for (const tm of this.timers) { tm.t -= dt; if (tm.t <= 0 && !tm.done) { tm.done = true; tm.fn(); } }
    this.timers = this.timers.filter((tm) => !tm.done);

    if (this.state === 'intro') {
      e.t += dt; const k = clamp(e.t / e.dur);
      e.x = lerp(this.W + 240, e.baseX, easeOut(k));
      if (k >= 1 && e.state === 'enter') { e.state = 'idle'; e.gapT = 1.3; this.fx.quake(e.spec.boss ? 12 : 7); this.fx.puff(e.x, this.gy - 4, 'rgba(255,255,255,0.7)', 8); this.o.sfx('land'); }
      if (this.stateT > 1.5) {
        this.state = 'fight'; this.stateT = 0; this.fx.text(this.W / 2, this.gy - 210 * this.zoom, this.o.tr('b_go'), '#fff', 40, 0.9); this.o.sfx('go');
        if (!this.tut.punch) { this.tutPunches = 0; this.setHint('punch'); this.tut.punch = true; this.o.onEvent('tut', 'punch'); }
      }
    } else if (this.state === 'fight') {
      this.stats.time += dt;
      this.updateEnemy(dt); this.updatePlayer(dt); this.updateWeak(dt);
      if (p.energy >= 100 && !this.tut.ult && !this.hintKey) this.setHint('ult');
    } else if (this.state === 'ult') {
      this.updateUlt(dt);
    } else if (this.state === 'won') {
      e.t += dt;
      if (e.t < 1.0 && Math.random() < dt * 22) { const [cx, cy] = this.enemyPoint(rand(-60, 60), -rand(20, e.meta.h)); this.fx.burst(cx, cy, [e.pal.a, e.pal.c, '#fff'], 6, 240, pick(['dot', 'star', 'shard']), 5); this.fx.quake(5); }
      if (e.t > 1.25) {
        if (this.o.mode === 'arena') {
          this.wave++; this.o.onEvent('arenaWave');
          p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.22));
          this.fx.text(p.x, this.gy - 150, '+' + Math.round(p.maxHp * 0.22), '#7dffb0', 22);
          this.spawnEnemy(this.o.nextWave(this.wave)); this.state = 'intro'; this.stateT = 0.4;
          this.fx.text(this.W / 2, this.gy - 230 * this.zoom, this.o.tr('b_wave') + ' ' + this.wave, '#fff', 34, 1.2);
        } else { this.state = 'victory'; this.stateT = 0; this.o.sfx('win'); }
      }
      this.updatePlayer(dt, true);
    } else if (this.state === 'victory') {
      if (Math.random() < dt * 8) this.fx.burst(rand(40, this.W - 40), this.gy - rand(120, 320), ['#ff8fc0', '#7df3ff', '#ffe14a'], 5, 160, pick(['star', 'heart']), 5);
      if (this.stateT > 1.7 && !this.ended) { this.ended = true; this.finish(true); }
    } else if (this.state === 'down') {
      p.koT += dt;
      if (this.stateT > 1.25 && !this.downSent) { this.downSent = true; this.paused = true; this.o.onDown(this); }
    }

    // projectiles
    for (const q of this.proj) {
      q.t += dt; const k = clamp(q.t / q.dur);
      if (q.from === 'p') {
        const back = q.returning;
        q.x = lerp(q.sx, q.tx, back ? 1 - k : k); q.y = lerp(q.sy, q.ty, back ? 1 - k : k) - arc(k) * (q.kind === 'boomerang' ? 34 : q.kind === 'rocket' ? 18 : 0) * (back ? -1 : 1);
        if (k >= 1) {
          if (!back) { this.weaponHit(q.tx, q.ty); if (q.hits > 1 && this.e.state !== 'dead') { q.returning = true; q.t = 0; q.dur = 0.3; this.after(0.02, () => this.weaponHit(q.tx, q.ty)); } else q.done = true; }
          else q.done = true;
        }
      } else {
        q.x = lerp(q.sx, q.tx, k); q.y = lerp(q.sy, q.ty, k) - arc(k) * q.arcH;
        if (k >= 1) { q.done = true; const r = this.hitPlayer(q.dmg, true, false); if (r !== 'dodge') this.fx.burst(q.tx, q.ty, [q.color, '#fff'], 8, 200, 'dot', 4); }
      }
    }
    this.proj = this.proj.filter((q) => !q.done);
    for (const w of this.waves) {
      w.t += dt; const k = clamp(w.t / w.dur); w.x = lerp(w.sx, w.tx, k);
      if (Math.random() < dt * 40) this.fx.burst(w.x, this.gy - 4, [w.color, '#fff'], 2, 120, 'shard', 4);
      if (k >= 1) { w.done = true; this.hitPlayer(w.dmg, false, true); }
    }
    this.waves = this.waves.filter((w) => !w.done);
    for (const b of this.bolts) b.t -= dt; this.bolts = this.bolts.filter((b) => b.t > 0);

    e.hurt = Math.max(0, e.hurt - dt * 4.5);
    this.fx.update(dt);
    this.syncHud();
  }

  updateEnemy(dt) {
    const e = this.e, p = this.p;
    if (e.burnT > 0 && e.state !== 'dead') {
      e.burnT -= dt; e.burnAcc = (e.burnAcc || 0) + e.burnDps * dt;
      if (e.burnAcc >= 1) { const d = Math.floor(e.burnAcc); e.burnAcc -= d; e.hp -= d; this.stats.dmgDealt += d; if (Math.random() < 0.3) { const [cx, cy] = this.enemyPoint(rand(-40, 40), -rand(30, e.meta.h * 0.8)); this.fx.burst(cx, cy, ['#7dff5a', '#eaffd0'], 2, 90, 'dot', 4); } if (e.hp <= 0) { this.killEnemy(); return; } }
    }
    if (e.freezeT > 0) { e.freezeT -= dt; return; }
    if (e.stunLock > 0) e.stunLock -= dt;
    if (e.state !== 'stunned') { e.staggerIdle += dt; if (e.staggerIdle > 2.2) e.stagger = Math.max(0, e.stagger - dt * 9); }
    switch (e.state) {
      case 'idle':
        e.gapT -= dt; if (e.gapT <= 0) this.startAttack(); break;
      case 'windup': {
        // tutoriel : le temps s'arrête jusqu'à la bonne réaction du joueur
        const need = e.atk.block ? 'block' : 'dodge';
        const holdAt = need === 'block' ? 0.62 : 0.9;
        if (!this.tut[need] && e.wind >= holdAt) {
          // le joueur a déjà la bonne réaction : leçon validée (et parade parfaite offerte)
          const ok = need === 'block' ? p.blocking : p.dodgeT > 0;
          if (ok) { this.tut[need] = true; this.o.onEvent('tut', need); if (need === 'block') p.blockStart = this.t; if (this.hintKey === need) this.setHint(null); }
          else if ((e.holdT = (e.holdT || 0) + dt) < 6) { if (this.hintKey !== need) this.setHint(need); break; }
          else if (this.hintKey === need) this.setHint(null); // pas de réaction : l'attaque part, la leçon reviendra
        }
        e.t += dt; e.wind = clamp(e.t / e.dur);
        if (e.wind >= 1) { e.state = 'strike'; e.t = 0; e.strike = 0; this.o.sfx(e.atk.type === 'melee' ? 'whoosh' : e.atk.type === 'beam' ? 'beam' : 'whoosh'); if (e.atk.type === 'beam') this.beam = { t: 0 }; }
        break;
      }
      case 'strike': {
        const a = e.atk; e.t += dt; e.strike = clamp(e.t / a.strike);
        if (a.type === 'melee') { if (e.strike >= 1) { this.hitPlayer(e.dmg * a.dmg, a.block, a.heavy); this.endAttack(); } }
        else if (a.type === 'proj') {
          while (e.fired < a.count && e.strike >= (e.fired + 0.4) / a.count) {
            const [mx, my] = this.enemyPoint(...e.meta.mouth);
            this.proj.push({ from: 'e', x: mx, y: my, sx: mx, sy: my, tx: p.x + 24, ty: this.gy - 76, t: 0, dur: 0.46, dmg: e.dmg * a.dmg, color: e.pal.c, col2: e.pal.glow, arcH: rand(10, 40) });
            e.fired++; this.o.sfx('spit'); this.fx.burst(mx, my, [e.pal.c, '#fff'], 5, 140, 'dot', 3);
          }
          if (e.strike >= 1) this.endAttack();
        } else if (a.type === 'wave') {
          if (e.strike >= 1) {
            const sx = e.x - e.meta.w * 0.3 * e.scale;
            this.waves.push({ x: sx, sx, tx: p.x + 6, t: 0, dur: 0.38, dmg: e.dmg * a.dmg, color: e.pal.c });
            this.fx.quake(15); this.fx.ring(sx, this.gy, e.pal.c, 10, 120, 0.4, 8); this.o.sfx('quake'); this.o.buzz('medium'); this.endAttack();
          }
        } else if (a.type === 'beam') {
          while (e.fired < a.ticks && e.strike >= (e.fired + 1) / (a.ticks + 0.5)) { e.fired++; this.hitPlayer(e.dmg * a.dmg, true, false); this.fx.quake(4); }
          if (e.strike >= 1) this.endAttack();
        }
        break;
      }
      case 'recover': e.t += dt; if (e.t >= e.dur) this.toIdle(); break;
      case 'stunned': e.t += dt; if (e.t >= e.dur) { e.stagger = 0; e.stunLock = 3; this.toIdle(0.45); } break;
      case 'roar': e.t += dt; if (e.t >= e.dur) this.toIdle(0.4); break;
      default:
    }
    // décalages d'animation (élan, charge, retour)
    let ox = 0, oy = 0, rot = 0;
    const a = e.atk, fly = e.meta.fly ? 1 : 0;
    if (a && e.state === 'windup') { const w = easeOut(e.wind); ox = 14 * w; rot = 0.05 * w; if (a.type === 'wave') oy = -26 * w; ox += Math.sin(this.t * 60) * e.wind * 1.6; }
    else if (a && e.state === 'strike') {
      const s = easeIn(e.strike);
      if (a.type === 'melee') { ox = lerp(14, -e.L, s); rot = lerp(0.05, -0.12, s); oy = fly * 34 * s; }
      else if (a.type === 'wave') { oy = lerp(-26, 0, s); ox = lerp(14, -10, s); }
      else { ox = 14 - 6 * Math.sin(e.strike * Math.PI * a.count || 1); }
    } else if (a && e.state === 'recover') {
      const k = easeOut(clamp(e.t / 0.5));
      if (a.type === 'melee') { ox = lerp(-e.L, 0, k); rot = lerp(-0.12, 0, k); oy = fly * 34 * (1 - k); }
    } else if (e.state === 'stunned') { rot = Math.sin(this.t * 5) * 0.035; oy = 3; }
    else if (e.state === 'roar') { const k = arc(clamp(e.t / e.dur)); ox = Math.sin(this.t * 70) * 3; oy = -8 * k; }
    ox += e.hurt * 9; rot += e.hurt * 0.03;
    e.ox = ox; e.oy = oy; e.rot = rot; e.x = e.baseX;
  }

  updateWeak(dt) {
    const e = this.e;
    if (e.state === 'dead' || e.state === 'roar' || e.state === 'enter') { this.weak = null; return; }
    if (this.weak) { this.weak.t += dt; if (this.weak.t >= this.weak.dur) { this.weak = null; this.weakCD = rand(3.5, 6); } return; }
    this.weakCD -= dt * (e.state === 'stunned' ? 2.5 : 1);
    if (this.weakCD <= 0) { this.weak = { i: Math.floor(Math.random() * e.meta.weak.length), t: 0, dur: 2.3 * this.o.diff.weak }; this.o.sfx('ping'); }
  }

  updateUlt(dt) {
    const u = this.ult, e = this.e, p = this.p;
    u.t += dt;
    const [tx, ty] = this.enemyPoint(e.meta.core[0], e.meta.core[1]);
    if (u.t > 0.45 && u.t < 1.5) {
      const want = Math.floor((u.t - 0.45) / 0.1) + 1;
      while (u.ticks < Math.min(10, want)) {
        u.ticks++;
        const was = e.state;
        this.hitEnemy(this.o.stats.atk * 0.75, { stagger: 5, x: tx + rand(-24, 24), y: ty + rand(-24, 24), color: '#ff8fc0' });
        this.fx.burst(tx, ty, ['#ff8fc0', '#fff', '#ffd0e6'], 4, 260, 'heart', 5); this.fx.quake(7);
        if (this.state !== 'ult') return; // l'ennemi est mort
        if (was !== 'roar' && e.state === 'roar') { /* enragé pendant le super : on continue */ }
      }
    }
    if (u.t >= 1.5 && !u.boom) { u.boom = true; this.fx.ring(tx, ty, '#ff8fc0', 20, 240, 0.6, 12); this.fx.blink('#ffd0e6', 0.6); this.fx.quake(18); this.o.sfx('boom'); this.o.buzz('heavy'); }
    if (u.t >= 1.9) { this.state = 'fight'; this.ult = null; }
    e.hurt = Math.max(e.hurt, u.t > 0.45 && u.t < 1.5 ? 0.6 : 0);
    // pose
    blendPose(p.pose, poseOf('ult', this.t, clamp(u.t / 1.9)), 1 - Math.exp(-dt * 16));
    p.x = lerp(p.x, HOME + 6, 1 - Math.exp(-dt * 10));
  }

  updatePlayer(dt, passive = false) {
    const p = this.p;
    p.punchCD = 0;
    p.weaponCD = Math.max(0, p.weaponCD - dt); p.dodgeCD = Math.max(0, p.dodgeCD - dt); p.blockLock = Math.max(0, p.blockLock - dt);
    p.hitT = Math.max(0, p.hitT - dt); p.breakT = Math.max(0, p.breakT - dt); p.comboT = Math.max(0, p.comboT - dt); p.engageT = Math.max(0, p.engageT - dt);
    if (p.chainT > 0) { p.chainT -= dt; if (p.chainT <= 0) { p.chain = 0; this.o.hud.combo(0); } }
    if (p.dodgeT > 0) p.dodgeT = Math.max(0, p.dodgeT - dt);
    if (!passive) this.addEnergy(dt * 0.7);
    let lunge = 0;
    if (p.act) {
      p.act.t += dt;
      if (!p.act.done && p.act.t >= p.act.hitAt) { p.act.done = true; this.playerStrike(p.act); }
      if (p.act) { lunge = (p.act.kind === 'punch' || p.act.name === 'slash') ? 30 * arc(clamp(p.act.t / p.act.dur)) : -4 * arc(clamp(p.act.t / p.act.dur)); }
      if (p.act && p.act.t >= p.act.dur) { p.act = null; const q = p.queued; p.queued = null; if (q === 'punch' && this.canAct()) this.startPunch(); else if (q === 'weapon' && this.canAct() && p.weaponCD <= 0) this.startWeapon(); }
    }
    // pose cible
    let target;
    if (this.state === 'victory') target = poseOf('victory', this.t, 0);
    else if (p.breakT > 0) target = poseOf('break', this.t, 0);
    else if (p.hitT > 0) target = poseOf('hit', this.t, 1 - p.hitT / 0.42);
    else if (p.dodgeT > 0) target = poseOf('dodge', this.t, 1 - p.dodgeT / DODGE_TIME);
    else if (p.act) target = poseOf(p.act.name, this.t, clamp(p.act.t / p.act.dur));
    else if (p.blocking) target = poseOf('block', this.t, 0);
    else target = poseOf('idle', this.t, 0);
    blendPose(p.pose, target, 1 - Math.exp(-dt * (p.act ? 34 : 20)));
    if (p.act || p.dodgeT > 0) { p.pose.rootY = target.rootY; }
    // position
    let tx = HOME + (p.engageT > 0 ? 22 : 0) + lunge;
    if (this.state === 'victory') tx = HOME + 30;
    if (p.dodgeT > 0) tx = HOME - 48 * arc(1 - p.dodgeT / DODGE_TIME);
    if (p.hitT > 0) tx -= 10;
    p.x = lerp(p.x, tx, 1 - Math.exp(-dt * 26));
    if (p.dodgeT > 0) { p.trail.push({ x: p.x, a: 0.5 }); if (p.trail.length > 5) p.trail.shift(); } else if (p.trail.length) p.trail.shift();
  }

  finish(win) {
    const p = this.p, e = this.e;
    this.o.onEnd({ win, hpPct: clamp(p.hp / p.maxHp), enemyHpPct: clamp(e.hp / e.maxHp), ...this.stats, waves: this.o.mode === 'arena' ? this.wave - 1 : (win ? 1 : 0) });
  }

  /** Appelé par l'UI quand le joueur abandonne après un K.O. */
  giveUp() { if (!this.ended) { this.ended = true; this.finish(false); } }

  syncHud(force) {
    const p = this.p, e = this.e, h = this.o.hud;
    const key = `${Math.round(p.hp)}|${Math.round(e.hp)}|${Math.round(p.energy)}|${Math.round(e.stagger)}|${e.state === 'stunned'}|${Math.round(p.weaponCD * 20)}|${Math.round(p.dodgeCD * 20)}|${e.enraged}`;
    if (!force && key === this._hk) return; this._hk = key;
    h.player(clamp(p.hp / p.maxHp), Math.round(p.hp), p.maxHp);
    h.enemyHp(clamp(e.hp / e.maxHp), e.enraged);
    h.stagger(e.stagger / 100, e.state === 'stunned');
    h.energy(p.energy / 100);
    h.cd('weapon', this.weapon.cd ? p.weaponCD / this.weapon.cd : 0);
    h.cd('dodge', p.dodgeCD / this.o.stats.dodgeCd);
  }

  /* ------------------------------ rendu ------------------------------ */

  draw() {
    const ctx = this.ctx, { W, H, gy } = this, p = this.p, e = this.e, t = this.t;
    const k = this.dpr * this.s;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.save();
    if (this.fx.shake > 0.2) ctx.translate(rand(-1, 1) * this.fx.shake * 0.5, rand(-1, 1) * this.fx.shake * 0.5);
    this.bg.draw(ctx, t);
    // caméra : zoom autour du sol
    ctx.translate(this.px, gy); ctx.scale(this.zoom, this.zoom); ctx.translate(-this.px, -gy);

    const ultK = this.ult ? clamp(Math.min(this.ult.t / 0.3, (1.9 - this.ult.t) / 0.3)) : 0;
    if (ultK > 0) { ctx.fillStyle = `rgba(20,6,50,${0.5 * ultK})`; ctx.fillRect(-W, -H, W * 3, H * 3); }

    // ombres
    ctx.fillStyle = 'rgba(8,12,40,0.28)';
    const jump = Math.abs(p.pose.rootY);
    ctx.beginPath(); ctx.ellipse(p.x, gy + 2, Math.max(8, 34 - jump * 0.3), Math.max(2, 7 - jump * 0.06), 0, 0, TAU); ctx.fill();
    const dk = e.state === 'dead' ? clamp(e.t / 1.2) : 0;
    if (dk < 1) { ctx.globalAlpha = 1 - dk; ctx.beginPath(); ctx.ellipse(e.x + e.ox, gy + 3, e.meta.w * 0.42 * e.scale * (1 - dk * 0.5), 10 * e.scale, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }

    // ennemi
    if (dk < 1) {
      const m = { x: e.x + e.ox + (dk > 0 ? rand(-3, 3) : 0), y: gy + e.oy, scale: e.scale * (1 - easeIn(dk) * 0.5), rot: e.rot, pal: e.pal, t, wind: e.wind, strike: e.strike, kind: e.atk ? e.atk.id : null, stun: e.state === 'stunned', enraged: e.enraged, hurt: Math.max(e.hurt, dk > 0 ? 1 : 0) };
      // aura de télégraphe
      if (e.state === 'windup') {
        const [ax, ay] = this.enemyPoint(0, -e.meta.h * 0.5), col = e.atk.block ? '255,215,80' : '255,60,90';
        const g = ctx.createRadialGradient(ax, ay, 10, ax, ay, e.meta.w * 0.8 * e.scale); g.addColorStop(0, `rgba(${col},${0.42 * e.wind})`); g.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ax, ay, e.meta.w * 0.8 * e.scale, 0, TAU); ctx.fill();
      }
      if (e.enraged && e.state !== 'dead') { const [ax, ay] = this.enemyPoint(0, -e.meta.h * 0.5); const g = ctx.createRadialGradient(ax, ay, 10, ax, ay, e.meta.w * 0.75 * e.scale); g.addColorStop(0, `rgba(255,40,80,${0.22 + 0.08 * Math.sin(t * 8)})`); g.addColorStop(1, 'rgba(255,40,80,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ax, ay, e.meta.w * 0.75 * e.scale, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = dk > 0 ? (1 - easeIn(dk)) * (Math.sin(t * 60) > 0 ? 1 : 0.6) : 1;
      drawMonster(ctx, e.type, m);
      if (e.hurt > 0.45 || dk > 0 || e.freezeT > 0) {
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (dk > 0 ? 0.7 : e.freezeT > 0 ? 0.4 : e.hurt * 0.65);
        drawMonster(ctx, e.type, m); ctx.globalCompositeOperation = 'source-over';
      }
      ctx.globalAlpha = 1;
      this.drawEnemyOverlays(ctx);
    }

    // faisceau ennemi
    if (this.beam && e.state === 'strike') {
      const [mx, my] = this.enemyPoint(...e.meta.mouth); const bx = p.x + (p.blocking ? 60 : 26), by = gy - 80;
      this.beamLine(ctx, mx, my, bx, by, e.pal.c, e.pal.glow, 15 + Math.sin(t * 50) * 3);
      if (Math.random() < 0.6) this.fx.burst(bx, by, [e.pal.c, '#fff'], 1, 200, 'spark', 3);
    }
    // vagues de choc
    for (const w of this.waves) {
      const h = 46 + Math.sin(t * 40) * 6;
      const g = ctx.createLinearGradient(0, gy - h, 0, gy); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, w.color); g.addColorStop(1, '#fff');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(w.x + 26, gy); ctx.quadraticCurveTo(w.x + 4, gy - h * 0.4, w.x - 16, gy - h); ctx.quadraticCurveTo(w.x - 6, gy - h * 0.3, w.x - 30, gy); ctx.closePath(); ctx.fill();
    }

    // joueur (traînée d'esquive puis personnage)
    const lo = this.o.loadout;
    p.trail.forEach((tr, i) => { ctx.globalAlpha = 0.1 + i * 0.05; drawLayjou(ctx, { x: tr.x, y: gy, scale: PSCALE, pose: p.pose, skin: lo.skin, accessory: lo.accessory, t }); });
    ctx.globalAlpha = 1;
    let pose = p.pose;
    if (this.state === 'down') pose = poseOf('ko', t, clamp(p.koT / 0.7));
    const flick = p.hitT > 0 && Math.sin(t * 70) > 0.2;
    ctx.globalAlpha = flick ? 0.55 : 1;
    drawLayjou(ctx, { x: p.x, y: gy, scale: PSCALE, pose, skin: lo.skin, accessory: lo.accessory, weapon: lo.weapon, weaponColor: this.weapon.color, t });
    ctx.globalAlpha = 1;

    // super cœur
    if (this.ult && this.ult.t > 0.45 && this.ult.t < 1.55) {
      const hx = p.x + 6, hy = gy + (-68 + p.pose.rootY) * PSCALE; const [tx, ty] = this.enemyPoint(e.meta.core[0], e.meta.core[1]);
      this.beamLine(ctx, hx, hy, tx, ty, '#ff5c9d', '#ffd0e6', 26 + Math.sin(t * 60) * 5);
      for (let i = 0; i < 4; i++) { const kk = ((t * 2.2 + i / 4) % 1); const x = lerp(hx, tx, kk), y = lerp(hy, ty, kk) + Math.sin(kk * 12 + i) * 8; ctx.globalAlpha = 0.9; heartPath(ctx, x, y, 7); ctx.fillStyle = '#fff'; ctx.fill(); }
      ctx.globalAlpha = 1;
    } else if (this.ult && this.ult.t <= 0.45) {
      const hx = p.x + 6, hy = gy + (-68 + p.pose.rootY) * PSCALE, kk = this.ult.t / 0.45;
      ctx.strokeStyle = '#ff8fc0'; ctx.lineWidth = 3; ctx.globalAlpha = kk; ctx.beginPath(); ctx.arc(hx, hy, 70 * (1 - kk) + 8, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    }

    // projectiles
    for (const q of this.proj) this.drawProj(ctx, q);
    for (const b of this.bolts) this.drawBolt(ctx, b);

    this.fx.draw(ctx);
    this.fx.drawTexts(ctx);
    ctx.restore();
    if (this.fx.flash > 0.01) { ctx.globalAlpha = Math.min(0.6, this.fx.flash); ctx.fillStyle = this.fx.flashColor; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    // bandeau d'intro boss
    if (this.state === 'intro' && e.spec.boss && this.stateT < 1.5) {
      const kk = arc(clamp(this.stateT / 1.5)); ctx.globalAlpha = Math.min(1, kk * 2);
      ctx.fillStyle = 'rgba(11,8,40,0.72)'; ctx.fillRect(0, H * 0.3 - 30, W, 64);
      ctx.fillStyle = '#ff4f6b'; ctx.fillRect(0, H * 0.3 - 30, W, 3); ctx.fillRect(0, H * 0.3 + 31, W, 3);
      ctx.font = '700 15px "Fredoka Variable", system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffb3c0'; ctx.fillText('⚠  BOSS  ⚠', W / 2, H * 0.3 - 8);
      ctx.font = '700 26px "Fredoka Variable", system-ui'; ctx.fillStyle = '#fff'; ctx.fillText(e.spec.name, W / 2, H * 0.3 + 20); ctx.globalAlpha = 1;
    }
  }

  drawEnemyOverlays(ctx) {
    const e = this.e, t = this.t;
    const [hx, hy] = this.enemyPoint(-10, -e.meta.h - 26);
    // icône de télégraphe + anneau de timing
    if (e.state === 'windup' && e.atk) {
      const block = e.atk.block, col = block ? '#ffd24a' : '#ff4f6b';
      const y = Math.max(hy, this.gy - 330);
      ctx.save(); ctx.translate(hx, y); const pop = easeBack(clamp(e.wind * 5)); ctx.scale(pop, pop);
      ctx.beginPath(); ctx.arc(0, 0, 21, 0, TAU); ctx.fillStyle = 'rgba(11,14,48,0.85)'; ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 3.5; ctx.stroke();
      ctx.lineWidth = 4; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(0, 0, 21 + 22 * (1 - e.wind), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = col;
      if (block) { ctx.beginPath(); ctx.moveTo(0, -12); ctx.quadraticCurveTo(8, -8, 11, -8); ctx.quadraticCurveTo(11, 6, 0, 13); ctx.quadraticCurveTo(-11, 6, -11, -8); ctx.quadraticCurveTo(-8, -8, 0, -12); ctx.closePath(); ctx.fill(); }
      else { for (const dx of [-7, 3]) { ctx.beginPath(); ctx.moveTo(dx + 8, -9); ctx.lineTo(dx - 3, 0); ctx.lineTo(dx + 8, 9); ctx.lineTo(dx + 4, 0); ctx.closePath(); ctx.fill(); } }
      ctx.restore();
    }
    if (e.state === 'stunned') {
      for (let i = 0; i < 3; i++) { const a = t * 4 + i * 2.1; ctx.save(); ctx.translate(hx + Math.cos(a) * 34, hy + 18 + Math.sin(a) * 9); ctx.rotate(a); starPath(ctx, 0, 0, 9, 4, 5); ctx.fillStyle = '#ffe14a'; ctx.fill(); ctx.restore(); }
    }
    if (e.burnT > 0) { for (let i = 0; i < 3; i++) { const [bx, by] = this.enemyPoint(Math.sin(t * 3 + i * 2) * 40, -e.meta.h * (0.3 + 0.25 * i)); ctx.globalAlpha = 0.6; ctx.fillStyle = '#7dff5a'; ctx.beginPath(); ctx.arc(bx, by - ((t * 40 + i * 20) % 30), 5 - ((t * 5 + i) % 3), 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; }
    // point faible
    if (this.weak && this.state === 'fight') {
      const [wx, wy] = this.enemyPoint(...e.meta.weak[this.weak.i]); const k = this.weak.t / this.weak.dur, pulse = 1 + Math.sin(t * 14) * 0.08, inK = easeBack(clamp(this.weak.t * 6));
      ctx.save(); ctx.translate(wx, wy); ctx.scale(pulse * inK, pulse * inK);
      ctx.globalAlpha = 0.35; ctx.fillStyle = '#ffe14a'; ctx.beginPath(); ctx.arc(0, 0, 26, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(0, 0, 19, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 26, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - k)); ctx.stroke();
      ctx.rotate(t * 2); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(24, 0); ctx.stroke(); }
      ctx.fillStyle = '#ff5c9d'; ctx.beginPath(); ctx.arc(0, 0, 5.5, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  beamLine(ctx, x0, y0, x1, y1, col, core, w) {
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.35; ctx.strokeStyle = col; ctx.lineWidth = w * 1.8; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.globalAlpha = 0.9; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.globalAlpha = 1; ctx.strokeStyle = core; ctx.lineWidth = w * 0.42; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.fillStyle = core; ctx.beginPath(); ctx.arc(x1, y1, w * 0.9, 0, TAU); ctx.fill();
  }

  drawProj(ctx, q) {
    const t = this.t;
    if (q.from === 'e') {
      const g = ctx.createRadialGradient(q.x, q.y, 1, q.x, q.y, 16); g.addColorStop(0, '#fff'); g.addColorStop(0.4, q.color); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y, 16, 0, TAU); ctx.fill();
      ctx.fillStyle = q.color; ctx.beginPath(); ctx.arc(q.x, q.y, 8, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(q.x - 2, q.y - 2, 3, 0, TAU); ctx.fill();
      return;
    }
    const ang = Math.atan2(q.ty - q.sy, q.tx - q.sx);
    ctx.save(); ctx.translate(q.x, q.y);
    if (q.kind === 'boomerang') { ctx.translate(-14, 4); drawWeapon(ctx, 'boomerang', t * 12); }
    else if (q.kind === 'rocket') {
      ctx.rotate(ang); ctx.fillStyle = '#ffd24a'; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.moveTo(-14, -5); ctx.lineTo(-34 - rand(0, 10), 0); ctx.lineTo(-14, 5); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = '#f4f7ff'; ctx.beginPath(); ctx.roundRect(-14, -6, 22, 12, 4); ctx.fill(); ctx.fillStyle = '#ff4f4f'; ctx.beginPath(); ctx.moveTo(8, -6); ctx.quadraticCurveTo(22, 0, 8, 6); ctx.closePath(); ctx.fill();
    } else if (q.kind === 'plasma') {
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 18); g.addColorStop(0, '#fff'); g.addColorStop(0.45, '#7dff5a'); g.addColorStop(1, 'rgba(125,255,90,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 18, 0, TAU); ctx.fill();
    } else { // blaster : cœur d'énergie
      ctx.rotate(ang); ctx.globalAlpha = 0.5; ctx.fillStyle = q.color; ctx.beginPath(); ctx.ellipse(-12, 0, 20, 6, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      ctx.rotate(-ang); heartPath(ctx, 0, 0, 9); ctx.fillStyle = q.color; ctx.fill(); heartPath(ctx, 0, -0.5, 5); ctx.fillStyle = '#fff'; ctx.fill();
    }
    ctx.restore();
  }

  drawBolt(ctx, b) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [w, c, a] of [[9, b.color, 0.45], [4, '#fff', 1]]) {
      ctx.globalAlpha = a * clamp(b.t / 0.12); ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(b.x0, b.y0);
      for (let i = 1; i < 7; i++) { const k = i / 7; ctx.lineTo(lerp(b.x0, b.x1, k) + rand(-12, 12), lerp(b.y0, b.y1, k) + rand(-14, 14)); }
      ctx.lineTo(b.x1, b.y1); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}
