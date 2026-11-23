/**
 * La ruche des multiplications (jeu 37) : règles pures, testées (tests/js/games31-43.test.js).
 * Niveau 1 : groupes égaux (fleurs et abeilles) ; niveau 2 : tableaux en rangées (alvéoles) ; niveau 3 : tables de
 * 2, 5 et 10. Les mauvaises réponses sont des erreurs plausibles : l'addition des deux nombres, un groupe en trop
 * ou en moins, un de plus dans chaque groupe.
 */
export const SERIES = 5;

export function distractors(a, b, count = 3) {
  const product = a * b;
  const candidates = [a + b, (a + 1) * b, (a - 1) * b, a * (b + 1), a * (b - 1), product + 1, product - 1, product + 2];
  const out = [];
  for (const c of candidates) if (c > 0 && c !== product && !out.includes(c)) out.push(c);
  return out.slice(0, count);
}

function question(kind, a, b, random) {
  const product = a * b;
  const choices = random.shuffle([product, ...distractors(a, b)]);
  const prompt = kind === 'groups'
    ? `Il y a ${a} fleurs. Sur chaque fleur, ${b} abeilles. Combien d’abeilles en tout ?`
    : kind === 'rows'
      ? `La ruche a ${a} rangées de ${b} alvéoles. Combien d’alvéoles en tout ?`
      : `Combien font ${a} fois ${b} ?`;
  const why = kind === 'groups'
    ? `Oui : ${a} groupes de ${b}, c’est ${a} fois ${b}, ${product} abeilles.`
    : kind === 'rows'
      ? `Oui : ${a} rangées de ${b}, ${a} fois ${b}, ${product} alvéoles.`
      : `Oui : ${a} fois ${b}, ${product}.`;
  return { kind, a, b, product, choices, prompt, why };
}

/** tables : tables à réviser choisies par le parent (offre Famille) ; sinon 2, 5 et 10 au niveau 3. */
export function makeSeries(difficulty, random, { tables = [] } = {}) {
  const revise = Array.isArray(tables) ? tables.filter((t) => Number.isInteger(t) && t >= 1 && t <= 10) : [];
  const out = [];
  const seen = new Set();
  for (let tries = 0; out.length < SERIES; tries++) {
    let q;
    if (difficulty === 0) q = question('groups', random.int(2, 4), random.int(2, 5), random);
    else if (difficulty === 1) q = question('rows', random.int(2, 5), random.int(2, 6), random);
    else {
      const table = random.pick(revise.length ? revise : [2, 5, 10]);
      const n = random.int(2, 10);
      q = random() < 0.5 ? question('table', table, n, random) : question('table', n, table, random);
    }
    const key = `${q.a}x${q.b}`;
    if (seen.has(key) && tries < 200) continue;
    seen.add(key);
    out.push(q);
  }
  return out;
}

/** Comptage par bonds (aide de l'indice) : 4, 8, 12… */
export function skipCount(a, b) {
  return Array.from({ length: a }, (_, i) => (i + 1) * b);
}
