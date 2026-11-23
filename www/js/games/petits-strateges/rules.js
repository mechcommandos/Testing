/**
 * Les petits stratèges (jeu 42) : règles pures, testées (tests/js/games31-43.test.js).
 * Le jeu des pommes (un jeu de Nim) : chacun à son tour prend de 1 à max pommes ; celui qui prend la dernière gagne.
 * Stratégie gagnante : laisser à l'autre un multiple de (max + 1). L'enfant commence toujours, dans une position
 * gagnante : il peut gagner s'il joue bien, même contre le robot malin.
 */
export const LEVELS = [
  { piles: [7, 8], max: 2, robot: 'random' },
  { piles: [9, 10, 11], max: 3, robot: 'careful' },
  { piles: [9, 10, 11, 13, 14, 15], max: 3, robot: 'smart' },
];

/** Meilleur coup : le reste de la division par (max + 1) ; 0 si la position est perdante (aucun coup gagnant). */
export function bestMove(pile, max) {
  return pile % (max + 1);
}

export function isWinning(pile, max) {
  return bestMove(pile, max) !== 0;
}

/** Coup du robot selon son caractère : au hasard, prudent (bon coup une fois sur deux), malin (toujours le bon coup). */
export function robotMove(pile, max, kind, random) {
  const limit = Math.min(max, pile);
  const randomTake = random.int(1, limit);
  const best = bestMove(pile, max);
  if (kind === 'random' || best === 0) return randomTake;
  if (kind === 'careful') return random() < 0.5 ? best : randomTake;
  return best;
}

export function newGame(difficulty, random) {
  const level = LEVELS[Math.min(difficulty, 2)];
  const pile = random.pick(level.piles.filter((p) => isWinning(p, level.max)));
  return { pile, start: pile, max: level.max, robot: level.robot };
}

/** Conseil du robot (indice) : combien prendre et pourquoi. */
export function advice(pile, max) {
  const best = bestMove(pile, max);
  const m = max + 1;
  if (best === 0) return `Il reste ${pile} pommes, un multiple de ${m} : c’est difficile ! Prends 1 pomme et espère que je me trompe.`;
  return `Prends ${best} pomme${best > 1 ? 's' : ''} : il en restera ${pile - best}, un multiple de ${m}. Quoi que je fasse ensuite, tu pourras revenir sur un multiple de ${m}.`;
}
