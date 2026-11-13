/**
 * Une partie : score, combos, armes, reprise. Logique pure (pas de DOM), sérialisable.
 */
import {
  CELLS,
  SIZE,
  canPlace,
  emptyBoard,
  fitsAnywhere,
  idx,
  isEmpty,
  place,
  type Board,
  type Lines,
} from './board';
import { newDirectorState, nextSet, type DirectorState, type PlayerModel, type Rng } from './director';
import { shapeById, type Piece } from './shapes';

export type WeaponId = 'hammer' | 'laser' | 'chroma' | 'recycle';
export const WEAPON_IDS: WeaponId[] = ['hammer', 'laser', 'chroma', 'recycle'];

/** Lignes nécessaires pour remplir la jauge « cœur » de LayJou. */
export const ENERGY_MAX = 10;
/** Poses sans ligne tolérées avant que le combo ne retombe. */
export const COMBO_GRACE = 3;
export const MAX_CONTINUES = 3;

export interface GameSnapshot {
  board: number[];
  tray: (Piece | null)[];
  score: number;
  streak: number;
  idle: number;
  energy: number;
  continues: number;
  lines: number;
  blocks: number;
  maxCombo: number;
  multi: number;
  weaponsUsed: number;
  director: DirectorState;
}

export interface PlaceOutcome {
  placed: number[];
  color: number;
  lines: Lines;
  cleared: number[];
  /** couleurs des cases effacées (pour les particules) */
  clearedColors: number[];
  lineCount: number;
  gained: number;
  streak: number;
  perfect: boolean;
  /** la jauge cœur vient de se remplir */
  energyFull: boolean;
  /** une nouvelle donne vient d'arriver */
  refilled: boolean;
}

export interface BlastOutcome {
  cells: number[];
  colors: number[];
  gained: number;
}

const lineScore = (n: number) => (10 * n * (n + 1)) / 2;

export class Game {
  board: Board = emptyBoard();
  tray: (Piece | null)[] = [null, null, null];
  score = 0;
  streak = 0;
  idle = 0;
  energy = 0;
  continues = 0;
  lines = 0;
  blocks = 0;
  maxCombo = 0;
  multi = 0;
  weaponsUsed = 0;
  director: DirectorState;

  constructor(
    private player: PlayerModel,
    private rng: Rng = Math.random,
  ) {
    this.director = newDirectorState(player);
  }

  static fresh(player: PlayerModel, rng?: Rng): Game {
    const g = new Game(player, rng);
    g.deal();
    return g;
  }

  static restore(s: GameSnapshot, player: PlayerModel): Game {
    const g = new Game(player);
    g.board = Uint8Array.from(s.board);
    if (g.board.length !== CELLS) g.board = emptyBoard();
    g.tray = s.tray.map((p) => (p ? { ...p } : null));
    g.score = s.score;
    g.streak = s.streak;
    g.idle = s.idle;
    g.energy = s.energy;
    g.continues = s.continues;
    g.lines = s.lines;
    g.blocks = s.blocks;
    g.maxCombo = s.maxCombo;
    g.multi = s.multi;
    g.weaponsUsed = s.weaponsUsed;
    g.director = { ...s.director };
    if (g.tray.every((p) => !p)) g.deal();
    return g;
  }

  snapshot(): GameSnapshot {
    return {
      board: Array.from(this.board),
      tray: this.tray.map((p) => (p ? { ...p } : null)),
      score: this.score,
      streak: this.streak,
      idle: this.idle,
      energy: this.energy,
      continues: this.continues,
      lines: this.lines,
      blocks: this.blocks,
      maxCombo: this.maxCombo,
      multi: this.multi,
      weaponsUsed: this.weaponsUsed,
      director: { ...this.director },
    };
  }

  private deal(forceRescue = false): void {
    const res = nextSet(this.board, this.score, this.director, this.player, { forceRescue, rng: this.rng });
    this.tray = res.pieces;
    this.director = res.state;
  }

  canPlaceAt(slot: number, r: number, c: number): boolean {
    const p = this.tray[slot];
    return !!p && canPlace(this.board, shapeById(p.shapeId), r, c);
  }

  slotFits(slot: number): boolean {
    const p = this.tray[slot];
    return !!p && fitsAnywhere(this.board, shapeById(p.shapeId));
  }

  hasMoves(): boolean {
    return this.tray.some((_, i) => this.slotFits(i));
  }

  placePiece(slot: number, r: number, c: number): PlaceOutcome | null {
    const piece = this.tray[slot];
    if (!piece) return null;
    const shape = shapeById(piece.shapeId);
    if (!canPlace(this.board, shape, r, c)) return null;

    const res = place(this.board, shape, r, c, piece.color);
    // couleurs avant effacement (la pièce posée incluse)
    const before = this.board.slice();
    for (const i of res.placed) before[i] = piece.color;
    const clearedColors = res.cleared.map((i) => before[i]);

    this.board = res.board;
    this.tray[slot] = null;
    this.blocks += res.placed.length;

    const lineCount = res.lines.rows.length + res.lines.cols.length;
    let gained = res.placed.length;
    let energyFull = false;
    let perfect = false;

    if (lineCount > 0) {
      this.streak += 1;
      this.idle = 0;
      this.maxCombo = Math.max(this.maxCombo, this.streak);
      this.lines += lineCount;
      if (lineCount >= 2) this.multi += 1;
      gained += lineScore(lineCount) * this.streak;
      perfect = isEmpty(this.board);
      if (perfect) gained += 200;
      this.energy += lineCount;
      if (this.energy >= ENERGY_MAX) {
        this.energy -= ENERGY_MAX;
        energyFull = true;
      }
    } else {
      this.idle += 1;
      if (this.idle >= COMBO_GRACE) this.streak = 0;
    }
    this.score += gained;

    let refilled = false;
    if (this.tray.every((p) => !p)) {
      this.deal();
      refilled = true;
    }

    return {
      placed: res.placed,
      color: piece.color,
      lines: res.lines,
      cleared: res.cleared,
      clearedColors,
      lineCount,
      gained,
      streak: this.streak,
      perfect,
      energyFull,
      refilled,
    };
  }

  /** Cases visées par une arme (pour l'aperçu et le tir). */
  weaponTargets(weapon: WeaponId, r: number, c: number): number[] {
    const out: number[] = [];
    if (r < 0 || c < 0 || r >= SIZE || c >= SIZE) return out;
    if (weapon === 'hammer') {
      for (let rr = r - 1; rr <= r + 1; rr++) {
        for (let cc = c - 1; cc <= c + 1; cc++) {
          if (rr >= 0 && cc >= 0 && rr < SIZE && cc < SIZE) out.push(idx(rr, cc));
        }
      }
    } else if (weapon === 'laser') {
      for (let k = 0; k < SIZE; k++) {
        out.push(idx(r, k));
        if (k !== r) out.push(idx(k, c));
      }
    } else if (weapon === 'chroma') {
      const color = this.board[idx(r, c)];
      if (color !== 0) for (let i = 0; i < CELLS; i++) if (this.board[i] === color) out.push(i);
    }
    return out;
  }

  private blast(cells: number[]): BlastOutcome {
    const hit = cells.filter((i) => this.board[i] !== 0);
    const colors = hit.map((i) => this.board[i]);
    for (const i of hit) this.board[i] = 0;
    const gained = hit.length * 2;
    this.score += gained;
    return { cells: hit, colors, gained };
  }

  /** Tire une arme ciblée. Renvoie null si le tir ne détruirait rien. */
  fireWeapon(weapon: WeaponId, r: number, c: number): BlastOutcome | null {
    const targets = this.weaponTargets(weapon, r, c);
    if (!targets.some((i) => this.board[i] !== 0)) return null;
    this.weaponsUsed += 1;
    return this.blast(targets);
  }

  /** Recycleur : remplace la donne par des pièces qui rentrent. */
  recycle(): void {
    this.weaponsUsed += 1;
    this.deal(true);
  }

  /** « Continuer » : LayJou efface les 2 lignes et 2 colonnes les plus chargées, puis nouvelle donne. */
  revive(): BlastOutcome {
    const count = (cells: number[]) => cells.filter((i) => this.board[i] !== 0).length;
    const rows = Array.from({ length: SIZE }, (_, r) => r)
      .sort((a, b) => count(rowCells(b)) - count(rowCells(a)))
      .slice(0, 2);
    const cols = Array.from({ length: SIZE }, (_, c) => c)
      .sort((a, b) => count(colCells(b)) - count(colCells(a)))
      .slice(0, 2);
    const cells = new Set<number>();
    rows.forEach((r) => rowCells(r).forEach((i) => cells.add(i)));
    cols.forEach((c) => colCells(c).forEach((i) => cells.add(i)));
    const out = this.blast([...cells]);
    this.continues += 1;
    this.deal(true);
    return out;
  }
}

const rowCells = (r: number) => Array.from({ length: SIZE }, (_, c) => idx(r, c));
const colCells = (c: number) => Array.from({ length: SIZE }, (_, r) => idx(r, c));
