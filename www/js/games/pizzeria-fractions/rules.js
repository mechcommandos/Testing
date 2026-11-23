/**
 * La pizzeria des fractions (jeu 18) : règles pures, testées (tests/js/games13-21.test.js).
 * Une pizza est toujours coupée en parts égales (secteurs de même angle). Une commande est servie si la part
 * servie représente la même quantité que la commande : 2 parts sur 4 servent « la moitié ».
 *
 * - difficulté 0 : moitiés et quarts (couper en 2 ou en 4, puis choisir les parts) ;
 * - difficulté 1 : tiers et sixièmes ;
 * - difficulté 2 : équivalences (pizza déjà coupée autrement que la commande) et comparaisons de fractions.
 */
export const ORDERS_PER_SERIES = 4;

const WORDS = {
  '1/2': 'la moitié', '1/4': 'un quart', '2/4': 'deux quarts', '3/4': 'trois quarts',
  '1/3': 'un tiers', '2/3': 'deux tiers', '1/6': 'un sixième', '2/6': 'deux sixièmes', '3/6': 'trois sixièmes', '4/6': 'quatre sixièmes', '5/6': 'cinq sixièmes',
  '1/8': 'un huitième', '2/8': 'deux huitièmes', '3/8': 'trois huitièmes', '4/8': 'quatre huitièmes', '6/8': 'six huitièmes',
};

export function words(num, den) {
  return WORDS[`${num}/${den}`] ?? `${num} sur ${den}`;
}

export function sameAmount(a, b) {
  return a.num * b.den === b.num * a.den;
}

const LEVEL = [
  { orders: [[1, 2], [1, 4], [3, 4]], cuts: [2, 4] },
  { orders: [[1, 3], [2, 3], [1, 6], [5, 6]], cuts: [2, 3, 4, 6] },
];

// Équivalences : commande et découpage imposé différents, une seule quantité juste.
const EQUIVALENCES = [[1, 2, 4], [1, 2, 6], [1, 2, 8], [1, 3, 6], [2, 3, 6], [3, 4, 8], [1, 4, 8]];
const COMPARE = [[[1, 2], [1, 4]], [[1, 3], [1, 4]], [[1, 6], [1, 3]], [[2, 3], [1, 2]], [[3, 4], [2, 3]], [[1, 8], [1, 6]]];

export function makeSeries(difficulty, random) {
  if (difficulty < 2) {
    const L = LEVEL[difficulty];
    const picks = random.shuffle([...L.orders, ...random.shuffle(L.orders)]).slice(0, ORDERS_PER_SERIES);
    return picks.map(([num, den]) => ({ kind: 'cut', num, den, cuts: L.cuts, prompt: `Une pizza, s’il vous plaît : j’en voudrais ${words(num, den)}.` }));
  }
  const eq = random.shuffle(EQUIVALENCES).slice(0, 2).map(([num, den, cut]) => ({
    kind: 'equivalent', num, den, cut, prompt: `La pizza est déjà coupée en ${cut} parts. Le client veut ${words(num, den)} : sers-lui la même quantité.`,
  }));
  const cmp = random.shuffle(COMPARE).slice(0, 2).map(([a, b]) => {
    const [left, right] = random.shuffle([a, b]);
    const bigger = left[0] * right[1] > right[0] * left[1] ? left : right;
    return {
      kind: 'compare', left, right, prompt: `Qu’est-ce qui fait le plus de pizza : ${words(...left)} ou ${words(...right)} ?`,
      choices: [left, right].map(([n, d]) => ({ id: `${n}/${d}`, text: `${words(n, d)} (${n}/${d})` })), correctId: `${bigger[0]}/${bigger[1]}`,
    };
  });
  return [eq[0], cmp[0], eq[1], cmp[1]];
}

/** Une commande « couper puis servir » est réussie si les parts servies font la même quantité. */
export function served(order, cut, slices) {
  return cut > 0 && slices > 0 && sameAmount({ num: slices, den: cut }, order);
}

/** Découpages qui permettent de servir la commande exactement (pour l'indice). */
export function goodCuts(order, cuts) {
  return cuts.filter((c) => (order.num * c) % order.den === 0);
}

/** Tracé d'un secteur (part) i sur n d'une pizza centrée en (cx, cy) de rayon r, en partant du haut. */
export function slicePath(i, n, cx = 100, cy = 100, r = 90) {
  if (n === 1) return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
  const a0 = -Math.PI / 2 + (2 * Math.PI * i) / n;
  const a1 = -Math.PI / 2 + (2 * Math.PI * (i + 1)) / n;
  const p = (a) => `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  return `M${cx} ${cy}L${p(a0)}A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)}Z`;
}
