/* ------------------------------------------------------------------ *
 *  LayJou — rendu vectoriel animable du héros.
 *  Repère local : origine aux pieds, y négatif vers le haut,
 *  hauteur totale ≈ 200 unités (antenne comprise).
 * ------------------------------------------------------------------ */
import { TAU, clamp, lerp, hsl, arc, easeOut } from '../core/util.js';
import { SKINS, byId } from './data.js';

const HIP_Y = -38;

export function resolvePal(skin, t = 0) {
  const def = typeof skin === 'string' ? byId(SKINS, skin) : skin && skin.pal ? skin : null;
  const pal = def ? def.pal : skin || SKINS[0].pal;
  if (def && def.rainbow) {
    const h = t * 70;
    return { ...pal, main: hsl(h, 85, 58), mainDark: hsl(h, 80, 44), accent: hsl(h + 150, 95, 66), accentLight: hsl(h + 150, 100, 82), eyeRing: hsl(h + 60, 100, 80), eye: hsl(h + 40, 90, 60) };
  }
  return pal;
}

export function basePose() {
  return {
    rootRot: 0, rootX: 0, rootY: 0,
    bob: 0, lean: 0, headTilt: 0, turn: 0, squash: 0,
    hfx: 40, hfy: -50, hbx: -40, hby: -50, bendF: 6, bendB: -6,
    ffx: 15, ffy: 0, ffr: 0, fbx: -15, fby: 0, fbr: 0,
    wAngle: 0, shield: 0, glow: 0, lookX: 0, lookY: 0, blink: 0,
    eyes: 'open', mouth: 'smile', fistF: 0, fistB: 0, weaponOn: 1, hsF: 1, hsB: 1, fsF: 1, fsB: 1,
  };
}

const NUM_KEYS = ['rootRot', 'rootX', 'rootY', 'bob', 'lean', 'headTilt', 'turn', 'squash', 'hfx', 'hfy', 'hbx', 'hby', 'bendF', 'bendB',
  'ffx', 'ffy', 'ffr', 'fbx', 'fby', 'fbr', 'wAngle', 'shield', 'glow', 'lookX', 'lookY', 'fistF', 'fistB', 'weaponOn', 'hsF', 'hsB', 'fsF', 'fsB'];

/** Interpolation douce d'une pose vers une autre (k = 0..1). */
export function blendPose(cur, target, k) {
  for (const key of NUM_KEYS) cur[key] = lerp(cur[key], target[key], k);
  cur.eyes = target.eyes; cur.mouth = target.mouth; cur.blink = target.blink;
  return cur;
}

/**
 * Bibliothèque de poses. `t` = temps global (s), `p` = progression 0..1 de l'action.
 */
export function poseOf(name, t = 0, p = 0) {
  const o = basePose();
  const breathe = Math.sin(t * 3.2);
  const blink = (t % 3.7) > 3.55 ? 1 : 0;
  o.blink = blink;
  switch (name) {
    case 'wave': { // menu : salut joyeux (pose de l'illustration d'origine)
      o.turn = 0.05; o.headTilt = -0.1 + Math.sin(t * 1.6) * 0.03; o.bob = breathe * 1.6;
      o.hfx = 70 + Math.sin(t * 7) * 6; o.hfy = -108 + Math.cos(t * 7) * 3; o.bendF = 9;
      o.hbx = -46; o.hby = -44 + breathe; o.fbx = -22; o.fby = -3 - Math.max(0, Math.sin(t * 1.6)) * 3; o.fbr = -0.25;
      o.ffx = 14; o.eyes = 'open'; o.mouth = 'smile'; o.lookX = Math.sin(t * 0.7) * 0.4; o.weaponOn = 0;
      break;
    }
    case 'proud': { // hangar : présente son équipement
      o.turn = 0.3; o.bob = breathe * 1.4; o.headTilt = Math.sin(t * 1.3) * 0.04;
      o.hfx = 46; o.hfy = -66 + breathe; o.wAngle = -0.5 + Math.sin(t * 1.3) * 0.08; o.hbx = -38; o.hby = -40; o.bendB = -12;
      o.fistB = 1; o.eyes = 'open'; o.mouth = 'smile';
      break;
    }
    case 'idle': { // garde de combat
      o.turn = 0.55; o.lean = 0.07; o.bob = breathe * 1.8; o.headTilt = 0.02;
      o.hfx = 36; o.hfy = -66 + breathe * 1.5; o.hbx = -22; o.hby = -58 - breathe; o.bendF = 12; o.bendB = -10;
      o.ffx = 22; o.fbx = -16; o.fistF = 1; o.fistB = 1; o.wAngle = -0.35; o.eyes = 'focus'; o.mouth = 'smirk'; o.lookX = 0.6;
      break;
    }
    case 'punch1': { // direct du bras avant
      const e = arc(p);
      o.turn = 0.6; o.lean = 0.07 + 0.2 * e; o.bob = -2 * e;
      o.hfx = 36 + 50 * e; o.hfy = -66 - 8 * e; o.bendF = 12 * (1 - e); o.hbx = -30; o.hby = -54; o.bendB = -12;
      o.ffx = 22 + 10 * e; o.fbx = -18; o.fistF = 1; o.fistB = 1; o.weaponOn = 0; o.eyes = 'angry'; o.mouth = 'open'; o.lookX = 0.8;
      break;
    }
    case 'punch2': { // croisé du bras arrière
      const e = arc(p);
      o.turn = 0.7; o.lean = 0.1 + 0.22 * e; o.bob = -2 * e;
      o.hbx = -22 + 96 * e; o.hby = -58 - 10 * e; o.bendB = -10 * (1 - e); o.hfx = 30 - 14 * e; o.hfy = -62; o.bendF = 14;
      o.ffx = 24 + 8 * e; o.fbx = -12 + 8 * e; o.fistF = 1; o.fistB = 1; o.weaponOn = 0; o.eyes = 'angry'; o.mouth = 'open'; o.lookX = 0.8;
      break;
    }
    case 'punch3': { // uppercut sauté
      const e = easeOut(p), a = arc(p);
      o.turn = 0.6; o.lean = 0.2 - 0.3 * e; o.rootY = -34 * a; o.squash = -0.08 * a;
      o.hfx = 40 + 26 * e; o.hfy = -40 - 96 * e; o.bendF = 16; o.hbx = -34; o.hby = -50 + 10 * e; o.bendB = -12;
      o.ffx = 20; o.ffy = -4 * a; o.fbx = -14; o.fby = -10 * a; o.fbr = -0.3 * a; o.fistF = 1; o.fistB = 1; o.weaponOn = 0;
      o.eyes = 'angry'; o.mouth = 'open'; o.lookX = 0.7; o.lookY = -0.5;
      break;
    }
    case 'shoot': {
      const k = 1 - easeOut(p);
      o.turn = 0.6; o.lean = -0.04 - 0.1 * k; o.bob = 1.5 * k;
      o.hfx = 64 - 14 * k; o.hfy = -78 - 6 * k; o.bendF = 4; o.wAngle = -0.5 * k; o.hbx = -30; o.hby = -52; o.bendB = -12;
      o.ffx = 22; o.fbx = -20; o.fistB = 1; o.eyes = 'focus'; o.mouth = 'grit'; o.lookX = 0.8;
      break;
    }
    case 'slash': { // arme de mêlée
      const e = easeOut(p);
      o.turn = 0.65; o.lean = -0.12 + 0.36 * e; o.bob = -3 * arc(p);
      o.hfx = 20 + 54 * e; o.hfy = -122 + 74 * e; o.bendF = 14; o.wAngle = -1.9 + 2.6 * e; o.hbx = -34; o.hby = -50; o.bendB = -10;
      o.ffx = 24 + 8 * e; o.fbx = -18; o.fistB = 1; o.eyes = 'angry'; o.mouth = 'open'; o.lookX = 0.8;
      break;
    }
    case 'block': {
      o.turn = 0.5; o.lean = -0.05; o.squash = 0.035; o.bob = 2;
      o.hfx = 40; o.hfy = -82; o.bendF = 16; o.hbx = 22; o.hby = -64; o.bendB = -18; o.wAngle = -1.2;
      o.ffx = 24; o.fbx = -20; o.fistF = 1; o.fistB = 1; o.shield = 1; o.eyes = 'focus'; o.mouth = 'grit'; o.lookX = 0.6; o.weaponOn = 0;
      break;
    }
    case 'dodge': {
      const a = arc(p);
      o.turn = 0.4; o.lean = -0.38 * a; o.rootY = -22 * a; o.squash = -0.05 * a;
      o.hfx = 30; o.hfy = -86; o.hbx = -52; o.hby = -70; o.ffx = 26; o.ffy = -8 * a; o.ffr = 0.3 * a; o.fbx = -12; o.fby = -4 * a;
      o.eyes = 'happy'; o.mouth = 'open'; o.weaponOn = 0;
      break;
    }
    case 'hit': {
      const k = 1 - p;
      o.turn = 0.5; o.lean = -0.3 * k; o.headTilt = -0.22 * k; o.squash = 0.05 * k;
      o.hfx = 30; o.hfy = -92; o.hbx = -50; o.hby = -84; o.ffx = 16; o.fbx = -24;
      o.eyes = 'hurt'; o.mouth = 'o'; o.weaponOn = 0;
      break;
    }
    case 'break': { // garde brisée, sonné
      o.turn = 0.4; o.lean = -0.16 + Math.sin(t * 9) * 0.05; o.headTilt = Math.sin(t * 7) * 0.12;
      o.hfx = 46; o.hfy = -38; o.hbx = -46; o.hby = -38; o.eyes = 'ko'; o.mouth = 'o'; o.weaponOn = 0;
      break;
    }
    case 'ko': {
      const e = easeOut(p);
      o.turn = 0.3; o.rootRot = -1.42 * e; o.rootY = -10 * arc(Math.min(1, p * 1.4)); o.rootX = -30 * e;
      o.hfx = 50; o.hfy = -80; o.hbx = -50; o.hby = -70; o.eyes = 'ko'; o.mouth = 'o'; o.weaponOn = 0;
      break;
    }
    case 'victory': {
      const j = Math.abs(Math.sin(t * 5.2));
      o.turn = 0; o.rootY = -22 * j; o.squash = -0.05 * j + 0.03 * (1 - j); o.headTilt = Math.sin(t * 5.2) * 0.07;
      o.hfx = 72; o.hfy = -122 - 8 * j; o.hbx = -72; o.hby = -120 - 8 * j; o.bendF = -8; o.bendB = 8;
      o.ffx = 16; o.ffy = -5 * j; o.fbx = -16; o.fby = -5 * j; o.eyes = 'happy'; o.mouth = 'open'; o.weaponOn = 0; o.glow = 0.6;
      break;
    }
    case 'ult': { // Super Cœur
      const up = easeOut(Math.min(1, p * 4));
      o.turn = 0.45; o.rootY = -34 * up + Math.sin(t * 20) * 1.2; o.lean = -0.1 * up;
      o.hfx = 70; o.hfy = -104; o.hbx = -68; o.hby = -100; o.bendF = -10; o.bendB = 10;
      o.ffx = 12; o.ffy = -6; o.ffr = 0.3; o.fbx = -14; o.fby = -2; o.fbr = 0.2; o.glow = 1.6;
      o.eyes = 'angry'; o.mouth = 'open'; o.lookX = 0.8; o.weaponOn = 0;
      break;
    }
    default:
  }
  return o;
}

/* ----------------------------- primitives ----------------------------- */

function blob(ctx, cx, cy, rx, ry, k = 0.72) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - ry);
  ctx.bezierCurveTo(cx + rx * k, cy - ry, cx + rx, cy - ry * k, cx + rx, cy);
  ctx.bezierCurveTo(cx + rx, cy + ry * k, cx + rx * k, cy + ry, cx, cy + ry);
  ctx.bezierCurveTo(cx - rx * k, cy + ry, cx - rx, cy + ry * k, cx - rx, cy);
  ctx.bezierCurveTo(cx - rx, cy - ry * k, cx - rx * k, cy - ry, cx, cy - ry);
  ctx.closePath();
}
const circle = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, Math.max(0.01, r), 0, TAU); };
const ell = (ctx, x, y, rx, ry, rot = 0) => { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU); };

function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.95);
  ctx.bezierCurveTo(x - s * 1.5, y - s * 0.1, x - s * 0.75, y - s * 1.15, x, y - s * 0.38);
  ctx.bezierCurveTo(x + s * 0.75, y - s * 1.15, x + s * 1.5, y - s * 0.1, x, y + s * 0.95);
  ctx.closePath();
}
export { heartPath };

/** Membre rayé (bras / jambe) : trait épais blanc + anneaux de couleur. */
function limb(ctx, x0, y0, x1, y1, w, bend, pal, dashOffset = 0) {
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
  const cx = mx + (-dy / len) * bend, cy = my + (dx / len) * bend;
  const path = () => { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, x1, y1); };
  ctx.lineCap = 'round';
  path(); ctx.strokeStyle = pal.shellShade; ctx.lineWidth = w + 2.2; ctx.stroke();
  path(); ctx.strokeStyle = pal.shell; ctx.lineWidth = w; ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.setLineDash([w * 0.5, w * 0.62]); ctx.lineDashOffset = dashOffset;
  path(); ctx.strokeStyle = pal.main; ctx.lineWidth = w; ctx.stroke();
  ctx.setLineDash([]);
  // ombre douce sous le membre
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.16; ctx.strokeStyle = pal.mainDark; ctx.lineWidth = w * 0.3;
  ctx.beginPath(); ctx.moveTo(x0 + 1, y0 + w * 0.3); ctx.quadraticCurveTo(cx + 1, cy + w * 0.3, x1, y1 + w * 0.3); ctx.stroke();
  ctx.globalAlpha = 1;
}

function hand(ctx, x, y, pal, fist, ang = -Math.PI / 2, k = 1) {
  const r = (10 + fist * 1.2) * k;
  if (fist <= 0.5) {
    // doigts de moufle, orientés dans le prolongement du bras
    ctx.fillStyle = pal.main;
    for (const [da, rr, d] of [[-1.25, 4.6, 0.92], [-0.42, 4.5, 1.0], [0.2, 4.6, 1.02], [0.8, 4.2, 0.96]]) {
      circle(ctx, x + Math.cos(ang + da) * r * d, y + Math.sin(ang + da) * r * d, rr * k); ctx.fill();
    }
  }
  if (fist > 0.5) {
    // phalanges : trois bosses sur l'avant du poing
    for (let i = -1; i <= 1; i++) {
      const a = ang + i * 0.5, bx = x + Math.cos(a) * r * 0.74, by = y + Math.sin(a) * r * 0.74;
      circle(ctx, bx, by, r * 0.37 + 1.1 * k); ctx.fillStyle = pal.mainDark; ctx.fill();
      circle(ctx, bx, by, r * 0.37); ctx.fillStyle = pal.main; ctx.fill();
    }
  }
  circle(ctx, x, y, r + 1.1 * k); ctx.fillStyle = pal.mainDark; ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, 1, x, y, r);
  g.addColorStop(0, lighten(pal.main)); g.addColorStop(0.55, pal.main); g.addColorStop(1, pal.mainDark);
  circle(ctx, x, y, r); ctx.fillStyle = g; ctx.fill();
  if (fist > 0.5) {
    ctx.strokeStyle = pal.mainDark; ctx.lineWidth = 1.2 * k; ctx.globalAlpha = 0.55;
    for (let i = -1; i <= 1; i++) {
      const a = ang + i * 0.42;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.3, a - 1.15, a + 1.15); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  ctx.globalAlpha = 0.55; ell(ctx, x - r * 0.3, y - r * 0.42, r * 0.34, r * 0.2, -0.6); ctx.fillStyle = '#fff'; ctx.fill(); ctx.globalAlpha = 1;
}

function lighten(c) {
  if (c[0] === '#') {
    const n = parseInt(c.slice(1), 16);
    const f = (v) => Math.round(v + (255 - v) * 0.38);
    return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
  }
  return c;
}

function shoe(ctx, x, y, rot, pal, k = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(k, k);
  // tige
  ctx.beginPath(); ctx.moveTo(-12, -6); ctx.bezierCurveTo(-13, -19, -4, -22, 3, -21); ctx.bezierCurveTo(12, -20, 17, -14, 17, -6); ctx.closePath();
  const g = ctx.createLinearGradient(0, -22, 0, -4); g.addColorStop(0, lighten(pal.main)); g.addColorStop(0.5, pal.main); g.addColorStop(1, pal.mainDark);
  ctx.fillStyle = g; ctx.fill();
  ctx.globalAlpha = 0.5; ell(ctx, 4, -16, 5, 2.2, 0.2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.globalAlpha = 1;
  // semelle
  ctx.beginPath(); ctx.roundRect(-14, -7.5, 33, 8, 4); ctx.fillStyle = pal.shell; ctx.fill();
  ctx.strokeStyle = pal.shellShade; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.restore();
}

/* ------------------------------ armes ------------------------------ */

export function drawWeapon(ctx, id, t = 0, color) {
  // poignée à l'origine, canon vers +x
  switch (id) {
    case 'blaster': {
      ctx.fillStyle = '#2b3566'; ctx.beginPath(); ctx.roundRect(-5, -2, 9, 16, 3); ctx.fill();
      const g = ctx.createLinearGradient(0, -12, 0, 6); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#cfdcf2');
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-9, -11, 34, 15, 6); ctx.fill();
      ctx.fillStyle = '#1cc3d2'; ctx.beginPath(); ctx.roundRect(20, -9, 12, 11, 4); ctx.fill();
      ctx.fillStyle = '#0c3a96'; ctx.beginPath(); ctx.roundRect(30, -6.5, 5, 6, 2); ctx.fill();
      heartPath(ctx, 5, -4.5, 4); ctx.fillStyle = '#ff5c9d'; ctx.fill();
      ctx.fillStyle = '#ff5c9d'; circle(ctx, -6, -4, 2.2); ctx.fill();
      break;
    }
    case 'saber': {
      ctx.fillStyle = '#2b3566'; ctx.beginPath(); ctx.roundRect(-8, -4, 18, 8, 3); ctx.fill();
      ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.roundRect(8, -7, 5, 14, 2); ctx.fill();
      const c = color || '#39e4ff';
      ctx.globalAlpha = 0.35; ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(12, -7, 64, 14, 7); ctx.fill();
      ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.roundRect(13, -4, 60 + Math.sin(t * 30) * 1.5, 8, 4); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(14, -1.8, 56, 3.6, 2); ctx.fill();
      break;
    }
    case 'boomerang': {
      ctx.save(); ctx.translate(14, -4); ctx.rotate(t * 2);
      starPath(ctx, 0, 0, 17, 7.5, 4);
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 17); g.addColorStop(0, '#fff6c2'); g.addColorStop(1, '#ffb81f');
      ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#e08a00'; ctx.lineWidth = 1.5; ctx.stroke();
      circle(ctx, 0, 0, 3.4); ctx.fillStyle = '#ff5c9d'; ctx.fill();
      ctx.restore();
      break;
    }
    case 'hammer': {
      ctx.fillStyle = '#7a5a3a'; ctx.beginPath(); ctx.roundRect(-8, -3.5, 56, 7, 3); ctx.fill();
      ctx.fillStyle = '#2b3566'; ctx.beginPath(); ctx.roundRect(-9, -4.5, 14, 9, 3); ctx.fill();
      const g = ctx.createLinearGradient(0, -24, 0, 24); g.addColorStop(0, '#ffc477'); g.addColorStop(0.5, '#ff9a3d'); g.addColorStop(1, '#d9661a');
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(40, -24, 28, 48, 8); ctx.fill();
      ctx.fillStyle = '#fff3d6'; ctx.beginPath(); ctx.roundRect(38, -27, 32, 7, 3); ctx.fill(); ctx.beginPath(); ctx.roundRect(38, 20, 32, 7, 3); ctx.fill();
      starPath(ctx, 54, 0, 8, 3.6, 5); ctx.fillStyle = '#fff'; ctx.fill();
      break;
    }
    case 'plasma': {
      ctx.fillStyle = '#2b3566'; ctx.beginPath(); ctx.roundRect(-5, 0, 9, 14, 3); ctx.fill();
      const g = ctx.createLinearGradient(0, -14, 0, 8); g.addColorStop(0, '#5b6aa8'); g.addColorStop(1, '#2b3566');
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-12, -13, 44, 19, 8); ctx.fill();
      const pulse = 0.6 + 0.4 * Math.sin(t * 8);
      ctx.fillStyle = '#7dff5a'; ctx.globalAlpha = 0.5 + 0.5 * pulse; ctx.beginPath(); ctx.roundRect(-4, -9, 22, 6, 3); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = '#d9ffcf'; ctx.beginPath(); ctx.roundRect(30, -11, 8, 15, 3); ctx.fill();
      circle(ctx, 40, -3.5, 4 + pulse * 1.5); ctx.fillStyle = '#7dff5a'; ctx.fill();
      break;
    }
    case 'rocket': {
      const g = ctx.createLinearGradient(0, -16, 0, 6); g.addColorStop(0, '#f4f7ff'); g.addColorStop(1, '#b8c4e0');
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-22, -15, 58, 18, 7); ctx.fill();
      ctx.fillStyle = '#ff4f4f'; ctx.beginPath(); ctx.roundRect(-24, -17, 9, 22, 3); ctx.fill(); ctx.beginPath(); ctx.roundRect(28, -17, 10, 22, 3); ctx.fill();
      ctx.fillStyle = '#2b3566'; ctx.beginPath(); ctx.roundRect(-4, 2, 9, 12, 3); ctx.fill();
      ctx.beginPath(); ctx.moveTo(38, -13); ctx.quadraticCurveTo(52, -6, 38, 1); ctx.closePath(); ctx.fillStyle = '#ff4f4f'; ctx.fill();
      ctx.fillStyle = '#ffd24a'; circle(ctx, 8, -6, 3.5); ctx.fill();
      break;
    }
    case 'thunder': {
      ctx.fillStyle = '#4b3a8a'; ctx.beginPath(); ctx.roundRect(-10, -3, 52, 6, 3); ctx.fill();
      ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.roundRect(36, -6, 6, 12, 2); ctx.fill();
      const pulse = 0.5 + 0.5 * Math.sin(t * 10);
      ctx.globalAlpha = 0.35 + 0.25 * pulse; circle(ctx, 54, 0, 15); ctx.fillStyle = '#b58cff'; ctx.fill(); ctx.globalAlpha = 1;
      circle(ctx, 54, 0, 9.5); ctx.fillStyle = '#e9dcff'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(56, -8); ctx.lineTo(50, 1); ctx.lineTo(54, 1); ctx.lineTo(51, 8); ctx.lineTo(59, -2); ctx.lineTo(55, -2); ctx.closePath();
      ctx.fillStyle = '#7a3dff'; ctx.fill();
      break;
    }
    default:
  }
}

export function starPath(ctx, x, y, R, r, n = 5) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = (i * Math.PI) / n - Math.PI / 2, rad = i % 2 ? r : R;
    ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath();
}

/* --------------------------- accessoires --------------------------- */

function accessoryBack(ctx, id, pal, t, turn) {
  if (id === 'cape') {
    const w = Math.sin(t * 3) * 5;
    ctx.beginPath(); ctx.moveTo(-20, -86); ctx.lineTo(18, -86);
    ctx.bezierCurveTo(30 - turn * 30, -50, 34 - turn * 44 + w, -24, 30 - turn * 50 + w, -6);
    ctx.quadraticCurveTo(-4 - turn * 40, -14 + w * 0.5, -44 - turn * 26 + w, -4);
    ctx.bezierCurveTo(-40 - turn * 16, -30, -34, -60, -20, -86); ctx.closePath();
    const g = ctx.createLinearGradient(0, -86, 0, 0); g.addColorStop(0, '#ff5c7a'); g.addColorStop(1, '#c41f4e');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 2.5; ctx.stroke();
  } else if (id === 'wings') {
    const f = Math.sin(t * 9) * 0.16;
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(s * 14 - turn * 10, -72); ctx.scale(s, 1); ctx.rotate(-0.25 + f);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(26, -34, 62, -40, 70, -18);
      ctx.lineTo(54, -10); ctx.lineTo(60, 2); ctx.lineTo(42, 4); ctx.lineTo(44, 16); ctx.quadraticCurveTo(18, 16, 0, 6); ctx.closePath();
      const g = ctx.createLinearGradient(0, -30, 60, 10); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#a8f3ff');
      ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#39c8e8'; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.restore();
    }
  } else if (id === 'scarf') {
    const w = Math.sin(t * 5) * 6;
    ctx.beginPath(); ctx.moveTo(-14, -86);
    ctx.bezierCurveTo(-40, -84 + w, -58, -70 - w, -74, -74 + w); ctx.lineTo(-70, -60 + w);
    ctx.bezierCurveTo(-54, -58 - w, -38, -70 + w, -12, -76); ctx.closePath();
    ctx.fillStyle = '#ff7a3d'; ctx.fill();
  } else if (id === 'headband') {
    const w = Math.sin(t * 6) * 5;
    ctx.save(); ctx.translate(-48 - turn * 4, -142);
    ctx.fillStyle = '#e03a4e';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-18, -4 + w, -34, 4 + w); ctx.lineTo(-32, 12 + w); ctx.quadraticCurveTo(-16, 6 + w, 0, 8); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, 4); ctx.quadraticCurveTo(-14, 12 - w, -26, 22 - w); ctx.lineTo(-20, 28 - w); ctx.quadraticCurveTo(-8, 18 - w, 2, 12); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

/** Accessoires dessinés dans le repère de la tête (origine = centre du casque). */
function accessoryHead(ctx, id, pal, t, turn) {
  switch (id) {
    case 'cap': {
      ctx.save(); ctx.translate(-turn * 4, 0);
      ctx.beginPath(); ctx.moveTo(-50, -22); ctx.bezierCurveTo(-48, -62, 46, -62, 50, -22); ctx.quadraticCurveTo(0, -34, -50, -22); ctx.closePath();
      const g = ctx.createLinearGradient(0, -60, 0, -20); g.addColorStop(0, '#ff8a4a'); g.addColorStop(1, '#f0531a');
      ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); ctx.moveTo(20 + turn * 10, -27); ctx.quadraticCurveTo(66 + turn * 12, -30, 76 + turn * 10, -14); ctx.quadraticCurveTo(50, -22, 16 + turn * 10, -19); ctx.closePath();
      ctx.fillStyle = '#c93d10'; ctx.fill();
      circle(ctx, 0, -40, 9); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(2, -47); ctx.lineTo(-4, -39); ctx.lineTo(0, -39); ctx.lineTo(-2, -33); ctx.lineTo(5, -41); ctx.lineTo(1, -41); ctx.closePath(); ctx.fillStyle = '#f0531a'; ctx.fill();
      ctx.restore();
      break;
    }
    case 'crown': {
      ctx.save(); ctx.translate(-turn * 3, -44); ctx.rotate(-0.06);
      ctx.beginPath(); ctx.moveTo(-26, 4); ctx.lineTo(-30, -22); ctx.lineTo(-15, -10); ctx.lineTo(0, -28); ctx.lineTo(15, -10); ctx.lineTo(30, -22); ctx.lineTo(26, 4); ctx.closePath();
      const g = ctx.createLinearGradient(0, -28, 0, 4); g.addColorStop(0, '#fff3a6'); g.addColorStop(0.5, '#ffd24a'); g.addColorStop(1, '#e89a10');
      ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#c97a00'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#ff5c9d'; circle(ctx, 0, -6, 4); ctx.fill();
      ctx.fillStyle = '#39e4ff'; circle(ctx, -16, -2, 3); ctx.fill(); circle(ctx, 16, -2, 3); ctx.fill();
      ctx.fillStyle = '#fff'; circle(ctx, -30, -23, 3); ctx.fill(); circle(ctx, 0, -29, 3.4); ctx.fill(); circle(ctx, 30, -23, 3); ctx.fill();
      ctx.restore();
      break;
    }
    case 'horns': {
      for (const s of [-1, 1]) {
        ctx.save(); ctx.translate(s * 34 - turn * 4, -36); ctx.scale(s, 1);
        ctx.beginPath(); ctx.moveTo(-8, 4); ctx.quadraticCurveTo(-2, -22, 16, -28); ctx.quadraticCurveTo(10, -10, 10, 6); ctx.closePath();
        const g = ctx.createLinearGradient(0, -28, 0, 6); g.addColorStop(0, '#ff8a9a'); g.addColorStop(1, '#e02a4a');
        ctx.fillStyle = g; ctx.fill();
        ctx.restore();
      }
      break;
    }
    case 'halo': {
      const y = -84 + Math.sin(t * 3) * 2;
      ctx.save(); ctx.globalAlpha = 0.35; ell(ctx, 0, y, 34, 9); ctx.strokeStyle = '#fff3a6'; ctx.lineWidth = 9; ctx.stroke();
      ctx.globalAlpha = 1; ell(ctx, 0, y, 34, 9); ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 4.5; ctx.stroke();
      ell(ctx, 0, y - 1, 34, 9); ctx.strokeStyle = '#fffbe0'; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.restore();
      break;
    }
    case 'shades': {
      const vx = 1 + turn * 7;
      ctx.fillStyle = '#0b0d1a';
      const px = 5; // taille du pixel
      const rows = ['1111111111111111', '0111111001111110', '0111111001111110', '0011110000111100'];
      rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === '1') ctx.fillRect(vx - 40 + i * px, -8 + j * px, px + 0.4, px + 0.4); });
      ctx.fillStyle = '#39e4ff'; ctx.fillRect(vx - 30, -3, px, px); ctx.fillRect(vx - 25, 2, px, px); ctx.fillRect(vx + 10, -3, px, px); ctx.fillRect(vx + 15, 2, px, px);
      break;
    }
    case 'headband': {
      ctx.save();
      ctx.beginPath(); ctx.moveTo(-52, -18); ctx.quadraticCurveTo(0, -36, 52, -18); ctx.lineTo(51, -8); ctx.quadraticCurveTo(0, -26, -51, -8); ctx.closePath();
      ctx.fillStyle = '#e03a4e'; ctx.fill();
      circle(ctx, turn * 8, -24, 5.5); ctx.fillStyle = '#fff'; ctx.fill(); circle(ctx, turn * 8, -24, 2.6); ctx.fillStyle = '#e03a4e'; ctx.fill();
      ctx.restore();
      break;
    }
    default:
  }
}

function accessoryNeck(ctx, id, pal, t, turn) {
  if (id === 'bowtie') {
    const x = turn * 6, y = -84;
    ctx.fillStyle = '#ff3b6b';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 15, y - 9); ctx.quadraticCurveTo(x - 18, y, x - 15, y + 9); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 15, y - 9); ctx.quadraticCurveTo(x + 18, y, x + 15, y + 9); ctx.closePath(); ctx.fill();
    circle(ctx, x, y, 4.5); ctx.fillStyle = '#ffd24a'; ctx.fill();
  } else if (id === 'scarf') {
    ctx.beginPath(); ctx.ellipse(turn * 3, -85, 26, 9, 0, 0, TAU);
    const g = ctx.createLinearGradient(0, -94, 0, -76); g.addColorStop(0, '#ffa15a'); g.addColorStop(1, '#f0531a');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = '#ffd9a8'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 5]); ctx.stroke(); ctx.setLineDash([]);
  } else if (id === 'cape') {
    ctx.fillStyle = '#ffd24a'; circle(ctx, turn * 6 - 14, -85, 4.5); ctx.fill(); circle(ctx, turn * 6 + 14, -85, 4.5); ctx.fill();
    ctx.strokeStyle = '#ff5c7a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(turn * 6 - 14, -85); ctx.quadraticCurveTo(turn * 6, -80, turn * 6 + 14, -85); ctx.stroke();
  }
}

/* ------------------------------ visage ------------------------------ */

function drawEye(ctx, x, y, r, pal, state, p, side) {
  if (state === 'ko') {
    ctx.strokeStyle = pal.eyeRing; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - r * 0.6, y - r * 0.6); ctx.lineTo(x + r * 0.6, y + r * 0.6); ctx.moveTo(x + r * 0.6, y - r * 0.6); ctx.lineTo(x - r * 0.6, y + r * 0.6); ctx.stroke();
    return;
  }
  if (state === 'hurt') {
    ctx.strokeStyle = pal.eyeRing; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x + side * r * 0.7, y - r * 0.6); ctx.lineTo(x - side * r * 0.5, y); ctx.lineTo(x + side * r * 0.7, y + r * 0.6); ctx.stroke();
    return;
  }
  if (state === 'happy' || p.blink > 0.5) {
    ctx.strokeStyle = pal.eyeRing; ctx.lineWidth = 3.6; ctx.lineCap = 'round';
    ctx.beginPath();
    if (state === 'happy') ctx.arc(x, y + r * 0.35, r * 0.8, Math.PI * 1.12, Math.PI * 1.88);
    else ctx.arc(x, y - r * 0.5, r * 0.8, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    return;
  }
  circle(ctx, x, y, r); ctx.fillStyle = '#f2fbff'; ctx.fill();
  circle(ctx, x, y, r * 0.88); ctx.fillStyle = pal.eyeRing; ctx.fill();
  const g = ctx.createRadialGradient(x, y + r * 0.3, 1, x, y, r * 0.76);
  g.addColorStop(0, lighten(pal.eye)); g.addColorStop(1, pal.eye);
  circle(ctx, x, y, r * 0.76); ctx.fillStyle = g; ctx.fill();
  const px = x + p.lookX * r * 0.16, py = y + p.lookY * r * 0.16;
  circle(ctx, px, py, r * 0.46); ctx.fillStyle = pal.visor; ctx.fill();
  circle(ctx, px + r * 0.3, py - r * 0.34, r * 0.25); ctx.fillStyle = '#fff'; ctx.fill();
  circle(ctx, px - r * 0.28, py + r * 0.3, r * 0.1); ctx.fill();
  if (state === 'angry' || state === 'focus') {
    // paupière inclinée (couleur visière)
    const d = state === 'angry' ? 0.75 : 0.42;
    ctx.fillStyle = pal.visor;
    ctx.beginPath();
    ctx.moveTo(x - r * 1.2, y - r * 1.3); ctx.lineTo(x + r * 1.2, y - r * 1.3);
    ctx.lineTo(x + r * 1.2, y - r * (side > 0 ? 0.25 + d * 0.5 : 0.95 - d * 0.9 + 0.5));
    ctx.lineTo(x - r * 1.2, y - r * (side > 0 ? 0.95 - d * 0.9 + 0.5 : 0.25 + d * 0.5));
    ctx.closePath(); ctx.fill();
  }
}

function drawBrow(ctx, x, y, r, pal, state, side) {
  ctx.strokeStyle = pal.eyeRing; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
  ctx.beginPath();
  if (state === 'angry' || state === 'focus') {
    const d = state === 'angry' ? 7 : 3.5;
    // incliné vers le centre du visage
    ctx.moveTo(x + side * 9, y - r - 9 + (side > 0 ? -d * 0.2 : -d * 0.2)); ctx.lineTo(x - side * 7, y - r - 5 + d * 0.9);
  } else if (state === 'hurt' || state === 'ko') {
    ctx.moveTo(x + side * 9, y - r - 3); ctx.lineTo(x - side * 6, y - r - 9);
  } else {
    ctx.arc(x + side * 1.5, y - r + 3, 12, Math.PI * (side > 0 ? 1.36 : 1.24), Math.PI * (side > 0 ? 1.76 : 1.64));
  }
  ctx.stroke();
}

function drawMouth(ctx, x, y, pal, state) {
  ctx.save(); ctx.translate(x, y);
  if (state === 'smile' || state === 'open') {
    const s = state === 'open' ? 1.22 : 1;
    ctx.scale(s, s);
    ctx.beginPath(); ctx.moveTo(-10.5, -2.5); ctx.quadraticCurveTo(0, 0.5, 10.5, -2.5);
    ctx.bezierCurveTo(11.5, 6, 6, 11.5, 0, 11.5); ctx.bezierCurveTo(-6, 11.5, -11.5, 6, -10.5, -2.5); ctx.closePath();
    ctx.fillStyle = pal.mouth; ctx.fill();
    ctx.save(); ctx.clip(); ell(ctx, 0.5, 11, 7.5, 5.2); ctx.fillStyle = pal.tongue; ctx.fill(); ctx.restore();
  } else if (state === 'o') {
    ell(ctx, 0, 4, 5, 6.5); ctx.fillStyle = pal.mouth; ctx.fill();
  } else if (state === 'grit') {
    ctx.beginPath(); ctx.roundRect(-10, -1, 20, 9.5, 4); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.strokeStyle = pal.mouth; ctx.lineWidth = 2; ctx.stroke();
    ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(-3.4, -1); ctx.lineTo(-3.4, 8.5); ctx.moveTo(3.4, -1); ctx.lineTo(3.4, 8.5); ctx.moveTo(-10, 3.7); ctx.lineTo(10, 3.7); ctx.stroke();
  } else if (state === 'sad') {
    ctx.strokeStyle = pal.mouth; ctx.lineWidth = 3.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 12, 8, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
  } else { // smirk
    ctx.strokeStyle = pal.mouth; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, -2, 8.5, Math.PI * 0.18, Math.PI * 0.82); ctx.stroke();
  }
  ctx.restore();
}

/* ------------------------------ rendu ------------------------------ */

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x:number,y:number,scale?:number,facing?:number,pose:object,skin?:any,accessory?:string,weapon?:string,t?:number}} o
 */
export function drawLayjou(ctx, o) {
  const p = o.pose, t = o.t || 0;
  const pal = resolvePal(o.skin, t);
  const s = o.scale ?? 1, turn = p.turn;
  const acc = o.accessory || 'none';

  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.scale(s * (o.facing ?? 1), s);
  ctx.translate(p.rootX, p.rootY);
  ctx.rotate(p.rootRot);
  ctx.scale(1 + p.squash * 0.6, 1 - p.squash);
  ctx.lineJoin = 'round';

  const cl = Math.cos(p.lean), sl = Math.sin(p.lean);
  const bodyPt = (px, py) => { const dy = py - HIP_Y; return [px * cl - dy * sl, HIP_Y + px * sl + dy * cl + p.bob]; };
  const [sfx, sfy] = bodyPt(23 + turn * 4, -77);
  const [sbx, sby] = bodyPt(-23 + turn * 7, -77);
  const [hipFx, hipFy] = bodyPt(11 + turn * 2, HIP_Y + 2);
  const [hipBx, hipBy] = bodyPt(-11 + turn * 2, HIP_Y + 2);

  // 1. accessoires arrière
  ctx.save(); ctx.translate(0, p.bob); ctx.translate(0, HIP_Y); ctx.rotate(p.lean); ctx.translate(0, -HIP_Y);
  accessoryBack(ctx, acc, pal, t, turn);
  ctx.restore();

  // 2. bras arrière (passe devant le corps quand il croise vers l'avant)
  const backArm = () => {
    limb(ctx, sbx, sby, p.hbx, p.hby, 12.5, p.bendB, pal);
    hand(ctx, p.hbx, p.hby, pal, p.fistB, Math.atan2(p.hby - sby, p.hbx - sbx), p.hsB ?? 1);
  };
  const backArmFront = p.hbx > 6;
  if (!backArmFront) backArm();

  // 3. jambes + chaussures (jambe arrière d'abord)
  const legs = [[hipBx, hipBy, p.fbx, p.fby, p.fbr, p.fsB ?? 1], [hipFx, hipFy, p.ffx, p.ffy, p.ffr, p.fsF ?? 1]];
  for (const [hx, hy, fx, fy, fr, fs] of legs) {
    const ax = fx - 2 * Math.cos(fr) * fs + 14 * Math.sin(fr) * fs, ay = fy - 14 * Math.cos(fr) * fs - 2 * Math.sin(fr) * fs; // cheville : suit la rotation du pied
    limb(ctx, hx, hy, ax, ay, 16.5, 2.5, pal, 5);
    const kx = lerp(hx, ax, 0.5) + 2.5 + turn * 2, ky = lerp(hy, ay, 0.5);
    circle(ctx, kx, ky, 6.6); ctx.fillStyle = pal.accent; ctx.fill();
    ctx.globalAlpha = 0.5; circle(ctx, kx - 1.6, ky - 2, 2.2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.globalAlpha = 1;
    shoe(ctx, fx, fy, fr, pal, fs);
  }

  // 4. torse
  ctx.save();
  ctx.translate(0, p.bob); ctx.translate(0, HIP_Y); ctx.rotate(p.lean); ctx.translate(0, -HIP_Y);
  const tx = turn * 3;
  blob(ctx, tx, -61, 27.5, 25.5, 0.7); ctx.fillStyle = pal.shellShade; ctx.fill();
  const tg = ctx.createRadialGradient(tx - 8, -72, 3, tx, -60, 34);
  tg.addColorStop(0, pal.shell); tg.addColorStop(0.7, pal.shell); tg.addColorStop(1, pal.shellShade);
  blob(ctx, tx, -61.5, 26.4, 24.6, 0.7); ctx.fillStyle = tg; ctx.fill();
  ctx.save(); ctx.clip();
  // bassin coloré
  const hg = ctx.createLinearGradient(0, -52, 0, -34); hg.addColorStop(0, pal.main); hg.addColorStop(1, pal.mainDark);
  ctx.beginPath(); ctx.moveTo(tx - 32, -47); ctx.quadraticCurveTo(tx, -57, tx + 32, -47); ctx.lineTo(tx + 32, -30); ctx.lineTo(tx - 32, -30); ctx.closePath();
  ctx.fillStyle = hg; ctx.fill();
  ctx.restore();
  // bretelles
  for (const sgn of [-1, 1]) {
    ctx.save(); ctx.translate(tx + sgn * 20 + turn * 2, -78); ctx.rotate(sgn * 0.3);
    ctx.beginPath(); ctx.roundRect(-4.2, -9, 8.4, 20, 4); ctx.fillStyle = pal.accent; ctx.fill();
    ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.roundRect(-2.6, -7, 2.4, 12, 1.2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.globalAlpha = 1;
    ctx.restore();
  }
  // cœur
  const hx = tx + turn * 6, hy = -68;
  if (p.glow > 0) {
    const gg = ctx.createRadialGradient(hx, hy, 1, hx, hy, 26 + p.glow * 12);
    gg.addColorStop(0, 'rgba(255,150,195,' + clamp(0.5 * p.glow) + ')'); gg.addColorStop(1, 'rgba(255,140,190,0)');
    circle(ctx, hx, hy, 26 + p.glow * 12); ctx.fillStyle = gg; ctx.fill();
  }
  const hs = 7.2 * (1 + 0.06 * Math.sin(t * 6) + 0.12 * clamp(p.glow));
  heartPath(ctx, hx, hy, hs); ctx.fillStyle = pal.accent; ctx.fill();
  ctx.globalAlpha = 0.55; ell(ctx, hx - hs * 0.42, hy - hs * 0.42, hs * 0.26, hs * 0.16, -0.7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.globalAlpha = 1;
  // cou
  ell(ctx, tx + turn * 2, -85, 13, 5.5); ctx.fillStyle = pal.mainDark; ctx.fill();
  accessoryNeck(ctx, acc, pal, t, turn);

  // 5. tête
  ctx.translate(tx + turn * 3, -84); ctx.rotate(p.headTilt); ctx.translate(0, -44);
  // antenne
  const sway = Math.sin(t * 4.3) * 0.08 - p.lean * 0.5 - p.headTilt * 0.4;
  ctx.save(); ctx.translate(-turn * 2, -44); ctx.rotate(sway);
  ctx.beginPath(); ctx.roundRect(-2.2, -14, 4.4, 16, 2); ctx.fillStyle = pal.main; ctx.fill();
  const ag = ctx.createRadialGradient(-3, -24, 1, 0, -21, 10);
  ag.addColorStop(0, pal.accentLight); ag.addColorStop(0.6, pal.accent); ag.addColorStop(1, pal.accent);
  circle(ctx, 0, -21, 9.6); ctx.fillStyle = ag; ctx.fill();
  circle(ctx, 2.6, -24.6, 2.6); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.restore();
  // écouteurs
  for (const sgn of [-1, 1]) {
    const far = sgn * turn > 0 ? 1 - Math.abs(turn) * 0.25 : 1 + Math.abs(turn) * 0.08;
    const ex = sgn * 55 - turn * 6;
    circle(ctx, ex, 4, 12 * far); ctx.fillStyle = pal.main; ctx.fill();
    ell(ctx, ex + sgn * 5.5 * far, 4, 5.5 * far, 12 * far); ctx.fillStyle = pal.accent; ctx.fill();
    ctx.globalAlpha = 0.5; ell(ctx, ex + sgn * 5 * far, -2, 1.8 * far, 4.4 * far); ctx.fillStyle = '#fff'; ctx.fill(); ctx.globalAlpha = 1;
  }
  // casque
  blob(ctx, 0, 0, 54, 47, 0.74); ctx.fillStyle = pal.shellShade; ctx.fill();
  const cg = ctx.createRadialGradient(-16, -20, 6, 0, 0, 62);
  cg.addColorStop(0, pal.shell); cg.addColorStop(0.72, pal.shell); cg.addColorStop(1, pal.shellShade);
  blob(ctx, 0, -0.6, 52.6, 45.8, 0.74); ctx.fillStyle = cg; ctx.fill();
  ctx.save(); ctx.clip();
  ell(ctx, -3 - turn * 7, -47, 45, 17.5, -0.06); ctx.fillStyle = pal.main; ctx.fill();
  ctx.globalAlpha = 0.9; ell(ctx, -27 - turn * 6, -37.5, 9, 3, -0.5); ctx.fillStyle = pal.shell; ctx.fill(); ctx.globalAlpha = 1;
  ctx.restore();
  // visière
  const vx = 1 + turn * 7;
  const vg = ctx.createLinearGradient(0, -32, 0, 38); vg.addColorStop(0, pal.visorLight); vg.addColorStop(0.45, pal.visor); vg.addColorStop(1, pal.visor);
  blob(ctx, vx, 2.5, 45, 34.5, 0.8); ctx.fillStyle = vg; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.globalAlpha = 0.1; ell(ctx, vx - 18, -22, 30, 12, -0.3); ctx.fillStyle = '#fff'; ctx.fill(); ctx.globalAlpha = 1;
  if (o.skin && (typeof o.skin === 'string' ? byId(SKINS, o.skin) : o.skin).stars) {
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 9; i++) { const a = i * 2.4, r = 10 + ((i * 37) % 30); ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 3 + i); circle(ctx, vx + Math.cos(a) * r, 2 + Math.sin(a) * r * 0.75, 0.9 + (i % 3) * 0.4); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  // yeux, sourcils, bouche
  const spread = 24.4 * (1 - 0.12 * Math.abs(turn));
  const hideEyes = acc === 'shades';
  for (const sgn of [-1, 1]) {
    const far = sgn * turn > 0 ? 1 - Math.abs(turn) * 0.14 : 1;
    const ex = vx + turn * 3 + sgn * spread, ey = 3, r = 12 * far;
    if (!hideEyes) drawEye(ctx, ex, ey, r, pal, p.eyes, p, sgn);
    drawBrow(ctx, ex, ey - (hideEyes ? 4 : 0), r, pal, p.eyes, sgn);
  }
  drawMouth(ctx, vx + turn * 4, 20.5, pal, p.mouth);
  ctx.restore();
  // reflet du casque
  ctx.globalAlpha = 0.5; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, 0, 49, Math.PI * 1.08, Math.PI * 1.2); ctx.stroke(); ctx.globalAlpha = 1;
  accessoryHead(ctx, acc, pal, t, turn);
  ctx.restore(); // fin torse + tête

  // 6. bras avant + arme
  if (backArmFront) backArm();
  limb(ctx, sfx, sfy, p.hfx, p.hfy, 12.5, p.bendF, pal);
  if (o.weapon && p.weaponOn > 0.5) {
    ctx.save(); ctx.translate(p.hfx, p.hfy); ctx.rotate(p.wAngle); ctx.scale(1.35, 1.35); ctx.translate(4, 0);
    drawWeapon(ctx, o.weapon, t, o.weaponColor);
    ctx.restore();
    hand(ctx, p.hfx, p.hfy, pal, 1, p.wAngle, p.hsF ?? 1);
  } else {
    hand(ctx, p.hfx, p.hfy, pal, p.fistF, Math.atan2(p.hfy - sfy, p.hfx - sfx), p.hsF ?? 1);
  }

  // 7. bouclier d'énergie
  if (p.shield > 0.02) {
    const a = clamp(p.shield);
    const cx = 34, cy = -96, rx = 62, ry = 112;
    const sg = ctx.createRadialGradient(cx + 30, cy, 10, cx, cy, ry);
    sg.addColorStop(0, 'rgba(120,235,255,0.02)'); sg.addColorStop(0.75, 'rgba(120,235,255,' + 0.16 * a + ')'); sg.addColorStop(1, 'rgba(160,245,255,' + 0.55 * a + ')');
    ell(ctx, cx, cy, rx, ry); ctx.fillStyle = sg; ctx.fill();
    ctx.strokeStyle = 'rgba(210,250,255,' + 0.9 * a + ')'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,' + 0.8 * a + ')'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(cx, cy, rx - 7, ry - 8, 0, -0.9, -0.3); ctx.stroke();
    ctx.globalAlpha = 0.35 * a; heartPath(ctx, cx + 30, cy + 6, 13); ctx.fillStyle = '#fff'; ctx.fill(); ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/** Dessine LayJou dans un petit canvas autonome (vignettes de boutique, icônes). */
export function renderLayjouThumb(canvas, { skin = 'classic', accessory = 'none', weapon = null, pose = 'wave', t = 0.6, zoom = 1, headOnly = false } = {}) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth || canvas.width, h = canvas.clientHeight || canvas.height;
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const sc = (h / 215) * zoom;
  const P = poseOf(pose, t, 0.5); P.blink = 0;
  if (headOnly) drawLayjou(ctx, { x: w / 2, y: h * 0.5 + 150 * sc * 1.25, scale: sc * 1.25, pose: P, skin, accessory, weapon, t });
  else drawLayjou(ctx, { x: w / 2 - (weapon ? 8 * sc : 0), y: h - 6, scale: sc, pose: P, skin, accessory, weapon, t });
}
