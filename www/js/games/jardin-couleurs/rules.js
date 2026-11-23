/**
 * Règles du jardin des couleurs et des formes (jeu 1). Pures : aucune dépendance au DOM.
 *  difficulté 0 « Couleurs » : toucher toutes les fleurs d'une couleur (2 couleurs, 5 fleurs).
 *  difficulté 1 « Formes »   : ranger chaque objet dans le pot de la même forme (3 formes, 3 couleurs).
 *  difficulté 2 « Tailles »  : toucher les objets du plus petit au plus grand (3 à 5 objets).
 */
export const COLORS = {
  // label : masculin (formes : « carré bleu ») ; feminine : accord avec « fleur(s) ».
  rouge: { hex: '#e5484d', label: 'rouge', feminine: 'rouge' },
  bleu: { hex: '#2f7fd8', label: 'bleu', feminine: 'bleue' },
  jaune: { hex: '#f2b705', label: 'jaune', feminine: 'jaune' },
  vert: { hex: '#3aa65b', label: 'vert', feminine: 'verte' },
};

export const SHAPES = {
  rond: { label: 'rond' },
  carre: { label: 'carré' },
  triangle: { label: 'triangle' },
};

export const MODES = ['pick', 'sort', 'order'];

export function makeRound(difficulty, random) {
  if (difficulty === 0) {
    const [target, other] = random.shuffle(Object.keys(COLORS)).slice(0, 2);
    const count = random.int(2, 3);
    const items = random.shuffle([
      ...Array.from({ length: count }, () => ({ color: target })),
      ...Array.from({ length: 5 - count }, () => ({ color: other })),
    ]).map((item, i) => ({ id: `f${i}`, kind: 'fleur', shape: 'fleur', size: 1, ...item }));
    return { mode: 'pick', target: { color: target }, items, prompt: `Touche toutes les fleurs ${COLORS[target].feminine}s.` };
  }

  if (difficulty === 1) {
    const shapes = Object.keys(SHAPES);
    const colors = random.shuffle(Object.keys(COLORS)).slice(0, 3);
    const count = random.int(4, 6);
    // Chaque forme apparaît au moins une fois, pour que chaque pot serve.
    const kinds = random.shuffle([...shapes, ...Array.from({ length: count - shapes.length }, () => random.pick(shapes))]);
    const items = kinds.map((shape, i) => ({ id: `o${i}`, kind: 'forme', shape, color: random.pick(colors), size: 1 }));
    return { mode: 'sort', pots: shapes.map((shape) => ({ id: `pot-${shape}`, shape })), items, prompt: 'Range chaque forme dans le pot qui a la même forme.' };
  }

  const count = random.int(3, 5);
  const color = random.pick(Object.keys(COLORS));
  const shape = random.pick(Object.keys(SHAPES));
  const sizes = Array.from({ length: count }, (_, i) => 0.55 + (i * 0.75) / (count - 1));
  const items = random.shuffle(sizes.map((size, rank) => ({ id: `t${rank}`, kind: 'forme', shape, color, size, rank })));
  return { mode: 'order', items, prompt: 'Touche les formes de la plus petite à la plus grande.' };
}

/** Mode « pick » : l'objet correspond-il à la consigne ? */
export function isTarget(round, item) {
  return round.mode === 'pick' && item.color === round.target.color;
}

export function targetsLeft(round, picked) {
  return round.items.filter((i) => isTarget(round, i) && !picked.has(i.id)).length;
}

/** Mode « sort » : l'objet va-t-il dans ce pot ? */
export function fitsPot(item, pot) {
  return item.shape === pot.shape;
}

/** Mode « order » : identifiant du prochain objet attendu. */
export function nextInOrder(round, placed) {
  return round.items.filter((i) => !placed.has(i.id)).sort((a, b) => a.rank - b.rank)[0]?.id ?? null;
}

/** La manche est-elle résoluble ? (contrôle des tests et garde-fou du générateur) */
export function isSolvable(round) {
  if (round.mode === 'pick') return round.items.some((i) => isTarget(round, i)) && round.items.some((i) => !isTarget(round, i));
  if (round.mode === 'sort') return round.items.every((i) => round.pots.some((p) => fitsPot(i, p)));
  const sizes = round.items.map((i) => i.size);
  return new Set(sizes).size === sizes.length;
}
