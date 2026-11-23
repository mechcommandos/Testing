/**
 * Le bocal d'estimation (jeu 38) : règles pures, testées (tests/js/games31-43.test.js).
 * Trois estimations « environ … » : la meilleure est la plus proche du vrai nombre, les deux autres sont nettement
 * plus loin (environ trois fois moins, et deux à trois fois plus). Une estimation lointaine n'est pas une erreur :
 * on compte ensemble et on compare.
 */
export const SERIES = 4;
export const JAR = { x: 34, y: 70, w: 132, h: 152 }; // intérieur du bocal (cadre de 200 × 240)

const round = (n, step) => Math.max(step, Math.round(n / step) * step);

export function options(count, difficulty) {
  const step = difficulty === 0 ? 5 : 10;
  const best = round(count, step);
  const low = Math.max(1, round(best / 3, difficulty === 0 ? 1 : 5));
  const high = round(best * (difficulty === 0 ? 3 : 2.5), step);
  return { best, list: [low, best, high] };
}

/** Le choix le plus proche du vrai nombre (unique par construction). */
export function closest(list, count) {
  return [...list].sort((a, b) => Math.abs(a - count) - Math.abs(b - count))[0];
}

/** Billes placées sans se chevaucher dans le bocal (tirage reproductible). */
export function marbles(count, random) {
  const r = count < 20 ? 11 : count < 60 ? 7 : 5;
  const out = [];
  let tries = 0;
  while (out.length < count && tries < 20000) {
    tries += 1;
    const x = JAR.x + r + random() * (JAR.w - 2 * r);
    const y = JAR.y + r + random() * (JAR.h - 2 * r);
    if (out.every((m) => Math.hypot(m.x - x, m.y - y) >= 2 * r + 1)) out.push({ x, y, r });
  }
  // Repli (très rare) : grille serrée.
  for (let i = 0; out.length < count; i++) out.push({ x: JAR.x + r + (i % 10) * r * 2, y: JAR.y + JAR.h - r - Math.floor(i / 10) * r * 2, r });
  return out;
}

/** Les 10 billes les plus proches de la première : un « paquet de 10 » à montrer. */
export function packOfTen(list) {
  const [first] = list;
  return list.map((m, i) => ({ i, d: Math.hypot(m.x - first.x, m.y - first.y) })).sort((a, b) => a.d - b.d).slice(0, 10).map((x) => x.i);
}

export function makeSeries(difficulty, random) {
  const range = [[6, 19], [24, 95], [30, 110]][Math.min(difficulty, 2)];
  const out = [];
  // Bocaux différents les uns des autres (écart d'au moins 3) ; le nombre d'essais est borné, pour ne jamais bloquer.
  for (let tries = 0; out.length < SERIES; tries++) {
    const count = random.int(range[0], range[1]);
    if (tries < 200 && out.some((q) => Math.abs(q.count - count) < 3)) continue;
    const { best, list } = options(count, difficulty);
    out.push({ count, best, options: list, colors: random.pick([['#1fb3c6', '#0e8fa0'], ['#ef5f95', '#c93b74'], ['#f5b82e', '#c98a1f'], ['#8b6fe8', '#6a4fd0']]) });
  }
  return out;
}
