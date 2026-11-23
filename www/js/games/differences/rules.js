/**
 * La chasse aux différences (jeu 14) : règles pures, testées (tests/js/games13-21.test.js).
 *
 * Une scène = des objets simples (formes de couleur) placés sur une grille, dans un repère 400 × 300.
 * L'image de droite est une copie où quelques objets diffèrent : absent, ajouté, autre couleur, autre forme, autre taille.
 * Une différence se trouve en touchant près d'elle sur l'une ou l'autre image (zone large, voir HIT_RADIUS).
 *
 * - difficulté 0 : 3 grosses différences (objet absent, autre couleur), 8 gros objets ;
 * - difficulté 1 : 5 différences (absent, ajouté, couleur, forme), 11 objets ;
 * - difficulté 2 : 7 différences fines (taille, nuance proche, forme), 15 petits objets.
 */
export const WIDTH = 400;
export const HEIGHT = 300;
export const HIT_RADIUS = 46; // dans le repère 400 × 300 : environ 11 % de la largeur de l'image
export const SCENES_PER_SERIES = 2;

export const SHAPES = ['rond', 'carre', 'triangle', 'etoile', 'coeur', 'fleur'];
export const COLORS = ['#e5484d', '#3b82f6', '#f5b82e', '#3aa65b', '#a855f7', '#f97316'];
// Nuances proches pour les différences fines (même famille de couleur, mais bien visibles côte à côte).
export const SHADES = { '#e5484d': '#f59ab0', '#3b82f6': '#93c5fd', '#f5b82e': '#c2851a', '#3aa65b': '#9bd3a9', '#a855f7': '#d8b4fe', '#f97316': '#b45309' };

const LEVELS = [
  { objects: 8, differences: 3, kinds: ['missing', 'color'], size: [44, 52] },
  { objects: 11, differences: 5, kinds: ['missing', 'extra', 'color', 'shape'], size: [36, 44] },
  { objects: 15, differences: 7, kinds: ['size', 'shade', 'shape', 'missing'], size: [28, 36] },
];

export function level(difficulty) {
  return LEVELS[Math.min(difficulty, 2)];
}

/** Cases de la grille (centres), assez espacées pour que deux zones de toucher ne se confondent pas. */
function cells(cols, rows) {
  const list = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) list.push({ x: Math.round((c + 0.5) * (WIDTH / cols)), y: Math.round((r + 0.5) * (HEIGHT / rows)) });
  return list;
}

export function makeScene(difficulty, random) {
  const L = level(difficulty);
  const grid = difficulty === 2 ? cells(6, 4) : difficulty === 1 ? cells(5, 4) : cells(4, 3);
  const spots = random.shuffle(grid);
  const objects = spots.slice(0, L.objects).map((p, i) => ({
    id: `o${i}`, x: p.x + random.int(-8, 8), y: p.y + random.int(-8, 8),
    shape: random.pick(SHAPES), color: random.pick(COLORS), size: random.int(L.size[0], L.size[1]),
  }));
  const free = spots.slice(L.objects);
  const right = objects.map((o) => ({ ...o }));
  const targets = random.shuffle(objects).slice(0, L.differences);
  const differences = [];
  targets.forEach((o, i) => {
    let kind = L.kinds[i % L.kinds.length];
    if (kind === 'extra' && !free.length) kind = 'color';
    const r = right.find((x) => x.id === o.id);
    if (kind === 'missing') right.splice(right.indexOf(r), 1);
    if (kind === 'color') r.color = random.pick(COLORS.filter((c) => c !== o.color));
    if (kind === 'shade') r.color = SHADES[o.color];
    if (kind === 'shape') r.shape = random.pick(SHAPES.filter((s) => s !== o.shape));
    if (kind === 'size') r.size = Math.round(o.size * 0.6);
    let at = { x: o.x, y: o.y };
    if (kind === 'extra') {
      // L'objet de la liste reste identique ; un nouvel objet apparaît à droite dans une case libre.
      const p = free.shift();
      at = { x: p.x, y: p.y };
      right.push({ id: `x${i}`, x: p.x, y: p.y, shape: random.pick(SHAPES), color: random.pick(COLORS), size: o.size });
    }
    differences.push({ id: `d${i}`, kind, x: at.x, y: at.y });
  });
  return { left: objects, right, differences };
}

/** Différence touchée (la plus proche dans le rayon), parmi celles pas encore trouvées ; sinon null. */
export function hitTest(differences, found, x, y, radius = HIT_RADIUS) {
  let best = null;
  for (const d of differences) {
    if (found.has(d.id)) continue;
    const dist = Math.hypot(d.x - x, d.y - y);
    if (dist <= radius && (!best || dist < best.dist)) best = { id: d.id, dist };
  }
  return best?.id ?? null;
}

export const KIND_LABEL = { missing: 'un objet a disparu', extra: 'un objet en plus', color: 'une autre couleur', shade: 'une couleur un peu différente', shape: 'une autre forme', size: 'une autre taille' };
