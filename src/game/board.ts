/**
 * Logique pure du plateau (aucune dépendance au DOM) : placement, lignes, simulation.
 * Le plateau est un tableau plat de SIZE*SIZE cases ; 0 = vide, 1..n = couleur.
 */
import type { Shape } from './shapes';

export const SIZE = 8;
export const CELLS = SIZE * SIZE;

export type Board = Uint8Array;

export const emptyBoard = (): Board => new Uint8Array(CELLS);
export const idx = (r: number, c: number): number => r * SIZE + c;

export function canPlace(board: Board, shape: Shape, r: number, c: number): boolean {
  if (r < 0 || c < 0 || r + shape.h > SIZE || c + shape.w > SIZE) return false;
  for (const [dr, dc] of shape.cells) {
    if (board[idx(r + dr, c + dc)] !== 0) return false;
  }
  return true;
}

export interface Lines {
  rows: number[];
  cols: number[];
}

/** Lignes et colonnes complètes du plateau. */
export function fullLines(board: Board): Lines {
  const rows: number[] = [];
  const cols: number[] = [];
  for (let r = 0; r < SIZE; r++) {
    let full = true;
    for (let c = 0; c < SIZE; c++) {
      if (board[idx(r, c)] === 0) {
        full = false;
        break;
      }
    }
    if (full) rows.push(r);
  }
  for (let c = 0; c < SIZE; c++) {
    let full = true;
    for (let r = 0; r < SIZE; r++) {
      if (board[idx(r, c)] === 0) {
        full = false;
        break;
      }
    }
    if (full) cols.push(c);
  }
  return { rows, cols };
}

/** Indices (uniques) des cases couvertes par un ensemble de lignes/colonnes. */
export function lineCells(lines: Lines): number[] {
  const set = new Set<number>();
  for (const r of lines.rows) for (let c = 0; c < SIZE; c++) set.add(idx(r, c));
  for (const c of lines.cols) for (let r = 0; r < SIZE; r++) set.add(idx(r, c));
  return [...set];
}

export interface PlaceResult {
  board: Board;
  placed: number[];
  lines: Lines;
  cleared: number[];
}

/** Pose une pièce (sans vérification) et efface les lignes complètes. Ne modifie pas `board`. */
export function place(board: Board, shape: Shape, r: number, c: number, color: number): PlaceResult {
  const next = board.slice();
  const placed: number[] = [];
  for (const [dr, dc] of shape.cells) {
    const i = idx(r + dr, c + dc);
    next[i] = color;
    placed.push(i);
  }
  const lines = fullLines(next);
  const cleared = lineCells(lines);
  for (const i of cleared) next[i] = 0;
  return { board: next, placed, lines, cleared };
}

/** Lignes qui seraient complétées en posant la pièce ici (pour l'aperçu). */
export function previewLines(board: Board, shape: Shape, r: number, c: number): Lines {
  const tmp = board.slice();
  for (const [dr, dc] of shape.cells) tmp[idx(r + dr, c + dc)] = 1;
  return fullLines(tmp);
}

export function fitsAnywhere(board: Board, shape: Shape): boolean {
  for (let r = 0; r <= SIZE - shape.h; r++) {
    for (let c = 0; c <= SIZE - shape.w; c++) {
      if (canPlace(board, shape, r, c)) return true;
    }
  }
  return false;
}

export interface FitInfo {
  /** nombre de positions valides */
  fits: number;
  /** nombre maximal de lignes effaçables en une pose */
  bestClear: number;
  /** meilleure position (max de lignes, puis meilleur « rangement ») */
  best: { r: number; c: number } | null;
}

/** Nombre de cases voisines occupées ou hors plateau : mesure à quel point une pose est « bien rangée ». */
function snugness(board: Board, shape: Shape, r: number, c: number): number {
  let score = 0;
  const own = new Set(shape.cells.map(([dr, dc]) => idx(r + dr, c + dc)));
  for (const [dr, dc] of shape.cells) {
    const rr = r + dr;
    const cc = c + dc;
    for (const [nr, nc] of [
      [rr - 1, cc],
      [rr + 1, cc],
      [rr, cc - 1],
      [rr, cc + 1],
    ]) {
      if (nr < 0 || nc < 0 || nr >= SIZE || nc >= SIZE) score += 1;
      else if (!own.has(idx(nr, nc)) && board[idx(nr, nc)] !== 0) score += 1;
    }
  }
  return score;
}

export function analyzeFit(board: Board, shape: Shape): FitInfo {
  let fits = 0;
  let bestClear = 0;
  let bestScore = -1;
  let best: FitInfo['best'] = null;
  for (let r = 0; r <= SIZE - shape.h; r++) {
    for (let c = 0; c <= SIZE - shape.w; c++) {
      if (!canPlace(board, shape, r, c)) continue;
      fits++;
      const lines = previewLines(board, shape, r, c);
      const n = lines.rows.length + lines.cols.length;
      const score = n * 100 + snugness(board, shape, r, c);
      if (score > bestScore) {
        bestScore = score;
        best = { r, c };
      }
      if (n > bestClear) bestClear = n;
    }
  }
  return { fits, bestClear, best };
}

export function fillRatio(board: Board): number {
  let n = 0;
  for (let i = 0; i < CELLS; i++) if (board[i] !== 0) n++;
  return n / CELLS;
}

export function isEmpty(board: Board): boolean {
  for (let i = 0; i < CELLS; i++) if (board[i] !== 0) return false;
  return true;
}

/**
 * Existe-t-il un ordre et des positions permettant de poser toutes les pièces ?
 * Recherche en profondeur bornée (les lignes effacées en cours de route sont prises en compte).
 */
export function canPlaceAll(board: Board, shapes: Shape[], budget = { nodes: 6000 }): boolean {
  if (shapes.length === 0) return true;
  const tried = new Set<string>();
  for (let i = 0; i < shapes.length; i++) {
    const shape = shapes[i];
    if (tried.has(shape.id)) continue;
    tried.add(shape.id);
    const rest = shapes.filter((_, j) => j !== i);
    for (let r = 0; r <= SIZE - shape.h; r++) {
      for (let c = 0; c <= SIZE - shape.w; c++) {
        if (!canPlace(board, shape, r, c)) continue;
        if (budget.nodes-- <= 0) return false;
        const res = place(board, shape, r, c, 1);
        if (canPlaceAll(res.board, rest, budget)) return true;
      }
    }
  }
  return false;
}
