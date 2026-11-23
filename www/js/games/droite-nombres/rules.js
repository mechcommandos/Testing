/**
 * La droite des nombres (jeu 45) : règles pures, testées (tests/js/games44-53.test.js).
 * Deux sortes de questions, en alternance : lire le nombre montré par la flèche ; trouver lequel des repères A, B, C
 * est un nombre donné. Niveau 1 : de 0 à 10 ; niveau 2 : de 0 à 100 (graduations de 10 en 10) ; niveau 3 : de 0 à
 * 1 000 (graduations de 100 en 100, demi-graduations de 50). Les nombres écrits sous la droite ne sont jamais demandés.
 */
import { numberOptions } from '../quiz.js';

export const SERIES_LENGTH = 6;
export const RANGES = [
  { max: 10, step: 1, minor: 0, labels: [0, 5, 10] },
  { max: 100, step: 10, minor: 0, labels: [0, 50, 100] },
  { max: 1000, step: 100, minor: 50, labels: [0, 500, 1000] },
];

/** Nombres qu'on peut demander : sur une graduation (ou demi-graduation), sans étiquette écrite. */
export function askable(range) {
  const unit = range.minor || range.step;
  const out = [];
  for (let v = unit; v < range.max; v += unit) if (!range.labels.includes(v)) out.push(v);
  return out;
}

export function makeSeries(difficulty, random) {
  const range = RANGES[difficulty];
  const pool = random.shuffle(askable(range));
  const unit = range.minor || range.step;
  return pool.slice(0, SERIES_LENGTH).map((value, i) => {
    if (i % 2 === 0) {
      // Lire : les voisins sont les erreurs habituelles (une graduation de trop ou de moins).
      const options = numberOptions(value, random, [value + range.step, value - range.step, value + unit, value - unit], { min: 1, max: range.max - 1 })
        .filter((n) => n % unit === 0);
      while (options.length < 3) {
        const extra = random.pick(askable(range));
        if (!options.includes(extra)) options.push(extra);
      }
      return { kind: 'read', range, value, answer: String(value), options: random.shuffle(options.slice(0, 3)).map(String) };
    }
    // Placer : trois repères à des endroits différents, nommés A, B, C de gauche à droite.
    // Repères écartés d'au moins deux graduations les uns des autres (lisibles même de 50 en 50).
    const others = [];
    for (const v of random.shuffle(askable(range))) {
      if (others.length < 2 && [value, ...others].every((w) => Math.abs(v - w) >= 2 * unit)) others.push(v);
    }
    const marks = [value, ...others].sort((a, b) => a - b).map((v, k) => ({ letter: 'ABC'[k], value: v }));
    return { kind: 'place', range, value, marks, answer: marks.find((m) => m.value === value).letter, options: ['A', 'B', 'C'] };
  });
}
