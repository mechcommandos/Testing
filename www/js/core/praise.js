/**
 * Félicitations variées après une bonne réponse : les jeux commencent leur phrase par « Oui » ou « Bravo »
 * (« Oui : chat ! », « Bravo, bien arrivé ! ») ; ce premier mot est remplacé au hasard par Oui, Bien, Très bien
 * ou Parfait, jamais deux fois de suite le même, pour que la voix ne soit pas monotone.
 */
export const PRAISES = ['Oui', 'Bien', 'Très bien', 'Parfait'];
const LEAD = /^(Oui|Bravo)(?=\s*[!:,.]|\s*$)/;

let last = null;

export function pickPraise(random = Math.random) {
  const choices = PRAISES.filter((p) => p !== last);
  last = choices[Math.floor(random() * choices.length)];
  return last;
}

/** Remplace le mot de félicitation en tête de phrase (le même dans le texte lu et le texte affiché). */
export function varyPraise(text, display = null, random = Math.random) {
  if (typeof text !== 'string' || !LEAD.test(text)) return { text, display };
  const word = pickPraise(random);
  return { text: text.replace(LEAD, word), display: typeof display === 'string' ? display.replace(LEAD, word) : display };
}
