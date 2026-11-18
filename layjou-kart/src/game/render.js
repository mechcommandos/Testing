/* ------------------------------------------------------------------ *
 *  Layjou Kart — rendu pseudo-3D (route projetée segment par segment).
 *
 *  1. ciel + fonds en parallaxe
 *  2. route : du plus proche au plus lointain, avec découpe des collines
 *  3. décors, objets, karts : du plus lointain au plus proche
 *  4. effets écran (particules, lignes de vitesse, flash)
 * ------------------------------------------------------------------ */
import { TAU, clamp, lerp, shade, hsl } from '../core/util.js';
import { SEG, ROAD } from './track.js';
import { sprite, paintLayer, paintSky } from './scenery.js';
import { drawKartRear, drawLayjouRear, flame, playerKartPal, exhaustOf, skinDef, starPath } from './kart-art.js';
import { resolvePal, heartPath } from './layjou.js';
import { MAXV } from './race.js';
import { ITEMS } from './data.js';

const CAMH = 3100, CAMD = 2500, TUNNEL_H = 3900;
const KART_K = 920 / 120;     // unités monde par unité de dessin du kart
const FOG_STEPS = 16;

function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
  const g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
  const bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
  return `rgb(${r},${g},${bl})`;
}
const hex = (c) => (c[0] === '#' ? c : '#' + c.match(/\d+/g).slice(0, 3).map((v) => Number(v).toString(16).padStart(2, '0')).join(''));
const circle = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, Math.max(0.01, r), 0, TAU); };

export class Renderer {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.W = 1; this.H = 1; this.dpr = 1; this.quality = 1;
    this.camX = 0; this.bgOff = 0; this.fovK = 1; this.draw_ = 230;
    this.touched = [];
  }

  /** Taille en pixels CSS et densité de rendu. */
  resize(cssW, cssH, quality = 1) {
    this.quality = quality;
    const dpr = Math.min(window.devicePixelRatio || 1, quality >= 1 ? 2 : 1.25);
    const k = Math.min(dpr, (quality >= 1 ? 820 : 560) / cssW);
    this.dpr = k;
    this.cv.width = Math.round(cssW * k); this.cv.height = Math.round(cssH * k);
    this.cv.style.width = cssW + 'px'; this.cv.style.height = cssH + 'px';
    this.W = this.cv.width; this.H = this.cv.height;
    this.draw_ = quality >= 1 ? 230 : 160;
    this.horizon = Math.round(this.H * 0.4);
    this.F = (this.H * 0.82 - this.horizon) * CAMD / CAMH;
    if (this.race) this.prepare(this.race);
  }

  /** Pré-calculs liés au circuit (couleurs avec brouillard, ciel, fonds). */
  prepare(race) {
    this.race = race;
    const th = race.track.theme, wid = race.track.world.id;
    this.theme = th;
    const fogged = (c) => Array.from({ length: FOG_STEPS }, (_, i) => mix(hex(c), th.fog, (i / (FOG_STEPS - 1)) * 0.9));
    this.C = {
      grass: [fogged(th.grass[0]), fogged(th.grass[1])], road: [fogged(th.road[0]), fogged(th.road[1])],
      roadT: [fogged(shade(th.road[0], -0.4)), fogged(shade(th.road[1], -0.4))], floorT: fogged(shade(th.tunnel, -0.2)),
      rumble: [fogged(th.rumble[0]), fogged(th.rumble[1])], lane: fogged(th.lane), edge: th.edge ? fogged(th.edge) : null,
      wall: fogged(th.tunnel), wallD: fogged(shade(th.tunnel, -0.25)), ceil: fogged(shade(th.tunnel, -0.45)),
    };
    this.sky = paintSky(th, this.W, this.H, this.horizon);
    this.far = paintLayer(th, wid, 'far', Math.round(this.W * 2), Math.round(this.H * 0.16));
    this.near = paintLayer(th, wid, 'near', Math.round(this.W * 2), Math.round(this.H * 0.12));
    this.map = this.paintMap(race.track.map);
  }

  paintMap(pts) {
    const s = Math.round(this.W * 0.24), c = document.createElement('canvas'); c.width = s; c.height = s;
    const g = c.getContext('2d'), pad = s * 0.1, k = s - pad * 2;
    g.lineJoin = 'round'; g.lineCap = 'round';
    const path = () => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(pad + x * k, pad + y * k) : g.moveTo(pad + x * k, pad + y * k))); g.closePath(); };
    path(); g.strokeStyle = 'rgba(10,6,40,.55)'; g.lineWidth = s * 0.075; g.stroke();
    path(); g.strokeStyle = '#ffffff'; g.lineWidth = s * 0.04; g.stroke();
    const [x0, y0] = pts[Math.floor(pts.length * 0.012)];
    g.fillStyle = '#ffd24a'; g.fillRect(pad + x0 * k - s * 0.03, pad + y0 * k - s * 0.012, s * 0.06, s * 0.024);
    this.mapPad = pad; this.mapK = k; this.mapS = s;
    return c;
  }

  /* ================================== frame ================================== */
  draw(race, dt, fx, opts = {}) {
    const ctx = this.ctx, W = this.W, H = this.H, segs = race.track.segments, N = segs.length, L = race.L;
    const p = race.player, C = this.C, th = this.theme;
    const pz = race.zOf(p);
    // champ de vision : léger élargissement pendant les turbos
    this.fovK = lerp(this.fovK, p.boostT > 0 || p.starT > 0 ? 0.88 : 1, Math.min(1, dt * 4));
    const F = this.F * this.fovK;
    const camZ = ((pz - CAMD) % L + L) % L;
    const base = Math.floor(camZ / SEG) % N, basePct = (camZ % SEG) / SEG;
    const pIdx = Math.floor(pz / SEG) % N, pPct = (pz % SEG) / SEG, pSeg = segs[pIdx];
    const playerY = lerp(pSeg.y1, pSeg.y2, pPct);
    const camY = playerY + CAMH + p.airH * 0.25;
    this.camX = lerp(this.camX, p.x * ROAD * 0.82, Math.min(1, dt * 7));
    const camX = this.camX;
    this.bgOff += pSeg.curve * (p.speed * dt / SEG) * 0.0016;

    let sx = 0, sy = 0;
    if (fx.shake > 0) { sx = (Math.random() - 0.5) * fx.shake * 18 * this.dpr; sy = (Math.random() - 0.5) * fx.shake * 18 * this.dpr; }
    ctx.setTransform(1, 0, 0, 1, sx, sy);

    // 1. ciel et fonds
    ctx.drawImage(this.sky, 0, 0);
    const hy = this.horizon + clamp(playerY * F / CAMD * 0.02, -H * 0.05, H * 0.05);
    this.layer(this.far, this.bgOff * 0.5, hy - this.far.height + H * 0.01);
    this.layer(this.near, this.bgOff, hy - this.near.height + H * 0.02);
    ctx.fillStyle = C.grass[0][FOG_STEPS - 1]; ctx.fillRect(0, hy + H * 0.015, W, H);

    // 2. route
    for (const s of this.touched) { s.cars.length = 0; s.objs = null; }
    this.touched.length = 0;
    const D = this.draw_;
    let x = 0, dx = -segs[base].curve * basePct, maxy = H;
    for (let n = 0; n < D; n++) {
      const seg = segs[(base + n) % N];
      const loop = (base + n) >= N ? L : 0;
      const dz1 = seg.z1 + loop - camZ, dz2 = seg.z2 + loop - camZ;
      seg.n = n; seg.vis = false; seg.clip = maxy;
      seg.fog = Math.min(FOG_STEPS - 1, Math.floor((1 - Math.exp(-Math.pow(n / D, 2) * 4.2)) * FOG_STEPS));
      const s1 = F / Math.max(1, dz1), s2 = F / Math.max(1, dz2);
      seg.ss1 = s1; seg.ss2 = s2;
      seg.sx1 = W / 2 + (x - camX) * s1; seg.sy1 = hy + (camY - seg.y1) * s1; seg.sw1 = ROAD * s1;
      seg.sx2 = W / 2 + (x + dx - camX) * s2; seg.sy2 = hy + (camY - seg.y2) * s2; seg.sw2 = ROAD * s2;
      x += dx; dx += seg.curve;
      if (dz1 <= 40 || seg.sy2 >= seg.sy1 || seg.sy2 >= maxy) continue;
      seg.vis = true;
      this.segment(seg, maxy);
      maxy = Math.min(maxy, seg.sy2);
    }

    // 3. objets : rangement par segment
    const bucket = (z, obj) => { const s = segs[Math.floor(z / SEG) % N]; if (!s.objs) { s.objs = []; this.touched.push(s); } else if (!this.touched.includes(s)) this.touched.push(s); s.objs.push(obj); obj._pct = (z % SEG) / SEG; };
    for (const r of race.racers) { const z = race.zOf(r); const s = segs[Math.floor(z / SEG) % N]; s.cars.push(r); r._pct = (z % SEG) / SEG; if (!this.touched.includes(s)) this.touched.push(s); }
    for (const pr of race.projectiles) bucket(pr.z, { kind: 'proj', o: pr });
    for (const h of race.hazards) bucket(h.z, { kind: 'haz', o: h });
    for (const b of race.blasts) bucket(((b.z % L) + L) % L, { kind: 'blast', o: b });

    this.pN = (pIdx - base + N) % N;
    for (let n = D - 1; n > 0; n--) {
      const seg = segs[(base + n) % N];
      if (seg.tunnel) this.tunnel(seg, n);
      if (seg.portal) this.portal(seg);
      if (seg.sprites.length) this.roadside(seg);
      if (seg.items.length) this.items(seg, race.time);
      if (seg.objs) for (const ob of seg.objs) this.object(seg, ob, race.time);
      if (seg.cars.length) {
        if (seg.cars.length > 1) seg.cars.sort((a, b) => b._pct - a._pct);
        for (const r of seg.cars) (r.isPlayer ? this.player(seg, r, race, fx) : this.rival(seg, r, race));
      }
    }
    ctx.globalAlpha = 1;

    // 4. effets écran
    this.screenFx(race, fx, dt);
    if (opts.minimap !== false) this.minimap(race);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  layer(img, off, y) {
    const w = img.width, o = ((off * w) % w + w) % w;
    this.ctx.drawImage(img, -o, y); this.ctx.drawImage(img, w - o, y);
  }

  poly(x1, y1, x2, y2, x3, y3, x4, y4, c) {
    const ctx = this.ctx; ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.lineTo(x4, y4); ctx.closePath(); ctx.fill();
  }

  segment(seg, maxy) {
    const ctx = this.ctx, C = this.C, f = seg.fog, W = this.W;
    let { sx1: x1, sy1: y1, sw1: w1 } = seg;
    const { sx2: x2, sy2: y2, sw2: w2 } = seg;
    if (y1 > maxy) { const t = (maxy - y2) / (y1 - y2); x1 = x2 + (x1 - x2) * t; w1 = w2 + (w1 - w2) * t; y1 = maxy; }
    const d = seg.dark ? 1 : 0;
    ctx.fillStyle = seg.tunnel ? C.floorT[f] : C.grass[d][f]; ctx.fillRect(0, y2, W, y1 - y2 + 1);
    const r1 = w1 * 0.13, r2 = w2 * 0.13;
    const rc = C.rumble[d][f];
    this.poly(x1 - w1 - r1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - r2, y2, rc);
    this.poly(x1 + w1 + r1, y1, x1 + w1, y1, x2 + w2, y2, x2 + w2 + r2, y2, rc);
    this.poly(x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2, seg.tunnel ? C.roadT[d][f] : C.road[d][f]);
    if (C.edge) { const e1 = w1 * 0.02, e2 = w2 * 0.02; this.poly(x1 - w1, y1, x1 - w1 + e1, y1, x2 - w2 + e2, y2, x2 - w2, y2, C.edge[f]); this.poly(x1 + w1, y1, x1 + w1 - e1, y1, x2 + w2 - e2, y2, x2 + w2, y2, C.edge[f]); }
    if (!seg.dark) for (const l of [-0.333, 0.333]) { const a1 = w1 * 0.016, a2 = w2 * 0.016; this.poly(x1 + l * w1 - a1, y1, x1 + l * w1 + a1, y1, x2 + l * w2 + a2, y2, x2 + l * w2 - a2, y2, C.lane[f]); }
    if (seg.start) {
      const cols = 10, rows = 2;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        if ((i + j + seg.i) % 2) continue;
        const ta = j / rows, tb = (j + 1) / rows;
        const ya = lerp(y1, y2, ta), yb = lerp(y1, y2, tb), xa = lerp(x1, x2, ta), xb = lerp(x1, x2, tb), wa = lerp(w1, w2, ta), wb = lerp(w1, w2, tb);
        const u0 = -1 + (2 * i) / cols, u1 = -1 + (2 * (i + 1)) / cols;
        this.poly(xa + u0 * wa, ya, xa + u1 * wa, ya, xb + u1 * wb, yb, xb + u0 * wb, yb, '#ffffff');
      }
    }
    if (seg.boost !== null && seg.boost !== undefined) {
      const c = seg.boost, bw = 0.34;
      this.poly(x1 + (c - bw) * w1, y1, x1 + (c + bw) * w1, y1, x2 + (c + bw) * w2, y2, x2 + (c - bw) * w2, y2, seg.i % 2 ? '#ffd24a' : '#ff8fbf');
      if (seg.i % 2 === 0) { const ym = (y1 + y2) / 2; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x1 + (c - bw * 0.6) * w1, y1); ctx.lineTo((x1 + x2) / 2 + c * (w1 + w2) / 2, ym - (y1 - y2) * 0.3); ctx.lineTo(x1 + (c + bw * 0.6) * w1, y1); ctx.closePath(); ctx.fill(); }
    }
    if (seg.ramp || seg.jump) this.poly(x1 - w1 * 0.9, y1, x1 + w1 * 0.9, y1, x2 + w2 * 0.9, y2, x2 - w2 * 0.9, y2, seg.i % 2 ? '#ffd24a' : '#2b2440');
  }

  /* ------------------------------- tunnels ------------------------------- */
  tunnel(seg, n) {
    if (!seg.vis && seg.sy1 < 0) return;
    const C = this.C, f = seg.fog;
    const { sx1: x1, sy1: y1, sw1: w1, sx2: x2, sy2: y2, sw2: w2, ss1, ss2 } = seg;
    if (seg.ss1 <= 0) return;
    const c1 = y1 - TUNNEL_H * ss1, c2 = y2 - TUNNEL_H * ss2;
    const l1 = x1 - w1 * 1.3, l2 = x2 - w2 * 1.3, r1 = x1 + w1 * 1.3, r2 = x2 + w2 * 1.3;
    this.poly(l1, y1, l1, c1, l2, c2, l2, y2, seg.dark ? C.wallD[f] : C.wall[f]);
    this.poly(r1, y1, r1, c1, r2, c2, r2, y2, seg.dark ? C.wallD[f] : C.wall[f]);
    this.poly(l1, c1, r1, c1, r2, c2, l2, c2, C.ceil[f]);
    // néons
    if (seg.i % 6 === 0) {
      const ctx = this.ctx;
      ctx.strokeStyle = this.theme.ring; ctx.lineWidth = Math.max(1, 70 * ss1); ctx.globalAlpha = 1 - f / FOG_STEPS;
      ctx.beginPath(); ctx.moveTo(l1, y1); ctx.lineTo(l1, c1 + w1 * 0.25); ctx.quadraticCurveTo(l1, c1, l1 + w1 * 0.25, c1); ctx.lineTo(r1 - w1 * 0.25, c1); ctx.quadraticCurveTo(r1, c1, r1, c1 + w1 * 0.25); ctx.lineTo(r1, y1); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (n < 3) return;
  }

  portal(seg) {
    const ctx = this.ctx, { sx1: x, sy1: y, sw1: w, ss1: s } = seg;
    if (s <= 0 || !isFinite(y)) return;
    const top = y - TUNNEL_H * s, l = x - w * 1.3, r = x + w * 1.3;
    ctx.fillStyle = shade(this.theme.tunnel, 0.12);
    ctx.beginPath(); ctx.rect(x - w * 5, top - TUNNEL_H * s * 0.9, w * 10, y - top + TUNNEL_H * s * 0.9);
    ctx.moveTo(l, y); ctx.lineTo(l, top); ctx.lineTo(r, top); ctx.lineTo(r, y); ctx.closePath();
    ctx.fill('evenodd');
    ctx.strokeStyle = this.theme.ring; ctx.lineWidth = Math.max(2, 120 * s); ctx.strokeRect(l, top, r - l, y - top);
    // bandeau
    ctx.fillStyle = '#ffd24a'; for (let i = 0; i < 10; i++) if (i % 2 === 0) ctx.fillRect(l + (r - l) * i / 10, top - 260 * s, (r - l) / 10, 160 * s);
  }

  /* ------------------------------- décors ------------------------------- */
  roadside(seg) {
    const ctx = this.ctx, th = this.theme;
    const alpha = seg.n > this.draw_ * 0.82 ? (this.draw_ - seg.n) / (this.draw_ * 0.18) : 1;
    for (const s of seg.sprites) {
      const spr = sprite(s.kind, th);
      const sc = seg.ss1, dw = spr.ww * sc, dh = spr.wh * sc;
      if (dw < 1.2) continue;
      const x = seg.sx1 + s.x * seg.sw1, y = seg.sy1;
      if (x + dw / 2 < 0 || x - dw / 2 > this.W) continue;
      const top = y - dh;
      const visH = Math.min(dh, seg.clip - top);
      if (visH <= 0) continue;
      ctx.globalAlpha = alpha;
      const sh = spr.img.height * (visH / dh);
      if (s.flip) { ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(spr.img, 0, 0, spr.img.width, sh, -dw / 2, top, dw, visH); ctx.restore(); }
      else ctx.drawImage(spr.img, 0, 0, spr.img.width, sh, x - dw / 2, top, dw, visH);
    }
    ctx.globalAlpha = 1;
  }

  at(seg, pct, xr) {
    const sc = lerp(seg.ss1, seg.ss2, pct);
    return { x: lerp(seg.sx1, seg.sx2, pct) + xr * lerp(seg.sw1, seg.sw2, pct), y: lerp(seg.sy1, seg.sy2, pct), s: sc };
  }

  items(seg, t) {
    const ctx = this.ctx;
    for (const it of seg.items) {
      if (!it.alive) continue;
      const q = this.at(seg, 0.5, it.x);
      if (q.y > seg.clip + 2) continue;
      if (it.type === 'coin') {
        const r = 120 * q.s; if (r < 0.8) continue;
        const y = q.y - 200 * q.s, wv = Math.abs(Math.cos(t * 4 + it.x * 3));
        ctx.save(); ctx.translate(q.x, y); ctx.scale(Math.max(0.15, wv), 1);
        circle(ctx, 0, 0, r); ctx.fillStyle = '#e0920a'; ctx.fill();
        circle(ctx, 0, 0, r * 0.84); ctx.fillStyle = '#ffd24a'; ctx.fill();
        heartPath(ctx, 0, 0, r * 0.38); ctx.fillStyle = '#ffb21f'; ctx.fill();
        ctx.globalAlpha = 0.7; circle(ctx, -r * 0.35, -r * 0.35, r * 0.2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.globalAlpha = 1;
        ctx.restore();
      } else {
        const s = 230 * q.s; if (s < 1) continue;
        const y = q.y - 380 * q.s + Math.sin(t * 3 + it.x * 4) * 30 * q.s;
        ctx.save(); ctx.translate(q.x, y); ctx.rotate(Math.sin(t * 1.7 + it.x) * 0.3);
        ctx.fillStyle = hsl(t * 90 + it.x * 120, 90, 70, 0.85);
        ctx.beginPath(); ctx.roundRect(-s, -s, s * 2, s * 2, s * 0.35); ctx.fill();
        ctx.lineWidth = Math.max(1, s * 0.14); ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.stroke();
        ctx.globalAlpha = 0.5; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(-s * 0.75, -s * 0.8, s * 0.7, s * 0.35, s * 0.15); ctx.fill(); ctx.globalAlpha = 1;
        heartPath(ctx, 0, s * 0.05, s * 0.5); ctx.fillStyle = '#fff'; ctx.fill();
        ctx.restore();
      }
    }
  }

  object(seg, ob, t) {
    const ctx = this.ctx, o = ob.o, q = this.at(seg, ob._pct, o.x);
    if (q.s <= 0) return;
    if (ob.kind === 'haz') {
      const w = 340 * q.s, hgt = w * 0.32, y = q.y - (o.fly > 0 ? Math.sin((1 - o.fly / 0.35) * Math.PI) * 900 * q.s : 0);
      ctx.fillStyle = 'rgba(70,20,140,.35)'; ctx.beginPath(); ctx.ellipse(q.x, q.y, w * 1.05, hgt * 1.05, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#9b5cff'; ctx.beginPath(); ctx.ellipse(q.x, y - hgt * 0.2, w, hgt, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#c9a6ff'; ctx.beginPath(); ctx.ellipse(q.x - w * 0.25, y - hgt * 0.45, w * 0.35, hgt * 0.3, 0, 0, TAU); ctx.fill();
      for (let i = 0; i < 3; i++) { circle(ctx, q.x + (i - 1) * w * 0.45, y - hgt * (0.8 + 0.4 * Math.sin(t * 4 + i)), w * 0.08); ctx.fillStyle = '#e1c9ff'; ctx.fill(); }
      // yeux de Gloupy
      for (const s of [-1, 1]) { circle(ctx, q.x + s * w * 0.22, y - hgt * 0.9, w * 0.11); ctx.fillStyle = '#fff'; ctx.fill(); circle(ctx, q.x + s * w * 0.2, y - hgt * 0.85, w * 0.05); ctx.fillStyle = '#1a1d38'; ctx.fill(); }
      return;
    }
    if (ob.kind === 'blast') {
      const k = o.t / 0.9, y = q.y - 300 * q.s;
      if (o.type === 'boom') {
        const r = (400 + 900 * k) * q.s;
        ctx.globalAlpha = 1 - k; ctx.fillStyle = `rgba(255,${Math.round(200 - 120 * k)},60,1)`; circle(ctx, q.x, y, r); ctx.fill();
        ctx.fillStyle = '#fff6c2'; circle(ctx, q.x, y, r * 0.5 * (1 - k)); ctx.fill(); ctx.globalAlpha = 1;
      } else if (o.type === 'quake') {
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#ff9a3d'; ctx.lineWidth = Math.max(2, 120 * q.s);
        ctx.beginPath(); ctx.ellipse(q.x, q.y, (600 + 4000 * k) * q.s, (200 + 1300 * k) * q.s, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
      } else {
        const col = o.type === 'splash' ? '#b58cff' : o.type === 'box' ? hsl(o.t * 600, 90, 70) : '#ffd24a';
        ctx.globalAlpha = 1 - k; ctx.fillStyle = col;
        for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU, r = (100 + 700 * k) * q.s; ctx.save(); ctx.translate(q.x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7); starPath(ctx, 0, 0, 90 * q.s, 36 * q.s, 4); ctx.fill(); ctx.restore(); }
        ctx.globalAlpha = 1;
      }
      return;
    }
    // projectiles
    const s = q.s, y = q.y - 300 * s;
    if (s * 200 < 0.8) return;
    ctx.save(); ctx.translate(q.x, y);
    switch (o.type) {
      case 'heart': case 'heartshot': {
        const r = (o.type === 'heart' ? 170 : 120) * s;
        ctx.globalAlpha = 0.4; circle(ctx, 0, 0, r * 1.8); ctx.fillStyle = '#ff8fbf'; ctx.fill(); ctx.globalAlpha = 1;
        heartPath(ctx, 0, 0, r); ctx.fillStyle = '#ff5c9d'; ctx.fill(); ctx.lineWidth = Math.max(1, r * 0.18); ctx.strokeStyle = '#fff'; ctx.stroke();
        break;
      }
      case 'bolt': { ctx.fillStyle = '#39e4ff'; ctx.globalAlpha = 0.4; circle(ctx, 0, 0, 200 * s); ctx.fill(); ctx.globalAlpha = 1; ctx.fillStyle = '#e9fdff'; ctx.beginPath(); ctx.ellipse(0, 0, 70 * s, 140 * s, 0, 0, TAU); ctx.fill(); break; }
      case 'bomb': {
        const arcY = -Math.sin(Math.min(1, o.t / o.life) * Math.PI) * 900 * s;
        ctx.translate(0, arcY); circle(ctx, 0, 0, 170 * s); ctx.fillStyle = '#2b2f55'; ctx.fill(); circle(ctx, -50 * s, -50 * s, 50 * s); ctx.fillStyle = '#6a72b8'; ctx.fill();
        ctx.strokeStyle = '#ff9a3d'; ctx.lineWidth = Math.max(1, 30 * s); ctx.beginPath(); ctx.moveTo(0, -170 * s); ctx.quadraticCurveTo(60 * s, -260 * s, 90 * s, -230 * s); ctx.stroke();
        circle(ctx, 90 * s, -230 * s, 40 * s * (1 + Math.random())); ctx.fillStyle = '#ffd24a'; ctx.fill();
        break;
      }
      case 'boomerang': { ctx.rotate(o.spin || 0); starPath(ctx, 0, 0, 220 * s, 95 * s, 4); ctx.fillStyle = '#ffd24a'; ctx.fill(); ctx.strokeStyle = '#e08a00'; ctx.lineWidth = Math.max(1, 25 * s); ctx.stroke(); circle(ctx, 0, 0, 45 * s); ctx.fillStyle = '#ff5c9d'; ctx.fill(); break; }
      case 'rocket': {
        ctx.fillStyle = '#ff4f4f'; ctx.beginPath(); ctx.roundRect(-70 * s, -150 * s, 140 * s, 260 * s, 60 * s); ctx.fill();
        ctx.fillStyle = '#fff'; circle(ctx, 0, -40 * s, 40 * s); ctx.fill();
        flame(ctx, 0, 110 * s, s * 8, 3, t);
        break;
      }
      case 'plasma': { const r = 230 * s * (1 + 0.1 * Math.sin(t * 20)); ctx.fillStyle = 'rgba(125,255,90,.35)'; circle(ctx, 0, 0, r * 1.6); ctx.fill(); ctx.fillStyle = '#7dff5a'; circle(ctx, 0, 0, r); ctx.fill(); ctx.fillStyle = '#eaffe0'; circle(ctx, -r * 0.3, -r * 0.3, r * 0.35); ctx.fill(); break; }
      default:
    }
    ctx.restore();
  }

  /* ---------------------------------- karts ---------------------------------- */
  kartTransform(seg, r) {
    const q = this.at(seg, r._pct, r.x);
    const k = KART_K * q.s;
    return { x: q.x, y: q.y - (r.airH || 0) * q.s, k, s: q.s };
  }

  rival(seg, r, race) {
    const spr = r.sprites; if (!spr) return;
    const T = this.kartTransform(seg, r), ctx = this.ctx;
    if (T.k * 120 < 2) return;
    const fr = r.steerVis < -0.33 ? 0 : r.steerVis > 0.33 ? 2 : 1;
    const img = spr.frames[fr][Math.floor(race.time * 9 + r.ai.wobble) % 2];
    if (!img) return;
    const dw = spr.w * T.k, dh = spr.h * T.k;
    const top = T.y - spr.oy * T.k + r.bounce * T.k;
    const visH = Math.min(dh, seg.clip - top);
    if (visH <= 0) return;
    // rivaux derrière le joueur (entre la caméra et lui) : translucides pour ne jamais masquer son kart
    const behind = seg.n < this.pN || (seg.n === this.pN && r._pct < race.player._pct);
    if (behind && (this.pN - seg.n > 2 || seg.n < 5)) return;
    ctx.save();
    if (behind) ctx.globalAlpha = 0.45;
    if (r.spinT > 0) { ctx.translate(T.x, T.y); ctx.scale(Math.cos(r.spinT * 13), 1); ctx.translate(-T.x, -T.y); }
    if (r.slowT > 0) { ctx.translate(T.x, T.y); ctx.scale(0.72, 0.72); ctx.translate(-T.x, -T.y); }
    if (r.starT > 0) ctx.filter = `hue-rotate(${Math.round(race.time * 600) % 360}deg) saturate(1.6)`;
    ctx.drawImage(img, 0, 0, img.width, img.height * (visH / dh), T.x - dw / 2, top, dw, visH);
    ctx.filter = 'none';
    if (r.boostT > 0) { ctx.translate(T.x, T.y); ctx.scale(T.k, T.k); for (const [ex, ey, ek] of exhaustOf(spr.shape)) flame(ctx, ex, ey + 4, ek, r.boostLv || 1, race.time); }
    ctx.restore();
    if (behind) return;
    if (r.shieldT > 0 && r.shieldT < 900) this.bubble(T.x, T.y - 70 * T.k, 95 * T.k, race.time);
    // étiquette (rivaux devant le joueur, à distance moyenne)
    if (dw > this.W * 0.08 && seg.n < 70 && seg.n > this.pN + 4) {
      const fs = Math.max(10 * this.dpr, Math.min(14 * this.dpr, dw * 0.09));
      ctx.font = `700 ${fs}px "Fredoka Variable", Fredoka, sans-serif`; ctx.textAlign = 'center';
      const tw = ctx.measureText(r.name).width + fs;
      const ly = top - fs * 0.6;
      ctx.fillStyle = r.boss ? 'rgba(255,43,92,.85)' : 'rgba(20,12,60,.7)'; ctx.beginPath(); ctx.roundRect(T.x - tw / 2, ly - fs, tw, fs * 1.4, fs * 0.7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillText(r.name, T.x, ly);
    }
  }

  bubble(x, y, r, t) {
    const ctx = this.ctx;
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,.05)'); g.addColorStop(0.8, 'rgba(143,245,255,.18)'); g.addColorStop(1, 'rgba(200,250,255,.6)');
    circle(ctx, x, y, r * (1 + Math.sin(t * 6) * 0.02)); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(220,252,255,.8)'; ctx.lineWidth = Math.max(1, r * 0.04); ctx.stroke();
  }

  player(seg, p, race, fx) {
    const ctx = this.ctx, T = this.kartTransform(seg, p), t = race.time;
    const skin = skinDef(p.skin);
    const pal = resolvePal(p.skin, t);
    const kpal = playerKartPal(p.skin, t);
    // ombre au sol pendant les sauts
    if (p.airH > 0) { ctx.globalAlpha = 0.3; ctx.fillStyle = '#100a30'; ctx.beginPath(); ctx.ellipse(T.x, T.y + p.airH * T.s, 70 * T.k, 10 * T.k, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.save();
    ctx.translate(T.x, T.y);
    ctx.scale(T.k, T.k);
    if (p.spinT > 0) { ctx.rotate(Math.sin(p.spinT * 10) * 0.35 * p.spinDir); ctx.scale(Math.cos(p.spinT * 12), 1); }
    if (p.crashT > 0) ctx.rotate(Math.sin(p.crashT * 30) * 0.08);
    if (p.drifting) ctx.rotate(p.drifting * 0.07);
    if (p.trick && p.airT > 0) ctx.rotate(Math.min(1, p.airT / (p.airDur * 0.8)) * TAU * (p.vx >= 0 ? 1 : -1));
    if (p.slowT > 0) ctx.scale(0.75, 0.75);
    if (p.starT > 0) ctx.filter = `hue-rotate(${Math.round(t * 600) % 360}deg) saturate(1.5) brightness(1.1)`;
    const ex = drawKartRear(ctx, {
      shape: p.shape, kpal, steer: p.steerVis, t, spin: p.dist / 260, boost: p.boostT, brake: p.spinT > 0, bounce: p.bounce,
      driver: (c) => drawLayjouRear(c, { pal, t, steer: p.steerVis, accessory: p.accessory, skinDef: skin, wind: clamp(p.speed / MAXV, 0, 1.4) }),
    });
    ctx.filter = 'none';
    if (p.boostT > 0 || p.starT > 0) for (const [x, y, k] of ex) flame(ctx, x, y + 4, k * 1.25, p.starT > 0 ? 4 : p.boostLv || 2, t);
    if (p.saberT > 0) {
      ctx.save(); ctx.translate(0, -60); ctx.rotate(t * 16);
      for (let i = 0; i < 2; i++) { ctx.rotate(Math.PI); ctx.globalAlpha = 0.85; ctx.fillStyle = '#39e4ff'; ctx.beginPath(); ctx.roundRect(10, -6, 110, 12, 6); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(14, -2.5, 100, 5, 2.5); ctx.fill(); }
      ctx.restore(); ctx.globalAlpha = 1;
    }
    ctx.restore();
    if (p.shieldT > 0 && p.shieldT < 900) this.bubble(T.x, T.y - 70 * T.k, 100 * T.k, t);
    if (p.shieldT >= 900) { ctx.globalAlpha = 0.5; this.bubble(T.x, T.y - 70 * T.k, 100 * T.k, t); ctx.globalAlpha = 1; }

    // particules : étincelles de dérapage, poussière, fumée
    const wl = T.x - 54 * T.k, wr = T.x + 54 * T.k, wy = T.y;
    const off = Math.abs(p.x) > 1.06 && p.air <= 0;
    if (p.drifting && p.air <= 0) {
      const cols = ['#ffffff', '#39e4ff', '#ff5c9d', '#ffd24a'][p.driftLv];
      for (const wx of [wl, wr]) for (let i = 0; i < (p.driftLv ? 2 : 1); i++) fx.spawn({ type: 'spark', x: wx, y: wy, vx: (Math.random() - 0.5) * 300 * this.dpr - p.drifting * 120 * this.dpr, vy: -(80 + Math.random() * 260) * this.dpr, g: 900 * this.dpr, life: 0.35, size: (p.driftLv ? 2.6 : 1.6) * this.dpr, color: cols, drag: 0.94 });
    }
    if (off && p.speed > 1500 && Math.random() < 0.6) fx.spawn({ type: 'smoke', x: Math.random() < 0.5 ? wl : wr, y: wy, vx: (Math.random() - 0.5) * 80, vy: -60 * this.dpr, life: 0.5, size: 10 * this.dpr, color: shade(this.theme.grass[0], -0.15) });
    if (p.spinT > 0 && Math.random() < 0.5) fx.spawn({ type: 'smoke', x: T.x, y: wy - 20 * T.k, vx: (Math.random() - 0.5) * 120, vy: -90 * this.dpr, life: 0.6, size: 14 * this.dpr, color: 'rgba(230,230,255,.7)' });
    this.playerScreen = { x: T.x, y: T.y, k: T.k };
  }

  /* ---------------------------------- écran ---------------------------------- */
  screenFx(race, fx, dt) {
    const ctx = this.ctx, W = this.W, H = this.H, p = race.player;
    fx.update(dt); fx.draw(ctx);
    // lignes de vitesse
    const sp = p.speed / MAXV;
    if (p.boostT > 0 || p.starT > 0 || sp > 1.05) {
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2 * this.dpr;
      const cx = W / 2, cy = this.horizon + H * 0.05;
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * TAU, r0 = H * (0.35 + Math.random() * 0.2), r1 = r0 + H * 0.12;
        ctx.globalAlpha = 0.3 + Math.random() * 0.4;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    if (p.starT > 0) { ctx.fillStyle = hsl(race.time * 300, 100, 60, 0.12); ctx.fillRect(0, 0, W, H); }
    if (fx.flash > 0) {
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.75);
      g.addColorStop(0, `rgba(${fx.flashColor},0)`); g.addColorStop(1, `rgba(${fx.flashColor},${0.55 * fx.flash})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
  }

  minimap(race) {
    const ctx = this.ctx, s = this.mapS, x0 = this.W * 0.03, y0 = this.H * 0.135;
    ctx.globalAlpha = 0.92; ctx.drawImage(this.map, x0, y0); ctx.globalAlpha = 1;
    const pts = race.track.map, N = pts.length;
    const dot = (r, col, rad) => {
      const i = Math.floor(race.zOf(r) / SEG) % N, [mx, my] = pts[i];
      circle(ctx, x0 + this.mapPad + mx * this.mapK, y0 + this.mapPad + my * this.mapK, rad); ctx.fillStyle = col; ctx.fill();
      ctx.lineWidth = rad * 0.35; ctx.strokeStyle = '#fff'; ctx.stroke();
    };
    for (const r of race.racers) if (!r.isPlayer) dot(r, r.boss ? '#ff2b5c' : r.rival ? r.rival.kart : '#888', s * 0.032);
    dot(race.player, '#ff5c9d', s * 0.05);
  }
}

export { ITEMS };
