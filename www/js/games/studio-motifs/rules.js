/**
 * Le studio des motifs et des symétries (jeu 30) : règles pures, testées (tests/js/games22-30.test.js).
 * Une grille = tableau de lignes ; une case vaut un indice de couleur (0, 1, 2…) ou null (vide).
 *
 * - difficulté 0 : symétrie verticale — la moitié gauche est donnée, colorier la droite en miroir ;
 * - difficulté 1 : motifs — chaque ligne répète un motif dont le début est donné ;
 * - difficulté 2 : symétries doubles — le quart en haut à gauche est donné, compléter les trois autres.
 * Le mode libre (création sans modèle) n'est jamais vérifié ni enregistré.
 */
export const PALETTE = ['#e5484d', '#3b82f6', '#f5c518', '#3aa65b', '#8b6fe8', '#f08a3c'];
export const CHALLENGES_PER_SERIES = 2;

const blank = (rows, cols) => Array.from({ length: rows }, () => Array(cols).fill(null));

/** Moitié (ou quart) donnée : environ la moitié des cases coloriées, 2 ou 3 couleurs. */
function randomPart(rows, cols, colors, random) {
  for (;;) {
    const part = Array.from({ length: rows }, () => Array.from({ length: cols }, () => (random() < 0.5 ? random.int(0, colors - 1) : null)));
    const filled = part.flat().filter((c) => c !== null).length;
    if (filled >= Math.ceil(rows * cols * 0.35) && filled <= Math.floor(rows * cols * 0.7)) return part;
  }
}

export function makeChallenge(difficulty, random) {
  if (difficulty === 0) {
    const rows = 6;
    const half = 3;
    const left = randomPart(rows, half, 2, random);
    const target = left.map((row) => [...row, ...[...row].reverse()]);
    const given = target.map((row) => row.map((c, x) => (x < half ? c : null)));
    const locked = target.map((row) => row.map((_, x) => x < half));
    return { kind: 'mirror', rows, cols: 6, target, given, locked, axis: 'v', colors: 2, prompt: 'Colorie la moitié droite comme dans un miroir : chaque case est à la même distance du trait.' };
  }
  if (difficulty === 1) {
    const cols = 8;
    const patterns = [[0, 1], [0, 0, 1], [0, 1, 2], [0, 1, 1], [0, 1, 2, 1]];
    const lines = [0, 1, 2].map(() => random.pick(patterns).map((c) => (c + random.int(0, 3)) % 4));
    const target = lines.map((p) => Array.from({ length: cols }, (_, x) => p[x % p.length]));
    const shown = lines.map((p) => Math.min(cols - 2, p.length * 2));
    const given = target.map((row, y) => row.map((c, x) => (x < shown[y] ? c : null)));
    const locked = target.map((row, y) => row.map((_, x) => x < shown[y]));
    return { kind: 'pattern', rows: 3, cols, target, given, locked, colors: 4, prompt: 'Continue chaque ligne : le motif du début se répète jusqu’au bout.' };
  }
  const q = 3;
  const quarter = randomPart(q, q, 3, random);
  const top = quarter.map((row) => [...row, ...[...row].reverse()]);
  const target = [...top, ...[...top].reverse().map((r) => [...r])];
  const given = target.map((row, y) => row.map((c, x) => (x < q && y < q ? c : null)));
  const locked = target.map((row, y) => row.map((_, x) => x < q && y < q));
  return { kind: 'double', rows: 6, cols: 6, target, given, locked, axis: 'vh', colors: 3, prompt: 'Complète le dessin en miroir, à droite et en bas : il est symétrique dans les deux sens.' };
}

export function makeSeries(difficulty, random) {
  return Array.from({ length: CHALLENGES_PER_SERIES }, () => makeChallenge(Math.min(difficulty, 2), random));
}

/** Peindre une case : la couleur choisie, ou vide si on retouche la même couleur. Les cases données sont figées. */
export function paint(challenge, grid, x, y, color) {
  if (challenge?.locked?.[y]?.[x]) return grid;
  return grid.map((row, j) => row.map((c, i) => (i === x && j === y ? (c === color ? null : color) : c)));
}

export function matches(challenge, grid) {
  return challenge.target.every((row, y) => row.every((c, x) => grid[y][x] === c));
}

/** Première case à corriger (indice) : { x, y, color } ; color null = à effacer. */
export function firstWrong(challenge, grid) {
  for (let y = 0; y < challenge.rows; y++) for (let x = 0; x < challenge.cols; x++) {
    if (grid[y][x] !== challenge.target[y][x]) return { x, y, color: challenge.target[y][x] };
  }
  return null;
}

export const freeGrid = (size = 8) => blank(size, size);

/** Mode libre avec miroir : peindre une case peint aussi sa jumelle de l'autre côté de l'axe vertical. */
export function paintFree(grid, x, y, color, mirror = false) {
  let next = paint(null, grid, x, y, color);
  if (mirror) {
    const mx = grid[0].length - 1 - x;
    if (mx !== x) next = next.map((row, j) => row.map((c, i) => (i === mx && j === y ? next[y][x] : c)));
  }
  return next;
}
