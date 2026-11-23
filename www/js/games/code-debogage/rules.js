/**
 * Mission code et débogage (jeu 28) : interpréteur pur et puzzles, testés (tests/js/games22-30.test.js).
 * Différent du jeu 6 : ici le programme est donné et faux ; il faut trouver le bloc fautif et le corriger.
 * Grille : « . » libre, « # » mur, « S » départ, « E » étoile (le but). Sortir de la grille = heurter un mur.
 *
 * Blocs : avancer, gauche, droite (tourner sur place), repeter (n fois, n nombre ou variable), si-mur (alors / sinon),
 * tantque (tant que l'étoile n'est pas atteinte), variable (donne une valeur à un nom).
 *
 * - difficulté 0 : une seule commande fausse ;
 * - difficulté 1 : boucles (nombre de répétitions, bloc dans la boucle) ;
 * - difficulté 2 : conditions et variables.
 */
export const MAX_STEPS = 200;
export const PUZZLES_PER_SERIES = 2;
const DIRS = { E: [1, 0], S: [0, 1], W: [-1, 0], N: [0, -1] };
const RIGHT = { E: 'S', S: 'W', W: 'N', N: 'E' };
const LEFT = { E: 'N', N: 'W', W: 'S', S: 'E' };

const fwd = () => ({ op: 'avancer' });
const left = () => ({ op: 'gauche' });
const right = () => ({ op: 'droite' });
const rep = (n, ...body) => ({ op: 'repeter', n, body });

export const PUZZLES = [
  { id: 'coin', level: 0, grid: ['S..#', '#..#', '#.E#'], dir: 'E', program: [fwd(), fwd(), left(), fwd(), fwd()], fault: [2], fix: { op: 'droite' } },
  { id: 'demi-tour', level: 0, grid: ['S...', '###.', 'E...'], dir: 'E', program: [fwd(), fwd(), fwd(), right(), fwd(), fwd(), left(), fwd(), fwd(), fwd()], fault: [6], fix: { op: 'droite' } },
  { id: 'monter', level: 0, grid: ['....E', 'S....'], dir: 'E', program: [right(), fwd(), right(), fwd(), fwd(), fwd(), fwd()], fault: [0], fix: { op: 'gauche' } },
  { id: 'trop-court', level: 0, grid: ['S#..', '.#..', '...E'], dir: 'S', program: [fwd(), fwd(), left(), fwd(), fwd(), left()], fault: [5], fix: { op: 'avancer' } },

  { id: 'couloir', level: 1, grid: ['S....E'], dir: 'E', program: [rep(4, fwd())], fault: [0], fix: { n: 5 } },
  { id: 'escalier', level: 1, grid: ['S.##', '#..#', '##..', '###E'], dir: 'E', program: [rep(3, fwd(), left(), fwd(), left())], fault: [0, 'body', 1], fix: { op: 'droite' } },
  { id: 'grand-tour', level: 1, grid: ['S.....', '#####.', 'E.....'], dir: 'E', program: [rep(5, fwd()), right(), rep(3, fwd()), right(), rep(5, fwd())], fault: [2], fix: { n: 2 } },

  { id: 'longer-mur', level: 2, grid: ['S...#', '###.#', 'E...#'], dir: 'E', program: [{ op: 'tantque', body: [{ op: 'si-mur', then: [left()], else: [fwd()] }] }], fault: [0, 'body', 0, 'then', 0], fix: { op: 'droite' } },
  { id: 'toupie', level: 2, grid: ['S..#', '##.#', 'E..#'], dir: 'E', program: [{ op: 'tantque', body: [{ op: 'si-mur', then: [right()], else: [right()] }] }], fault: [0, 'body', 0, 'else', 0], fix: { op: 'avancer' } },
  { id: 'variable', level: 2, grid: ['S...', '###.', '###.', '###E'], dir: 'E', program: [{ op: 'variable', name: 'pas', value: 2 }, rep('pas', fwd()), right(), rep('pas', fwd())], fault: [0], fix: { value: 3 } },
];

/** Copie profonde d'un programme, chaque bloc reçoit un identifiant stable (son chemin). */
export function withIds(program, prefix = 'b') {
  return program.map((node, i) => {
    const id = `${prefix}${i}`;
    const copy = { ...node, id };
    for (const key of ['body', 'then', 'else']) if (node[key]) copy[key] = withIds(node[key], `${id}${key[0]}`);
    return copy;
  });
}

/** Bloc à un chemin [index, 'body', index, …]. */
export function nodeAt(program, path) {
  let list = program;
  let node = null;
  for (let i = 0; i < path.length; i++) {
    const step = path[i];
    if (typeof step === 'number') node = list[step];
    else list = node[step];
  }
  return node;
}

export function findById(program, id) {
  for (const node of program) {
    if (node.id === id) return node;
    for (const key of ['body', 'then', 'else']) if (node[key]) { const f = findById(node[key], id); if (f) return f; }
  }
  return null;
}

/** Programme modifié : le bloc `id` reçoit les changements (op, n, value). */
export function edit(program, id, changes) {
  return program.map((node) => {
    const copy = node.id === id ? { ...node, ...changes } : { ...node };
    for (const key of ['body', 'then', 'else']) if (node[key]) copy[key] = edit(node[key], id, changes);
    return copy;
  });
}

/** Exécute un programme. { ok, trace: [{x, y, dir, id}], reason: 'goal' | 'wall' | 'end' | 'limit' }. */
export function run(puzzle, program) {
  const grid = puzzle.grid.map((r) => [...r]);
  const find = (ch) => { for (let y = 0; y < grid.length; y++) { const x = grid[y].indexOf(ch); if (x >= 0) return { x, y }; } return null; };
  const goal = find('E');
  const state = { ...find('S'), dir: puzzle.dir, vars: {} };
  const trace = [{ x: state.x, y: state.y, dir: state.dir, id: null }];
  let steps = 0;
  const atGoal = () => state.x === goal.x && state.y === goal.y;
  const wallAhead = () => {
    const [dx, dy] = DIRS[state.dir];
    const nx = state.x + dx;
    const ny = state.y + dy;
    return ny < 0 || ny >= grid.length || nx < 0 || nx >= grid[0].length || grid[ny][nx] === '#';
  };
  class Stop extends Error { constructor(reason) { super(reason); this.reason = reason; } }
  const exec = (list) => {
    for (const node of list) {
      if (++steps > MAX_STEPS) throw new Stop('limit');
      if (node.op === 'avancer') {
        if (wallAhead()) { trace.push({ x: state.x, y: state.y, dir: state.dir, id: node.id, bump: true }); throw new Stop('wall'); }
        const [dx, dy] = DIRS[state.dir];
        state.x += dx;
        state.y += dy;
      } else if (node.op === 'droite') state.dir = RIGHT[state.dir];
      else if (node.op === 'gauche') state.dir = LEFT[state.dir];
      else if (node.op === 'variable') state.vars[node.name] = node.value;
      else if (node.op === 'repeter') {
        const n = typeof node.n === 'number' ? node.n : state.vars[node.n] ?? 0;
        for (let i = 0; i < n; i++) exec(node.body);
      } else if (node.op === 'si-mur') exec(wallAhead() ? node.then : node.else);
      else if (node.op === 'tantque') { while (!atGoal()) exec(node.body); }
      if (['avancer', 'droite', 'gauche'].includes(node.op)) trace.push({ x: state.x, y: state.y, dir: state.dir, id: node.id });
    }
  };
  try {
    exec(program);
  } catch (e) {
    if (e instanceof Stop) return { ok: false, trace, reason: e.reason };
    throw e;
  }
  return { ok: atGoal(), trace, reason: atGoal() ? 'goal' : 'end' };
}

/** Choix proposés quand on touche un bloc. */
export function optionsFor(node) {
  if (['avancer', 'gauche', 'droite'].includes(node.op)) return ['avancer', 'gauche', 'droite'].map((op) => ({ changes: { op }, label: LABELS[op] }));
  if (node.op === 'repeter' && typeof node.n === 'number') return [2, 3, 4, 5, 6].map((n) => ({ changes: { n }, label: `${n} fois` }));
  if (node.op === 'variable') return [1, 2, 3, 4, 5].map((value) => ({ changes: { value }, label: `${node.name} ← ${value}` }));
  return [];
}

export const LABELS = { avancer: 'Avancer', gauche: 'Tourner à gauche', droite: 'Tourner à droite' };

export function makeSeries(difficulty, random) {
  return random.shuffle(PUZZLES.filter((p) => p.level === Math.min(difficulty, 2))).slice(0, PUZZLES_PER_SERIES).map((p) => ({ ...p, program: withIds(p.program) }));
}
