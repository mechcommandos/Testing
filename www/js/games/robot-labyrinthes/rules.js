/**
 * Règles du robot des labyrinthes (jeu 6). Pures.
 * Un niveau est une grille texte : S départ, G étoile, # mur, . case libre.
 * Un programme est une liste d'instructions : 'U' 'D' 'L' 'R' ou { repeat: n, move: 'U' }.
 * Les directions sont absolues (haut, bas, gauche, droite) : pas de rotation mentale à 5 ans.
 */
export const MOVES = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
export const MOVE_LABELS = { U: 'haut', D: 'bas', L: 'gauche', R: 'droite' };

export const LEVELS = [
  // Difficulté 0 : petites grilles, chemins courts
  [
    { id: 'd0-1', map: ['S..G'], solution: ['R', 'R', 'R'] },
    { id: 'd0-2', map: ['S...', '...G'], solution: ['R', 'R', 'R', 'D'] },
    { id: 'd0-3', map: ['S.#.', '..#.', '...G'], solution: ['D', 'D', 'R', 'R', 'R'] },
    { id: 'd0-4', map: ['...G', '.##.', 'S...'], solution: ['U', 'U', 'R', 'R', 'R'] },
  ],
  // Difficulté 1 : murs, jusqu'à 10 instructions
  [
    { id: 'd1-1', map: ['S.#...', '..#.#.', '....#G'], solution: ['D', 'D', 'R', 'R', 'R', 'U', 'U', 'R', 'R', 'D', 'D'] },
    { id: 'd1-2', map: ['S#....', '.#.##.', '...#G.'], solution: ['D', 'D', 'R', 'R', 'U', 'U', 'R', 'R', 'R', 'D', 'D', 'L'] },
    { id: 'd1-3', map: ['S.....', '####.#', 'G.....'], solution: ['R', 'R', 'R', 'R', 'D', 'D', 'L', 'L', 'L', 'L'] },
    { id: 'd1-4', map: ['..#G', '.##.', 'S...'], solution: ['R', 'R', 'R', 'U', 'U'] },
  ],
  // Difficulté 2 : répétitions, nombre d'instructions limité
  [
    { id: 'd2-1', map: ['S......G'], max: 2, solution: [{ repeat: 7, move: 'R' }] },
    { id: 'd2-2', map: ['S.....', '......', '......', '.....G'], max: 3, solution: [{ repeat: 5, move: 'R' }, { repeat: 3, move: 'D' }] },
    { id: 'd2-3', map: ['......G', '.######', '.......', '######.', 'S......'], max: 6, solution: [{ repeat: 6, move: 'R' }, { repeat: 2, move: 'U' }, { repeat: 6, move: 'L' }, { repeat: 2, move: 'U' }, { repeat: 6, move: 'R' }] },
  ],
];

export function parse(level) {
  const rows = level.map;
  const cells = rows.map((r) => [...r]);
  let start = null;
  let goal = null;
  cells.forEach((row, y) => row.forEach((c, x) => {
    if (c === 'S') start = { x, y };
    if (c === 'G') goal = { x, y };
  }));
  return { width: rows[0].length, height: rows.length, cells, start, goal };
}

export function isWall(grid, x, y) {
  return x < 0 || y < 0 || x >= grid.width || y >= grid.height || grid.cells[y][x] === '#';
}

/** Déroule le programme en mouvements unitaires. */
export function expand(program) {
  return program.flatMap((step) => (typeof step === 'string' ? [step] : Array.from({ length: step.repeat }, () => step.move)));
}

export function size(program) {
  return program.length;
}

/**
 * Exécute un programme. Retourne la trace des positions et l'issue :
 * 'goal' étoile atteinte, 'wall' un mur arrête le robot, 'short' programme terminé avant l'étoile.
 */
export function run(level, program) {
  const grid = parse(level);
  let { x, y } = grid.start;
  const trace = [{ x, y }];
  for (const move of expand(program)) {
    const [dx, dy] = MOVES[move];
    if (isWall(grid, x + dx, y + dy)) return { outcome: 'wall', trace, blockedAt: trace.length - 1 };
    x += dx;
    y += dy;
    trace.push({ x, y });
    if (x === grid.goal.x && y === grid.goal.y) return { outcome: 'goal', trace };
  }
  return { outcome: x === grid.goal.x && y === grid.goal.y ? 'goal' : 'short', trace };
}

/** Plus court chemin (parcours en largeur) depuis une case : utilisé pour les indices et les tests. */
export function shortestPath(level, from = null) {
  const grid = parse(level);
  const origin = from ?? grid.start;
  const key = (p) => `${p.x},${p.y}`;
  const queue = [{ ...origin, path: [] }];
  const seen = new Set([key(origin)]);
  while (queue.length) {
    const current = queue.shift();
    if (current.x === grid.goal.x && current.y === grid.goal.y) return current.path;
    for (const [move, [dx, dy]] of Object.entries(MOVES)) {
      const next = { x: current.x + dx, y: current.y + dy };
      if (isWall(grid, next.x, next.y) || seen.has(key(next))) continue;
      seen.add(key(next));
      queue.push({ ...next, path: [...current.path, move] });
    }
  }
  return null;
}

/**
 * Indice : la prochaine instruction utile à partir du programme actuel.
 * Si le programme heurte un mur, l'indice propose de retirer la dernière instruction.
 */
export function hint(level, program) {
  const result = run(level, program);
  if (result.outcome === 'goal') return { type: 'done' };
  if (result.outcome === 'wall') return { type: 'remove-last' };
  const end = result.trace.at(-1);
  const path = shortestPath(level, end);
  return path?.length ? { type: 'add', move: path[0] } : { type: 'remove-last' };
}

export function respectsLimit(level, program) {
  return !level.max || size(program) <= level.max;
}
