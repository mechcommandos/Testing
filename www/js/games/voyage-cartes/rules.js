/**
 * Le voyage des cartes (jeu 21) : règles pures, testées (tests/js/games13-21.test.js).
 * Contenu : content/games/voyage-cartes.json — cartes fictives (lignes de caractères), légende, trajets demandés.
 * Un chemin est une suite de cases voisines (haut, bas, gauche, droite). Tout chemin qui respecte la consigne est juste.
 *
 * - difficulté 0 : aller d'un lieu à un autre sur un plan simple ;
 * - difficulté 1 : le lieu d'arrivée n'est donné que par la légende (traverser la rivière par un pont) ;
 * - difficulté 2 : itinéraire avec contraintes (passer par un lieu, éviter la forêt, nombre de pas limité).
 */
export const TASKS_PER_SERIES = 3;

export function parseMap(rows) {
  return rows.map((r) => [...r]);
}

export function find(grid, ch) {
  for (let y = 0; y < grid.length; y++) for (let x = 0; x < grid[y].length; x++) if (grid[y][x] === ch) return { x, y };
  return null;
}

export const key = ({ x, y }) => `${x},${y}`;
const adjacent = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;

/** Une case est praticable si son terrain l'est (les lieux le sont) et qu'elle n'est pas à éviter. */
export function walkable(content, ch, avoid = []) {
  if (avoid.includes(ch)) return false;
  return content.terrain[ch] ? content.terrain[ch].walk : !!content.legend[ch];
}

/** Plus court chemin (en pas) de `from` à `to` en passant par les lieux `via` dans l'ordre ; null si impossible. */
export function shortestPath(content, grid, from, to, via = [], avoid = []) {
  const stops = [...via.map((c) => find(grid, c)), find(grid, to)];
  let path = [find(grid, from)];
  for (const goal of stops) {
    const start = path[path.length - 1];
    const prev = new Map([[key(start), null]]);
    const queue = [start];
    while (queue.length && !prev.has(key(goal))) {
      const c = queue.shift();
      for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = { x: c.x + d[0], y: c.y + d[1] };
        if (n.y < 0 || n.y >= grid.length || n.x < 0 || n.x >= grid[0].length || prev.has(key(n))) continue;
        if (!walkable(content, grid[n.y][n.x], avoid)) continue;
        prev.set(key(n), c);
        queue.push(n);
      }
    }
    if (!prev.has(key(goal))) return null;
    const leg = [];
    for (let c = goal; c && key(c) !== key(start); c = prev.get(key(c))) leg.unshift(c);
    path = [...path, ...leg];
  }
  return path;
}

/** Nombre de pas d'un chemin (cases parcourues, sans compter le départ). */
export const steps = (path) => path.length - 1;

/** Prépare une consigne : carte, départ, arrivée, contraintes et nombre de pas maximal (plus court + marge). */
export function prepare(content, task) {
  const grid = parseMap(content.maps[task.map]);
  const shortest = shortestPath(content, grid, task.from, task.to, task.via ?? [], task.avoid ?? []);
  const maxSteps = task.slack !== undefined && shortest ? steps(shortest) + task.slack : null;
  return { ...task, grid, via: task.via ?? [], avoid: task.avoid ?? [], maxSteps, shortest };
}

/** « au parc », « à la ferme », « à l’école » (préposition à + article, contractée). */
export function toPlace(label) {
  if (label.startsWith('le ')) return `au ${label.slice(3)}`;
  if (label.startsWith('les ')) return `aux ${label.slice(4)}`;
  return `à ${label}`;
}

/** « du parc », « de la maison », « de l’école ». */
export function fromPlace(label) {
  if (label.startsWith('le ')) return `du ${label.slice(3)}`;
  if (label.startsWith('les ')) return `des ${label.slice(4)}`;
  return `de ${label}`;
}

/** « jusqu’au parc », « jusqu’à la ferme ». */
const until = (label) => `jusqu’${toPlace(label)}`;

export function promptFor(content, t) {
  const L = (c) => content.legend[c].label;
  if (t.level === 0) return `Trace le chemin ${fromPlace(L(t.from))} ${until(L(t.to))}.`;
  if (t.level === 1) return `Pars ${fromPlace(L(t.from))} et va ${until(L(t.to))}. Cherche son symbole dans la légende.`;
  const parts = [`Va ${fromPlace(L(t.from))} ${until(L(t.to))}`];
  if (t.via.length) parts.push(`en passant par ${t.via.map(L).join(' puis ')}`);
  if (t.avoid.includes('T')) parts.push('sans traverser la forêt');
  if (t.maxSteps) parts.push(`en ${t.maxSteps} pas au plus`);
  return `${parts.join(', ')}.`;
}

/**
 * Vérifie un chemin : { ok } ou { ok: false, reason }. Raisons : start, gap, blocked, avoid, via, end, long.
 */
export function checkPath(content, t, path) {
  const start = find(t.grid, t.from);
  if (!path.length || key(path[0]) !== key(start)) return { ok: false, reason: 'start' };
  for (let i = 1; i < path.length; i++) {
    if (!adjacent(path[i - 1], path[i])) return { ok: false, reason: 'gap' };
    const ch = t.grid[path[i].y][path[i].x];
    if (t.avoid.includes(ch)) return { ok: false, reason: 'avoid' };
    if (!walkable(content, ch)) return { ok: false, reason: 'blocked' };
  }
  if (key(path[path.length - 1]) !== key(find(t.grid, t.to))) return { ok: false, reason: 'end' };
  // Les lieux de passage dans l'ordre demandé.
  let k = 0;
  for (const c of path) if (k < t.via.length && t.grid[c.y][c.x] === t.via[k]) k++;
  if (k < t.via.length) return { ok: false, reason: 'via' };
  if (t.maxSteps && steps(path) > t.maxSteps) return { ok: false, reason: 'long' };
  return { ok: true };
}

/** Prochaine case conseillée depuis la fin du chemin actuel (indice « montrer un repère »). */
export function nextHint(content, t, path) {
  const last = path[path.length - 1];
  const grid = t.grid;
  // Lieux de passage encore à faire.
  let k = 0;
  for (const c of path) if (k < t.via.length && grid[c.y][c.x] === t.via[k]) k++;
  const fakeFrom = '@';
  const copy = grid.map((r) => [...r]);
  copy[last.y][last.x] = fakeFrom;
  const local = { ...content, legend: { ...content.legend, [fakeFrom]: { label: '' } } };
  const route = shortestPath(local, copy, fakeFrom, t.to, t.via.slice(k), t.avoid);
  return route && route.length > 1 ? route[1] : null;
}

export function makeSeries(difficulty, content, random) {
  return random.shuffle(content.tasks.filter((t) => t.level === Math.min(difficulty, 2))).slice(0, TASKS_PER_SERIES).map((t) => prepare(content, t));
}

export function validateContent(content) {
  const errors = [];
  for (const [name, rows] of Object.entries(content.maps)) {
    if (rows.some((r) => r.length !== rows[0].length)) errors.push(`${name} : lignes de longueurs différentes`);
    for (const ch of rows.join('')) if (!content.terrain[ch] && !content.legend[ch]) errors.push(`${name} : symbole inconnu ${ch}`);
  }
  for (const t of content.tasks) {
    const p = prepare(content, t);
    if (!p.shortest) errors.push(`${t.map} ${t.from}→${t.to} : aucun chemin possible`);
    for (const c of [t.from, t.to, ...(t.via ?? [])]) if (!find(p.grid, c)) errors.push(`${t.map} : lieu ${c} absent de la carte`);
  }
  for (const level of [0, 1, 2]) if (content.tasks.filter((t) => t.level === level).length < TASKS_PER_SERIES) errors.push(`niveau ${level} : pas assez de trajets`);
  return errors;
}
