/**
 * Règles du petit marché des nombres (jeu 3). Pures.
 *  difficulté 0 « Compter »   : mettre N fruits (1 à 5) dans le panier.
 *  difficulté 1 « Comparer »  : quel panier a le plus, ou autant ? (1 à 10)
 *  difficulté 2 « Compléter » : il y a déjà A fruits, il en faut B (B ≤ 10) ; symboles + et =.
 */
export const FRUITS = ['pomme', 'poire', 'orange', 'fraise'];
export const FRUIT_NAMES = { pomme: ['pomme', 'pommes'], poire: ['poire', 'poires'], orange: ['orange', 'oranges'], fraise: ['fraise', 'fraises'] };

export function makeOrder(difficulty, random) {
  const fruit = random.pick(FRUITS);
  if (difficulty === 0) {
    const target = random.int(1, 5);
    return { kind: 'count', fruit, start: 0, target, max: 8 };
  }
  if (difficulty === 1) {
    const equal = random() < 0.2;
    const left = random.int(1, 10);
    let right = equal ? left : random.int(1, 10);
    if (!equal && right === left) right = left === 10 ? 9 : left + 1;
    return { kind: 'compare', fruit, left, right };
  }
  const start = random.int(1, 6);
  const target = random.int(start + 1, 10);
  return { kind: 'complete', fruit, start, target, max: 12 };
}

export function name(fruit, n) {
  return FRUIT_NAMES[fruit][n > 1 ? 1 : 0];
}

export function prompt(order) {
  if (order.kind === 'count') return `Mets ${order.target} ${name(order.fruit, order.target)} dans le panier.`;
  if (order.kind === 'compare') return `Quel panier a le plus de ${name(order.fruit, 2)} ? Ou bien en ont-ils autant ?`;
  const missing = order.target - order.start;
  return `Il y a déjà ${order.start} ${name(order.fruit, order.start)}. Il en faut ${order.target}. Ajoute ce qui manque.`
    + (missing ? '' : '');
}

/** Vérifie un panier. diff > 0 : il en manque ; diff < 0 : il y en a trop. */
export function checkBasket(order, count) {
  const diff = order.target - count;
  return { ok: diff === 0, diff };
}

export function compareAnswer(order) {
  if (order.left === order.right) return 'equal';
  return order.left > order.right ? 'left' : 'right';
}

/** Texte d'aide après une erreur : on décrit l'écart, sans jugement. */
export function feedback(order, count) {
  const { diff } = checkBasket(order, count);
  if (diff > 0) return `Il en manque ${diff}.`;
  if (diff < 0) return `Il y en a ${-diff} de trop.`;
  return 'C’est exactement ça !';
}

export function isValidOrder(order) {
  if (order.kind === 'compare') return order.left >= 1 && order.right >= 1 && order.left <= 10 && order.right <= 10;
  return order.target >= 1 && order.target <= 10 && order.start >= 0 && order.start < order.target && order.target <= order.max;
}
