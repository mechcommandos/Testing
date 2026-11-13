/**
 * Catalogue des pièces. Chaque forme de base est déclinée dans toutes ses orientations
 * (rotations, et miroirs quand ils diffèrent), puis dédoublonnée.
 */

export interface Shape {
  /** identifiant unique de l'orientation, ex. "L4#2" */
  id: string;
  /** famille (forme de base) */
  family: string;
  w: number;
  h: number;
  /** cellules occupées [ligne, colonne] */
  cells: ReadonlyArray<readonly [number, number]>;
  /** difficulté intrinsèque 0 (très facile à caser) → 1 (très contraignante) */
  difficulty: number;
  /** poids de base dans le tirage */
  weight: number;
}

interface BaseDef {
  family: string;
  pattern: string;
  difficulty: number;
  weight: number;
  mirror?: boolean;
}

const BASES: BaseDef[] = [
  { family: 'dot', pattern: '#', difficulty: 0.02, weight: 0.55 },
  { family: 'I2', pattern: '##', difficulty: 0.08, weight: 0.9 },
  { family: 'I3', pattern: '###', difficulty: 0.2, weight: 1.1 },
  { family: 'I4', pattern: '####', difficulty: 0.45, weight: 0.9 },
  { family: 'I5', pattern: '#####', difficulty: 0.72, weight: 0.55 },
  { family: 'O2', pattern: '##/##', difficulty: 0.3, weight: 1.1 },
  { family: 'O3', pattern: '###/###/###', difficulty: 0.95, weight: 0.5 },
  { family: 'R23', pattern: '###/###', difficulty: 0.66, weight: 0.6 },
  { family: 'V3', pattern: '#./##', difficulty: 0.22, weight: 1.0 },
  { family: 'L4', pattern: '#./#./##', difficulty: 0.5, weight: 0.9, mirror: true },
  { family: 'V5', pattern: '#../#../###', difficulty: 0.82, weight: 0.5 },
  { family: 'T4', pattern: '###/.#.', difficulty: 0.52, weight: 0.8 },
  { family: 'S4', pattern: '.##/##.', difficulty: 0.6, weight: 0.6, mirror: true },
  { family: 'D2', pattern: '#./.#', difficulty: 0.58, weight: 0.3 },
  { family: 'D3', pattern: '#../.#./..#', difficulty: 0.8, weight: 0.18 },
];

type Grid = boolean[][];

function parse(pattern: string): Grid {
  return pattern.split('/').map((row) => [...row].map((ch) => ch === '#'));
}

function rotate(g: Grid): Grid {
  const h = g.length;
  const w = g[0].length;
  const out: Grid = [];
  for (let c = 0; c < w; c++) {
    const row: boolean[] = [];
    for (let r = h - 1; r >= 0; r--) row.push(g[r][c]);
    out.push(row);
  }
  return out;
}

function flip(g: Grid): Grid {
  return g.map((row) => [...row].reverse());
}

function key(g: Grid): string {
  return g.map((row) => row.map((v) => (v ? '#' : '.')).join('')).join('/');
}

function build(): Shape[] {
  const shapes: Shape[] = [];
  for (const base of BASES) {
    const seen = new Set<string>();
    const variants: Grid[] = [];
    let g = parse(base.pattern);
    for (let i = 0; i < 4; i++) {
      variants.push(g);
      if (base.mirror) variants.push(flip(g));
      g = rotate(g);
    }
    const unique = variants.filter((v) => {
      const k = key(v);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    unique.forEach((v, i) => {
      const cells: [number, number][] = [];
      v.forEach((row, r) => row.forEach((on, c) => on && cells.push([r, c])));
      shapes.push({
        id: `${base.family}#${i}`,
        family: base.family,
        w: v[0].length,
        h: v.length,
        cells,
        difficulty: base.difficulty,
        // le poids de la famille est réparti sur ses orientations
        weight: base.weight / unique.length,
      });
    });
  }
  return shapes;
}

export const SHAPES: ReadonlyArray<Shape> = build();
const BY_ID = new Map(SHAPES.map((s) => [s.id, s]));

export function shapeById(id: string): Shape {
  const s = BY_ID.get(id);
  if (!s) throw new Error(`Forme inconnue: ${id}`);
  return s;
}

/** Nombre de couleurs de blocs disponibles (index 1..COLOR_COUNT). */
export const COLOR_COUNT = 7;

export interface Piece {
  shapeId: string;
  color: number;
}
