/**
 * La roue du hasard (jeu 51) : règles pures, testées (tests/js/games44-53.test.js).
 * Une roue partagée en cases égales de couleur ; la flèche s'arrête au hasard sur une case.
 * Niveau 1 : certain, possible ou impossible. Niveau 2 : la couleur la plus probable ; laquelle de deux roues de même
 * taille donne le plus de chances. Niveau 3 : « k chances sur n » ; comparer deux roues de tailles différentes
 * (l'une est un multiple de l'autre, pour pouvoir comparer en « sur n »). Jamais d'égalité.
 */
export const SERIES_LENGTH = 6;
export const COLORS = { rouge: '#e5484d', bleu: '#1a56b8', vert: '#3aa65b', jaune: '#f5b82e' };
const NAMES = Object.keys(COLORS);

/** Roue : liste des couleurs de ses cases, dans l'ordre (mélangée). */
export function wheel(counts, random) {
  return random.shuffle(Object.entries(counts).flatMap(([c, n]) => Array(n).fill(c)));
}

export const count = (sectors, color) => sectors.filter((s) => s === color).length;

function chanceQuestion(type, random) {
  return { ...chanceBase(type, random), options: ['certain', 'possible', 'impossible'] };
}

function chanceBase(type, random) {
  const n = random.int(4, 8);
  if (type === 'certain') {
    const c = random.pick(NAMES);
    return { kind: 'chance', sectors: Array(n).fill(c), color: c, answer: 'certain' };
  }
  const [a, b, c] = random.shuffle(NAMES);
  const k = random.int(1, n - 1);
  const sectors = wheel({ [a]: k, [b]: n - k }, random);
  return type === 'possible' ? { kind: 'chance', sectors, color: random.pick([a, b]), answer: 'possible' } : { kind: 'chance', sectors, color: c, answer: 'impossible' };
}

function mostLikely(random) {
  const [a, b, c] = random.shuffle(NAMES);
  const n = random.int(6, 10);
  let x;
  let y;
  let top;
  // Trois couleurs présentes, et une seule a le plus de cases.
  do {
    x = random.int(1, n - 2);
    y = random.int(1, n - x - 1);
    top = [x, y, n - x - y].sort((p, q) => q - p);
  } while (n - x - y < 1 || top[0] === top[1]);
  const counts = { [a]: x, [b]: y, [c]: n - x - y };
  const answer = Object.keys(counts).reduce((m, k) => (counts[k] > counts[m] ? k : m));
  return { kind: 'most', sectors: wheel(counts, random), answer, options: random.shuffle([a, b, c]) };
}

function compareSame(random) {
  const n = random.pick([6, 8]);
  const color = random.pick(NAMES);
  const other = random.pick(NAMES.filter((c) => c !== color));
  let ka;
  let kb;
  do { ka = random.int(1, n - 1); kb = random.int(1, n - 1); } while (ka === kb);
  return { kind: 'compare', color, a: wheel({ [color]: ka, [other]: n - ka }, random), b: wheel({ [color]: kb, [other]: n - kb }, random), answer: ka > kb ? 'A' : 'B', options: ['A', 'B'] };
}

function fractionQuestion(random) {
  const n = random.int(4, 10);
  const k = random.int(1, n - 1);
  const [color, other] = random.shuffle(NAMES);
  const options = [`${k} sur ${n}`];
  // Pièges : l'autre couleur (n − k sur n), une case de plus ou de moins, ou un total faux (cases de la couleur oubliées).
  const traps = [`${n - k} sur ${n}`, k + 1 < n ? `${k + 1} sur ${n}` : null, k > 1 ? `${k - 1} sur ${n}` : null, n - k > k ? `${k} sur ${n - k}` : null, `${k} sur ${n + 2}`];
  for (const o of traps) if (o && !options.includes(o) && options.length < 3) options.push(o);
  return { kind: 'fraction', color, n, k, sectors: wheel({ [color]: k, [other]: n - k }, random), answer: options[0], options: random.shuffle(options) };
}

const PAIRS = [[2, 4], [2, 6], [2, 8], [3, 6], [4, 8]];

function compareDifferent(random) {
  const [small, big] = random.pick(PAIRS);
  const factor = big / small;
  const color = random.pick(NAMES);
  const other = random.pick(NAMES.filter((c) => c !== color));
  let ks;
  let kb;
  do { ks = random.int(1, small - 1); kb = random.int(1, big - 1); } while (ks * factor === kb);
  const smallFirst = random() < 0.5;
  const wa = smallFirst ? [ks, small] : [kb, big];
  const wb = smallFirst ? [kb, big] : [ks, small];
  const better = ks * factor > kb ? 'small' : 'big';
  return {
    kind: 'compare', color, scale: { small, big, ks, kb, factor },
    a: wheel({ [color]: wa[0], [other]: wa[1] - wa[0] }, random), b: wheel({ [color]: wb[0], [other]: wb[1] - wb[0] }, random),
    answer: (better === 'small') === smallFirst ? 'A' : 'B', options: ['A', 'B'],
  };
}

export function makeSeries(difficulty, random) {
  if (difficulty === 0) return random.shuffle(['certain', 'possible', 'impossible', 'certain', 'possible', 'impossible']).map((t) => chanceQuestion(t, random));
  if (difficulty === 1) return Array.from({ length: SERIES_LENGTH }, (_, i) => (i % 2 ? compareSame(random) : mostLikely(random)));
  return Array.from({ length: SERIES_LENGTH }, (_, i) => (i % 2 ? compareDifferent(random) : fractionQuestion(random)));
}
