// LayJou Bubble — pure game logic (no DOM). The UI replays the "steps" this module returns.

let nextId = 1;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const key = (r, c) => r * 100 + c;
const unkey = (k) => [Math.floor(k / 100), k % 100];

export class Board {
  /**
   * @param def level definition: { layout: string[], colors, moves, goal: {type, target|count}, stars: [a,b,c] }
   *            layout chars: '#' hole, '.' cell, '1' frost, '2' thick frost
   */
  constructor(def, rng = Math.random) {
    this.def = def;
    this.rng = rng;
    this.rows = def.layout.length;
    this.cols = def.layout[0].length;
    this.colors = def.colors;
    this.moves = def.moves;
    this.score = 0;
    this.batteriesTotal = def.goal.type === 'battery' ? def.goal.count : 0;
    this.batteriesSpawned = 0;
    this.batteriesCollected = 0;
    this.cells = [];
    for (let r = 0; r < this.rows; r++) {
      const row = [];
      for (let c = 0; c < this.cols; c++) {
        const ch = def.layout[r][c];
        row.push({ hole: ch === '#', ice: ch === '1' ? 1 : ch === '2' ? 2 : 0, piece: null });
      }
      this.cells.push(row);
    }
    this.fill();
  }

  // ---------- helpers ----------
  inside(r, c) {
    return r >= 0 && c >= 0 && r < this.rows && c < this.cols && !this.cells[r][c].hole;
  }
  pieceAt(r, c) {
    return this.inside(r, c) ? this.cells[r][c].piece : null;
  }
  colorAt(r, c) {
    const p = this.pieceAt(r, c);
    return p && !p.battery && p.special !== 'rainbow' ? p.color : -1;
  }
  newPiece(color, special = null) {
    return { id: nextId++, color, special, battery: false };
  }
  newBattery() {
    this.batteriesSpawned++;
    return { id: nextId++, color: -1, special: null, battery: true };
  }
  randColor() {
    return Math.floor(this.rng() * this.colors);
  }
  eachCell(fn) {
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++) if (!this.cells[r][c].hole) fn(r, c, this.cells[r][c]);
  }
  iceLeft() {
    let n = 0;
    this.eachCell((r, c, cell) => { if (cell.ice > 0) n++; });
    return n;
  }
  batteriesOnBoard() {
    let n = 0;
    this.eachCell((r, c, cell) => { if (cell.piece && cell.piece.battery) n++; });
    return n;
  }
  bottomRow(c) {
    for (let r = this.rows - 1; r >= 0; r--) if (!this.cells[r][c].hole) return r;
    return -1;
  }
  snapshot() {
    return { score: this.score, ice: this.iceLeft(), batteries: this.batteriesCollected, moves: this.moves };
  }

  // ---------- setup ----------
  fill() {
    for (let attempt = 0; attempt < 200; attempt++) {
      this.eachCell((r, c, cell) => {
        let color;
        do {
          color = this.randColor();
        } while (
          (this.colorAt(r, c - 1) === color && this.colorAt(r, c - 2) === color) ||
          (this.colorAt(r - 1, c) === color && this.colorAt(r - 2, c) === color)
        );
        cell.piece = this.newPiece(color);
      });
      if (this.findMove()) break;
    }
    // Batteries start near the top of random columns.
    const n = Math.min(2, this.batteriesTotal);
    const colsAvail = [];
    for (let c = 0; c < this.cols; c++) {
      const top = this.cells.findIndex((row) => !row[c].hole);
      if (top >= 0 && this.bottomRow(c) - top >= 3) colsAvail.push([top, c]);
    }
    for (let i = 0; i < n && colsAvail.length; i++) {
      const [r, c] = colsAvail.splice(Math.floor(this.rng() * colsAvail.length), 1)[0];
      this.cells[r][c].piece = this.newBattery();
    }
  }

  // ---------- matching ----------
  findMatches() {
    const runs = [];
    for (let r = 0; r < this.rows; r++) {
      let c = 0;
      while (c < this.cols) {
        const col = this.colorAt(r, c);
        let e = c + 1;
        if (col >= 0) while (e < this.cols && this.colorAt(r, e) === col) e++;
        if (col >= 0 && e - c >= 3) {
          const cells = [];
          for (let k = c; k < e; k++) cells.push(key(r, k));
          runs.push({ dir: 'h', color: col, cells });
        }
        c = e;
      }
    }
    for (let c = 0; c < this.cols; c++) {
      let r = 0;
      while (r < this.rows) {
        const col = this.colorAt(r, c);
        let e = r + 1;
        if (col >= 0) while (e < this.rows && this.colorAt(e, c) === col) e++;
        if (col >= 0 && e - r >= 3) {
          const cells = [];
          for (let k = r; k < e; k++) cells.push(key(k, c));
          runs.push({ dir: 'v', color: col, cells });
        }
        r = e;
      }
    }
    // Merge runs that share a cell into groups (L / T shapes).
    const groups = [];
    for (const run of runs) {
      let target = null;
      for (const g of groups) {
        if (g.color === run.color && run.cells.some((k) => g.cells.has(k))) {
          if (!target) {
            target = g;
          } else {
            for (const k of g.cells) target.cells.add(k);
            target.runs.push(...g.runs);
            g.dead = true;
          }
        }
      }
      if (!target) {
        target = { color: run.color, cells: new Set(), runs: [] };
        groups.push(target);
      }
      for (const k of run.cells) target.cells.add(k);
      target.runs.push(run);
    }
    return groups.filter((g) => !g.dead);
  }

  /** Which special (if any) a matched group creates, and where. */
  groupSpecial(g, prefer) {
    const longest = g.runs.reduce((a, b) => (b.cells.length > a.cells.length ? b : a));
    const hasH = g.runs.some((r) => r.dir === 'h');
    const hasV = g.runs.some((r) => r.dir === 'v');
    let special = null;
    if (longest.cells.length >= 5) special = 'rainbow';
    else if (hasH && hasV) special = 'bomb';
    else if (longest.cells.length === 4) special = longest.dir;
    if (!special) return null;
    let at = null;
    for (const p of prefer) if (g.cells.has(key(p.r, p.c))) at = key(p.r, p.c);
    if (at === null && hasH && hasV) {
      const h = g.runs.find((r) => r.dir === 'h');
      const v = g.runs.find((r) => r.dir === 'v');
      at = h.cells.find((k) => v.cells.includes(k)) ?? null;
    }
    if (at === null) at = longest.cells[Math.floor(longest.cells.length / 2)];
    const [r, c] = unkey(at);
    return { r, c, special, color: special === 'rainbow' ? -1 : g.color };
  }

  findMove() {
    const tryPair = (r, c, r2, c2) => {
      const a = this.pieceAt(r, c);
      const b = this.pieceAt(r2, c2);
      if (!a || !b) return false;
      if ((a.special === 'rainbow' && !b.battery) || (b.special === 'rainbow' && !a.battery)) return true;
      if (a.special && b.special) return true;
      this.cells[r][c].piece = b;
      this.cells[r2][c2].piece = a;
      const ok = this.findMatches().length > 0;
      this.cells[r][c].piece = a;
      this.cells[r2][c2].piece = b;
      return ok;
    };
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++) {
        if (tryPair(r, c, r, c + 1)) return { a: { r, c }, b: { r, c: c + 1 } };
        if (tryPair(r, c, r + 1, c)) return { a: { r, c }, b: { r: r + 1, c } };
      }
    return null;
  }

  // ---------- special effects ----------
  rowCells(r) {
    const out = [];
    for (let c = 0; c < this.cols; c++) if (this.inside(r, c)) out.push(key(r, c));
    return out;
  }
  colCells(c) {
    const out = [];
    for (let r = 0; r < this.rows; r++) if (this.inside(r, c)) out.push(key(r, c));
    return out;
  }
  squareCells(r, c, rad) {
    const out = [];
    for (let y = r - rad; y <= r + rad; y++)
      for (let x = c - rad; x <= c + rad; x++) if (this.inside(y, x)) out.push(key(y, x));
    return out;
  }
  cellsOfColor(color) {
    const out = [];
    this.eachCell((r, c) => { if (this.colorAt(r, c) === color) out.push(key(r, c)); });
    return out;
  }
  mostCommonColor() {
    const counts = new Array(this.colors).fill(0);
    this.eachCell((r, c) => { const k = this.colorAt(r, c); if (k >= 0) counts[k]++; });
    return counts.indexOf(Math.max(...counts));
  }

  /** Initial blast when two specials are swapped together. `at` is where the dragged piece landed. */
  comboBlast(pa, pb, at, other) {
    const blast = { cells: new Set([key(at.r, at.c), key(other.r, other.c)]), fx: [], transforms: [], activated: new Set([pa.id, pb.id]) };
    const add = (list) => list.forEach((k) => blast.cells.add(k));
    const rainbow = pa.special === 'rainbow' ? pa : pb.special === 'rainbow' ? pb : null;
    if (rainbow) {
      const o = rainbow === pa ? pb : pa;
      if (o.special === 'rainbow') {
        this.eachCell((r, c) => blast.cells.add(key(r, c)));
        blast.fx.push({ kind: 'all' });
      } else {
        const targets = this.cellsOfColor(o.color);
        add(targets);
        blast.fx.push({ kind: 'rainbow', color: o.color, from: at, targets: targets.map(unkey) });
        if (o.special) {
          blast.activated.delete(o.id);
          for (const k of targets) {
            const [r, c] = unkey(k);
            const p = this.cells[r][c].piece;
            if (!p.special) {
              p.special = o.special === 'bomb' ? 'bomb' : this.rng() < 0.5 ? 'h' : 'v';
              blast.transforms.push({ id: p.id, special: p.special });
            }
          }
        }
      }
      return blast;
    }
    const kinds = [pa.special, pb.special];
    const bombs = kinds.filter((k) => k === 'bomb').length;
    if (bombs === 2) {
      add(this.squareCells(at.r, at.c, 2));
      blast.fx.push({ kind: 'bomb', r: at.r, c: at.c, rad: 2 });
    } else if (bombs === 1) {
      for (let d = -1; d <= 1; d++) {
        if (at.r + d >= 0 && at.r + d < this.rows) { add(this.rowCells(at.r + d)); blast.fx.push({ kind: 'row', r: at.r + d }); }
        if (at.c + d >= 0 && at.c + d < this.cols) { add(this.colCells(at.c + d)); blast.fx.push({ kind: 'col', c: at.c + d }); }
      }
    } else {
      add(this.rowCells(at.r));
      add(this.colCells(at.c));
      blast.fx.push({ kind: 'row', r: at.r }, { kind: 'col', c: at.c });
    }
    return blast;
  }

  // ---------- turn resolution ----------
  /** Swap two adjacent cells. Returns { valid, steps }. */
  swap(a, b) {
    const pa = this.pieceAt(a.r, a.c);
    const pb = this.pieceAt(b.r, b.c);
    if (!pa || !pb || Math.abs(a.r - b.r) + Math.abs(a.c - b.c) !== 1) return { valid: false, steps: [] };
    this.cells[a.r][a.c].piece = pb;
    this.cells[b.r][b.c].piece = pa;
    const steps = [{ type: 'swap', a, b, ids: [pa.id, pb.id] }];
    let blast = null;
    const rainbowPlay = (pa.special === 'rainbow' && !pb.battery) || (pb.special === 'rainbow' && !pa.battery);
    if (rainbowPlay || (pa.special && pb.special)) {
      blast = this.comboBlast(pa, pb, b, a);
    } else if (this.findMatches().length === 0) {
      this.cells[a.r][a.c].piece = pa;
      this.cells[b.r][b.c].piece = pb;
      steps.push({ type: 'swap', a, b, ids: [pa.id, pb.id], back: true });
      return { valid: false, steps };
    }
    this.moves--;
    steps.push(...this.resolve(blast, [a, b]));
    return { valid: true, steps };
  }

  resolve(blast, prefer = []) {
    const steps = [];
    let combo = 0;
    for (;;) {
      const clear = new Set();
      const spawns = [];
      const fx = [];
      let transforms = [];
      const activated = new Set();
      if (blast) {
        blast.cells.forEach((k) => clear.add(k));
        fx.push(...blast.fx);
        transforms = blast.transforms;
        blast.activated.forEach((id) => activated.add(id));
        blast = null;
      } else {
        const groups = this.findMatches();
        if (!groups.length) break;
        for (const g of groups) {
          g.cells.forEach((k) => clear.add(k));
          const sp = this.groupSpecial(g, prefer);
          if (sp) spawns.push(sp);
        }
      }
      combo++;
      // Chain-react any special caught in the blast.
      const queue = [...clear];
      while (queue.length) {
        const [r, c] = unkey(queue.pop());
        const p = this.cells[r][c].piece;
        if (!p || !p.special || activated.has(p.id)) continue;
        activated.add(p.id);
        let hit;
        if (p.special === 'h') { hit = this.rowCells(r); fx.push({ kind: 'row', r }); }
        else if (p.special === 'v') { hit = this.colCells(c); fx.push({ kind: 'col', c }); }
        else if (p.special === 'bomb') { hit = this.squareCells(r, c, 1); fx.push({ kind: 'bomb', r, c, rad: 1 }); }
        else {
          const color = this.mostCommonColor();
          hit = this.cellsOfColor(color);
          fx.push({ kind: 'rainbow', color, from: { r, c }, targets: hit.map(unkey) });
        }
        for (const k of hit) if (!clear.has(k)) { clear.add(k); queue.push(k); }
      }
      // Apply.
      const removed = [];
      const ice = [];
      for (const k of clear) {
        const [r, c] = unkey(k);
        const cell = this.cells[r][c];
        if (cell.piece && !cell.piece.battery) {
          removed.push({ id: cell.piece.id, r, c });
          cell.piece = null;
        }
        if (cell.ice > 0) {
          cell.ice--;
          ice.push({ r, c, level: cell.ice });
        }
      }
      const created = [];
      for (const sp of spawns) {
        const cell = this.cells[sp.r][sp.c];
        if (cell.piece) continue; // a battery sits here
        cell.piece = this.newPiece(sp.color, sp.special);
        created.push({ r: sp.r, c: sp.c, piece: { ...cell.piece } });
      }
      const gained = removed.length * 60 * combo + created.length * 120 + ice.length * 100;
      this.score += gained;
      steps.push({ type: 'clear', removed, ice, spawns: created, fx, transforms, combo, gained, state: this.snapshot() });
      prefer = [];
      // Gravity + battery collection until nothing moves.
      for (;;) {
        const fall = this.gravity();
        if (fall.moves.length || fall.spawned.length) steps.push(fall);
        const items = [];
        for (let c = 0; c < this.cols; c++) {
          const r = this.bottomRow(c);
          if (r < 0) continue;
          const p = this.cells[r][c].piece;
          if (p && p.battery) {
            items.push({ id: p.id, r, c });
            this.cells[r][c].piece = null;
            this.batteriesCollected++;
            this.score += 1000;
          }
        }
        if (!items.length) break;
        steps.push({ type: 'collect', items, state: this.snapshot() });
      }
    }
    if (this.status() === 'playing' && !this.findMove()) steps.push(this.shuffle());
    return steps;
  }

  gravity() {
    const moves = [];
    const spawned = [];
    for (let c = 0; c < this.cols; c++) {
      const slots = [];
      for (let r = 0; r < this.rows; r++) if (!this.cells[r][c].hole) slots.push(r);
      const pieces = slots.map((r) => ({ r, p: this.cells[r][c].piece })).filter((x) => x.p);
      const missing = slots.length - pieces.length;
      if (!missing) continue;
      pieces.forEach((x, i) => {
        const to = slots[missing + i];
        if (to !== x.r) moves.push({ id: x.p.id, c, from: x.r, to });
        this.cells[to][c].piece = x.p;
      });
      for (let i = 0; i < missing; i++) {
        let p;
        const wantBattery =
          this.batteriesSpawned < this.batteriesTotal && i === 0 && missing < slots.length && this.batteriesOnBoard() < 2;
        if (wantBattery && (this.batteriesOnBoard() === 0 || this.rng() < 0.3)) p = this.newBattery();
        else p = this.newPiece(this.randColor());
        this.cells[slots[i]][c].piece = p;
        spawned.push({ piece: { ...p }, c, from: slots[0] - (missing - i), to: slots[i] });
      }
    }
    return { type: 'fall', moves, spawned };
  }

  shuffle() {
    const spots = [];
    const pieces = [];
    this.eachCell((r, c, cell) => {
      if (cell.piece && !cell.piece.battery) { spots.push([r, c]); pieces.push(cell.piece); }
    });
    for (let attempt = 0; attempt < 300; attempt++) {
      for (let i = pieces.length - 1; i > 0; i--) {
        const j = Math.floor(this.rng() * (i + 1));
        [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
      }
      spots.forEach(([r, c], i) => { this.cells[r][c].piece = pieces[i]; });
      if (attempt >= 200) for (const p of pieces) if (!p.special) p.color = this.randColor(); // last resort: recolour
      if (!this.findMatches().length && this.findMove()) break;
    }
    return {
      type: 'shuffle',
      positions: spots.map(([r, c]) => ({ id: this.cells[r][c].piece.id, r, c, color: this.cells[r][c].piece.color })),
    };
  }

  // ---------- goal ----------
  goalProgress() {
    const g = this.def.goal;
    if (g.type === 'score') return { done: Math.min(this.score, g.target), total: g.target };
    if (g.type === 'ice') return { done: this.def.iceTotal - this.iceLeft(), total: this.def.iceTotal };
    return { done: this.batteriesCollected, total: g.count };
  }
  goalMet() {
    const p = this.goalProgress();
    return p.done >= p.total;
  }
  status() {
    if (this.goalMet()) return 'won';
    return this.moves <= 0 ? 'lost' : 'playing';
  }
  addMoves(n) {
    this.moves += n;
    return this.findMove() ? [] : [this.shuffle()];
  }
  /** End-of-level bonus for unused moves; returns the stars earned (1-3). */
  finish() {
    const bonus = this.moves * 150;
    this.score += bonus;
    const stars = Math.max(1, this.def.stars.filter((s) => this.score >= s).length);
    return { bonus, stars, score: this.score };
  }
}
