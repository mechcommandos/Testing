/**
 * Le petit bâtisseur (jeu 13) : règles pures, testées (tests/js/games13-21.test.js).
 *
 * Le chantier est une grille de colonnes. Un bloc posé dans une colonne tombe sur la pile : pas besoin de viser
 * une case précise (placement tolérant, au toucher comme à la souris). Une construction = une pile de couleurs par colonne.
 *
 * - difficulté 0 : reproduire un modèle de 3 blocs d'une seule couleur (seule la forme compte) ;
 * - difficulté 1 : reproduire un modèle de 6 blocs de couleurs ;
 * - difficulté 2 : défis avec contraintes (hauteur, équilibre, ordre des couleurs) ; plusieurs constructions sont justes.
 */
export const COLS = 4;
export const MAX_HEIGHT = 5;
export const COLORS = [
  { id: 'rouge', label: 'rouge', fill: '#e5484d' },
  { id: 'bleu', label: 'bleu', fill: '#3b82f6' },
  { id: 'jaune', label: 'jaune', fill: '#f5b82e' },
  { id: 'vert', label: 'vert', fill: '#3aa65b' },
];
export const MODELS_PER_SERIES = 3;

const count = (board) => board.reduce((n, col) => n + col.length, 0);
const heights = (board) => board.map((col) => col.length);
const empty = () => Array.from({ length: COLS }, () => []);

/** Modèle aléatoire : `blocks` blocs répartis en piles contiguës, sans trou (chaque bloc repose sur un autre ou au sol). */
export function randomModel(blocks, colored, random) {
  for (;;) {
    const board = empty();
    for (let i = 0; i < blocks; i++) {
      const free = board.map((c, k) => k).filter((k) => board[k].length < MAX_HEIGHT - 1);
      board[random.pick(free)].push(colored ? random.pick(COLORS).id : 'bleu');
    }
    // Pas de colonne vide entre deux piles (le modèle reste lisible), au moins 2 colonnes utilisées.
    const used = board.map((c) => c.length > 0);
    const first = used.indexOf(true);
    const last = used.lastIndexOf(true);
    if (used.slice(first, last + 1).every(Boolean) && used.filter(Boolean).length >= 2) return board;
  }
}

/** Défis de la difficulté 2 : un énoncé et une vérification ; toute construction qui la respecte est juste. */
export const CHALLENGES = [
  {
    id: 'tour-4', text: 'Construis une tour de 4 blocs.', blocks: 4,
    check: (b) => b.some((c) => c.length === 4) && count(b) === 4,
  },
  {
    id: 'deux-tours', text: 'Construis deux tours de la même hauteur, avec 6 blocs en tout.', blocks: 6,
    check: (b) => count(b) === 6 && heights(b).filter((h) => h > 0).length === 2 && new Set(heights(b).filter((h) => h > 0)).size === 1,
  },
  {
    id: 'escalier', text: 'Construis un escalier de 3 marches : 1 bloc, puis 2, puis 3, côte à côte.', blocks: 6,
    check: (b) => count(b) === 6 && [0, 1].some((s) => [1, 2, 3].every((h, i) => b[s + i].length === h) || [3, 2, 1].every((h, i) => b[s + i].length === h)),
  },
  {
    id: 'rouge-en-haut', text: 'Construis une tour de 3 blocs avec le bloc rouge tout en haut.', blocks: 3,
    check: (b) => count(b) === 3 && b.some((c) => c.length === 3 && c[2] === 'rouge'),
  },
  {
    id: 'bleu-en-bas', text: 'Construis une tour de 4 blocs : le bleu en bas, le jaune en haut.', blocks: 4,
    check: (b) => count(b) === 4 && b.some((c) => c.length === 4 && c[0] === 'bleu' && c[3] === 'jaune'),
  },
  {
    id: 'pont', text: 'Construis deux tours de 2 blocs, séparées par une colonne vide.', blocks: 4,
    check: (b) => count(b) === 4 && [0, 1].some((s) => b[s].length === 2 && b[s + 1].length === 0 && b[s + 2].length === 2),
  },
  {
    id: 'equilibre', text: 'Équilibre la balance : autant de blocs à gauche (2 premières colonnes) qu’à droite, 6 blocs en tout.', blocks: 6,
    check: (b) => count(b) === 6 && b[0].length + b[1].length === b[2].length + b[3].length,
  },
];

export function makeSeries(difficulty, random) {
  if (difficulty === 2) return random.shuffle(CHALLENGES).slice(0, MODELS_PER_SERIES).map((c) => ({ kind: 'challenge', challenge: c, blocks: c.blocks, prompt: c.text }));
  const blocks = difficulty === 0 ? 3 : 6;
  const seen = new Set();
  return Array.from({ length: MODELS_PER_SERIES }, () => {
    let model;
    // Jamais deux fois le même modèle dans une série.
    do model = randomModel(blocks, difficulty === 1, random); while (seen.has(JSON.stringify(model)));
    seen.add(JSON.stringify(model));
    return { kind: 'model', model, blocks, colored: difficulty === 1, prompt: difficulty === 0 ? 'Construis la même chose que le modèle.' : 'Construis la même chose que le modèle, avec les mêmes couleurs.' };
  });
}

/** Construction identique au modèle (couleurs comparées seulement si le modèle est en couleurs). */
export function matches(board, model, colored) {
  return model.every((col, k) => col.length === board[k].length && (!colored || col.every((c, i) => board[k][i] === c)));
}

export function isDone(task, board) {
  return task.kind === 'challenge' ? task.challenge.check(board) : matches(board, task.model, task.colored);
}

/** Indice pour un modèle : le prochain bloc à poser (colonne, couleur), ou le bloc à retirer s'il y a une erreur. */
export function nextStep(task, board) {
  if (task.kind !== 'model') return null;
  for (let k = 0; k < COLS; k++) {
    const want = task.model[k];
    const have = board[k];
    const firstWrong = have.findIndex((c, i) => i >= want.length || (task.colored && c !== want[i]));
    if (firstWrong !== -1) return { action: 'remove', col: k };
  }
  for (let k = 0; k < COLS; k++) {
    if (board[k].length < task.model[k].length) return { action: 'add', col: k, color: task.model[k][board[k].length] };
  }
  return null;
}

export { empty as emptyBoard, count as blockCount };
