import { describe, expect, it } from 'vitest';
import { analyzeFit, canPlace, canPlaceAll, emptyBoard, idx, place, SIZE } from '../src/game/board';
import { newPlayerModel, nextSet, newDirectorState, recordGame, type PlayerModel } from '../src/game/director';
import { Game } from '../src/game/game';
import { SHAPES, shapeById } from '../src/game/shapes';

function rngFrom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('plateau', () => {
  it('catalogue : orientations uniques et cohérentes', () => {
    expect(new Set(SHAPES.map((s) => s.id)).size).toBe(SHAPES.length);
    for (const s of SHAPES) {
      expect(s.cells.length).toBeGreaterThan(0);
      for (const [r, c] of s.cells) {
        expect(r).toBeLessThan(s.h);
        expect(c).toBeLessThan(s.w);
      }
    }
  });

  it('efface ligne et colonne complétées en même temps', () => {
    const b = emptyBoard();
    for (let c = 1; c < SIZE; c++) b[idx(0, c)] = 2;
    for (let r = 1; r < SIZE; r++) b[idx(r, 0)] = 3;
    const res = place(b, shapeById('dot#0'), 0, 0, 1);
    expect(res.lines.rows).toEqual([0]);
    expect(res.lines.cols).toEqual([0]);
    expect(res.cleared.length).toBe(15);
    expect(res.board.every((v) => v === 0)).toBe(true);
  });

  it('refuse les poses hors plateau ou sur une case occupée', () => {
    const b = emptyBoard();
    b[idx(3, 3)] = 1;
    const sq = shapeById('O2#0');
    expect(canPlace(b, sq, 7, 7)).toBe(false);
    expect(canPlace(b, sq, 2, 2)).toBe(false);
    expect(canPlace(b, sq, 4, 4)).toBe(true);
    expect(analyzeFit(b, sq).fits).toBe(49 - 4);
  });
});

/** Joueur automatique : meilleure pose gloutonne (lignes puis rangement), avec un taux d'erreur. */
function playGame(player: PlayerModel, seed: number, mistake: number, maxSets = 400) {
  const rng = rngFrom(seed);
  const g = Game.fresh(player, rng);
  let unsolvable = 0;
  let sets = 0;
  while (sets < maxSets) {
    const shapes = g.tray.filter(Boolean).map((p) => shapeById(p!.shapeId));
    if (shapes.length === 3) {
      sets++;
      if (!canPlaceAll(g.board, shapes, { nodes: 200000 })) unsolvable++;
    }
    const slots = [0, 1, 2].filter((i) => g.slotFits(i));
    if (slots.length === 0) break;
    let best: { slot: number; r: number; c: number; score: number } | null = null;
    for (const slot of slots) {
      const shape = shapeById(g.tray[slot]!.shapeId);
      const info = analyzeFit(g.board, shape);
      if (rng() < mistake) {
        // pose au hasard
        const opts: [number, number][] = [];
        for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (canPlace(g.board, shape, r, c)) opts.push([r, c]);
        const [r, c] = opts[Math.floor(rng() * opts.length)];
        best = { slot, r, c, score: 1e9 };
        break;
      }
      const score = info.bestClear * 10 + shape.cells.length;
      if (!best || score > best.score) best = { slot, r: info.best!.r, c: info.best!.c, score };
    }
    g.placePiece(best!.slot, best!.r, best!.c);
  }
  return { score: g.score, sets, unsolvable };
}

describe('directeur', () => {
  it('chaque donne est posable au moment où elle est distribuée', () => {
    let player = newPlayerModel();
    let unsolvable = 0;
    for (let i = 0; i < 25; i++) {
      const res = playGame(player, 1000 + i, 0.25);
      unsolvable += res.unsolvable;
      player = recordGame(player, res.score);
    }
    expect(unsolvable).toBe(0);
  });

  it('donne de sauvetage sur un plateau presque plein', () => {
    const b = emptyBoard();
    for (let i = 0; i < b.length; i++) b[i] = 1;
    for (const [r, c] of [
      [0, 0],
      [0, 1],
      [4, 4],
      [7, 7],
    ]) b[idx(r, c)] = 0;
    const player = newPlayerModel();
    const res = nextSet(b, 300, newDirectorState(player), player, { rng: rngFrom(7) });
    expect(res.debug.mode).toBe('rescue');
    expect(canPlaceAll(b, res.pieces.map((p) => shapeById(p.shapeId)))).toBe(true);
  });

  it('les parties se terminent et restent variées (bot imparfait)', () => {
    let player = newPlayerModel();
    const sets: number[] = [];
    for (let i = 0; i < 30; i++) {
      const res = playGame(player, 5000 + i, 0.35);
      sets.push(res.sets);
      player = recordGame(player, res.score);
    }
    const avg = sets.reduce((a, b) => a + b, 0) / sets.length;
    console.log('donnes par partie (bot 35% d\'erreurs):', sets.join(' '), '| moyenne', avg.toFixed(1));
    expect(avg).toBeGreaterThan(8);
    expect(sets.some((s) => s < 400)).toBe(true);
  });
});

describe('partie', () => {
  it('sauvegarde et restauration à l\'identique', () => {
    const player = newPlayerModel();
    const g = Game.fresh(player, rngFrom(3));
    const info = analyzeFit(g.board, shapeById(g.tray[0]!.shapeId));
    g.placePiece(0, info.best!.r, info.best!.c);
    const copy = Game.restore(JSON.parse(JSON.stringify(g.snapshot())), player);
    expect(copy.snapshot()).toEqual(g.snapshot());
  });

  it('continuer libère de la place et redonne des pièces posables', () => {
    const player = newPlayerModel();
    const g = Game.fresh(player, rngFrom(9));
    for (let i = 0; i < g.board.length; i++) g.board[i] = (i % 7) + 1;
    g.board[0] = 0;
    const out = g.revive();
    expect(out.cells.length).toBeGreaterThan(20);
    expect(g.hasMoves()).toBe(true);
    expect(g.continues).toBe(1);
  });

  it('le marteau détruit un carré 3x3 et le chroma une couleur', () => {
    const player = newPlayerModel();
    const g = Game.fresh(player, rngFrom(11));
    for (let i = 0; i < g.board.length; i++) g.board[i] = (i % 2) + 1;
    expect(g.fireWeapon('hammer', 0, 0)!.cells.length).toBe(4);
    const n = Array.from(g.board).filter((v) => v === 2).length;
    const r = Array.from(g.board).indexOf(2);
    expect(g.fireWeapon('chroma', Math.floor(r / SIZE), r % SIZE)!.cells.length).toBe(n);
  });
});
