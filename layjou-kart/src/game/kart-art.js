/* ------------------------------------------------------------------ *
 *  Layjou Kart — dessin vectoriel des karts et des pilotes.
 *
 *  Vue arrière (course) : origine au sol entre les roues arrière,
 *  y négatif vers le haut, largeur ≈ 120 unités.
 *  Vue de face (menus) : même repère, Layjou assis au volant.
 *
 *  Les pilotes rivaux sont redessinés de dos à partir des monstres
 *  de Layjou Battle (mêmes palettes, mêmes silhouettes).
 * ------------------------------------------------------------------ */
import { TAU, clamp, shade, hsl } from '../core/util.js';
import { resolvePal, drawLayjou, poseOf, hand, heartPath, starPath, accessoryHead } from './layjou.js';
import { SKINS, ANTI_PAL, MONSTER_PALS, byId } from './data.js';

const circle = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, Math.max(0.01, r), 0, TAU); };
const ell = (ctx, x, y, rx, ry, rot = 0) => { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU); };
const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
const lin = (ctx, x0, y0, x1, y1, stops) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c)); return g; };
const rad = (ctx, x, y, r0, r1, c0, c1) => { const g = ctx.createRadialGradient(x, y, r0, x, y, r1); g.addColorStop(0, c0); g.addColorStop(1, c1); return g; };
const light = (c, k = 0.38) => (c[0] === '#' ? shade(c, k) : c);
const dark = (c, k = 0.3) => (c[0] === '#' ? shade(c, -k) : c);

/** Palette de carrosserie à partir d'une couleur unique (karts des rivaux). */
export function kartPalFromColor(c, accent = '#ffd24a') {
  return { main: c, mainDark: dark(c, 0.32), accent, accentLight: light(accent, 0.4), shell: '#ffffff', shellShade: '#d5e2f3', visor: '#0c3a96' };
}

/* =============================== roues =============================== */

function tire(ctx, x, y, w, h, spin, rim) {
  rr(ctx, x - w / 2, y - h, w, h, Math.min(w, h) * 0.38);
  ctx.fillStyle = lin(ctx, x - w / 2, 0, x + w / 2, 0, ['#14162b', '#3a3f66', '#1b1d36']); ctx.fill();
  ctx.save(); ctx.clip();
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 2.2;
  const step = h / 4.2, off = ((spin * 26) % step + step) % step;
  for (let i = -1; i < 6; i++) { const yy = y - h + off + i * step; ctx.beginPath(); ctx.moveTo(x - w / 2, yy); ctx.lineTo(x + w / 2, yy + 2); ctx.stroke(); }
  ctx.globalAlpha = 0.28; rr(ctx, x - w / 2 + 2, y - h + 2, w * 0.3, h - 4, 4); ctx.fillStyle = '#fff'; ctx.fill(); ctx.globalAlpha = 1;
  ctx.restore();
  if (rim) { rr(ctx, x - w * 0.16, y - h * 0.62, w * 0.32, h * 0.3, 3); ctx.fillStyle = rim; ctx.fill(); }
}

/** Petite roue avant vue de dos / roue arrière vue de face. */
function smallWheel(ctx, x, y, w, h, spin) { tire(ctx, x, y, w, h, spin, null); }

/* ============================ carrosseries (dos) ============================ */

function bodyRear(ctx, shape, P, t, boost) {
  const g = lin(ctx, 0, -66, 0, -10, [light(P.main, 0.25), P.main, P.mainDark]);
  ctx.lineJoin = 'round';
  switch (shape) {
    case 'rocket': {
      // fuseau central + ailerons
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(s * 30, -50); ctx.quadraticCurveTo(s * 66, -40, s * 62, -12); ctx.lineTo(s * 36, -16); ctx.closePath();
        ctx.fillStyle = lin(ctx, s * 30, -50, s * 60, -10, [P.accent, dark(P.accent, 0.25)]); ctx.fill();
      }
      ctx.beginPath(); ctx.moveTo(-40, -14); ctx.bezierCurveTo(-46, -46, -30, -64, 0, -64); ctx.bezierCurveTo(30, -64, 46, -46, 40, -14); ctx.closePath();
      ctx.fillStyle = g; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      for (let i = -3; i < 4; i++) { ctx.beginPath(); ctx.moveTo(i * 22 - 8, -70); ctx.lineTo(i * 22 + 4, -70); ctx.lineTo(i * 22 + 26, 0); ctx.lineTo(i * 22 + 14, 0); ctx.closePath(); ctx.globalAlpha = 0.28; ctx.fill(); }
      ctx.globalAlpha = 1; ctx.restore();
      // tuyère
      circle(ctx, 0, -32, 19); ctx.fillStyle = '#3a3f66'; ctx.fill();
      circle(ctx, 0, -32, 15); ctx.fillStyle = lin(ctx, 0, -47, 0, -17, ['#c9d6f2', '#7c88b0']); ctx.fill();
      circle(ctx, 0, -32, 10); ctx.fillStyle = boost > 0 ? '#fff6c2' : '#1b1d36'; ctx.fill();
      return [[0, -32, 1.6]];
    }
    case 'shark': {
      ctx.beginPath(); ctx.moveTo(-58, -12); ctx.lineTo(-60, -30); ctx.quadraticCurveTo(-54, -50, -26, -54); ctx.lineTo(26, -54); ctx.quadraticCurveTo(54, -50, 60, -30); ctx.lineTo(58, -12); ctx.closePath();
      ctx.fillStyle = g; ctx.fill();
      ctx.save(); ctx.clip(); ell(ctx, 0, -6, 70, 18); ctx.fillStyle = P.shell; ctx.fill(); ctx.restore();
      // ouïes
      ctx.strokeStyle = P.mainDark; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(s * (40 + i * 6), -44); ctx.quadraticCurveTo(s * (37 + i * 6), -36, s * (40 + i * 6), -28); ctx.stroke(); }
      // aileron + dérives
      rr(ctx, -50, -70, 100, 9, 4); ctx.fillStyle = P.mainDark; ctx.fill();
      rr(ctx, -50, -72, 100, 7, 4); ctx.fillStyle = lin(ctx, 0, -72, 0, -65, [light(P.main), P.main]); ctx.fill();
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(s * 44, -64); ctx.lineTo(s * 52, -92); ctx.lineTo(s * 56, -64); ctx.closePath(); ctx.fillStyle = P.mainDark; ctx.fill();
        rr(ctx, s * 24 - 3, -66, 6, 14, 2); ctx.fillStyle = '#2b3566'; ctx.fill();
      }
      for (const s of [-1, 1]) { rr(ctx, s * 12 - 6, -24, 12, 10, 4); ctx.fillStyle = '#c9d6f2'; ctx.fill(); circle(ctx, s * 12, -19, 3.4); ctx.fillStyle = '#1b1d36'; ctx.fill(); }
      return [[-12, -19, 1], [12, -19, 1]];
    }
    case 'buggy': {
      ctx.beginPath(); ctx.moveTo(-48, -14); ctx.lineTo(-50, -40); ctx.lineTo(-36, -56); ctx.lineTo(36, -56); ctx.lineTo(50, -40); ctx.lineTo(48, -14); ctx.closePath();
      ctx.fillStyle = g; ctx.fill();
      rr(ctx, -30, -50, 60, 26, 6); ctx.fillStyle = '#2b3566'; ctx.fill();
      ctx.strokeStyle = '#4a5590'; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-24, -45 + i * 6); ctx.lineTo(24, -45 + i * 6); ctx.stroke(); }
      for (const s of [-1, 1]) { circle(ctx, s * 40, -46, 5); ctx.fillStyle = P.accent; ctx.fill(); }
      circle(ctx, 0, -18, 6); ctx.fillStyle = '#c9d6f2'; ctx.fill(); circle(ctx, 0, -18, 3.4); ctx.fillStyle = '#1b1d36'; ctx.fill();
      return [[0, -18, 1.1]];
    }
    case 'sled': {
      // patins recourbés
      ctx.strokeStyle = '#c9d6f2'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 50, -4); ctx.lineTo(s * 50, -18); ctx.quadraticCurveTo(s * 50, -34, s * 62, -36); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(-46, -14); ctx.bezierCurveTo(-56, -44, -40, -62, 0, -62); ctx.bezierCurveTo(40, -62, 56, -44, 46, -14); ctx.closePath();
      ctx.fillStyle = g; ctx.fill();
      // bordure fourrée
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 9; i++) { const a = Math.PI + (i / 8) * Math.PI; circle(ctx, Math.cos(a) * 44, -36 + Math.sin(a) * 24, 7); ctx.fill(); }
      ctx.save(); ctx.translate(0, -30); ctx.strokeStyle = P.shell; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 10, Math.sin(a) * 10); ctx.stroke(); }
      ctx.restore();
      return [[-22, -18, 0.9], [22, -18, 0.9]];
    }
    case 'glitch': {
      ctx.beginPath(); ctx.moveTo(-54, -12); ctx.lineTo(-58, -34); ctx.lineTo(-40, -58); ctx.lineTo(40, -58); ctx.lineTo(58, -34); ctx.lineTo(54, -12); ctx.closePath();
      ctx.fillStyle = lin(ctx, 0, -60, 0, -10, ['#2a2f55', '#141731']); ctx.fill();
      ctx.strokeStyle = P.main; ctx.lineWidth = 2.4; ctx.shadowColor = P.main; ctx.shadowBlur = 8; ctx.stroke(); ctx.shadowBlur = 0;
      ctx.strokeStyle = P.accent; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-46, -30); ctx.lineTo(-20, -30); ctx.lineTo(-12, -40); ctx.lineTo(12, -40); ctx.lineTo(20, -30); ctx.lineTo(46, -30); ctx.stroke();
      // aileron anguleux
      ctx.beginPath(); ctx.moveTo(-60, -74); ctx.lineTo(60, -74); ctx.lineTo(52, -64); ctx.lineTo(-52, -64); ctx.closePath(); ctx.fillStyle = P.main; ctx.fill();
      for (const s of [-1, 1]) { rr(ctx, s * 30 - 3, -66, 6, 10, 1); ctx.fillStyle = '#141731'; ctx.fill(); }
      const k = Math.floor(t * 7);
      for (let i = 0; i < 3; i++) { const x = ((k * 31 + i * 47) % 90) - 45, y = -54 + ((k * 17 + i * 23) % 36); ctx.fillStyle = i % 2 ? '#ff2bd6' : '#00f0ff'; ctx.globalAlpha = 0.7; ctx.fillRect(x, y, 10 + (i * 5), 3); }
      ctx.globalAlpha = 1;
      for (const s of [-1, 1]) { rr(ctx, s * 14 - 7, -24, 14, 9, 2); ctx.fillStyle = '#c9d6f2'; ctx.fill(); rr(ctx, s * 14 - 4, -22, 8, 5, 1); ctx.fillStyle = '#1b1d36'; ctx.fill(); }
      return [[-14, -20, 1], [14, -20, 1]];
    }
    default: { // 'round' — Bolide Cœur
      ctx.beginPath(); ctx.moveTo(-50, -14); ctx.lineTo(-53, -34); ctx.quadraticCurveTo(-50, -58, -28, -60); ctx.lineTo(28, -60); ctx.quadraticCurveTo(50, -58, 53, -34); ctx.lineTo(50, -14); ctx.closePath();
      ctx.fillStyle = g; ctx.fill();
      ctx.save(); ctx.clip(); rr(ctx, -60, -42, 120, 7, 0); ctx.fillStyle = P.accent; ctx.fill(); ctx.restore();
      rr(ctx, -24, -54, 48, 26, 9); ctx.fillStyle = lin(ctx, 0, -54, 0, -28, [P.shell, P.shellShade]); ctx.fill();
      heartPath(ctx, 0, -42, 7); ctx.fillStyle = P.accent; ctx.fill();
      // becquet
      ctx.beginPath(); ctx.moveTo(-34, -60); ctx.quadraticCurveTo(0, -68, 34, -60); ctx.lineTo(30, -56); ctx.quadraticCurveTo(0, -62, -30, -56); ctx.closePath(); ctx.fillStyle = P.mainDark; ctx.fill();
      for (const s of [-1, 1]) { circle(ctx, s * 13, -19, 5.5); ctx.fillStyle = '#c9d6f2'; ctx.fill(); circle(ctx, s * 13, -19, 3.2); ctx.fillStyle = '#1b1d36'; ctx.fill(); }
      return [[-13, -19, 1], [13, -19, 1]];
    }
  }
}

function taillights(ctx, shape, brake) {
  const pos = shape === 'shark' ? 52 : shape === 'rocket' ? 30 : 42;
  for (const s of [-1, 1]) {
    rr(ctx, s * pos - 6, -36, 12, 7, 3); ctx.fillStyle = brake ? '#ff2b5c' : '#ff6f91'; ctx.fill();
    if (brake) { ctx.globalAlpha = 0.35; circle(ctx, s * pos, -32, 13); ctx.fillStyle = '#ff2b5c'; ctx.fill(); ctx.globalAlpha = 1; }
  }
}

/** Flammes d'échappement. level : 1 cyan · 2 rose · 3 or · 4 prisme (Mode Prisme) */
export function flame(ctx, x, y, k, level, t) {
  const cols = [null, ['#e9fdff', '#39e4ff', 'rgba(57,228,255,0)'], ['#fff0f8', '#ff5c9d', 'rgba(255,92,157,0)'], ['#fffbe0', '#ffc531', 'rgba(255,140,40,0)'], ['#ffffff', hsl(t * 400, 100, 65), 'rgba(255,255,255,0)']][level] || ['#fff7d6', '#ff9a3d', 'rgba(255,90,40,0)'];
  const L = (22 + Math.sin(t * 60) * 5 + Math.random() * 6) * k;
  const g = ctx.createLinearGradient(x, y, x, y + L);
  g.addColorStop(0, cols[0]); g.addColorStop(0.35, cols[1]); g.addColorStop(1, cols[2]);
  ctx.beginPath(); ctx.moveTo(x - 6 * k, y); ctx.quadraticCurveTo(x, y + L * 1.1, x + 6 * k, y); ctx.closePath();
  ctx.fillStyle = g; ctx.fill();
}

/* ============================ pilotes (dos) ============================ */

/** Layjou de dos. Origine : assise (bas du torse). */
export function drawLayjouRear(ctx, o) {
  const pal = o.pal, t = o.t || 0, steer = o.steer || 0, acc = o.accessory || 'none';
  const wind = o.wind ?? 1;
  ctx.save();
  ctx.rotate(steer * 0.08);
  // ailes (dans le dos)
  if (acc === 'wings') {
    const f = Math.sin(t * 9) * 0.12;
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(s * 12, -30); ctx.scale(s, 1); ctx.rotate(-0.15 + f);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(24, -30, 56, -36, 64, -16); ctx.lineTo(50, -9); ctx.lineTo(55, 2); ctx.lineTo(38, 4); ctx.lineTo(40, 14); ctx.quadraticCurveTo(16, 14, 0, 6); ctx.closePath();
      ctx.fillStyle = lin(ctx, 0, -30, 60, 10, ['#ffffff', '#a8f3ff']); ctx.fill(); ctx.strokeStyle = '#39c8e8'; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.restore();
    }
  }
  // bras vers le volant
  for (const s of [-1, 1]) {
    const sx = s * 22, sy = -34, hx = s * 38, hy = -12 - s * steer * 5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = pal.shellShade; ctx.lineWidth = 14.5; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(s * 36, -30, hx, hy); ctx.stroke();
    ctx.strokeStyle = pal.shell; ctx.lineWidth = 12.5; ctx.stroke();
    ctx.setLineDash([6, 7]); ctx.lineCap = 'butt'; ctx.strokeStyle = pal.main; ctx.stroke(); ctx.setLineDash([]);
    circle(ctx, hx, hy, 9); ctx.fillStyle = pal.mainDark; ctx.fill(); circle(ctx, hx, hy - 0.8, 8); ctx.fillStyle = pal.main; ctx.fill();
  }
  // torse
  ell(ctx, 0, -22, 27, 24); ctx.fillStyle = pal.shellShade; ctx.fill();
  ell(ctx, 0, -22.5, 25.6, 22.8); ctx.fillStyle = rad(ctx, -8, -34, 3, 32, pal.shell, pal.shellShade); ctx.fill();
  ctx.save(); ell(ctx, 0, -22.5, 25.6, 22.8); ctx.clip();
  ctx.fillStyle = lin(ctx, 0, -12, 0, 0, [pal.main, pal.mainDark]); ctx.fillRect(-30, -12, 60, 14);
  ctx.restore();
  // bretelles croisées
  ctx.strokeStyle = pal.accent; ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-16, -42); ctx.lineTo(10, -12); ctx.moveTo(16, -42); ctx.lineTo(-10, -12); ctx.stroke();
  circle(ctx, 0, -27, 5); ctx.fillStyle = light(pal.accent, 0.3); ctx.fill();
  // écharpe (autour du cou, pan qui flotte)
  if (acc === 'scarf') {
    const w = Math.sin(t * 9) * 6 * wind;
    ctx.beginPath(); ctx.moveTo(6, -44); ctx.bezierCurveTo(28 + w, -40, 44 - w, -20 + w, 62 + w, -14 - w); ctx.lineTo(58 + w, -2 - w); ctx.bezierCurveTo(40 - w, -10, 24, -30, 2, -38); ctx.closePath();
    ctx.fillStyle = '#ff7a3d'; ctx.fill();
    ell(ctx, 0, -45, 24, 8); ctx.fillStyle = lin(ctx, 0, -53, 0, -37, ['#ffa15a', '#f0531a']); ctx.fill();
  }
  // cou
  ell(ctx, 0, -45, 12, 5); ctx.fillStyle = pal.mainDark; ctx.fill();

  // tête
  ctx.save();
  ctx.translate(0, -86); ctx.rotate(steer * 0.12);
  // antenne
  const sway = Math.sin(t * 5) * 0.08 - steer * 0.25 + Math.sin(t * 13) * 0.04 * wind;
  ctx.save(); ctx.translate(0, -44); ctx.rotate(sway);
  rr(ctx, -2.2, -14, 4.4, 16, 2); ctx.fillStyle = pal.main; ctx.fill();
  circle(ctx, 0, -21, 9.6); ctx.fillStyle = rad(ctx, -3, -24, 1, 10, pal.accentLight, pal.accent); ctx.fill();
  circle(ctx, -2.6, -24.6, 2.6); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.restore();
  // écouteurs
  for (const s of [-1, 1]) {
    circle(ctx, s * 53, 4, 12); ctx.fillStyle = pal.main; ctx.fill();
    ell(ctx, s * 58.5, 4, 5.5, 12); ctx.fillStyle = pal.accent; ctx.fill();
  }
  // casque
  ell(ctx, 0, 0, 54, 47); ctx.fillStyle = pal.shellShade; ctx.fill();
  ell(ctx, 0, -0.6, 52.6, 45.8); ctx.fillStyle = rad(ctx, 14, -18, 6, 64, pal.shell, pal.shellShade); ctx.fill();
  ctx.save(); ell(ctx, 0, -0.6, 52.6, 45.8); ctx.clip();
  ell(ctx, 0, -46, 47, 19); ctx.fillStyle = pal.main; ctx.fill();
  rr(ctx, -7, -44, 14, 90, 7); ctx.fillStyle = pal.main; ctx.globalAlpha = 0.9; ctx.fill(); ctx.globalAlpha = 1;
  rr(ctx, -2.4, -40, 4.8, 84, 3); ctx.fillStyle = pal.accent; ctx.fill();
  // bord de visière visible en braquant
  if (Math.abs(steer) > 0.05) {
    const s = Math.sign(steer);
    ell(ctx, s * (64 - Math.abs(steer) * 12), 4, 18, 30); ctx.fillStyle = pal.visor; ctx.fill();
  }
  if (o.skinDef && o.skinDef.stars) { ctx.fillStyle = '#fff'; for (let i = 0; i < 7; i++) { ctx.globalAlpha = 0.4 + 0.3 * Math.sin(t * 3 + i); circle(ctx, -34 + i * 11, -20 + ((i * 17) % 30), 1.2); ctx.fill(); } ctx.globalAlpha = 1; }
  ctx.restore();
  ctx.globalAlpha = 0.55; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, 0, 48, Math.PI * 1.78, Math.PI * 1.92); ctx.stroke(); ctx.globalAlpha = 1;
  // accessoires de tête
  if (acc === 'cap') {
    ctx.beginPath(); ctx.moveTo(-50, -18); ctx.bezierCurveTo(-48, -62, 48, -62, 50, -18); ctx.quadraticCurveTo(0, -30, -50, -18); ctx.closePath();
    ctx.fillStyle = lin(ctx, 0, -60, 0, -18, ['#ff8a4a', '#f0531a']); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -20, 11, Math.PI, TAU); ctx.closePath(); ctx.fillStyle = pal.shell; ctx.fill();
    rr(ctx, -12, -22, 24, 4, 2); ctx.fillStyle = '#c93d10'; ctx.fill();
  } else if (acc === 'headband') {
    ctx.beginPath(); ctx.moveTo(-52, -14); ctx.quadraticCurveTo(0, -32, 52, -14); ctx.lineTo(51, -4); ctx.quadraticCurveTo(0, -22, -51, -4); ctx.closePath();
    ctx.fillStyle = '#e03a4e'; ctx.fill();
    const w = Math.sin(t * 10) * 7 * wind;
    ctx.beginPath(); ctx.moveTo(-2, -20); ctx.quadraticCurveTo(-14 + w, 4, -22 + w, 26); ctx.lineTo(-12 + w, 28); ctx.quadraticCurveTo(-6 + w * 0.5, 6, 4, -18); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(2, -20); ctx.quadraticCurveTo(16 - w, 2, 26 - w, 20); ctx.lineTo(34 - w, 14); ctx.quadraticCurveTo(20, -4, 6, -20); ctx.closePath(); ctx.fill();
  } else if (acc === 'shades') {
    ctx.beginPath(); ctx.moveTo(-52, -4); ctx.quadraticCurveTo(0, 6, 52, -4); ctx.lineWidth = 6; ctx.strokeStyle = '#0b0d1a'; ctx.stroke();
  } else if (acc === 'crown' || acc === 'horns' || acc === 'halo') {
    accessoryHead(ctx, acc, pal, t, 0);
  }
  ctx.restore(); // tête

  // cape : par-dessus le dos, flotte au vent
  if (acc === 'cape') {
    const w = Math.sin(t * 8) * 6 * wind, w2 = Math.sin(t * 8 + 1.4) * 6 * wind;
    ctx.beginPath(); ctx.moveTo(-20, -44); ctx.lineTo(20, -44);
    ctx.bezierCurveTo(34, -24, 40 + w, 0, 44 + w2, 22); ctx.quadraticCurveTo(14, 14 + w, 0 + w, 26); ctx.quadraticCurveTo(-14, 14 - w, -44 - w2, 22);
    ctx.bezierCurveTo(-40 - w, 0, -34, -24, -20, -44); ctx.closePath();
    ctx.fillStyle = lin(ctx, 0, -44, 0, 26, ['#ff5c7a', '#c41f4e']); ctx.fill();
    ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 2.5; ctx.stroke();
    heartPath(ctx, 0, -14, 8); ctx.fillStyle = '#ffd24a'; ctx.fill();
  }
  ctx.restore();
}

/* ------------------------------ monstres de dos ------------------------------ */

function eyeBack(ctx, x, y, r, pal) { // œil sur tige vu de dos : globe + reflet
  circle(ctx, x, y, r); ctx.fillStyle = rad(ctx, x - r * 0.3, y - r * 0.3, 1, r * 1.2, '#ffffff', '#d9e2f5'); ctx.fill();
  ctx.strokeStyle = pal.b; ctx.lineWidth = 2; ctx.stroke();
}

function blobRear(ctx, pal, t, steer) {
  for (const s of [-1, 1]) { ell(ctx, s * 40, -14, 16, 10, s * 0.4); ctx.fillStyle = pal.b; ctx.fill(); }
  const sq = Math.sin(t * 6) * 0.03;
  ctx.save(); ctx.rotate(steer * 0.1); ctx.scale(1 + sq, 1 - sq);
  ctx.beginPath(); ctx.moveTo(-50, 0); ctx.bezierCurveTo(-58, -60, -34, -96, 0, -96); ctx.bezierCurveTo(34, -96, 58, -60, 50, 0); ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, -96, 0, 0, [pal.a, pal.b]); ctx.fill();
  ctx.save(); ctx.clip();
  ctx.globalAlpha = 0.35; ctx.fillStyle = '#fff';
  for (let i = 0; i < 5; i++) { const yy = (t * 22 + i * 29) % 90; circle(ctx, -30 + i * 15, -4 - yy, 2.5 + (i % 3)); ctx.fill(); }
  ctx.globalAlpha = 1; ctx.restore();
  ctx.globalAlpha = 0.5; ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, -46, 42, Math.PI * 1.62, Math.PI * 1.86); ctx.stroke(); ctx.globalAlpha = 1;
  for (const [x, h, ph] of [[-16, 18, 0], [6, 24, 1], [24, 15, 2]]) {
    const sw = Math.sin(t * 5 + ph) * 4 - steer * 6;
    ctx.strokeStyle = pal.b; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, -92); ctx.quadraticCurveTo(x + sw, -94 - h * 0.6, x + sw * 1.6, -94 - h); ctx.stroke();
    circle(ctx, x + sw * 1.6, -96 - h, 5.5); ctx.fillStyle = pal.c; ctx.fill();
  }
  ctx.restore();
}

function crabRear(ctx, pal, t, steer) {
  // pattes qui pendent sur les côtés
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) for (let i = 0; i < 2; i++) {
    const ph = Math.sin(t * 8 + i + s) * 3;
    ctx.strokeStyle = pal.b; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(s * 34, -26 + i * 8); ctx.lineTo(s * (54 + i * 6), -36 + ph); ctx.lineTo(s * (60 + i * 6), -8 + ph); ctx.stroke();
  }
  ctx.save(); ctx.rotate(steer * 0.08);
  // pinces levées
  for (const s of [-1, 1]) {
    const open = 0.3 + 0.3 * Math.sin(t * 6 + s);
    ctx.strokeStyle = pal.b; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(s * 36, -40); ctx.quadraticCurveTo(s * 58, -60, s * 54, -84); ctx.stroke();
    ctx.save(); ctx.translate(s * 54, -90); ctx.rotate(-Math.PI / 2 + s * 0.3);
    for (const k of [-1, 1]) { ctx.save(); ctx.rotate(k * (0.15 + open * 0.4)); ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(10, k * 16, 30, k * 16, 38, k * 3); ctx.quadraticCurveTo(24, k * 6, 12, 0); ctx.closePath(); ctx.fillStyle = lin(ctx, 0, -12, 30, 12, [pal.a, pal.b]); ctx.fill(); ctx.restore(); }
    circle(ctx, 0, 0, 8); ctx.fillStyle = pal.b; ctx.fill();
    ctx.restore();
  }
  // yeux sur tiges
  for (const [x, h] of [[-14, 30], [14, 34]]) {
    const sw = Math.sin(t * 4 + x) * 3 - steer * 5;
    ctx.strokeStyle = pal.b; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, -64); ctx.lineTo(x + sw, -64 - h); ctx.stroke();
    eyeBack(ctx, x + sw, -68 - h, 10, pal);
  }
  // carapace
  ctx.beginPath(); ctx.moveTo(-52, -6); ctx.bezierCurveTo(-56, -56, -30, -76, 0, -76); ctx.bezierCurveTo(30, -76, 56, -56, 52, -6); ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, -76, 0, 0, [pal.a, pal.b]); ctx.fill(); ctx.strokeStyle = pal.b; ctx.lineWidth = 3; ctx.stroke();
  ctx.save(); ctx.clip(); ctx.strokeStyle = pal.b; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.6;
  ctx.beginPath(); ctx.arc(0, -10, 40, Math.PI, TAU); ctx.moveTo(-18, -74); ctx.lineTo(-12, -30); ctx.moveTo(18, -74); ctx.lineTo(12, -30); ctx.stroke(); ctx.globalAlpha = 1; ctx.restore();
  for (const x of [-34, -16, 16, 34]) { circle(ctx, x, -34 + Math.abs(x) * 0.2, 3.2); ctx.fillStyle = pal.c; ctx.fill(); }
  ctx.globalAlpha = 0.45; ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, -32, 40, Math.PI * 1.6, Math.PI * 1.85); ctx.stroke(); ctx.globalAlpha = 1;
  ctx.restore();
}

function waspRear(ctx, pal, t, steer, frame) {
  ctx.save(); ctx.rotate(steer * 0.1);
  const bob = Math.sin(t * 7) * 2;
  ctx.translate(0, bob);
  // ailes battantes
  const fl = frame ? 0.35 : -0.2;
  for (const s of [-1, 1]) for (const [rx, ry, rot] of [[46, 15, -0.5], [36, 12, -0.15]]) {
    ctx.save(); ctx.translate(s * 14, -70); ctx.scale(s, 1); ctx.rotate(rot + fl); ctx.globalAlpha = 0.55;
    ell(ctx, rx * 0.85, 0, rx, ry); ctx.fillStyle = '#eaf9ff'; ctx.fill(); ctx.strokeStyle = '#9fdcf5'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  }
  ctx.globalAlpha = 1;
  // bras
  for (const s of [-1, 1]) { ctx.strokeStyle = '#2b2440'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(s * 18, -46); ctx.lineTo(s * 36, -20); ctx.stroke(); circle(ctx, s * 37, -17, 5); ctx.fillStyle = pal.a; ctx.fill(); }
  // thorax rayé
  ell(ctx, 0, -40, 24, 30); ctx.fillStyle = lin(ctx, 0, -70, 0, -10, [pal.a, pal.b]); ctx.fill();
  ctx.save(); ell(ctx, 0, -40, 24, 30); ctx.clip(); ctx.fillStyle = pal.c; for (let i = 0; i < 3; i++) ctx.fillRect(-30, -58 + i * 16, 60, 7); ctx.restore();
  // dard
  ctx.beginPath(); ctx.moveTo(-5, -12); ctx.lineTo(0, 2); ctx.lineTo(5, -12); ctx.closePath(); ctx.fillStyle = '#2b2440'; ctx.fill();
  // tête + antennes
  ell(ctx, 0, -82, 22, 19); ctx.fillStyle = lin(ctx, 0, -100, 0, -64, [pal.a, pal.b]); ctx.fill();
  for (const s of [-1, 1]) {
    ctx.strokeStyle = '#2b2440'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(s * 8, -98); ctx.quadraticCurveTo(s * 14, -118, s * (22 - steer * 4), -120); ctx.stroke();
    circle(ctx, s * (22 - steer * 4), -121, 4); ctx.fillStyle = pal.c; ctx.fill();
    ell(ctx, s * 19, -84, 5, 9); ctx.fillStyle = '#2b2440'; ctx.fill();
  }
  ctx.restore();
}

function golemRear(ctx, pal, t, steer) {
  ctx.save(); ctx.rotate(steer * 0.06);
  const glow = 0.6 + 0.4 * Math.sin(t * 3);
  // poings sur le volant
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 34, -28); ctx.lineTo(s * 58, -30); ctx.lineTo(s * 62, -10); ctx.lineTo(s * 40, -4); ctx.closePath(); ctx.fillStyle = lin(ctx, 0, -30, 0, 0, [pal.a, pal.b]); ctx.fill(); }
  // dos rocheux
  ctx.beginPath(); ctx.moveTo(-50, -4); ctx.lineTo(-56, -50); ctx.lineTo(-34, -80); ctx.lineTo(-8, -86); ctx.lineTo(24, -82); ctx.lineTo(52, -56); ctx.lineTo(50, -4); ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, -86, 0, 0, [pal.a, pal.b]); ctx.fill(); ctx.strokeStyle = dark(pal.b, 0.2); ctx.lineWidth = 3; ctx.stroke();
  ctx.strokeStyle = pal.c; ctx.lineWidth = 3; ctx.globalAlpha = glow; ctx.shadowColor = pal.c; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.moveTo(-30, -70); ctx.lineTo(-14, -48); ctx.lineTo(-22, -24); ctx.moveTo(18, -74); ctx.lineTo(8, -50); ctx.lineTo(24, -30); ctx.stroke();
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  // petite tête
  ctx.beginPath(); ctx.moveTo(-18, -84); ctx.lineTo(-16, -108); ctx.lineTo(4, -114); ctx.lineTo(20, -104); ctx.lineTo(18, -84); ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, -114, 0, -84, [light(pal.a, 0.15), pal.a]); ctx.fill();
  ctx.restore();
}

function octoRear(ctx, pal, t, steer) {
  ctx.lineCap = 'round';
  // tentacules qui débordent du kart
  for (const s of [-1, 1]) for (let i = 0; i < 2; i++) {
    const w = Math.sin(t * 5 + i * 1.7 + s) * 6;
    ctx.strokeStyle = pal.b; ctx.lineWidth = 11 - i * 2;
    ctx.beginPath(); ctx.moveTo(s * 26, -20); ctx.bezierCurveTo(s * (50 + i * 8), -30 + w, s * (60 + i * 6), 0 - w, s * (52 + i * 10), 10 + w); ctx.stroke();
    ctx.strokeStyle = pal.a; ctx.lineWidth = 7 - i * 2; ctx.stroke();
  }
  ctx.save(); ctx.rotate(steer * 0.1);
  const pulse = Math.sin(t * 3) * 3;
  ctx.beginPath(); ctx.moveTo(-36, -18); ctx.bezierCurveTo(-52 - pulse, -70, -30, -118, 0, -118 - pulse); ctx.bezierCurveTo(30, -118, 52 + pulse, -70, 36, -18); ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, -120, 0, -18, [pal.a, pal.b]); ctx.fill();
  for (const [x, y, r] of [[-14, -90, 6], [12, -100, 4.5], [18, -70, 5], [-20, -58, 4]]) { circle(ctx, x, y, r); ctx.fillStyle = pal.belly; ctx.globalAlpha = 0.6; ctx.fill(); }
  ctx.globalAlpha = 0.5; ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, -70, 34, Math.PI * 1.6, Math.PI * 1.85); ctx.stroke(); ctx.globalAlpha = 1;
  ctx.restore();
}

function dragonRear(ctx, pal, t, steer) {
  ctx.save(); ctx.rotate(steer * 0.08);
  // ailes repliées
  const f = Math.sin(t * 3) * 0.08;
  for (const s of [-1, 1]) {
    ctx.save(); ctx.translate(s * 16, -60); ctx.scale(s, 1); ctx.rotate(-0.3 + f);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(30, -40); ctx.lineTo(56, -30); ctx.quadraticCurveTo(46, -18, 50, -6); ctx.quadraticCurveTo(36, -6, 34, 6); ctx.quadraticCurveTo(18, 2, 0, 12); ctx.closePath();
    ctx.fillStyle = lin(ctx, 0, -40, 50, 10, [pal.belly, pal.b]); ctx.fill(); ctx.strokeStyle = pal.b; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }
  // queue enroulée sur le côté
  ctx.strokeStyle = pal.b; ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(10, -10); ctx.bezierCurveTo(40, 0, 66, -6, 62 + Math.sin(t * 4) * 3, -26); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(56, -30); ctx.lineTo(66, -40); ctx.lineTo(70, -24); ctx.closePath(); ctx.fillStyle = pal.c; ctx.fill();
  // dos
  ell(ctx, 0, -38, 30, 36); ctx.fillStyle = lin(ctx, 0, -74, 0, 0, [pal.a, pal.b]); ctx.fill();
  // crête dorsale
  ctx.fillStyle = pal.c;
  for (let i = 0; i < 5; i++) { const y = -70 + i * 13; ctx.beginPath(); ctx.moveTo(-5, y + 6); ctx.lineTo(0, y - 6); ctx.lineTo(5, y + 6); ctx.closePath(); ctx.fill(); }
  // cou + tête
  ctx.strokeStyle = pal.a; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(0, -66); ctx.quadraticCurveTo(-steer * 6, -84, 0, -96); ctx.stroke();
  ell(ctx, 0, -104, 22, 17); ctx.fillStyle = lin(ctx, 0, -120, 0, -88, [pal.a, pal.b]); ctx.fill();
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 10, -116); ctx.quadraticCurveTo(s * 18, -132, s * 26, -136); ctx.quadraticCurveTo(s * 20, -122, s * 18, -112); ctx.closePath(); ctx.fillStyle = pal.c; ctx.fill(); }
  ctx.restore();
}

function antiRear(ctx, t, steer) {
  ctx.save();
  ctx.globalAlpha = 0.45 + 0.15 * Math.sin(t * 5);
  ell(ctx, 0, -70, 70, 90); ctx.fillStyle = rad(ctx, 0, -70, 10, 90, 'rgba(255,43,214,0.4)', 'rgba(120,20,220,0)'); ctx.fill();
  ctx.globalAlpha = 1;
  drawLayjouRear(ctx, { pal: ANTI_PAL, t, steer, accessory: 'horns' });
  const k = Math.floor(t * 9);
  for (let i = 0; i < 4; i++) { const gx = ((k * 73 + i * 41) % 110) - 55, gy = -(((k * 37 + i * 59) % 150) + 10); ctx.fillStyle = i % 2 ? 'rgba(0,240,255,0.6)' : 'rgba(255,43,214,0.6)'; ctx.fillRect(gx, gy, 12 + ((k * 13 + i * 7) % 22), 3); }
  ctx.restore();
}

const REAR = { blob: blobRear, crab: crabRear, wasp: waspRear, golem: golemRear, octo: octoRear, dragon: dragonRear };

/* ============================ kart complet (dos) ============================ */

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{shape:string, kpal:object, steer:number, t:number, spin:number, boost?:number, brake?:boolean, driver:(ctx)=>void, bounce?:number}} o
 * @returns {Array} positions des échappements [x, y, taille] (repère du kart)
 */
export function drawKartRear(ctx, o) {
  const P = o.kpal, steer = clamp(o.steer || 0, -1, 1), t = o.t || 0, spin = o.spin || 0, sh = o.shape || 'round';
  const big = sh === 'buggy' ? 1.18 : 1;
  // ombre
  ell(ctx, 0, 2, 70, 10); ctx.fillStyle = 'rgba(10,8,40,.35)'; ctx.fill();
  // roues avant (au fond)
  for (const s of [-1, 1]) smallWheel(ctx, s * 42 + steer * 9, -20, 15, 18, spin);
  ctx.save();
  ctx.translate(steer * 4, (o.bounce || 0));
  ctx.rotate(steer * 0.05);
  // pilote
  ctx.save(); ctx.translate(0, sh === 'shark' ? -46 : -50); o.driver(ctx); ctx.restore();
  // arceau du buggy
  if (sh === 'buggy') {
    ctx.strokeStyle = '#2b3566'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-46, -50); ctx.lineTo(-40, -148); ctx.lineTo(40, -148); ctx.lineTo(46, -50); ctx.stroke();
    ctx.strokeStyle = P.accent; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.save(); ctx.translate(0, -152); ctx.rotate(Math.sin(t * 2) * 0.2);
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(8, 0); ctx.lineTo(0, 8); ctx.lineTo(-8, 0); ctx.closePath();
    ctx.fillStyle = lin(ctx, -8, -12, 8, 8, ['#e9fbff', '#7fd8ff', '#b06bff']); ctx.fill(); ctx.restore();
  }
  // carrosserie
  const ex = bodyRear(ctx, sh, P, t, o.boost || 0);
  taillights(ctx, sh, o.brake);
  rr(ctx, -46, -16, 92, 7, 3.5); ctx.fillStyle = '#2b3566'; ctx.fill();
  ctx.restore();
  // roues arrière
  for (const s of [-1, 1]) tire(ctx, s * 54, 0, 24 * big, 30 * big, spin, P.accent);
  return ex.map(([x, y, k]) => [x + steer * 4, y + (o.bounce || 0), k]);
}

/* ============================ kart de face (menus) ============================ */

function bodyFront(ctx, shape, P, t) {
  const g = lin(ctx, 0, -60, 0, -6, [light(P.main, 0.3), P.main, P.mainDark]);
  ctx.beginPath();
  switch (shape) {
    case 'shark':
      ctx.moveTo(-62, -10); ctx.lineTo(-58, -34); ctx.quadraticCurveTo(-20, -50, 0, -50); ctx.quadraticCurveTo(20, -50, 58, -34); ctx.lineTo(62, -10); break;
    case 'rocket':
      ctx.moveTo(-50, -10); ctx.bezierCurveTo(-54, -36, -26, -56, 0, -58); ctx.bezierCurveTo(26, -56, 54, -36, 50, -10); break;
    case 'buggy':
      ctx.moveTo(-52, -10); ctx.lineTo(-54, -34); ctx.lineTo(-30, -50); ctx.lineTo(30, -50); ctx.lineTo(54, -34); ctx.lineTo(52, -10); break;
    case 'glitch':
      ctx.moveTo(-58, -10); ctx.lineTo(-60, -30); ctx.lineTo(-30, -50); ctx.lineTo(30, -50); ctx.lineTo(60, -30); ctx.lineTo(58, -10); break;
    default:
      ctx.moveTo(-54, -10); ctx.lineTo(-56, -30); ctx.quadraticCurveTo(-46, -50, -20, -52); ctx.lineTo(20, -52); ctx.quadraticCurveTo(46, -50, 56, -30); ctx.lineTo(54, -10);
  }
  ctx.closePath();
  if (shape === 'glitch') { ctx.fillStyle = lin(ctx, 0, -52, 0, -8, ['#2a2f55', '#141731']); ctx.fill(); ctx.strokeStyle = P.main; ctx.lineWidth = 2.4; ctx.shadowColor = P.main; ctx.shadowBlur = 8; ctx.stroke(); ctx.shadowBlur = 0; }
  else { ctx.fillStyle = g; ctx.fill(); }
  ctx.save(); ctx.clip();
  if (shape === 'rocket') { ctx.fillStyle = 'rgba(255,255,255,.3)'; for (let i = -3; i < 4; i++) { ctx.beginPath(); ctx.moveTo(i * 22 - 8, -60); ctx.lineTo(i * 22 + 4, -60); ctx.lineTo(i * 22 + 26, 0); ctx.lineTo(i * 22 + 14, 0); ctx.closePath(); ctx.fill(); } }
  else if (shape === 'sled') { ctx.fillStyle = '#fff'; for (let i = 0; i < 10; i++) { circle(ctx, -54 + i * 12, -44 + Math.abs(i - 4.5) * 1.5, 7); ctx.fill(); } }
  else if (shape !== 'glitch') { ctx.fillStyle = P.accent; ctx.fillRect(-70, -30, 140, 6); }
  ctx.globalAlpha = 0.35; ell(ctx, -18, -44, 26, 6, -0.1); ctx.fillStyle = '#fff'; ctx.fill(); ctx.globalAlpha = 1;
  ctx.restore();
  // calandre / phares
  rr(ctx, -22, -24, 44, 12, 6); ctx.fillStyle = '#2b3566'; ctx.fill();
  if (shape === 'shark') { ctx.fillStyle = '#fff'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-20 + i * 7, -24); ctx.lineTo(-16.5 + i * 7, -18); ctx.lineTo(-13 + i * 7, -24); ctx.closePath(); ctx.fill(); } }
  else { heartPath(ctx, 0, -19, 4); ctx.fillStyle = P.accent; ctx.fill(); }
  for (const s of [-1, 1]) {
    const x = s * (shape === 'shark' ? 44 : 38);
    ctx.globalAlpha = 0.35; circle(ctx, x, -24, 12); ctx.fillStyle = '#fff6c2'; ctx.fill(); ctx.globalAlpha = 1;
    circle(ctx, x, -24, 7.5); ctx.fillStyle = '#fffbe6'; ctx.fill(); ctx.strokeStyle = '#c9d6f2'; ctx.lineWidth = 2; ctx.stroke();
  }
  rr(ctx, -50, -12, 100, 8, 4); ctx.fillStyle = '#2b3566'; ctx.fill();
  if (shape === 'buggy') { ctx.fillStyle = P.accent; for (const s of [-1, 1]) { rr(ctx, s * 30 - 6, -8, 12, 4, 2); ctx.fill(); } }
}

/**
 * Kart vu de face avec Layjou au volant.
 * @param {{shape:string, skin?:string|object, accessory?:string, t:number, steer?:number, kpal?:object}} o
 */
export function drawKartFront(ctx, o) {
  const t = o.t || 0, steer = o.steer || 0, sh = o.shape || 'round';
  const pal = resolvePal(o.skin || 'classic', t);
  const P = o.kpal || pal;
  const big = sh === 'buggy' ? 1.15 : 1;
  ell(ctx, 0, 4, 84, 11); ctx.fillStyle = 'rgba(10,8,40,.32)'; ctx.fill();
  // roues arrière (au fond)
  for (const s of [-1, 1]) smallWheel(ctx, s * 46, -18, 16, 20, t * 4);
  // aileron derrière le pilote
  if (sh === 'shark' || sh === 'glitch') { rr(ctx, -52, -78, 104, 8, 4); ctx.fillStyle = P.mainDark; ctx.fill(); }
  if (sh === 'buggy') {
    ctx.strokeStyle = '#2b3566'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-46, -46); ctx.lineTo(-40, -150); ctx.lineTo(40, -150); ctx.lineTo(46, -46); ctx.stroke();
    ctx.strokeStyle = P.accent; ctx.lineWidth = 2.5; ctx.stroke();
  }
  // Layjou assis
  const P0 = poseOf('drive', t, steer); P0.blink = (t % 3.7) > 3.55 ? 1 : 0;
  drawLayjou(ctx, { x: 0, y: -18, scale: 0.68, pose: P0, skin: o.skin || 'classic', accessory: o.accessory || 'none', t, seated: true });
  // volant + mains
  ctx.save(); ctx.translate(0, -52); ctx.rotate(steer * 0.5);
  ell(ctx, 0, 0, 24, 9); ctx.strokeStyle = '#2b3566'; ctx.lineWidth = 5; ctx.stroke();
  ctx.strokeStyle = '#3e4a86'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(22, 0); ctx.stroke();
  circle(ctx, 0, 0, 4.5); ctx.fillStyle = P.accent; ctx.fill();
  ctx.restore();
  for (const s of [-1, 1]) hand(ctx, s * 21, -52 - s * steer * 5, pal, 1, -Math.PI / 2 - s * 0.6, 0.72);
  // carrosserie
  bodyFront(ctx, sh, P, t);
  // roues avant
  for (const s of [-1, 1]) tire(ctx, s * 60, 2, 24 * big, 30 * big, t * 4, P.accent);
}

/* ============================ cache de sprites ============================ */

const SPR_W = 190, SPR_H = 240, ORIGIN_Y = 222; // repère des sprites mis en cache (unités)

/**
 * Pré-rend les vues arrière d'un pilote rival : 3 braquages × 2 images d'animation.
 * @returns {{frames:HTMLCanvasElement[][], res:number, w:number, h:number, oy:number}}
 */
export function buildRivalSprites(rival, palKey, res = 1.4) {
  const pal = MONSTER_PALS[palKey] || MONSTER_PALS[rival.pal];
  const kpal = rival.type === 'antijou' ? kartPalFromColor('#7a1fd1', '#ff2b5c') : kartPalFromColor(pal.a === '#2a2f55' ? '#2a2f55' : rival.kart, pal.c === '#2b2440' || pal.c === '#101c40' || pal.c === '#2b0f14' ? '#ffffff' : pal.c);
  if (palKey === 'glitch' && rival.type !== 'antijou') { kpal.main = '#2a2f55'; kpal.mainDark = '#141731'; kpal.accent = '#ff2bd6'; }
  const shape = { blob: 'round', crab: 'shark', wasp: 'rocket', golem: 'buggy', octo: 'sled', dragon: 'shark', antijou: 'glitch' }[rival.type];
  const frames = [];
  for (const steer of [-1, 0, 1]) {
    const row = [];
    for (let f = 0; f < 2; f++) {
      const c = document.createElement('canvas');
      c.width = Math.round(SPR_W * res); c.height = Math.round(SPR_H * res);
      const ctx = c.getContext('2d');
      ctx.setTransform(res, 0, 0, res, (SPR_W / 2) * res, ORIGIN_Y * res);
      ctx.lineJoin = 'round';
      const t = f * 0.31 + 0.2;
      drawKartRear(ctx, {
        shape, kpal, steer: steer * 0.8, t, spin: f * 0.5,
        driver: (cx) => (rival.type === 'antijou' ? antiRear(cx, t, steer * 0.8) : REAR[rival.type](cx, pal, t, steer * 0.8, f)),
      });
      row.push(c);
    }
    frames.push(row);
  }
  return { frames, res, w: SPR_W, h: SPR_H, oy: ORIGIN_Y, shape, kpal };
}

/** Échappements (repère du kart) d'une forme donnée, pour les flammes des rivaux. */
export function exhaustOf(shape) {
  return { rocket: [[0, -32, 1.6]], buggy: [[0, -18, 1.1]], sled: [[-22, -18, 0.9], [22, -18, 0.9]], glitch: [[-14, -20, 1], [14, -20, 1]], shark: [[-12, -19, 1], [12, -19, 1]] }[shape] || [[-13, -19, 1], [13, -19, 1]];
}

/** Palette kart du joueur (suit le skin). */
export function playerKartPal(skinId, t) {
  const pal = resolvePal(skinId, t);
  return { main: pal.main, mainDark: pal.mainDark, accent: pal.accent, accentLight: pal.accentLight, shell: pal.shell, shellShade: pal.shellShade, visor: pal.visor };
}

export const skinDef = (id) => byId(SKINS, id);
export { starPath };
