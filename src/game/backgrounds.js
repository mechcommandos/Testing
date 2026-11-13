/* Décors de combat : couche statique pré-rendue + éléments animés légers. */
import { TAU, seeded, clamp } from '../core/util.js';

const lin = (ctx, x0, y0, x1, y1, stops) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
const circle = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); };

const THEMES = {
  candy: {
    sky: [[0, '#58c8ff'], [0.55, '#bdeeff'], [1, '#ffe6f3']], ground: [[0, '#8fe8d2'], [1, '#3fbfb0']], line: '#ffffff',
    hill: ['#b9f0c8', '#8fe0b4'], city: ['#ff9cc4', '#ffd27a', '#b89cff', '#7fdcff', '#ff8f8f', '#9ff0c0'], cityDark: 0, sun: ['#fff6c2', '#ffd24a'], mote: 'rgba(255,255,255,0.8)',
  },
  harbor: {
    sky: [[0, '#2a1a6e'], [0.45, '#b03a9a'], [0.78, '#ff7a6b'], [1, '#ffc97a']], ground: [[0, '#2a5a8a'], [1, '#15305a']], line: '#39e4ff',
    hill: ['#5a2f8f', '#3d2278'], city: ['#ff5c9d', '#39e4ff', '#ffd24a', '#7a5cff', '#ff8a3d'], cityDark: 0.55, sun: ['#fff0b0', '#ff9a5a'], mote: 'rgba(255,220,160,0.7)',
  },
  desert: {
    sky: [[0, '#ff9f5a'], [0.5, '#ffcf8a'], [1, '#fff0c9']], ground: [[0, '#f4c477'], [1, '#d99245']], line: '#fff3d0',
    hill: ['#f0b56a', '#e39a4e'], city: ['#b06bff', '#39e4ff', '#ff7ad1'], cityDark: 0, sun: ['#ffffff', '#ffe9a8'], mote: 'rgba(255,240,200,0.7)',
  },
  frost: {
    sky: [[0, '#0b1440'], [0.5, '#1d3a8a'], [1, '#6fc0e0']], ground: [[0, '#cfeeff'], [1, '#7fb8e0']], line: '#ffffff',
    hill: ['#8fc2ee', '#6aa0d8'], city: ['#dff4ff', '#a9d4ff', '#c9b8ff'], cityDark: 0, sun: ['#ffffff', '#cfe6ff'], mote: 'rgba(255,255,255,0.9)',
  },
  glitch: {
    sky: [[0, '#05030f'], [0.6, '#1b0b3a'], [1, '#4a0f6b']], ground: [[0, '#1a0b3a'], [1, '#07040f']], line: '#ff2bd6',
    hill: ['#2a1259', '#1c0c40'], city: ['#ff2bd6', '#00f0ff', '#7a5cff'], cityDark: 0.75, sun: ['#ff8bea', '#ff2bd6'], mote: 'rgba(0,240,255,0.8)',
  },
};

export const themeOf = (id) => THEMES[id] || THEMES.candy;

function buildings(ctx, rnd, W, baseY, th, minH, maxH, alpha) {
  let x = -10;
  while (x < W + 10) {
    const w = 16 + rnd() * 26, h = minH + rnd() * (maxH - minH), col = th.city[Math.floor(rnd() * th.city.length)];
    ctx.globalAlpha = alpha;
    ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x, baseY - h, w, h + 4, [4, 4, 0, 0]); ctx.fill();
    if (th.cityDark) { ctx.globalAlpha = alpha * th.cityDark; ctx.fillStyle = '#0b0a2a'; ctx.beginPath(); ctx.roundRect(x, baseY - h, w, h + 4, [4, 4, 0, 0]); ctx.fill(); }
    // toit / antenne
    const top = rnd();
    ctx.globalAlpha = alpha; ctx.fillStyle = col;
    if (top < 0.3) { ctx.beginPath(); ctx.moveTo(x, baseY - h + 2); ctx.lineTo(x + w / 2, baseY - h - 12); ctx.lineTo(x + w, baseY - h + 2); ctx.fill(); }
    else if (top < 0.5) { ctx.fillRect(x + w / 2 - 1, baseY - h - 12, 2, 12); circle(ctx, x + w / 2, baseY - h - 13, 3); ctx.fill(); }
    else if (top < 0.65) { circle(ctx, x + w / 2, baseY - h, w / 2); ctx.fill(); }
    // fenêtres
    ctx.fillStyle = th.cityDark ? col : 'rgba(255,255,255,0.7)';
    for (let wy = baseY - h + 7; wy < baseY - 6; wy += 9) for (let wx = x + 4; wx < x + w - 5; wx += 7) if (rnd() > 0.35) { ctx.globalAlpha = alpha * (th.cityDark ? 0.9 : 0.7); ctx.fillRect(wx, wy, 3.4, 4.6); }
    x += w + rnd() * 5 - 1;
  }
  ctx.globalAlpha = 1;
}

function hills(ctx, rnd, W, baseY, color, amp, step) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-10, baseY + 6);
  let x = -10; ctx.lineTo(x, baseY - amp * (0.4 + rnd() * 0.6));
  while (x < W + 10) { const nx = x + step * (0.6 + rnd() * 0.8); ctx.quadraticCurveTo((x + nx) / 2, baseY - amp * (0.5 + rnd() * 1.1), nx, baseY - amp * (0.2 + rnd() * 0.6)); x = nx; }
  ctx.lineTo(W + 10, baseY + 6); ctx.closePath(); ctx.fill();
}

function peaks(ctx, rnd, W, baseY, color, light, amp) {
  let x = -30;
  while (x < W + 20) {
    const w = 60 + rnd() * 70, h = amp * (0.5 + rnd() * 0.7);
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x, baseY + 4); ctx.lineTo(x + w * 0.5, baseY - h); ctx.lineTo(x + w, baseY + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = light; ctx.beginPath(); ctx.moveTo(x + w * 0.5, baseY - h); ctx.lineTo(x + w * 0.36, baseY - h * 0.6); ctx.lineTo(x + w * 0.5, baseY - h * 0.5); ctx.lineTo(x + w * 0.62, baseY - h * 0.64); ctx.closePath(); ctx.fill();
    x += w * (0.45 + rnd() * 0.3);
  }
}

function crystals(ctx, rnd, W, baseY, th, n) {
  for (let i = 0; i < n; i++) {
    const x = rnd() * W, h = 22 + rnd() * 48, w = 7 + rnd() * 9, col = th.city[Math.floor(rnd() * th.city.length)], r = (rnd() - 0.5) * 0.7;
    ctx.save(); ctx.translate(x, baseY + 2); ctx.rotate(r);
    ctx.fillStyle = col; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(-w, 0); ctx.lineTo(-w * 0.6, -h * 0.75); ctx.lineTo(0, -h); ctx.lineTo(w * 0.6, -h * 0.75); ctx.lineTo(w, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.4; ctx.beginPath(); ctx.moveTo(-w * 0.6, -h * 0.75); ctx.lineTo(0, -h); ctx.lineTo(0, 0); ctx.lineTo(-w, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

/**
 * Pré-rend le décor d'un monde. Unités virtuelles (largeur W), sol à groundY.
 * @returns {{ draw(ctx:CanvasRenderingContext2D, t:number):void, theme:object }}
 */
export function makeBackground(id, W, H, groundY, dpr = 1) {
  const th = themeOf(id), rnd = seeded(id.length * 977 + 13);
  const cv = document.createElement('canvas'); cv.width = Math.ceil(W * dpr); cv.height = Math.ceil(H * dpr);
  const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
  // ciel
  ctx.fillStyle = lin(ctx, 0, 0, 0, groundY, th.sky); ctx.fillRect(0, 0, W, groundY + 2);
  // astre
  const sx = id === 'harbor' ? W * 0.3 : W * 0.74, sy = id === 'harbor' ? groundY - 46 : groundY * 0.3, sr = id === 'harbor' ? 70 : id === 'frost' ? 44 : 38;
  const halo = ctx.createRadialGradient(sx, sy, sr * 0.6, sx, sy, sr * 3); halo.addColorStop(0, 'rgba(255,255,255,0.35)'); halo.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = halo; circle(ctx, sx, sy, sr * 3); ctx.fill();
  const sg = ctx.createRadialGradient(sx - sr * 0.3, sy - sr * 0.3, 2, sx, sy, sr); sg.addColorStop(0, th.sun[0]); sg.addColorStop(1, th.sun[1]);
  ctx.fillStyle = sg; circle(ctx, sx, sy, sr); ctx.fill();
  if (id === 'frost') { ctx.fillStyle = 'rgba(150,180,230,0.5)'; for (const [dx, dy, r] of [[-12, -8, 9], [14, 6, 6], [-4, 16, 5]]) { circle(ctx, sx + dx, sy + dy, r); ctx.fill(); } }
  if (id === 'desert') { // planète annelée
    const px = W * 0.2, py = groundY * 0.24; ctx.save(); ctx.translate(px, py); ctx.rotate(-0.35);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(0, 0, 54, 13, 0, 0, TAU); ctx.stroke();
    const pg = ctx.createRadialGradient(-8, -8, 2, 0, 0, 30); pg.addColorStop(0, '#ffb3e0'); pg.addColorStop(1, '#b06bff'); ctx.fillStyle = pg; circle(ctx, 0, 0, 30); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(0, 0, 54, 13, 0, 0.05, Math.PI - 0.05); ctx.stroke(); ctx.restore();
  }
  if (id === 'glitch') { // soleil rayé
    ctx.fillStyle = th.sky[2][1]; for (let i = 0; i < 6; i++) ctx.fillRect(sx - sr - 2, sy + 2 + i * 7, sr * 2 + 4, 2 + i * 0.6);
  }
  if (id === 'frost' || id === 'glitch' || id === 'harbor') {
    ctx.fillStyle = '#fff'; for (let i = 0; i < 70; i++) { ctx.globalAlpha = 0.25 + rnd() * 0.6; circle(ctx, rnd() * W, rnd() * groundY * 0.7, 0.5 + rnd() * 1.1); ctx.fill(); } ctx.globalAlpha = 1;
  }
  // plans lointains
  const hz = groundY;
  if (id === 'candy') { hills(ctx, rnd, W, hz, th.hill[0], 46, 90); buildings(ctx, rnd, W, hz, th, 26, 86, 0.55); hills(ctx, rnd, W, hz, th.hill[1], 14, 60); buildings(ctx, rnd, W, hz, th, 16, 54, 1); }
  else if (id === 'harbor') {
    ctx.fillStyle = lin(ctx, 0, hz - 30, 0, hz, [[0, '#ff9a8a'], [1, '#5a3aa8']]); ctx.fillRect(0, hz - 30, W, 32);
    ctx.fillStyle = 'rgba(255,240,200,0.5)'; for (let i = 0; i < 9; i++) ctx.fillRect(sx - 60 + rnd() * 120, hz - 26 + i * 3, 10 + rnd() * 40, 1.4);
    buildings(ctx, rnd, W, hz - 20, th, 20, 70, 0.6);
    // grues
    ctx.strokeStyle = '#1b1440'; ctx.lineWidth = 3;
    for (const gx of [W * 0.62, W * 0.9]) { ctx.beginPath(); ctx.moveTo(gx, hz); ctx.lineTo(gx, hz - 92); ctx.lineTo(gx - 44, hz - 78); ctx.moveTo(gx, hz - 92); ctx.lineTo(gx + 22, hz - 80); ctx.moveTo(gx - 36, hz - 80); ctx.lineTo(gx - 36, hz - 54); ctx.stroke(); }
    // conteneurs
    let cx = -6; while (cx < W) { const n = 1 + Math.floor(rnd() * 3); for (let j = 0; j < n; j++) { ctx.fillStyle = th.city[Math.floor(rnd() * th.city.length)]; ctx.globalAlpha = 0.9; ctx.fillRect(cx, hz - 11 * (j + 1), 26, 10); ctx.globalAlpha = 0.25; ctx.fillStyle = '#000'; for (let k = 3; k < 26; k += 5) ctx.fillRect(cx + k, hz - 11 * (j + 1) + 1, 1, 8); } ctx.globalAlpha = 1; cx += 27 + (rnd() > 0.6 ? 14 : 0); }
  } else if (id === 'desert') { hills(ctx, rnd, W, hz, th.hill[0], 60, 130); crystals(ctx, rnd, W, hz - 6, th, 9); hills(ctx, rnd, W, hz, th.hill[1], 22, 100); crystals(ctx, rnd, W, hz, th, 7); }
  else if (id === 'frost') {
    // aurore statique douce (la partie animée est ajoutée en direct)
    peaks(ctx, rnd, W, hz, th.hill[0], '#e9f6ff', 120); peaks(ctx, rnd, W, hz, th.hill[1], '#ffffff', 70); crystals(ctx, rnd, W, hz, th, 8);
  } else if (id === 'glitch') {
    buildings(ctx, rnd, W, hz, th, 40, 130, 0.5); buildings(ctx, rnd, W, hz, th, 20, 70, 0.95);
    for (let i = 0; i < 14; i++) { ctx.fillStyle = th.city[i % 3]; ctx.globalAlpha = 0.5; ctx.fillRect(rnd() * W, rnd() * hz * 0.8, 6 + rnd() * 30, 2 + rnd() * 3); } ctx.globalAlpha = 1;
  }
  // sol
  ctx.fillStyle = lin(ctx, 0, groundY, 0, H, [[0, th.ground[0][1]], [0.5, th.ground[1][1]], [1, th.ground[1][1]]]); ctx.fillRect(0, groundY, W, H - groundY);
  ctx.fillStyle = th.line; ctx.globalAlpha = 0.5; ctx.fillRect(0, groundY, W, 2.5); ctx.globalAlpha = 1;
  // perspective : lignes fuyantes + bandes
  ctx.save(); ctx.beginPath(); ctx.rect(0, groundY, W, H - groundY); ctx.clip();
  ctx.strokeStyle = th.line; ctx.globalAlpha = id === 'glitch' ? 0.55 : 0.16; ctx.lineWidth = 1.5;
  for (let i = -8; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 26, groundY); ctx.lineTo(W / 2 + i * 150, H); ctx.stroke(); }
  for (let i = 1; i < 8; i++) { const y = groundY + Math.pow(i / 8, 1.8) * (H - groundY); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.restore(); ctx.globalAlpha = 1;
  // arène : ellipse claire sous les combattants
  const ag = ctx.createRadialGradient(W / 2, groundY + 34, 10, W / 2, groundY + 34, W * 0.62); ag.addColorStop(0, 'rgba(255,255,255,0.28)'); ag.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.save(); ctx.translate(W / 2, groundY + 34); ctx.scale(1, 0.24); ctx.translate(-W / 2, -(groundY + 34)); ctx.fillStyle = ag; circle(ctx, W / 2, groundY + 34, W * 0.62); ctx.fill(); ctx.restore();

  // éléments animés
  const motes = Array.from({ length: 16 }, () => ({ x: rnd() * W, y: rnd() * groundY, s: 0.6 + rnd() * 1.6, v: 4 + rnd() * 10, ph: rnd() * 6 }));
  const clouds = Array.from({ length: 4 }, (_, i) => ({ x: rnd() * W, y: 60 + i * 34 + rnd() * 20, s: 0.6 + rnd() * 0.7, v: 3 + rnd() * 5 }));

  return {
    theme: th,
    draw(c, t) {
      c.drawImage(cv, 0, 0, W, H);
      if (id === 'candy' || id === 'desert') {
        c.fillStyle = id === 'candy' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)';
        for (const cl of clouds) {
          const x = ((cl.x + t * cl.v) % (W + 160)) - 80;
          c.beginPath(); c.ellipse(x, cl.y, 34 * cl.s, 12 * cl.s, 0, 0, TAU); c.ellipse(x - 20 * cl.s, cl.y + 4 * cl.s, 20 * cl.s, 9 * cl.s, 0, 0, TAU); c.ellipse(x + 22 * cl.s, cl.y + 3 * cl.s, 22 * cl.s, 10 * cl.s, 0, 0, TAU); c.ellipse(x + 4 * cl.s, cl.y - 8 * cl.s, 18 * cl.s, 11 * cl.s, 0, 0, TAU); c.fill();
        }
      }
      if (id === 'frost') { // aurore boréale
        for (let b = 0; b < 3; b++) {
          const g = c.createLinearGradient(0, 40 + b * 30, 0, 150 + b * 30); g.addColorStop(0, 'rgba(80,255,190,0)'); g.addColorStop(0.5, b === 1 ? 'rgba(255,120,220,0.2)' : 'rgba(80,255,190,0.22)'); g.addColorStop(1, 'rgba(80,255,190,0)');
          c.fillStyle = g; c.beginPath(); c.moveTo(0, 150 + b * 30);
          for (let x = 0; x <= W; x += 20) c.lineTo(x, 60 + b * 30 + Math.sin(x * 0.02 + t * 0.6 + b * 2) * 22);
          c.lineTo(W, 150 + b * 30); for (let x = W; x >= 0; x -= 20) c.lineTo(x, 150 + b * 30 + Math.sin(x * 0.016 + t * 0.5 + b) * 16); c.closePath(); c.fill();
        }
      }
      if (id === 'glitch') { // pluie numérique
        for (let i = 0; i < 9; i++) { const x = (i * 47 + 20) % W, y = ((t * (60 + i * 13) + i * 90) % (groundY + 60)) - 60; const g = c.createLinearGradient(0, y, 0, y + 50); g.addColorStop(0, 'rgba(0,240,255,0)'); g.addColorStop(1, i % 2 ? 'rgba(255,43,214,0.55)' : 'rgba(0,240,255,0.55)'); c.fillStyle = g; c.fillRect(x, y, 2, 50); }
      }
      c.fillStyle = th.mote;
      for (const m of motes) { const y = id === 'frost' ? (m.y + t * m.v * 2.4) % groundY : groundY - ((groundY - m.y + t * m.v) % groundY); c.globalAlpha = 0.35 + 0.35 * Math.sin(t * 2 + m.ph); c.beginPath(); c.arc(m.x + Math.sin(t * 0.7 + m.ph) * 8, y, m.s, 0, TAU); c.fill(); }
      c.globalAlpha = 1;
    },
  };
}

/** Dégradé CSS d'un monde (cartes de la carte des niveaux). */
export function worldCss(id) {
  const th = themeOf(id);
  return `linear-gradient(180deg, ${th.sky.map(([o, c]) => `${c} ${Math.round(o * 62)}%`).join(', ')}, ${th.ground[0][1]} 62%, ${th.ground[1][1]} 100%)`;
}

export { clamp };
