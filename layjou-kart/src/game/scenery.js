/* ------------------------------------------------------------------ *
 *  Layjou Kart — décors : sprites des bas-côtés, obstacles, arche de
 *  départ, panneaux, fonds en parallaxe et ciel des 5 mondes.
 *  Tout est peint une fois dans des canvas hors écran (rapide).
 * ------------------------------------------------------------------ */
import { TAU, seeded, shade } from '../core/util.js';
import { heartPath } from './layjou.js';

const circle = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, Math.max(0.01, r), 0, TAU); };
const ell = (ctx, x, y, rx, ry, rot = 0) => { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU); };
const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
const lin = (ctx, x0, y0, x1, y1, stops) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c)); return g; };
const rad = (ctx, x, y, r0, r1, stops) => { const g = ctx.createRadialGradient(x, y, r0, x, y, r1); stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c)); return g; };
const shadowAt = (ctx, w) => { ell(ctx, 0, -2, w, w * 0.16); ctx.fillStyle = 'rgba(20,10,60,.22)'; ctx.fill(); };

/**
 * Sprites : bw/bh = boîte de dessin (unités de peinture, origine en bas au centre),
 * ww = largeur dans le monde (unités de route ; demi-route = 2000).
 * solid : collision si le kart sort de la piste.
 */
const DEF = {
  /* ------------------------------- Bonbon-Ville ------------------------------- */
  lollipop: { bw: 100, bh: 190, ww: 1000, solid: true, paint(c) {
    shadowAt(c, 26); rr(c, -4, -110, 8, 110, 4); c.fillStyle = lin(c, -4, 0, 4, 0, ['#fff', '#e6e0f5']); c.fill();
    c.save(); c.translate(0, -140); circle(c, 0, 0, 46); c.fillStyle = '#ff6fae'; c.fill(); c.clip();
    c.strokeStyle = '#fff'; c.lineWidth = 11; c.beginPath(); for (let a = 0; a < 18; a += 0.2) { const r = a * 2.8; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.stroke();
    c.restore(); c.globalAlpha = 0.45; ell(c, -16, -158, 14, 8, -0.6); c.fillStyle = '#fff'; c.fill(); c.globalAlpha = 1;
  } },
  cane: { bw: 70, bh: 200, ww: 640, solid: true, paint(c) {
    shadowAt(c, 18);
    c.lineCap = 'round'; c.lineWidth = 18; const path = () => { c.beginPath(); c.moveTo(4, 0); c.lineTo(4, -150); c.arc(-14, -150, 18, 0, Math.PI, true); };
    path(); c.strokeStyle = '#fff'; c.stroke(); c.setLineDash([14, 14]); path(); c.strokeStyle = '#ff3b6b'; c.stroke(); c.setLineDash([]);
  } },
  gumtree: { bw: 140, bh: 190, ww: 1500, solid: true, paint(c) {
    shadowAt(c, 40); rr(c, -9, -80, 18, 80, 6); c.fillStyle = '#c98a5a'; c.fill();
    const cols = ['#ff8fbf', '#ffd24a', '#7be3b4', '#a98bff', '#ff9a6a'];
    const blobs = [[-34, -100, 34], [32, -104, 34], [0, -140, 42], [-20, -150, 26], [24, -152, 26]];
    blobs.forEach(([x, y, r], i) => { circle(c, x, y, r); c.fillStyle = rad(c, x - r * 0.3, y - r * 0.4, 2, r, ['#fff', cols[i % 5], shade(cols[i % 5], -0.15)]); c.fill(); });
  } },
  cupcake: { bw: 160, bh: 190, ww: 2200, solid: true, paint(c) {
    shadowAt(c, 60);
    c.beginPath(); c.moveTo(-62, -80); c.lineTo(62, -80); c.lineTo(48, 0); c.lineTo(-48, 0); c.closePath(); c.fillStyle = lin(c, 0, -80, 0, 0, ['#ffb3d1', '#ff6fae']); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 4; for (let i = -4; i <= 4; i++) { c.beginPath(); c.moveTo(i * 14, -80); c.lineTo(i * 11, 0); c.stroke(); }
    rr(c, -14, -50, 28, 50, 12); c.fillStyle = '#8a4b7a'; c.fill();
    for (const [x, y, r] of [[-44, -92, 30], [0, -100, 40], [44, -92, 30], [-20, -128, 30], [22, -130, 30], [0, -156, 24]]) { circle(c, x, y, r); c.fillStyle = rad(c, x - 8, y - 10, 2, r, ['#fffaf2', '#fff0f7', '#ffd9ea']); c.fill(); }
    circle(c, 0, -182, 12); c.fillStyle = '#ff3b6b'; c.fill(); circle(c, -4, -186, 3); c.fillStyle = '#fff'; c.fill();
    const sp = ['#39e4ff', '#ffd24a', '#7be35a', '#a56bff'];
    for (let i = 0; i < 14; i++) { const a = i * 2.3, r = 20 + (i * 13) % 34; c.save(); c.translate(Math.cos(a) * r, -118 + Math.sin(a) * r * 0.6); c.rotate(a); rr(c, -5, -1.5, 10, 3, 1.5); c.fillStyle = sp[i % 4]; c.fill(); c.restore(); }
  } },
  donut: { bw: 220, bh: 230, ww: 5200, paint(c) {
    rr(c, -8, -60, 16, 60, 4); c.fillStyle = '#c9b8e8'; c.fill();
    c.save(); c.translate(0, -140); circle(c, 0, 0, 96); circle(c, 0, 0, 38); c.fillStyle = lin(c, 0, -96, 0, 96, ['#ffcf8a', '#e8a05a']); c.fill('evenodd');
    c.beginPath(); for (let a = 0; a <= TAU + 0.01; a += 0.25) { const r = 90 - Math.sin(a * 7) * 6; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); circle(c, 0, 0, 44); c.fillStyle = '#ff8fbf'; c.fill('evenodd');
    const sp = ['#fff', '#39e4ff', '#ffd24a', '#7be35a'];
    for (let i = 0; i < 26; i++) { const a = i * 0.9, r = 52 + (i * 7) % 32; c.save(); c.translate(Math.cos(a) * r, Math.sin(a) * r); c.rotate(a * 2); rr(c, -6, -2, 12, 4, 2); c.fillStyle = sp[i % 4]; c.fill(); c.restore(); }
    c.restore();
  } },
  fence: { bw: 40, bh: 80, ww: 260, solid: true, paint(c) {
    rr(c, -10, -64, 20, 64, 8); c.fillStyle = '#fff'; c.fill(); c.save(); c.clip(); c.fillStyle = '#ff5c9d'; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(-12, -70 + i * 14); c.lineTo(12, -80 + i * 14); c.lineTo(12, -73 + i * 14); c.lineTo(-12, -63 + i * 14); c.closePath(); c.fill(); } c.restore();
    circle(c, 0, -70, 10); c.fillStyle = '#ffd24a'; c.fill();
  } },
  gumball: { bw: 80, bh: 80, ww: 560, solid: true, paint(c) {
    shadowAt(c, 30); circle(c, 0, -36, 34); c.fillStyle = rad(c, -12, -50, 3, 40, ['#fff', '#ff6fae', '#d83a80']); c.fill();
  } },

  /* -------------------------------- Port Néon -------------------------------- */
  palm: { bw: 140, bh: 240, ww: 1500, solid: true, paint(c) {
    c.lineCap = 'round'; c.strokeStyle = '#3a2a6a'; c.lineWidth = 12; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(14, -100, -4, -190); c.stroke();
    c.strokeStyle = '#ff2bd6'; c.lineWidth = 2.5; c.shadowColor = '#ff2bd6'; c.shadowBlur = 10; c.stroke();
    for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.48; c.beginPath(); c.moveTo(-4, -190); c.quadraticCurveTo(-4 + Math.cos(a) * 50, -190 + Math.sin(a) * 50 - 18, -4 + Math.cos(a) * 70, -190 + Math.sin(a) * 40 + 20); c.strokeStyle = '#00f0ff'; c.lineWidth = 6; c.shadowColor = '#00f0ff'; c.stroke(); }
    c.shadowBlur = 0;
  } },
  lamp: { bw: 80, bh: 230, ww: 700, solid: true, paint(c) {
    rr(c, -4, -200, 8, 200, 3); c.fillStyle = '#4a4f85'; c.fill();
    rr(c, -4, -204, 40, 7, 3); c.fill();
    c.shadowColor = '#fff6c2'; c.shadowBlur = 18; ell(c, 30, -194, 12, 6); c.fillStyle = '#fff6c2'; c.fill(); c.shadowBlur = 0;
    c.globalAlpha = 0.25; c.beginPath(); c.moveTo(22, -192); c.lineTo(38, -192); c.lineTo(70, 0); c.lineTo(-10, 0); c.closePath(); c.fillStyle = '#fff6c2'; c.fill(); c.globalAlpha = 1;
  } },
  container: { bw: 160, bh: 120, ww: 2400, solid: true, paint(c) {
    const cols = [['#ff5c9d', '#d6418a'], ['#39e4ff', '#1f9fd6'], ['#ffd24a', '#e09a10']];
    cols.forEach(([a, b], i) => { if (i === 2) return; const y = -54 - i * 54; rr(c, -74 + i * 10, y, 148 - i * 10, 52, 3); c.fillStyle = lin(c, 0, y, 0, y + 52, [a, b]); c.fill(); c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 2; for (let k = 0; k < 9; k++) { c.beginPath(); c.moveTo(-66 + i * 10 + k * 16, y + 6); c.lineTo(-66 + i * 10 + k * 16, y + 46); c.stroke(); } });
  } },
  building: { bw: 160, bh: 360, ww: 4800, paint(c, rnd) {
    const h = 300 + rnd() * 50;
    rr(c, -70, -h, 140, h, 6); c.fillStyle = lin(c, 0, -h, 0, 0, ['#2a2f6a', '#141840']); c.fill();
    for (let y = -h + 16; y < -14; y += 18) for (let x = -58; x < 58; x += 16) if (rnd() < 0.55) { c.fillStyle = rnd() < 0.5 ? '#ffe9a8' : rnd() < 0.5 ? '#9ff6ff' : '#ff9cee'; c.fillRect(x, y, 9, 10); }
    c.strokeStyle = '#ff2bd6'; c.lineWidth = 3; c.shadowColor = '#ff2bd6'; c.shadowBlur = 10; c.strokeRect(-70, -h, 140, h); c.shadowBlur = 0;
  } },
  crane: { bw: 220, bh: 340, ww: 5200, paint(c) {
    c.strokeStyle = '#ff9a3d'; c.lineWidth = 7; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(-20, 0); c.lineTo(-20, -300); c.moveTo(20, 0); c.lineTo(20, -300); c.stroke();
    c.lineWidth = 3; for (let y = 0; y > -300; y -= 30) { c.beginPath(); c.moveTo(-20, y); c.lineTo(20, y - 30); c.stroke(); }
    c.lineWidth = 8; c.beginPath(); c.moveTo(-100, -300); c.lineTo(104, -300); c.stroke();
    c.lineWidth = 2; c.beginPath(); c.moveTo(80, -300); c.lineTo(80, -200); c.stroke(); rr(c, 66, -200, 28, 18, 2); c.fillStyle = '#39e4ff'; c.fill();
    c.fillStyle = '#ff2b5c'; c.shadowColor = '#ff2b5c'; c.shadowBlur = 12; circle(c, 104, -304, 5); c.fill(); circle(c, -100, -304, 5); c.fill(); c.shadowBlur = 0;
  } },
  buoy: { bw: 40, bh: 70, ww: 240, solid: true, paint(c) {
    rr(c, -9, -56, 18, 56, 6); c.fillStyle = '#20244f'; c.fill();
    c.shadowColor = '#00f0ff'; c.shadowBlur = 12; rr(c, -9, -56, 18, 12, 6); c.fillStyle = '#00f0ff'; c.fill(); c.shadowBlur = 0;
    rr(c, -9, -30, 18, 6, 2); c.fillStyle = '#ff2bd6'; c.fill();
  } },
  barrel: { bw: 70, bh: 90, ww: 520, solid: true, paint(c) {
    shadowAt(c, 28); rr(c, -26, -78, 52, 78, 10); c.fillStyle = lin(c, -26, 0, 26, 0, ['#ff6a3d', '#ffa15a', '#d6421a']); c.fill();
    c.fillStyle = '#2b2440'; c.fillRect(-26, -64, 52, 6); c.fillRect(-26, -20, 52, 6);
    c.fillStyle = '#ffd24a'; c.beginPath(); c.moveTo(0, -54); c.lineTo(12, -32); c.lineTo(-12, -32); c.closePath(); c.fill();
  } },

  /* ----------------------------- Désert de Cristal ----------------------------- */
  crystal: { bw: 110, bh: 170, ww: 1100, solid: true, paint(c) {
    shadowAt(c, 36);
    const shards = [[-24, 0, -34, -100, 12, '#ff8fe0'], [16, 0, 26, -150, 16, '#7fd8ff'], [36, 0, 46, -80, 10, '#b06bff'], [-2, 0, 0, -120, 12, '#a8f3ff']];
    for (const [x0, y0, x1, y1, w, col] of shards) {
      c.beginPath(); c.moveTo(x0 - w, y0); c.lineTo(x1 - w * 0.4, y1 + w); c.lineTo(x1, y1); c.lineTo(x1 + w * 0.4, y1 + w); c.lineTo(x0 + w, y0); c.closePath();
      c.fillStyle = lin(c, x0 - w, 0, x0 + w, 0, ['#ffffff', col, shade(col, -0.25)]); c.fill();
      c.globalAlpha = 0.5; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke(); c.globalAlpha = 1;
    }
  } },
  crystalBig: { bw: 200, bh: 320, ww: 4400, paint(c) {
    const shards = [[-50, -180, 30, '#b06bff'], [10, -290, 40, '#7fd8ff'], [64, -170, 28, '#ff8fe0']];
    for (const [x, y, w, col] of shards) { c.beginPath(); c.moveTo(x - w, 0); c.lineTo(x - w * 0.5, y + w); c.lineTo(x, y); c.lineTo(x + w * 0.5, y + w); c.lineTo(x + w, 0); c.closePath(); c.fillStyle = lin(c, x - w, 0, x + w, 0, ['#ffffff', col, shade(col, -0.3)]); c.fill(); }
  } },
  cactus: { bw: 110, bh: 170, ww: 1000, solid: true, paint(c) {
    shadowAt(c, 30); c.lineCap = 'round'; c.strokeStyle = '#2fa86a'; c.lineWidth = 30;
    c.beginPath(); c.moveTo(0, -10); c.lineTo(0, -140); c.moveTo(0, -70); c.lineTo(-30, -70); c.lineTo(-30, -110); c.moveTo(0, -90); c.lineTo(28, -90); c.lineTo(28, -126); c.stroke();
    c.strokeStyle = '#4fd08a'; c.lineWidth = 12; c.beginPath(); c.moveTo(-6, -20); c.lineTo(-6, -136); c.stroke();
    c.fillStyle = '#ff5c9d'; heartPath(c, 0, -152, 9); c.fill();
  } },
  rockpile: { bw: 140, bh: 90, ww: 1500, solid: true, paint(c) {
    shadowAt(c, 56); for (const [x, y, r, col] of [[-30, -28, 30, '#d9925a'], [24, -30, 34, '#e5a36a'], [0, -56, 26, '#f0b07a']]) { ell(c, x, y, r * 1.2, r); c.fillStyle = lin(c, 0, y - r, 0, y + r, [col, shade(col, -0.25)]); c.fill(); }
  } },
  mesa: { bw: 300, bh: 200, ww: 7000, paint(c) {
    c.beginPath(); c.moveTo(-140, 0); c.lineTo(-110, -150); c.lineTo(-70, -170); c.lineTo(60, -172); c.lineTo(110, -140); c.lineTo(140, 0); c.closePath();
    c.fillStyle = lin(c, 0, -172, 0, 0, ['#e88a5a', '#c9643a']); c.fill();
    c.fillStyle = 'rgba(255,255,255,.18)'; for (let y = -150; y < 0; y += 30) c.fillRect(-130, y, 260, 8);
  } },
  flag: { bw: 40, bh: 90, ww: 260, solid: true, paint(c) {
    rr(c, -3, -84, 6, 84, 3); c.fillStyle = '#fff3d6'; c.fill();
    c.beginPath(); c.moveTo(3, -84); c.lineTo(32, -74); c.lineTo(3, -62); c.closePath(); c.fillStyle = '#ff7a3d'; c.fill();
  } },
  crystalRock: { bw: 80, bh: 80, ww: 560, solid: true, paint(c) {
    shadowAt(c, 30); c.beginPath(); c.moveTo(-32, 0); c.lineTo(-22, -50); c.lineTo(0, -70); c.lineTo(26, -46); c.lineTo(32, 0); c.closePath(); c.fillStyle = lin(c, -32, 0, 32, 0, ['#fff', '#b06bff', '#6e2fd0']); c.fill();
  } },

  /* -------------------------------- Lune Givrée -------------------------------- */
  pine: { bw: 120, bh: 210, ww: 1300, solid: true, paint(c) {
    shadowAt(c, 36); rr(c, -7, -40, 14, 40, 4); c.fillStyle = '#7a5a3a'; c.fill();
    for (let i = 0; i < 4; i++) { const y = -30 - i * 40, w = 54 - i * 10; c.beginPath(); c.moveTo(-w, y); c.lineTo(0, y - 64); c.lineTo(w, y); c.closePath(); c.fillStyle = lin(c, 0, y - 64, 0, y, ['#3aa87a', '#1f6f58']); c.fill();
      c.beginPath(); c.moveTo(-w * 0.55, y - 28); c.lineTo(0, y - 64); c.lineTo(w * 0.55, y - 28); c.quadraticCurveTo(w * 0.2, y - 20, 0, y - 30); c.quadraticCurveTo(-w * 0.2, y - 20, -w * 0.55, y - 28); c.closePath(); c.fillStyle = '#fff'; c.fill(); }
  } },
  icecrystal: { bw: 100, bh: 170, ww: 1000, solid: true, paint(c) {
    shadowAt(c, 30);
    for (const [x, h, w] of [[-20, 110, 16], [10, 150, 20], [32, 90, 12]]) { c.beginPath(); c.moveTo(x - w, 0); c.lineTo(x - w * 0.6, -h + w); c.lineTo(x, -h); c.lineTo(x + w * 0.6, -h + w); c.lineTo(x + w, 0); c.closePath(); c.fillStyle = lin(c, x - w, 0, x + w, 0, ['#ffffff', '#a9e8ff', '#5aa8e8']); c.fill(); }
  } },
  icecrystalBig: { bw: 200, bh: 300, ww: 4600, paint(c) {
    for (const [x, h, w] of [[-60, 180, 34], [0, 280, 44], [62, 200, 32]]) { c.beginPath(); c.moveTo(x - w, 0); c.lineTo(x - w * 0.6, -h + w); c.lineTo(x, -h); c.lineTo(x + w * 0.6, -h + w); c.lineTo(x + w, 0); c.closePath(); c.fillStyle = lin(c, x - w, 0, x + w, 0, ['#ffffff', '#a9e8ff', '#4a8ad8']); c.fill(); }
  } },
  snowman: { bw: 90, bh: 160, ww: 900, solid: true, paint(c) {
    shadowAt(c, 30); circle(c, 0, -34, 34); c.fillStyle = rad(c, -10, -44, 2, 36, ['#fff', '#dfeeff']); c.fill();
    circle(c, 0, -90, 26); c.fill(); circle(c, 0, -134, 19); c.fill();
    c.fillStyle = '#1a1d38'; circle(c, -6, -138, 3); c.fill(); circle(c, 6, -138, 3); c.fill();
    c.beginPath(); c.moveTo(0, -132); c.lineTo(18, -129); c.lineTo(0, -127); c.closePath(); c.fillStyle = '#ff8a3d'; c.fill();
    rr(c, -22, -112, 44, 8, 4); c.fillStyle = '#ff5c9d'; c.fill(); rr(c, 8, -108, 8, 26, 3); c.fill();
    c.fillStyle = '#39e4ff'; heartPath(c, 0, -92, 6); c.fill();
  } },
  igloo: { bw: 220, bh: 130, ww: 4200, paint(c) {
    c.beginPath(); c.arc(0, 0, 100, Math.PI, TAU); c.closePath(); c.fillStyle = rad(c, -30, -70, 10, 110, ['#fff', '#dfeeff', '#b9cdee']); c.fill();
    c.strokeStyle = '#a9c0e8'; c.lineWidth = 3; for (const r of [70, 40]) { c.beginPath(); c.arc(0, 0, 100, Math.PI, TAU); c.stroke(); c.beginPath(); c.moveTo(-Math.sqrt(100 * 100 - r * r), -r); c.lineTo(Math.sqrt(100 * 100 - r * r), -r); c.stroke(); }
    c.beginPath(); c.arc(0, 0, 32, Math.PI, TAU); c.closePath(); c.fillStyle = '#3a5a9a'; c.fill();
  } },
  icepole: { bw: 40, bh: 80, ww: 250, solid: true, paint(c) {
    rr(c, -6, -70, 12, 70, 5); c.fillStyle = '#fff'; c.fill(); c.fillStyle = '#56d6f5'; for (let i = 0; i < 3; i++) c.fillRect(-6, -66 + i * 22, 12, 9);
  } },
  iceRock: { bw: 90, bh: 80, ww: 600, solid: true, paint(c) {
    shadowAt(c, 32); c.beginPath(); c.moveTo(-36, 0); c.lineTo(-28, -42); c.lineTo(-4, -64); c.lineTo(24, -50); c.lineTo(36, 0); c.closePath(); c.fillStyle = lin(c, -36, 0, 36, 0, ['#fff', '#a9e8ff', '#5aa8e8']); c.fill();
  } },

  /* ------------------------------- Cœur du Glitch ------------------------------- */
  pillar: { bw: 70, bh: 230, ww: 800, solid: true, paint(c) {
    rr(c, -22, -210, 44, 210, 4); c.fillStyle = lin(c, -22, 0, 22, 0, ['#1b1f4b', '#2a2f6a', '#141731']); c.fill();
    c.shadowBlur = 12; for (let i = 0; i < 6; i++) { const col = i % 2 ? '#00f0ff' : '#ff2bd6'; c.shadowColor = col; c.fillStyle = col; c.fillRect(-22, -200 + i * 34, 44, 4); } c.shadowBlur = 0;
  } },
  cube: { bw: 100, bh: 160, ww: 900, paint(c) {
    c.save(); c.translate(0, -100);
    c.beginPath(); c.moveTo(0, -40); c.lineTo(36, -20); c.lineTo(36, 22); c.lineTo(0, 42); c.lineTo(-36, 22); c.lineTo(-36, -20); c.closePath(); c.fillStyle = '#1b1f4b'; c.fill();
    c.strokeStyle = '#00f0ff'; c.lineWidth = 3; c.shadowColor = '#00f0ff'; c.shadowBlur = 12; c.stroke();
    c.beginPath(); c.moveTo(-36, -20); c.lineTo(0, 0); c.lineTo(36, -20); c.moveTo(0, 0); c.lineTo(0, 42); c.strokeStyle = '#ff2bd6'; c.shadowColor = '#ff2bd6'; c.stroke(); c.shadowBlur = 0;
    c.restore(); ell(c, 0, -2, 24, 5); c.fillStyle = 'rgba(0,240,255,.25)'; c.fill();
  } },
  cubeBig: { bw: 200, bh: 300, ww: 4000, paint(c) {
    c.save(); c.translate(0, -170); c.scale(2.3, 2.3);
    c.beginPath(); c.moveTo(0, -40); c.lineTo(36, -20); c.lineTo(36, 22); c.lineTo(0, 42); c.lineTo(-36, 22); c.lineTo(-36, -20); c.closePath(); c.fillStyle = '#160f3a'; c.fill();
    c.strokeStyle = '#ff2bd6'; c.lineWidth = 2; c.shadowColor = '#ff2bd6'; c.shadowBlur = 10; c.stroke(); c.shadowBlur = 0; c.restore();
  } },
  pixeltree: { bw: 100, bh: 170, ww: 1100, solid: true, paint(c) {
    shadowAt(c, 30); c.fillStyle = '#ff2bd6'; c.fillRect(-6, -50, 12, 50);
    const px = 14, rows = ['0011100', '0111110', '1111111', '1111111', '0111110', '0011100'];
    rows.forEach((r, j) => { for (let i = 0; i < 7; i++) if (r[i] === '1') { c.fillStyle = (i + j) % 3 ? '#00f0ff' : '#16e0a0'; c.fillRect(-49 + i * px, -140 + j * px, px - 1, px - 1); } });
  } },
  tower: { bw: 160, bh: 380, ww: 5000, paint(c) {
    c.beginPath(); c.moveTo(-50, 0); c.lineTo(-30, -320); c.lineTo(0, -360); c.lineTo(30, -320); c.lineTo(50, 0); c.closePath(); c.fillStyle = lin(c, 0, -360, 0, 0, ['#2a1060', '#0e0a2a']); c.fill();
    c.strokeStyle = '#00f0ff'; c.lineWidth = 3; c.shadowColor = '#00f0ff'; c.shadowBlur = 10; c.stroke(); c.shadowBlur = 0;
    c.fillStyle = '#ff2bd6'; for (let y = -300; y < -20; y += 40) c.fillRect(-20, y, 40, 6);
  } },
  barrier: { bw: 40, bh: 70, ww: 250, solid: true, paint(c) {
    rr(c, -8, -60, 16, 60, 3); c.fillStyle = '#141731'; c.fill(); c.shadowColor = '#ff2bd6'; c.shadowBlur = 10; c.fillStyle = '#ff2bd6'; c.fillRect(-8, -60, 16, 6); c.shadowBlur = 0;
  } },
  glitchBlock: { bw: 80, bh: 90, ww: 560, solid: true, paint(c) {
    shadowAt(c, 30); rr(c, -30, -64, 60, 60, 4); c.fillStyle = '#1b1f4b'; c.fill(); c.strokeStyle = '#ff2bd6'; c.lineWidth = 3; c.shadowColor = '#ff2bd6'; c.shadowBlur = 10; c.stroke(); c.shadowBlur = 0;
    c.fillStyle = '#00f0ff'; c.font = 'bold 34px sans-serif'; c.textAlign = 'center'; c.fillText('!', 0, -22);
  } },
};

/* ------------------------------- arche & panneau ------------------------------- */

function paintArch(c, theme) {
  const W = 300, H = 170;
  for (const s of [-1, 1]) {
    rr(c, s * W / 2 - 14, -H, 28, H, 8); c.fillStyle = lin(c, s * W / 2 - 14, 0, s * W / 2 + 14, 0, [theme.rumble[0], shade(theme.rumble[0], -0.25)]); c.fill();
    c.fillStyle = '#fff'; for (let i = 0; i < 6; i++) c.fillRect(s * W / 2 - 14, -H + 20 + i * 24, 28, 8);
  }
  rr(c, -W / 2 - 20, -H - 34, W + 40, 44, 14); c.fillStyle = lin(c, 0, -H - 34, 0, -H + 10, ['#2a1a6e', '#160d44']); c.fill();
  c.strokeStyle = theme.rumble[1] === '#ffffff' ? theme.rumble[0] : theme.rumble[1]; c.lineWidth = 4; c.stroke();
  // damier
  for (let i = 0; i < 30; i++) for (let j = 0; j < 2; j++) if ((i + j) % 2) { c.fillStyle = '#fff'; c.fillRect(-W / 2 - 14 + i * ((W + 28) / 30), -H + 12 + j * 7, (W + 28) / 30, 7); } else { c.fillStyle = '#1a1d38'; c.fillRect(-W / 2 - 14 + i * ((W + 28) / 30), -H + 12 + j * 7, (W + 28) / 30, 7); }
  c.font = '800 28px "Fredoka Variable", Fredoka, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = '#fff'; c.fillText('LAYJOU', -38, -H - 12); c.fillStyle = '#ffd24a'; c.fillText('KART', 66, -H - 12);
  heartPath(c, 14, -H - 13, 8); c.fillStyle = '#ff5c9d'; c.fill();
}

function paintBillboard(c, logo) {
  rr(c, -4, -120, 8, 120, 3); c.fillStyle = '#4a4f85'; c.fill();
  rr(c, -90, -190, 180, 84, 12); c.fillStyle = '#ffffff'; c.fill(); c.strokeStyle = '#ff5c9d'; c.lineWidth = 6; c.stroke();
  if (logo && logo.complete && logo.naturalWidth) { const w = 150, h = w * logo.naturalHeight / logo.naturalWidth; c.drawImage(logo, -w / 2, -164 - h / 2 + 4, w, h); }
  c.font = '800 20px "Fredoka Variable", Fredoka, sans-serif'; c.textAlign = 'center'; c.fillStyle = '#ff5c9d'; c.fillText('KART', 0, -118);
}

/** Métadonnées sans peinture (collisions) : largeur monde et solidité. */
export function spriteMeta(kind) {
  if (kind === 'arch') return { ww: 2 * 2000 * 1.42, solid: false };
  if (kind === 'billboard') return { ww: 2600, solid: true };
  const d = DEF[kind] || DEF.gumball; return { ww: d.ww, solid: !!d.solid };
}

/* ------------------------------------ cache ------------------------------------ */

const RES = 2.2; // pixels par unité de peinture
const cache = new Map();
let logoImg = null;

export function loadLogo() {
  if (logoImg) return Promise.resolve(logoImg);
  return new Promise((resolve) => {
    const img = new Image(); img.onload = () => { logoImg = img; cache.delete('billboard'); resolve(img); }; img.onerror = () => resolve(null); img.src = './layjou-logo.png';
  });
}

/** @returns {{img:HTMLCanvasElement, ww:number, wh:number, solid:boolean}} */
export function sprite(kind, theme) {
  const key = kind === 'arch' ? 'arch:' + theme.rumble.join() : kind;
  let s = cache.get(key);
  if (s) return s;
  let bw, bh, ww, paint, solid = false;
  if (kind === 'arch') { bw = 380; bh = 230; ww = 2 * 2000 * 1.42; paint = (c) => paintArch(c, theme); }
  else if (kind === 'billboard') { bw = 200; bh = 200; ww = 2600; paint = (c) => paintBillboard(c, logoImg); solid = true; }
  else { const d = DEF[kind] || DEF.gumball; ({ bw, bh, ww } = d); solid = !!d.solid; const rnd = seeded(key.length * 977 + bw); paint = (c) => d.paint(c, rnd); }
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(bw * RES); cv.height = Math.ceil(bh * RES);
  const c = cv.getContext('2d');
  c.setTransform(RES, 0, 0, RES, (bw / 2) * RES, bh * RES); c.lineJoin = 'round';
  paint(c);
  s = { img: cv, ww, wh: ww * (bh / bw), solid };
  cache.set(key, s);
  return s;
}

/* ------------------------------- fonds & ciel ------------------------------- */

/** Bande de fond qui se répète horizontalement. kind : 'far' | 'near' */
export function paintLayer(theme, worldId, kind, w, h) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d'), rnd = seeded((kind === 'far' ? 11 : 23) * worldId.length + w);
  const [c1, c2] = kind === 'far' ? theme.far : theme.near;
  const g = lin(c, 0, 0, 0, h, [c2, c1]);
  c.fillStyle = g;
  const wave = (amp, base, freq, jag = 0) => {
    c.beginPath(); c.moveTo(0, h);
    for (let x = 0; x <= w; x += 4) {
      const t = (x / w) * TAU;
      let y = base + Math.sin(t * freq) * amp + Math.sin(t * freq * 2.3 + 1) * amp * 0.4;
      if (jag) y += (Math.abs(((x / jag) % 2) - 1) - 0.5) * jag * 0.6;
      c.lineTo(x, y);
    }
    c.lineTo(w, h); c.closePath(); c.fill();
  };
  if (worldId === 'harbor' && kind === 'far') {
    // skyline
    let x = 0;
    while (x < w) { const bw = 30 + rnd() * 60, bh = h * (0.3 + rnd() * 0.55); c.fillStyle = g; c.fillRect(x, h - bh, bw, bh); for (let yy = h - bh + 8; yy < h - 6; yy += 10) for (let xx = x + 5; xx < x + bw - 6; xx += 9) if (rnd() < 0.35) { c.fillStyle = rnd() < 0.6 ? 'rgba(255,233,168,.8)' : 'rgba(159,246,255,.8)'; c.fillRect(xx, yy, 4, 5); } x += bw + 4 + rnd() * 10; }
  } else if (worldId === 'glitch' && kind === 'far') {
    wave(h * 0.12, h * 0.5, 3, 40);
    c.strokeStyle = 'rgba(0,240,255,.35)'; c.lineWidth = 1.5; for (let x = 0; x < w; x += 32) { c.beginPath(); c.moveTo(x, h * 0.45); c.lineTo(x, h); c.stroke(); }
  } else if (worldId === 'desert' && kind === 'far') {
    for (let i = 0; i < 7; i++) { const x = (i / 7) * w + rnd() * 60, bw = 80 + rnd() * 120, bh = h * (0.35 + rnd() * 0.4); c.beginPath(); c.moveTo(x - 10, h); c.lineTo(x, h - bh); c.lineTo(x + bw, h - bh - rnd() * 10); c.lineTo(x + bw + 14, h); c.closePath(); c.fill(); }
  } else if (worldId === 'frost' && kind === 'far') {
    c.beginPath(); c.moveTo(0, h); let x = 0; while (x < w) { const pw = 70 + rnd() * 90, ph = h * (0.4 + rnd() * 0.5); c.lineTo(x + pw / 2, h - ph); c.lineTo(x + pw, h * 0.75); x += pw; } c.lineTo(w, h); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,.8)'; x = 0; const r2 = seeded(5); while (x < w) { const pw = 70 + r2() * 90, ph = h * (0.4 + r2() * 0.5); x += pw; }
  } else if (kind === 'far') {
    wave(h * 0.16, h * 0.45, 4);
  } else {
    wave(h * 0.1, h * 0.55, 6);
    // silhouettes d'arbres / objets
    const n = 26;
    for (let i = 0; i < n; i++) {
      const x = rnd() * w, s = 0.5 + rnd() * 0.7, base = h * 0.6;
      c.fillStyle = shade(c2[0] === '#' ? c2 : '#333333', -0.12);
      if (worldId === 'candy') { circle(c, x, base - 26 * s, 18 * s); c.fill(); c.fillRect(x - 2, base - 14 * s, 4, 16 * s); }
      else if (worldId === 'frost') { c.beginPath(); c.moveTo(x - 14 * s, base); c.lineTo(x, base - 46 * s); c.lineTo(x + 14 * s, base); c.closePath(); c.fill(); }
      else if (worldId === 'desert') { c.fillRect(x - 3 * s, base - 30 * s, 6 * s, 30 * s); c.fillRect(x - 10 * s, base - 22 * s, 7 * s, 4 * s); }
      else if (worldId === 'harbor') { c.fillRect(x, base - 50 * s, 3, 50 * s); c.fillStyle = 'rgba(255,43,214,.7)'; c.fillRect(x - 1, base - 52 * s, 5, 3); }
      else { c.fillStyle = 'rgba(255,43,214,.5)'; c.fillRect(x, base - 40 * s, 10 * s, 40 * s); }
    }
    if (theme.water) { c.fillStyle = 'rgba(0,240,255,.12)'; for (let i = 0; i < 40; i++) c.fillRect(rnd() * w, h * 0.65 + rnd() * h * 0.35, 20 + rnd() * 40, 2); }
  }
  return cv;
}

/** Ciel complet (dégradé, astre, étoiles, aurore) peint à la taille de l'écran. */
export function paintSky(theme, w, h, horizonY) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  c.fillStyle = lin(c, 0, 0, 0, horizonY, theme.sky); c.fillRect(0, 0, w, h);
  const rnd = seeded(42);
  if (theme.stars) { for (let i = 0; i < 120; i++) { c.globalAlpha = 0.3 + rnd() * 0.7; c.fillStyle = '#fff'; const r = rnd() < 0.1 ? 1.6 : 0.8; circle(c, rnd() * w, rnd() * horizonY * 0.85, r * (w / 400)); c.fill(); } c.globalAlpha = 1; }
  if (theme.aurora) {
    for (let k = 0; k < 3; k++) {
      c.globalAlpha = 0.22; c.beginPath();
      for (let x = 0; x <= w; x += 8) c.lineTo(x, horizonY * (0.25 + k * 0.08) + Math.sin(x / w * 7 + k) * horizonY * 0.08);
      for (let x = w; x >= 0; x -= 8) c.lineTo(x, horizonY * (0.45 + k * 0.08) + Math.sin(x / w * 7 + k + 0.5) * horizonY * 0.1);
      c.closePath(); c.fillStyle = lin(c, 0, 0, w, 0, ['#3ddc97', '#39e4ff', '#a56bff', '#3ddc97']); c.fill();
    }
    c.globalAlpha = 1;
  }
  if (theme.sun) {
    const s = theme.sun, x = s.x * w, y = s.y * h, r = s.r * w;
    c.fillStyle = rad(c, x, y, r * 0.5, r * 3.2, [s.glow, 'rgba(255,255,255,0)']); c.fillRect(0, 0, w, horizonY);
    circle(c, x, y, r); c.fillStyle = s.c; c.fill();
  }
  if (theme.moon) {
    const m = theme.moon, x = m.x * w, y = m.y * h, r = m.r * w;
    c.fillStyle = rad(c, x, y, r, r * 3, ['rgba(200,220,255,.35)', 'rgba(200,220,255,0)']); c.fillRect(0, 0, w, horizonY);
    circle(c, x, y, r); c.fillStyle = '#f2f6ff'; c.fill();
    c.fillStyle = 'rgba(160,180,230,.5)'; circle(c, x - r * 0.3, y - r * 0.2, r * 0.22); c.fill(); circle(c, x + r * 0.35, y + r * 0.25, r * 0.15); c.fill();
  }
  // nuages doux (mondes de jour)
  if (!theme.stars) {
    c.fillStyle = 'rgba(255,255,255,.75)';
    for (let i = 0; i < 6; i++) { const x = rnd() * w, y = horizonY * (0.15 + rnd() * 0.5), s = (0.6 + rnd()) * w / 400; for (const [dx, dy, r] of [[0, 0, 16], [16, 4, 12], [-16, 5, 11], [8, -8, 12]]) { circle(c, x + dx * s, y + dy * s, r * s); c.fill(); } }
  }
  if (theme.grid) {
    c.strokeStyle = 'rgba(255,43,214,.25)'; c.lineWidth = 1;
    for (let i = 0; i < 12; i++) { const y = horizonY * (0.6 + i * 0.035); c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  }
  return cv;
}
