/* ------------------------------------------------------------------ *
 *  Layjou Kart — construction des circuits.
 *
 *  Un circuit est une suite de segments (rendu pseudo-3D « à la
 *  route projetée ») : chaque segment porte une courbure, une
 *  altitude, des décors, des boîtes à objets, des pièces, des
 *  plaques de boost, tunnels et tremplins.
 * ------------------------------------------------------------------ */
import { seeded, easeInOut, lerp } from '../core/util.js';
import { WORLDS } from './data.js';

export const SEG = 200;          // longueur d'un segment (unités monde)
export const ROAD = 2000;        // demi-largeur de la route
export const RUMBLE = 3;         // segments par bande de vibreur
export const HILL = 130;         // unité de dénivelé du mini-langage
export const START_SEG = 14;     // ligne de départ / arrivée

/** Thèmes visuels des mondes. */
export const THEMES = {
  candy: {
    sky: ['#6fc8ff', '#a9e3ff', '#ffe1f1'], fog: '#ffd9ee', sun: { x: 0.72, y: 0.16, r: 0.07, c: '#fff6c9', glow: 'rgba(255,240,190,0.55)' },
    road: ['#8c80b8', '#968bc2'], rumble: ['#ff5c9d', '#ffffff'], lane: '#ffffff', grass: ['#79e0b3', '#6cd4a6'], edge: null,
    far: ['#c3a6ff', '#e0b9ff'], near: ['#5cc996', '#49b885'], deco: ['lollipop', 'cane', 'gumtree', 'cupcake', 'lollipop', 'gumtree'], big: ['donut', 'cupcake'], border: 'fence', obstacle: 'gumball', tunnel: '#7a5bb8', ring: '#ff8fbf',
  },
  harbor: {
    sky: ['#050a2c', '#171760', '#5a2a8c'], fog: '#2c2070', moon: { x: 0.25, y: 0.14, r: 0.05 }, stars: true,
    road: ['#2a2e57', '#30355f'], rumble: ['#00f0ff', '#ff2bd6'], lane: '#9ff6ff', grass: ['#0d2a5e', '#0a2352'], edge: '#00f0ff', water: true,
    far: ['#1d1f5c', '#2a2a78'], near: ['#101848', '#131d55'], deco: ['palm', 'lamp', 'palm', 'container', 'lamp'], big: ['building', 'crane'], border: 'buoy', obstacle: 'barrel', tunnel: '#181a48', ring: '#00f0ff',
  },
  desert: {
    sky: ['#ff8f5a', '#ffc98a', '#fff0c8'], fog: '#ffe2ae', sun: { x: 0.3, y: 0.2, r: 0.09, c: '#fffbe6', glow: 'rgba(255,220,150,0.6)' },
    road: ['#c4925f', '#cd9c68'], rumble: ['#ff7a3d', '#fff3d6'], lane: '#fff6e0', grass: ['#f2cd88', '#ebc27a'], edge: null,
    far: ['#e59a6b', '#f0b07a'], near: ['#d9925a', '#cf8650'], deco: ['crystal', 'cactus', 'rockpile', 'crystal', 'cactus'], big: ['mesa', 'crystalBig'], border: 'flag', obstacle: 'crystalRock', tunnel: '#8a5a3a', ring: '#ffd24a',
  },
  frost: {
    sky: ['#071234', '#1a3a7c', '#5ba2da'], fog: '#a9c9ff', moon: { x: 0.74, y: 0.13, r: 0.06 }, stars: true, aurora: true,
    road: ['#9ab0da', '#a4b9e0'], rumble: ['#56d6f5', '#ffffff'], lane: '#ffffff', grass: ['#eef6ff', '#dde9fb'], edge: null,
    far: ['#7d96d6', '#93acdf'], near: ['#c9daf5', '#b9cdee'], deco: ['pine', 'icecrystal', 'pine', 'snowman', 'pine'], big: ['igloo', 'icecrystalBig'], border: 'icepole', obstacle: 'iceRock', tunnel: '#3a5a9a', ring: '#a9f3ff',
  },
  glitch: {
    sky: ['#040210', '#1a0a4e', '#4b0f70'], fog: '#2a0b4c', stars: true, grid: true,
    road: ['#1a1e4a', '#1f2456'], rumble: ['#ff2bd6', '#00f0ff'], lane: '#00f0ff', grass: ['#090b20', '#0d102c'], edge: '#ff2bd6',
    far: ['#2a0f5a', '#3b1478'], near: ['#140a38', '#1b0d48'], deco: ['pillar', 'cube', 'pixeltree', 'pillar', 'cube'], big: ['tower', 'cubeBig'], border: 'barrier', obstacle: 'glitchBlock', tunnel: '#0e0a2a', ring: '#ff2bd6',
  },
};

const TOKEN = /^([SLR])(?:(\d+)x)?(\d+)((?:[\^v]\d+)?)((?:![a-z])*)$/;

/** Découpe le mini-langage de tracé en tronçons. */
export function parseLayout(str) {
  return str.trim().split(/\s+/).map((tok) => {
    const m = TOKEN.exec(tok);
    if (!m) throw new Error('Tracé invalide : ' + tok);
    const [, kind, k, n, hill, flags] = m;
    const curve = kind === 'S' ? 0 : (kind === 'L' ? -1 : 1) * Number(k || 2);
    const h = hill ? (hill[0] === '^' ? 1 : -1) * Number(hill.slice(1)) : 0;
    return { n: Number(n), curve, hill: h, flags: new Set((flags || '').split('!').filter(Boolean)) };
  });
}

/**
 * Construit un circuit complet.
 * @returns {{segments:object[], length:number, theme:object, world:object, map:number[][], name:object}}
 */
export function buildTrack(worldIndex, trackIndex) {
  const world = WORLDS[worldIndex], def = world.tracks[trackIndex];
  const theme = THEMES[world.id];
  const rnd = seeded(hash(def.id));
  const sections = [{ n: START_SEG + 10, curve: 0, hill: 0, flags: new Set() }, ...parseLayout(def.layout)];
  const segs = [];
  let y = 0;
  const add = (curve, y1, y2, flags) => {
    const i = segs.length;
    segs.push({ i, curve, y1, y2, z1: i * SEG, z2: (i + 1) * SEG, sprites: [], items: [], tunnel: flags.has('t'), boost: null, jump: false, dark: Math.floor(i / RUMBLE) % 2 === 1, sx1: 0, sy1: 0, sw1: 0, ss1: 0, sx2: 0, sy2: 0, sw2: 0, ss2: 0, clip: 0, vis: false, fog: 0, cars: [] });
  };
  const ranges = [];
  for (const s of sections) {
    const start = segs.length, y0 = y, y1 = y + s.hill * HILL;
    const enter = Math.round(s.n * 0.28), leave = Math.round(s.n * 0.28), hold = s.n - enter - leave;
    for (let i = 0; i < s.n; i++) {
      const env = i < enter ? easeInOut(i / enter) : i < enter + hold ? 1 : easeInOut(1 - (i - enter - hold) / leave);
      const a = lerp(y0, y1, easeInOut(i / s.n)), b = lerp(y0, y1, easeInOut((i + 1) / s.n));
      add(s.curve * env, a, b, s.flags);
    }
    y = y1;
    ranges.push({ start, end: segs.length, ...s });
  }
  // retour à l'altitude de départ + ligne droite d'arrivée
  if (Math.abs(y) > 1) {
    const n = Math.max(40, Math.round(Math.abs(y) / HILL * 2.2)), y0 = y;
    for (let i = 0; i < n; i++) add(0, lerp(y0, 0, easeInOut(i / n)), lerp(y0, 0, easeInOut((i + 1) / n)), new Set());
  }
  for (let i = 0; i < 16; i++) add(0, 0, 0, new Set());

  const N = segs.length;
  // éléments demandés par le tracé
  for (const r of ranges) {
    const mid = Math.floor((r.start + r.end) / 2), len = r.end - r.start;
    if (r.flags.has('b')) { const x = (rnd() - 0.5) * 1.0; for (let k = -3; k < 3; k++) segs[mid + k].boost = x; }
    if (r.flags.has('i')) { for (const x of [-0.66, -0.22, 0.22, 0.66]) segs[mid].items.push({ type: 'box', x, alive: true, t: 0 }); }
    if (r.flags.has('c')) {
      const x0 = (rnd() - 0.5) * 1.1, wave = rnd() < 0.5 ? 0 : 0.35, st = r.start + Math.floor(len * 0.15);
      for (let k = 0; k < 10; k++) { const s = st + k * 3; if (s < r.end) segs[s].items.push({ type: 'coin', x: x0 + Math.sin(k * 0.6) * wave, alive: true, t: 0 }); }
    }
    if (r.flags.has('j')) { const s = r.end - 4; segs[s].jump = true; segs[s - 1].ramp = true; segs[s - 2].ramp = true; segs[s - 3].ramp = true; }
    if (r.flags.has('o')) { for (let k = 0; k < 4; k++) { const s = r.start + Math.floor(len * (0.2 + k * 0.2)); segs[s].sprites.push({ kind: theme.obstacle, x: (k % 2 ? 1 : -1) * (0.25 + rnd() * 0.45), road: true }); } }
  }
  // pièces supplémentaires dans les longues lignes droites sans objets
  for (let i = START_SEG + 30; i < N - 30; i += 70) {
    if (segs.slice(i, i + 30).some((s) => s.items.length || s.boost !== null || s.jump || Math.abs(s.curve) > 2)) continue;
    const x0 = (rnd() - 0.5) * 1.2;
    for (let k = 0; k < 6; k++) segs[i + k * 3].items.push({ type: 'coin', x: x0, alive: true, t: 0 });
  }
  // ligne de départ
  for (let k = 0; k < 2; k++) segs[START_SEG + k].start = true;
  segs[START_SEG + 2].sprites.push({ kind: 'arch', x: 0, big: true });

  // décors des bas-côtés
  let border = 0;
  for (let i = 0; i < N; i++) {
    const s = segs[i];
    if (s.tunnel) { if (i > 0 && !segs[i - 1].tunnel) s.portal = true; continue; }
    if (i >= START_SEG - 4 && i <= START_SEG + 6) continue;
    if (i % 4 === 0 && (border > 0 || Math.abs(s.curve) > 2.5)) { s.sprites.push({ kind: theme.border, x: -1.22 }); s.sprites.push({ kind: theme.border, x: 1.22 }); }
    if (border > 0) border--; else if (rnd() < 0.012) border = 60;
    if (rnd() < 0.34) {
      const side = rnd() < 0.5 ? -1 : 1, far = rnd();
      s.sprites.push({ kind: theme.deco[Math.floor(rnd() * theme.deco.length)], x: side * (1.45 + far * far * 2.6), flip: rnd() < 0.5 });
    }
    if (rnd() < 0.035) {
      const side = rnd() < 0.5 ? -1 : 1;
      s.sprites.push({ kind: theme.big[Math.floor(rnd() * theme.big.length)], x: side * (4.4 + rnd() * 3), flip: rnd() < 0.5 });
    }
    if (i % 160 === 80) s.sprites.push({ kind: 'billboard', x: (i % 320 === 80 ? -1 : 1) * 1.9 });
  }
  // fin des tunnels : façade à la sortie aussi (vue depuis l'arrière, non dessinée)

  return { segments: segs, length: N * SEG, theme, world, worldIndex, trackIndex, def, name: def.name, map: buildMap(segs) };
}

/** Tracé 2D pour la mini-carte (boucle fermée par répartition de l'erreur). */
function buildMap(segs) {
  const N = segs.length, k = 0.0105;
  const sum = segs.reduce((a, s) => a + s.curve, 0);
  const dir = sum >= 0 ? 1 : -1;
  const bias = (dir * Math.PI * 2 - k * sum) / N;
  let h = 0, x = 0, y = 0;
  const pts = [];
  for (let i = 0; i < N; i++) { pts.push([x, y]); h += segs[i].curve * k + bias; x += Math.sin(h); y -= Math.cos(h); }
  // fermeture de la boucle
  const ex = x, ey = y;
  for (let i = 0; i < N; i++) { pts[i][0] -= (ex * i) / N; pts[i][1] -= (ey * i) / N; }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [px, py] of pts) { minX = Math.min(minX, px); minY = Math.min(minY, py); maxX = Math.max(maxX, px); maxY = Math.max(maxY, py); }
  const s = 1 / Math.max(maxX - minX, maxY - minY);
  const ox = (1 - (maxX - minX) * s) / 2, oy = (1 - (maxY - minY) * s) / 2;
  return pts.map(([px, py]) => [ox + (px - minX) * s, oy + (py - minY) * s]);
}

export function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

export const segAt = (track, z) => track.segments[Math.floor(((z % track.length) + track.length) % track.length / SEG) % track.segments.length];
