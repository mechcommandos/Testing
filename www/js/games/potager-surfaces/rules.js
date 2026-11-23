/**
 * Le potager des surfaces (jeu 50) : règles pures, testées (tests/js/games44-53.test.js).
 * Les parcelles sont posées sur un quadrillage (un carreau = 1 mètre de côté).
 * Niveau 1 : compter les carreaux d'une parcelle (l'aire). Niveau 2 : rectangles (rangées × colonnes) et comparer
 * deux parcelles. Niveau 3 : le tour de la parcelle (le périmètre, la clôture), mêlé à quelques questions d'aire.
 */
import { numberOptions } from '../quiz.js';

export const SERIES_LENGTH = 6;
export const COLS = 7;
export const ROWS = 5;

const key = (x, y) => `${x},${y}`;

/** true si la parcelle entoure un carreau d'herbe (un « trou ») : la clôture serait ambiguë. */
export function hasHole(cells) {
  const has = new Set(cells.map(([x, y]) => key(x, y)));
  const seen = new Set();
  const stack = [[-1, -1]];
  while (stack.length) {
    const [x, y] = stack.pop();
    const k = key(x, y);
    if (x < -1 || y < -1 || x > COLS || y > ROWS || seen.has(k) || has.has(k)) continue;
    seen.add(k);
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return (COLS + 2) * (ROWS + 2) - seen.size !== cells.length;
}

/** Parcelle d'un seul tenant, sans trou : n carreaux voisins, tirés au hasard dans le quadrillage. */
export function polyomino(n, random) {
  for (;;) {
    const cells = grow(n, random);
    if (!hasHole(cells)) return cells;
  }
}

function grow(n, random) {
  const cells = [[random.int(1, COLS - 2), random.int(1, ROWS - 2)]];
  const has = new Set([key(...cells[0])]);
  for (let tries = 0; cells.length < n && tries < 500; tries++) {
    const [x, y] = random.pick(cells);
    const [dx, dy] = random.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || has.has(key(nx, ny))) continue;
    has.add(key(nx, ny));
    cells.push([nx, ny]);
  }
  return cells;
}

export function rectangle(w, h, x0 = 0, y0 = 0) {
  const cells = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) cells.push([x0 + x, y0 + y]);
  return cells;
}

export const area = (cells) => cells.length;

/** Périmètre : chaque côté de carreau qui ne touche pas un autre carreau de la parcelle. */
export function perimeter(cells) {
  const has = new Set(cells.map(([x, y]) => key(x, y)));
  let p = 0;
  for (const [x, y] of cells) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!has.has(key(x + dx, y + dy))) p += 1;
  return p;
}

function countQuestion(cells, random, extra = []) {
  const a = area(cells);
  return { kind: 'area', cells, answer: String(a), options: numberOptions(a, random, [...extra, a + 1, a - 1, a + 2], { min: 1 }).map(String) };
}

export function makeSeries(difficulty, random) {
  const out = [];
  for (let i = 0; i < SERIES_LENGTH; i++) {
    if (difficulty === 0) {
      out.push(countQuestion(polyomino(random.int(3, 9), random), random));
    } else if (difficulty === 1) {
      if (i % 2 === 0) {
        const w = random.int(2, 6);
        const h = random.int(2, 4);
        const q = countQuestion(rectangle(w, h, Math.floor((COLS - w) / 2), Math.floor((ROWS - h) / 2)), random, [w * h + w, w * h - w, w + h]);
        out.push({ ...q, rect: [w, h] });
      } else {
        // Comparer deux rectangles d'aires différentes, ni l'un dans l'autre (pas de comparaison « à l'œil » trop facile).
        let a;
        let b;
        do {
          a = [random.int(2, 3), random.int(2, 4)];
          b = [random.int(1, 3), random.int(2, 4)];
        } while (a[0] * a[1] === b[0] * b[1] || (a[0] >= b[0] && a[1] >= b[1]) || (b[0] >= a[0] && b[1] >= a[1]));
        const A = rectangle(a[0], a[1], 0, 0);
        const B = rectangle(b[0], b[1], COLS - b[0], 0);
        out.push({ kind: 'compare', a: A, b: B, answer: area(A) > area(B) ? 'A' : 'B', options: ['A', 'B'] });
      }
    } else if (i % 3 === 2) {
      out.push(countQuestion(polyomino(random.int(5, 10), random), random));
    } else {
      const cells = i % 3 === 0 ? (() => { const w = random.int(2, 5); const h = random.int(2, 4); return rectangle(w, h, 1, 0); })() : polyomino(random.int(4, 8), random);
      const p = perimeter(cells);
      out.push({ kind: 'perimeter', cells, answer: String(p), options: numberOptions(p, random, [area(cells), p + 2, p - 2], { min: 4 }).map(String) });
    }
  }
  return out;
}
