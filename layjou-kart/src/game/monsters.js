/* ------------------------------------------------------------------ *
 *  Monstres — rendu vectoriel procédural.
 *  Repère local : origine au sol, le monstre regarde vers la GAUCHE
 *  (vers Layjou). m = { t, pal, wind, strike, kind, stun, enraged, hurt }
 * ------------------------------------------------------------------ */
import { TAU, clamp, lerp, arc, easeOut, easeIn } from '../core/util.js';
import { drawLayjou, poseOf, blendPose } from './layjou.js';
import { ANTI_PAL } from './data.js';

/** w/h : gabarit · mouth : origine des projectiles · weak : points faibles · core : centre des impacts */
export const MONSTER_META = {
  blob: { w: 190, h: 150, mouth: [-52, -52], core: [-10, -70], weak: [[-30, -118], [36, -70], [-66, -30]] },
  crab: { w: 220, h: 130, mouth: [-70, -48], core: [0, -62], weak: [[0, -100], [-52, -34], [60, -58]] },
  wasp: { w: 170, h: 190, fly: true, mouth: [-84, -96], core: [-6, -112], weak: [[-50, -118], [8, -120], [44, -74]] },
  golem: { w: 210, h: 200, mouth: [-70, -120], core: [-8, -96], weak: [[-10, -94], [-8, -172], [44, -40]] },
  octo: { w: 200, h: 200, mouth: [-46, -84], core: [0, -118], weak: [[-6, -160], [44, -108], [-52, -52]] },
  dragon: { w: 230, h: 215, mouth: [-120, -150], core: [16, -72], weak: [[12, -70], [-74, -168], [78, -44]] },
  antijou: { w: 170, h: 250, mouth: [-70, -100], core: [0, -100], weak: [[-8, -86], [0, -170], [-20, -30]] },
};

const circle = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, Math.max(0.01, r), 0, TAU); };
const ell = (ctx, x, y, rx, ry, rot = 0) => { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU); };
const lin = (ctx, x0, y0, x1, y1, c0, c1) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, c0); g.addColorStop(1, c1); return g; };
const rad = (ctx, x, y, r0, r1, c0, c1) => { const g = ctx.createRadialGradient(x, y, r0, x, y, r1); g.addColorStop(0, c0); g.addColorStop(1, c1); return g; };

/** Œil de monstre : regard vers Layjou, paupière fâchée, variantes sonné / touché. */
function eye(ctx, x, y, r, m, o = {}) {
  const lidColor = o.lid || m.pal.b, iris = o.iris || m.pal.c;
  if (m.stun) {
    circle(ctx, x, y, r); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.strokeStyle = '#3a3f66'; ctx.lineWidth = r * 0.16; ctx.lineCap = 'round'; ctx.beginPath();
    for (let a = 0; a < 11; a += 0.3) { const rr = (a / 11) * r * 0.8; ctx.lineTo(x + Math.cos(a + m.t * 6) * rr, y + Math.sin(a + m.t * 6) * rr); }
    ctx.stroke(); return;
  }
  if (m.hurt > 0.35) {
    ctx.strokeStyle = '#1a1d38'; ctx.lineWidth = r * 0.28; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x + r * 0.6, y - r * 0.55); ctx.lineTo(x - r * 0.45, y); ctx.lineTo(x + r * 0.6, y + r * 0.55); ctx.stroke(); return;
  }
  const blink = ((m.t + (o.phase || 0)) % 4.3) > 4.16;
  circle(ctx, x, y, r); ctx.fillStyle = rad(ctx, x - r * 0.2, y - r * 0.3, 1, r * 1.2, '#ffffff', '#d9e2f5'); ctx.fill();
  if (blink) { ctx.fillStyle = lidColor; ctx.fill(); return; }
  const px = x - r * 0.3, py = y + r * 0.08;
  circle(ctx, px, py, r * 0.56); ctx.fillStyle = m.enraged ? '#ff2b4e' : iris; ctx.fill();
  circle(ctx, px - r * 0.06, py, r * 0.28); ctx.fillStyle = '#12142a'; ctx.fill();
  circle(ctx, px + r * 0.16, py - r * 0.22, r * 0.14); ctx.fillStyle = '#fff'; ctx.fill();
  // paupière fâchée (inclinée vers le museau)
  const anger = clamp(0.45 + m.wind * 0.3 + (m.enraged ? 0.2 : 0));
  ctx.save(); circle(ctx, x, y, r + 0.6); ctx.clip();
  ctx.fillStyle = lidColor; ctx.beginPath();
  ctx.moveTo(x - r * 1.3, y - r * 1.4); ctx.lineTo(x + r * 1.3, y - r * 1.4);
  ctx.lineTo(x + r * 1.3, y - r * (1.05 - anger * 0.5)); ctx.lineTo(x - r * 1.3, y - r * (0.5 - anger * 0.75)); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function teeth(ctx, x0, x1, y, n, h, up = false) {
  ctx.fillStyle = '#fff';
  const w = (x1 - x0) / n;
  for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.moveTo(x0 + i * w, y); ctx.lineTo(x0 + (i + 0.5) * w, y + (up ? -h : h)); ctx.lineTo(x0 + (i + 1) * w, y); ctx.closePath(); ctx.fill(); }
}

/** Tentacule / cou / queue : chapelet de disques le long d'une courbe. */
function beads(ctx, pts, r0, r1, colA, colB, sucker) {
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1), r = lerp(r0, r1, k), [x, y] = pts[i];
    circle(ctx, x, y, r + 1.4); ctx.fillStyle = colB; ctx.fill();
  }
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1), r = lerp(r0, r1, k), [x, y] = pts[i];
    circle(ctx, x, y, r); ctx.fillStyle = colA; ctx.fill();
    if (sucker && i % 2 === 0) { circle(ctx, x - r * 0.1, y + r * 0.45, r * 0.34); ctx.fillStyle = sucker; ctx.fill(); }
  }
}
function curve(p0, p1, p2, p3, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), u = 1 - t;
    out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
  }
  return out;
}

/* ------------------------------- Gloupy ------------------------------- */
function drawBlob(ctx, m) {
  const { pal, t } = m;
  const sq = Math.sin(t * 3) * 0.035 + m.wind * 0.2 - arc(m.strike) * 0.22;
  ctx.save(); ctx.scale(1 + sq * 0.7, 1 - sq);
  // petits bras
  for (const s of [-1, 1]) {
    const a = Math.sin(t * 4 + s) * 0.3 - m.wind * 0.9 * (s < 0 ? 1 : 0.4);
    ctx.save(); ctx.translate(s * 84, -62); ctx.rotate(s * (0.5 + a));
    ell(ctx, s * 14, 0, 22, 12); ctx.fillStyle = pal.b; ctx.fill(); ctx.restore();
  }
  // corps
  ctx.beginPath(); ctx.moveTo(-94, -10);
  ctx.bezierCurveTo(-104, -96, -62, -152, 0, -152); ctx.bezierCurveTo(62, -152, 104, -96, 94, -10);
  const d = Math.sin(t * 2.4) * 3;
  ctx.quadraticCurveTo(84, 8 + d, 66, -2); ctx.quadraticCurveTo(48, 10 - d, 30, -1); ctx.quadraticCurveTo(10, 9 + d, -8, -1);
  ctx.quadraticCurveTo(-28, 10 - d, -48, -2); ctx.quadraticCurveTo(-70, 9 + d, -94, -10); ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, -152, 0, 6, pal.a, pal.b); ctx.fill();
  ctx.save(); ctx.clip();
  ell(ctx, -6, -34, 62, 44); ctx.fillStyle = pal.belly; ctx.globalAlpha = 0.5; ctx.fill();
  ctx.globalAlpha = 0.35; ctx.fillStyle = '#fff';
  for (let i = 0; i < 6; i++) { const yy = ((t * 18 + i * 37) % 130); circle(ctx, -60 + i * 26 + Math.sin(t * 2 + i) * 5, -8 - yy, 3 + (i % 3) * 2); ctx.fill(); }
  ctx.globalAlpha = 1; ctx.restore();
  // reflet
  ctx.globalAlpha = 0.55; ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(-4, -62, 76, Math.PI * 1.16, Math.PI * 1.4); ctx.stroke(); ctx.globalAlpha = 1;
  // antennes gélatineuses
  for (const [x, h, ph] of [[-22, 22, 0], [8, 28, 1], [36, 18, 2]]) {
    const sw = Math.sin(t * 3 + ph) * 5;
    ctx.strokeStyle = pal.b; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, -148); ctx.quadraticCurveTo(x + sw, -150 - h * 0.6, x + sw * 1.6, -150 - h); ctx.stroke();
    circle(ctx, x + sw * 1.6, -152 - h, 6.5); ctx.fillStyle = pal.c; ctx.fill();
  }
  // visage
  eye(ctx, -54, -92, 19, m); eye(ctx, -6, -96, 23, m, { phase: 0.1 });
  const open = clamp(0.25 + m.wind * 0.9 + (m.kind === 'shot' ? 0.4 : 0) + m.hurt * 0.5);
  ctx.beginPath(); ctx.moveTo(-74, -58); ctx.quadraticCurveTo(-34, -50 + open * 6, 10, -60);
  ctx.quadraticCurveTo(-4, -34 + open * 26, -34, -34 + open * 28); ctx.quadraticCurveTo(-64, -36 + open * 22, -74, -58); ctx.closePath();
  ctx.fillStyle = '#3a0f2e'; ctx.fill();
  ctx.save(); ctx.clip(); teeth(ctx, -70, 6, -57, 6, 9 + open * 4); ell(ctx, -30, -20 + open * 20, 22, 12); ctx.fillStyle = '#ff6f91'; ctx.fill(); ctx.restore();
  ctx.restore();
}

/* -------------------------------- Pinz -------------------------------- */
function claw(ctx, x, y, ang, size, open, pal) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(size, size);
  for (const s of [-1, 1]) {
    ctx.save(); ctx.rotate(s * (0.12 + open * 0.42));
    ctx.beginPath(); ctx.moveTo(4, s * 3); ctx.bezierCurveTo(-8, s * 34, -46, s * 34, -62, s * 6); ctx.quadraticCurveTo(-40, s * 12, -24, s * 1); ctx.closePath();
    ctx.fillStyle = lin(ctx, 0, -20, -50, 20, pal.a, pal.b); ctx.fill(); ctx.strokeStyle = pal.b; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }
  circle(ctx, 0, 0, 15); ctx.fillStyle = pal.b; ctx.fill();
  circle(ctx, 0, 0, 8); ctx.fillStyle = pal.c; ctx.fill();
  ctx.restore();
}
function drawCrab(ctx, m) {
  const { pal, t } = m;
  const bob = Math.sin(t * 5) * 2.5;
  // pattes
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const ph = Math.sin(t * 7 + i * 2 + (s > 0 ? 1.5 : 0)) * 5;
    const bx = s * (38 + i * 16), kx = s * (78 + i * 18), fx = s * (88 + i * 22) + ph * 0.6;
    ctx.strokeStyle = pal.b; ctx.lineWidth = 11;
    ctx.beginPath(); ctx.moveTo(bx, -44 + bob); ctx.lineTo(kx, -68 - i * 4 + ph * 0.5); ctx.lineTo(fx, 0); ctx.stroke();
    ctx.strokeStyle = pal.a; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(bx, -44 + bob); ctx.lineTo(kx, -68 - i * 4 + ph * 0.5); ctx.lineTo(fx, 0); ctx.stroke();
    circle(ctx, kx, -68 - i * 4 + ph * 0.5, 6); ctx.fillStyle = pal.c; ctx.fill();
  }
  ctx.save(); ctx.translate(0, bob);
  // pince arrière
  const snap = 0.5 + 0.5 * Math.sin(t * 6);
  ctx.strokeStyle = pal.b; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(62, -70); ctx.quadraticCurveTo(100, -112, 92, -132); ctx.stroke();
  claw(ctx, 90, -136, -1.0 + Math.sin(t * 2) * 0.1, 0.72, snap, pal);
  // yeux sur tiges
  for (const [x, h, ph] of [[-44, 34, 0], [-12, 42, 0.5]]) {
    const sw = Math.sin(t * 3 + ph) * 3;
    ctx.strokeStyle = pal.b; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x, -104); ctx.lineTo(x + sw, -104 - h); ctx.stroke();
    eye(ctx, x + sw, -110 - h, 15, m, { phase: ph });
  }
  // carapace
  ctx.beginPath(); ctx.moveTo(-90, -46); ctx.bezierCurveTo(-92, -106, -50, -126, 0, -126); ctx.bezierCurveTo(50, -126, 92, -106, 90, -46);
  ctx.quadraticCurveTo(0, -20, -90, -46); ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, -126, 0, -30, pal.a, pal.b); ctx.fill(); ctx.strokeStyle = pal.b; ctx.lineWidth = 3; ctx.stroke();
  ctx.save(); ctx.clip();
  ctx.globalAlpha = 0.5; ell(ctx, 0, -40, 78, 22); ctx.fillStyle = pal.belly; ctx.fill(); ctx.globalAlpha = 1;
  ctx.strokeStyle = pal.b; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.7;
  ctx.beginPath(); ctx.arc(0, -40, 62, Math.PI, TAU); ctx.moveTo(-30, -122); ctx.lineTo(-22, -66); ctx.moveTo(30, -122); ctx.lineTo(22, -66); ctx.stroke(); ctx.globalAlpha = 1;
  ctx.restore();
  ctx.globalAlpha = 0.5; ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, -52, 68, Math.PI * 1.18, Math.PI * 1.42); ctx.stroke(); ctx.globalAlpha = 1;
  for (const x of [-64, -40, 40, 64]) { circle(ctx, x, -52 - Math.abs(x) * 0.02, 3.4); ctx.fillStyle = pal.c; ctx.fill(); }
  // gueule-grille
  ctx.beginPath(); ctx.roundRect(-76, -62, 44, 18 + m.wind * 8, 8); ctx.fillStyle = '#1a1d38'; ctx.fill();
  ctx.fillStyle = pal.c; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 9); for (let i = 0; i < 4; i++) ctx.fillRect(-71 + i * 10, -58, 4, 10 + m.wind * 8); ctx.globalAlpha = 1;
  // pince avant (attaque)
  let cx = -118, cy = -78, ca = 0.15, op = snap * 0.6;
  if (m.kind && m.kind !== 'rush') {
    const w = easeOut(m.wind), s = easeIn(m.strike);
    cx = lerp(lerp(-118, -96, w), -168, s); cy = lerp(lerp(-78, -176, w), -34, s); ca = lerp(lerp(0.15, 1.1, w), -0.35, s); op = lerp(1, 0, s);
  } else if (m.kind === 'rush') { cx = -128 - m.strike * 20; cy = -60; ca = 0; op = 1 - m.strike; }
  ctx.strokeStyle = pal.b; ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(-70, -66); ctx.quadraticCurveTo((cx - 70) / 2, cy - 30, cx + 10, cy); ctx.stroke();
  ctx.strokeStyle = pal.a; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(-70, -66); ctx.quadraticCurveTo((cx - 70) / 2, cy - 30, cx + 10, cy); ctx.stroke();
  claw(ctx, cx, cy, ca, 1.12, op, pal);
  ctx.restore();
}

/* ------------------------------- Bzzork ------------------------------- */
function drawWasp(ctx, m) {
  const { pal, t } = m;
  const bob = Math.sin(t * 4) * 7;
  ctx.save(); ctx.translate(0, -104 + bob);
  const tilt = -0.1 + m.wind * 0.35 - m.strike * 0.5;
  ctx.rotate(tilt);
  // ailes
  const fl = Math.sin(t * 46);
  for (const [x, y, rx, ry, rot] of [[8, -30, 62, 20, -0.75], [26, -22, 50, 16, -0.3]]) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot + fl * 0.28); ctx.globalAlpha = 0.5;
    ell(ctx, rx * 0.8, 0, rx, ry * (0.6 + 0.4 * Math.abs(fl))); ctx.fillStyle = '#eaf9ff'; ctx.fill(); ctx.strokeStyle = '#9fdcf5'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  // abdomen rayé + dard (se replie vers l'avant pour piquer)
  const curl = 0.5 + m.wind * 0.5 + arc(m.strike) * 0.4;
  ctx.save(); ctx.translate(26, 8); ctx.rotate(1.05 + curl * 1.0);
  ell(ctx, 44, 0, 50, 30); ctx.fillStyle = lin(ctx, 0, -30, 0, 30, pal.a, pal.b); ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle = pal.c; for (let i = 0; i < 4; i++) ctx.fillRect(18 + i * 22, -34, 10, 68); ctx.restore();
  ctx.beginPath(); ctx.moveTo(90, -9); ctx.lineTo(126, 0); ctx.lineTo(90, 9); ctx.closePath(); ctx.fillStyle = '#f2f6ff'; ctx.fill();
  ctx.globalAlpha = 0.5; ell(ctx, 40, -14, 30, 6); ctx.fillStyle = '#fff'; ctx.fill(); ctx.globalAlpha = 1;
  ctx.restore();
  // pattes
  ctx.strokeStyle = pal.c; ctx.lineWidth = 5; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) { const sw = Math.sin(t * 6 + i) * 4; ctx.beginPath(); ctx.moveTo(-14 + i * 14, 18); ctx.lineTo(-24 + i * 14 + sw, 38); ctx.lineTo(-34 + i * 14 + sw, 46); ctx.stroke(); }
  // thorax
  ell(ctx, 4, 0, 34, 28); ctx.fillStyle = lin(ctx, 0, -28, 0, 28, pal.a, pal.b); ctx.fill();
  ctx.globalAlpha = 0.6; ell(ctx, -2, -12, 20, 7, -0.2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.globalAlpha = 1;
  // tête
  for (const s of [-1, 1]) { ctx.strokeStyle = pal.c; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-48 + s * 8, -34); ctx.quadraticCurveTo(-62 + s * 12, -66, -84 + s * 14 + Math.sin(t * 5 + s) * 4, -70); ctx.stroke(); circle(ctx, -84 + s * 14 + Math.sin(t * 5 + s) * 4, -70, 5); ctx.fillStyle = pal.a; ctx.fill(); }
  circle(ctx, -46, -6, 33); ctx.fillStyle = lin(ctx, 0, -40, 0, 28, pal.a, pal.b); ctx.fill();
  eye(ctx, -62, -12, 15, m, { iris: '#ff5c9d', lid: pal.b }); eye(ctx, -32, -16, 17, m, { iris: '#ff5c9d', lid: pal.b, phase: 0.1 });
  // mandibules
  const mo = 0.3 + m.wind * 0.6 + Math.sin(t * 8) * 0.1;
  for (const s of [-1, 1]) { ctx.save(); ctx.translate(-56 + s * 9, 20); ctx.rotate(s * mo); ctx.beginPath(); ctx.moveTo(-4, 0); ctx.quadraticCurveTo(-2 * s, 16, s * -8, 20); ctx.quadraticCurveTo(4, 12, 4, 0); ctx.closePath(); ctx.fillStyle = pal.c; ctx.fill(); ctx.restore(); }
  ctx.restore();
}

/* -------------------------------- Rokko ------------------------------- */
function rock(ctx, pts, pal, glow) {
  ctx.beginPath(); pts.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](x, y)); ctx.closePath();
  ctx.fillStyle = glow; ctx.fill(); ctx.strokeStyle = pal.b; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
}
function fist(ctx, x, y, r, pal, t) {
  ctx.save(); ctx.translate(x, y);
  rock(ctx, [[-r, -r * 0.5], [-r * 0.5, -r], [r * 0.6, -r * 0.9], [r, -r * 0.2], [r * 0.8, r * 0.7], [-r * 0.2, r], [-r * 0.95, r * 0.5]], pal, lin(ctx, 0, -r, 0, r, pal.a, pal.b));
  ctx.strokeStyle = pal.c; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 5);
  ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.2); ctx.lineTo(0, r * 0.1); ctx.lineTo(-r * 0.1, r * 0.6); ctx.moveTo(0, r * 0.1); ctx.lineTo(r * 0.5, -r * 0.1); ctx.stroke(); ctx.globalAlpha = 1;
  ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.9); ctx.lineTo(r * 0.5, -r * 0.82); ctx.lineTo(r * 0.2, -r * 0.5); ctx.lineTo(-r * 0.6, -r * 0.55); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.globalAlpha = 1;
  ctx.restore();
}
function drawGolem(ctx, m) {
  const { pal, t } = m;
  const bob = Math.sin(t * 2.4) * 3;
  const pulse = 0.6 + 0.4 * Math.sin(t * 4);
  // jambes
  for (const x of [-40, 40]) rock(ctx, [[x - 26, 0], [x - 22, -40], [x + 20, -44], [x + 28, -4], [x + 22, 0]], pal, lin(ctx, 0, -44, 0, 0, pal.a, pal.b));
  // poing arrière
  fist(ctx, 104, -84 + bob * 1.4 + Math.sin(t * 2) * 4, 30, pal, t);
  ctx.save(); ctx.translate(0, bob);
  // cristaux d'épaules
  for (const [x, y, h, r] of [[-56, -148, 44, -0.5], [-30, -158, 30, -0.15], [50, -150, 50, 0.4], [26, -160, 28, 0.1]]) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(r);
    ctx.beginPath(); ctx.moveTo(-10, 4); ctx.lineTo(0, -h); ctx.lineTo(10, 4); ctx.closePath(); ctx.fillStyle = lin(ctx, 0, -h, 0, 4, pal.glow, pal.c); ctx.fill();
    ctx.restore();
  }
  // torse
  rock(ctx, [[-78, -60], [-88, -112], [-62, -150], [-10, -162], [56, -152], [86, -110], [76, -58], [30, -34], [-34, -36]], pal, lin(ctx, 0, -162, 0, -34, pal.a, pal.b));
  ctx.globalAlpha = 0.28; ctx.beginPath(); ctx.moveTo(-62, -148); ctx.lineTo(-10, -160); ctx.lineTo(20, -130); ctx.lineTo(-50, -118); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.globalAlpha = 1;
  // fissures lumineuses + cœur
  ctx.strokeStyle = pal.c; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.globalAlpha = pulse;
  ctx.beginPath(); ctx.moveTo(-10, -96); ctx.lineTo(-44, -72); ctx.lineTo(-58, -78); ctx.moveTo(-10, -96); ctx.lineTo(34, -70); ctx.lineTo(40, -52); ctx.moveTo(-10, -96); ctx.lineTo(8, -132); ctx.lineTo(40, -138); ctx.stroke(); ctx.globalAlpha = 1;
  circle(ctx, -10, -96, 30); ctx.fillStyle = rad(ctx, -10, -96, 2, 30, pal.glow, 'rgba(255,255,255,0)'); ctx.globalAlpha = 0.5 + 0.5 * pulse; ctx.fill(); ctx.globalAlpha = 1;
  circle(ctx, -10, -96, 15); ctx.fillStyle = pal.c; ctx.fill(); circle(ctx, -14, -100, 6); ctx.fillStyle = pal.glow; ctx.fill();
  // tête
  ctx.save(); ctx.translate(-8, -172 + Math.sin(t * 2.4 + 1) * 2); ctx.rotate(-0.06 - m.wind * 0.1);
  rock(ctx, [[-34, 10], [-38, -18], [-18, -34], [22, -32], [36, -10], [30, 14], [-10, 18]], pal, lin(ctx, 0, -34, 0, 18, pal.a, pal.b));
  if (m.stun) { eye(ctx, -18, -8, 9, m); eye(ctx, 8, -9, 9, m); } else {
    ctx.fillStyle = m.enraged ? '#ff2b4e' : pal.c; ctx.globalAlpha = 0.75 + 0.25 * pulse;
    ctx.beginPath(); ctx.moveTo(-28, -12); ctx.lineTo(-8, -6); ctx.lineTo(-10, 0); ctx.lineTo(-27, -4); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(20, -12); ctx.lineTo(19, -4); ctx.lineTo(2, 0); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
  }
  ctx.fillStyle = '#1a1d38'; ctx.beginPath(); ctx.roundRect(-18, 5, 24, 5 + m.wind * 6, 2); ctx.fill();
  ctx.restore();
  ctx.restore();
  // poing avant (attaque)
  let fx = -112, fy = -74 + bob * 1.4 - Math.sin(t * 2) * 4;
  if (m.kind) {
    const w = easeOut(m.wind), s = easeIn(m.strike);
    if (m.kind === 'wave' || m.kind === 'slam') { fx = lerp(lerp(-112, -80, w), -130, s); fy = lerp(lerp(fy, -214, w), -26, s); }
    else { fx = lerp(lerp(-112, -60, w), -176, s); fy = lerp(lerp(fy, -110, w), -84, s); }
  }
  ctx.strokeStyle = pal.c; ctx.lineWidth = 4; ctx.globalAlpha = 0.35; ctx.setLineDash([4, 8]);
  ctx.beginPath(); ctx.moveTo(-70, -110 + bob); ctx.lineTo(fx, fy); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
  fist(ctx, fx, fy, 37, pal, t);
}

/* ------------------------------- Tentakl ------------------------------ */
function drawOcto(ctx, m) {
  const { pal, t } = m;
  const bob = Math.sin(t * 2.6) * 5;
  const tent = (i, sx, len, ph, atk) => {
    const s = Math.sign(sx) || 1, w1 = Math.sin(t * 2.6 + ph) * 16, w2 = Math.cos(t * 3.1 + ph) * 14;
    let p3 = [sx * 1.9 + w2, -6 + Math.abs(w1) * 0.3], p2 = [sx * 1.7 + w1, -len * 0.25], p1 = [sx * 0.8, -6];
    if (atk) {
      const w = easeOut(m.wind), k = easeIn(m.strike);
      p2 = [lerp(lerp(p2[0], -70, w), -130, k), lerp(lerp(p2[1], -230, w), -110, k)];
      p3 = [lerp(lerp(p3[0], -40, w), -190, k), lerp(lerp(p3[1], -250, w), -40, k)];
      p1 = [sx * 0.8, -30];
    }
    beads(ctx, curve([sx * 0.5, -58 + bob], p1, p2, p3, 15), 17, 5, pal.a, pal.b, i % 2 ? null : pal.belly);
    return s;
  };
  const atkA = m.kind && m.kind !== 'volley', atkB = m.kind === 'slam' || m.kind === 'rush';
  tent(0, 62, 120, 0); tent(1, 34, 110, 1.3); tent(2, -24, 110, 2.1);
  // tête
  ctx.save(); ctx.translate(0, bob);
  const pf = 1 + m.wind * 0.06 * (m.kind === 'volley' ? 1 : 0);
  ctx.beginPath(); ctx.moveTo(-64, -62); ctx.bezierCurveTo(-92 * pf, -120, -66, -206, 0, -206); ctx.bezierCurveTo(66, -206, 92 * pf, -120, 64, -62);
  ctx.quadraticCurveTo(0, -40, -64, -62); ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, -206, 0, -46, pal.a, pal.b); ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = pal.belly; ctx.globalAlpha = 0.45;
  for (const [x, y, r] of [[30, -176, 13], [52, -146, 8], [8, -188, 7], [-40, -182, 9], [58, -108, 6]]) { circle(ctx, x, y, r); ctx.fill(); }
  ctx.globalAlpha = 1; ctx.restore();
  ctx.globalAlpha = 0.5; ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, -124, 66, Math.PI * 1.2, Math.PI * 1.42); ctx.stroke(); ctx.globalAlpha = 1;
  eye(ctx, -50, -112, 20, m); eye(ctx, -2, -116, 24, m, { phase: 0.15 });
  // bouche-siphon
  const open = clamp(0.2 + (m.kind === 'volley' ? m.wind : m.wind * 0.4) + m.hurt * 0.5);
  ell(ctx, -36, -74, 13 + open * 3, 6 + open * 10); ctx.fillStyle = '#2a0f3a'; ctx.fill();
  ctx.restore();
  tent(3, -60, 120, 3.0, atkB); tent(4, -44, 126, 4.2, atkA); tent(5, 10, 100, 5.1);
}

/* ------------------------------- Drakito ------------------------------ */
function wing(ctx, x, y, rot, s, pal, dark) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(34, -84); ctx.lineTo(118, -96);
  ctx.quadraticCurveTo(96, -66, 104, -44); ctx.quadraticCurveTo(76, -40, 76, -16); ctx.quadraticCurveTo(48, -20, 40, 6); ctx.closePath();
  ctx.fillStyle = dark ? pal.b : lin(ctx, 0, -96, 0, 6, pal.c, pal.a); ctx.globalAlpha = dark ? 1 : 0.92; ctx.fill(); ctx.globalAlpha = 1;
  ctx.strokeStyle = pal.b; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(34, -84); ctx.lineTo(118, -96); ctx.moveTo(34, -84); ctx.lineTo(104, -44); ctx.moveTo(34, -84); ctx.lineTo(76, -16); ctx.stroke();
  ctx.restore();
}
function drawDragon(ctx, m) {
  const { pal, t } = m;
  const bob = Math.sin(t * 2.2) * 3, flap = Math.sin(t * 3.2) * 0.14 + m.wind * 0.3 - arc(m.strike) * 0.5;
  // queue
  const tw = Math.sin(t * 2.5) * 12;
  let tail = curve([62, -40], [120, -20], [150, -70 + tw], [128 + tw * 0.5, -120 + tw], 13);
  if (m.kind === 'wave') { const w = easeOut(m.wind), k = easeIn(m.strike); tail = curve([62, -40], [lerp(120, 60, k), lerp(-10, 10, k)], [lerp(lerp(150, 170, w), -60, k), lerp(-70, -6, k)], [lerp(lerp(128, 190, w), -150, k), lerp(lerp(-120, -150, w), -10, k)], 13); }
  beads(ctx, tail, 20, 5, pal.a, pal.b);
  const tp = tail[tail.length - 1];
  ctx.beginPath(); ctx.moveTo(tp[0] - 12, tp[1] + 4); ctx.lineTo(tp[0], tp[1] - 24); ctx.lineTo(tp[0] + 12, tp[1] + 4); ctx.closePath(); ctx.fillStyle = pal.c; ctx.fill();
  wing(ctx, 34, -100 + bob, -0.1 + flap, 1.0, pal, true);
  // pattes
  for (const x of [-16, 52]) {
    ell(ctx, x, -18, 22, 24); ctx.fillStyle = pal.b; ctx.fill();
    ctx.beginPath(); ctx.roundRect(x - 26, -12, 46, 14, 7); ctx.fillStyle = pal.a; ctx.fill();
    ctx.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x - 24 + i * 10, -4); ctx.lineTo(x - 30 + i * 10, 3); ctx.lineTo(x - 18 + i * 10, 2); ctx.closePath(); ctx.fill(); }
  }
  ctx.save(); ctx.translate(0, bob);
  // corps + ventre
  ell(ctx, 20, -66, 70, 56, -0.12); ctx.fillStyle = lin(ctx, 0, -122, 0, -10, pal.a, pal.b); ctx.fill();
  ctx.save(); ctx.clip(); ell(ctx, -18, -52, 44, 48, -0.2); ctx.fillStyle = pal.belly; ctx.fill();
  ctx.strokeStyle = pal.b; ctx.globalAlpha = 0.3; ctx.lineWidth = 2.5; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(-18, -150 + i * 20, 60, Math.PI * 0.3, Math.PI * 0.7); ctx.stroke(); }
  ctx.globalAlpha = 1; ctx.restore();
  // crête dorsale
  ctx.fillStyle = pal.c; for (let i = 0; i < 4; i++) { const x = 30 + i * 18, y = -118 + i * 9; ctx.beginPath(); ctx.moveTo(x - 9, y + 6); ctx.lineTo(x + 3, y - 16); ctx.lineTo(x + 11, y + 8); ctx.closePath(); ctx.fill(); }
  // cou + tête
  let hx = -78 + Math.sin(t * 1.8) * 5, hy = -172 + Math.cos(t * 2.2) * 4, jaw = 0.12 + Math.max(0, Math.sin(t * 2)) * 0.08, ha = 0;
  if (m.kind) {
    const w = easeOut(m.wind), k = easeIn(m.strike);
    if (m.kind === 'swipe') { hx = lerp(lerp(hx, -36, w), -168, k); hy = lerp(lerp(hy, -206, w), -92, k); jaw = lerp(lerp(jaw, 0.7, w), 0.05, k); ha = lerp(lerp(0, -0.3, w), 0.3, k); }
    else if (m.kind === 'wave') { ha = -0.2 * w; jaw = 0.3 * w; }
    else { hx = lerp(hx, -58, w); hy = lerp(hy, -196, w); jaw = lerp(jaw, 0.75, Math.max(w, m.strike > 0 ? 1 : 0)); ha = -0.18 * w + 0.12 * (m.strike > 0 ? 1 : 0); }
  }
  beads(ctx, curve([-24, -98], [-40, -150], [hx + 50, hy + 30], [hx + 16, hy + 6], 11), 25, 17, pal.a, pal.b);
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(ha);
  // cornes
  for (const [x, r] of [[24, 0.5], [10, 0.2]]) { ctx.save(); ctx.translate(x, -20); ctx.rotate(r); ctx.beginPath(); ctx.moveTo(-7, 4); ctx.quadraticCurveTo(4, -22, 26, -34); ctx.quadraticCurveTo(12, -12, 8, 6); ctx.closePath(); ctx.fillStyle = '#fff6dc'; ctx.fill(); ctx.restore(); }
  // mâchoire inférieure
  ctx.save(); ctx.rotate(-jaw);
  ctx.beginPath(); ctx.moveTo(18, 8); ctx.quadraticCurveTo(-30, 26, -60, 10); ctx.lineTo(-56, 2); ctx.lineTo(14, -2); ctx.closePath(); ctx.fillStyle = pal.b; ctx.fill();
  teeth(ctx, -54, -10, 4, 5, 8, true);
  ctx.restore();
  // crâne + museau
  ctx.beginPath(); ctx.moveTo(34, 4); ctx.bezierCurveTo(40, -30, 4, -40, -18, -30); ctx.bezierCurveTo(-40, -30, -66, -22, -70, -6); ctx.quadraticCurveTo(-66, 6, -40, 6); ctx.lineTo(20, 12); ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, -38, 0, 12, pal.a, pal.b); ctx.fill();
  teeth(ctx, -62, -14, 5, 5, 8);
  circle(ctx, -60, -12, 3); ctx.fillStyle = '#1a1d38'; ctx.fill();
  eye(ctx, -10, -16, 13, m);
  ctx.restore();
  ctx.restore();
  wing(ctx, 6, -104 + bob, -0.5 + flap * 1.2, 0.86, pal, false);
}

/* ------------------------------ Anti-Jou ------------------------------ */
const antiPose = { cur: null };
function drawAnti(ctx, m) {
  const { t } = m;
  let name = 'idle', p = 0;
  if (m.stun) name = 'break';
  else if (m.kind) {
    const striking = m.strike > 0;
    if (m.kind === 'swipe') { name = striking ? 'punch1' : 'idle'; p = m.strike; }
    else if (m.kind === 'rush') { name = striking ? 'punch2' : 'idle'; p = m.strike; }
    else if (m.kind === 'wave') { name = 'punch3'; p = striking ? 0.5 + m.strike * 0.5 : m.wind * 0.5; }
    else if (m.kind === 'beam') { name = 'ult'; p = 1; }
    else { name = 'shoot'; p = striking ? m.strike : 1; }
  } else if (m.hurt > 0.4) { name = 'hit'; p = 1 - m.hurt; }
  const target = poseOf(name, t, p);
  if (!antiPose.cur) antiPose.cur = target; else blendPose(antiPose.cur, target, 0.35);
  const P = antiPose.cur;
  if (!m.stun && name !== 'hit') { P.eyes = 'angry'; P.mouth = m.kind ? 'open' : 'grit'; }
  if (m.kind && m.strike <= 0 && name === 'idle') { P.lean = -0.12 * m.wind; P.hfy -= 30 * m.wind; }
  P.blink = 0; P.glow = (m.kind === 'beam' || m.kind === 'shot') ? 0.6 + m.wind : 0.25;
  // aura corrompue
  ctx.save();
  ctx.globalAlpha = 0.5 + 0.2 * Math.sin(t * 5);
  ell(ctx, 0, -120, 120, 150); ctx.fillStyle = rad(ctx, 0, -120, 20, 150, 'rgba(255,43,214,0.35)', 'rgba(120,20,220,0)'); ctx.fill();
  ctx.globalAlpha = 1;
  drawLayjou(ctx, { x: 0, y: 0, scale: 1.28, facing: -1, pose: P, skin: { pal: ANTI_PAL }, accessory: 'horns', t });
  // parasites « glitch »
  for (let i = 0; i < 5; i++) {
    const s = Math.floor(t * 9 + i * 7.3);
    const gx = ((s * 73 + i * 41) % 180) - 90, gy = -(((s * 37 + i * 59) % 230) + 10), gw = 14 + ((s * 13) % 30);
    ctx.fillStyle = i % 2 ? 'rgba(0,240,255,0.55)' : 'rgba(255,43,214,0.55)'; ctx.fillRect(gx, gy, gw, 3);
  }
  ctx.restore();
}

const DRAW = { blob: drawBlob, crab: drawCrab, wasp: drawWasp, golem: drawGolem, octo: drawOcto, dragon: drawDragon, antijou: drawAnti };

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} type
 * @param {{x:number,y:number,scale?:number,rot?:number,pal:object,t:number,wind?:number,strike?:number,kind?:string|null,stun?:boolean,enraged?:boolean,hurt?:number}} m
 */
export function drawMonster(ctx, type, m) {
  ctx.save();
  ctx.translate(m.x, m.y);
  if (m.rot) ctx.rotate(m.rot);
  const s = m.scale ?? 1;
  ctx.scale(s, s);
  m.wind = m.wind || 0; m.strike = m.strike || 0; m.hurt = m.hurt || 0;
  ctx.lineJoin = 'round';
  (DRAW[type] || drawBlob)(ctx, m);
  ctx.restore();
}

/** Vignette statique (carte des niveaux, écran d'avant-combat). */
export function renderMonsterThumb(canvas, type, pal, { zoom = 1, t = 1.2 } = {}) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth || canvas.width, h = canvas.clientHeight || canvas.height;
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const meta = MONSTER_META[type];
  const sc = Math.min(w / (meta.w + 70), h / (meta.h + 40)) * zoom;
  antiPose.cur = null;
  drawMonster(ctx, type, { x: w / 2 + 6 * sc, y: h - 6, scale: sc, pal, t });
  antiPose.cur = null;
}
