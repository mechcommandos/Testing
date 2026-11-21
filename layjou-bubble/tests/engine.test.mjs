// Engine sanity tests + a greedy bot that plays every level (node tests/engine.test.mjs [--calibrate]).
import assert from 'node:assert/strict';
import { Board, mulberry32 } from '../www/js/engine.js';
import { getLevel, LEVEL_COUNT } from '../www/js/levels.js';

function checkInvariants(board) {
  board.eachCell((r, c, cell) => assert.ok(cell.piece, `empty cell at ${r},${c}`));
  assert.equal(board.findMatches().length, 0, 'board must be stable between turns');
  const ids = new Set();
  board.eachCell((r, c, cell) => {
    assert.ok(!ids.has(cell.piece.id), 'duplicate piece id');
    ids.add(cell.piece.id);
  });
}

function allMoves(board) {
  const out = [];
  for (let r = 0; r < board.rows; r++)
    for (let c = 0; c < board.cols; c++)
      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        if (board.pieceAt(r, c) && board.pieceAt(r + dr, c + dc)) out.push({ a: { r, c }, b: { r: r + dr, c: c + dc } });
      }
  return out;
}

function clone(board, rng) {
  const b = Object.create(Board.prototype);
  Object.assign(b, board, { rng });
  b.cells = board.cells.map((row) => row.map((cell) => ({ ...cell, piece: cell.piece && { ...cell.piece } })));
  return b;
}

function value(board) {
  const g = board.goalProgress();
  let v = board.score + g.done * (board.def.goal.type === 'score' ? 0 : 3000);
  // Batteries lower on the board are closer to being collected.
  board.eachCell((r, c, cell) => { if (cell.piece && cell.piece.battery) v += r * 400; });
  return v;
}

// A "casual player": mostly takes the move that looks best one step ahead, sometimes a random one.
function play(n, seed) {
  const rng = mulberry32(seed);
  const board = new Board(getLevel(n), rng);
  checkInvariants(board);
  const startMoves = board.moves;
  while (board.status() === 'playing') {
    const scored = [];
    for (const m of allMoves(board)) {
      const sim = clone(board, mulberry32(seed + scored.length));
      if (sim.swap(m.a, m.b).valid) scored.push({ m, v: value(sim) });
    }
    assert.ok(scored.length, 'a playable board always has a valid move');
    scored.sort((x, y) => y.v - x.v);
    const pick = rng() < 0.3 ? scored[Math.floor(rng() * scored.length)] : scored[0];
    const before = board.moves;
    const res = board.swap(pick.m.a, pick.m.b);
    assert.equal(res.valid, true);
    assert.equal(board.moves, before - 1);
    checkInvariants(board);
  }
  const used = startMoves - board.moves;
  const scoreBefore = board.score;
  const status = board.status();
  const end = board.finish();
  return { status, used, perMove: scoreBefore / used, stars: end.stars };
}

// --- unit checks ---
{
  const b = new Board(getLevel(1), mulberry32(1));
  const res = b.swap({ r: 0, c: 0 }, { r: 5, c: 5 });
  assert.equal(res.valid, false, 'non-adjacent swap rejected');
  assert.equal(b.moves, getLevel(1).moves, 'invalid swap must not cost a move');
  // Force a 4-in-a-row and check a line blaster appears.
  const set = (r, c, color, special = null) => { b.cells[r][c].piece = b.newPiece(color, special); };
  for (let r = 0; r < b.rows; r++) for (let c = 0; c < b.cols; c++) set(r, c, (r * 2 + c) % 4 === 0 ? 3 : (r + c * 3) % 3);
  b.eachCell((r, c) => set(r, c, 10 + r * 8 + c)); // all distinct colours: no accidental matches
  set(8, 0, 0); set(8, 1, 0); set(7, 2, 0); set(8, 3, 0); set(8, 2, 1);
  const r4 = b.swap({ r: 7, c: 2 }, { r: 8, c: 2 });
  assert.equal(r4.valid, true);
  const clear = r4.steps.find((s) => s.type === 'clear');
  assert.equal(clear.removed.length, 4);
  assert.equal(clear.spawns[0].piece.special, 'h');
  assert.deepEqual([clear.spawns[0].r, clear.spawns[0].c], [8, 2]);
  // Rainbow + colour clears every bubble of that colour.
  b.eachCell((r, c) => set(r, c, 10 + r * 8 + c));
  set(0, 0, -1, 'rainbow'); set(0, 1, 2); set(4, 4, 2); set(6, 6, 2);
  const rr = b.swap({ r: 0, c: 0 }, { r: 0, c: 1 });
  assert.equal(rr.valid, true);
  assert.equal(rr.steps.find((s) => s.type === 'clear').removed.length, 4);
}

// --- every level is playable to the end ---
const calibrate = process.argv.includes('--calibrate');
const GAMES = calibrate ? 40 : 4;
for (let n = 1; n <= LEVEL_COUNT; n++) {
  const def = getLevel(n);
  let wins = 0, per = 0, stars = 0, used = 0;
  for (let g = 0; g < GAMES; g++) {
    const res = play(n, n * 1000 + g);
    if (res.status === 'won') { wins++; stars += res.stars; }
    per += res.perMove;
    used += res.used;
  }
  if (calibrate)
    console.log(
      `L${String(n).padStart(2)} ${def.goal.type.padEnd(7)} colors=${def.colors} moves=${def.moves} ice=${def.iceTotal} ` +
        `win=${Math.round((wins / GAMES) * 100)}% pts/move=${Math.round(per / GAMES)} avgStars=${(stars / Math.max(1, wins)).toFixed(1)} avgUsed=${Math.round(used / GAMES)}`
    );
}
console.log('engine tests passed');
