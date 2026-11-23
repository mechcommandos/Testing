/**
 * Les amis de 10 (jeu 44) : règles pures, testées (tests/js/games44-53.test.js).
 * Niveau 1 : compléments à 10 (cadre de 10). Niveau 2 : compléments à 20 (deux cadres). Niveau 3 : compléments à 100
 * (dizaines entières, puis nombres quelconques). Une série = 6 questions, sans doublon.
 */
import { numberOptions } from '../quiz.js';

export const SERIES_LENGTH = 6;

function startFor(difficulty, random, k) {
  if (difficulty === 0) return [10, random.int(1, 9)];
  if (difficulty === 1) {
    const a = random.int(2, 18);
    return [20, a === 10 ? 12 : a];
  }
  // 100 : la moitié des questions avec des dizaines entières, l'autre moitié avec des unités.
  return [100, k % 2 === 0 ? random.int(1, 9) * 10 : random.int(11, 89)];
}

export function makeSeries(difficulty, random) {
  const out = [];
  const seen = new Set();
  for (let k = 0; out.length < SERIES_LENGTH && k < 200; k++) {
    const [total, a] = startFor(difficulty, random, out.length);
    // Les questions « avec unités » ne tombent pas sur une dizaine entière (déjà travaillée juste avant).
    if (seen.has(a) || (total === 100 && out.length % 2 === 1 && a % 10 === 0)) continue;
    seen.add(a);
    const answer = total - a;
    // Erreurs fréquentes : un de plus ou de moins, et pour 100 l'oubli de la retenue (64 + 46).
    const traps = total === 100 && a % 10 ? [answer + 10, answer - 10, answer + 1] : [answer + 1, answer - 1, answer + 2];
    out.push({ total, start: a, answer: String(answer), options: numberOptions(answer, random, traps, { min: 0, max: total }).map(String) });
  }
  return out;
}
