/**
 * La bulle de calme (jeu 36) : règles pures, testées (tests/js/games31-43.test.js).
 * Il n'y a rien à réussir : on suit un rythme de respiration lent. La météo intérieure choisie au niveau 3
 * n'est pas enregistrée (seulement le fait d'avoir terminé le moment).
 */

/** Une respiration de la bulle : inspirer 4 s, souffler 5 s (le souffle un peu plus long aide à se calmer). */
export const BUBBLE = [
  { phase: 'in', seconds: 4, say: 'Inspire par le nez…' },
  { phase: 'out', seconds: 5, say: 'Souffle doucement par la bouche…' },
];
/** Le carré : inspirer, garder, souffler, attendre, 4 secondes chacun. */
export const SQUARE = [
  { phase: 'in', seconds: 4, say: 'Inspire…', side: 0 },
  { phase: 'hold', seconds: 4, say: 'Garde l’air…', side: 1 },
  { phase: 'out', seconds: 4, say: 'Souffle…', side: 2 },
  { phase: 'rest', seconds: 4, say: 'Attends…', side: 3 },
];

export const WEATHERS = [
  { id: 'soleil', label: 'Soleil', feel: 'Je me sens bien', reply: 'Super ! Garde ce soleil avec toi. Respirons quand même trois fois, pour en profiter.' },
  { id: 'nuage', label: 'Nuages', feel: 'Je suis un peu fatigué ou un peu triste', reply: 'Ça arrive à tout le monde. Respirons doucement ensemble, trois fois.' },
  { id: 'pluie', label: 'Pluie', feel: 'Je suis triste', reply: 'Tu as le droit d’être triste. Tu peux aussi en parler à un adulte. Respirons trois fois ensemble.' },
  { id: 'vent', label: 'Tempête', feel: 'Je suis agité ou en colère', reply: 'La colère, c’est comme une tempête : elle passe. Respirons lentement, trois fois.' },
];

/** Suite des étapes d'un moment : niveau 1 = 5 respirations de bulle ; 2 = 3 tours du carré ; 3 = météo puis 3 bulles. */
export function steps(difficulty) {
  if (difficulty === 1) return Array.from({ length: 3 }, () => SQUARE).flat();
  return Array.from({ length: difficulty === 0 ? 5 : 3 }, () => BUBBLE).flat();
}

export function totalSeconds(list) {
  return list.reduce((t, s) => t + s.seconds, 0);
}
