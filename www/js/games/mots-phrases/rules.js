/**
 * L'atelier des mots et des phrases (jeu 24) : règles pures, testées (tests/js/games22-30.test.js).
 * Contenu : content/games/mots-phrases.json. Une phrase est juste si les mots posés forment l'un des ordres acceptés
 * (« orders ») ; les étiquettes pièges (« distractors ») ne font partie d'aucun ordre. Les virgules écrites dans un ordre
 * (« ce matin, le chien… ») ne sont pas des étiquettes : elles s'affichent dans la phrase finale de cet ordre-là.
 *
 * - difficulté 0 : phrases de 3 mots ;
 * - difficulté 1 : accords simples (une étiquette piège : singulier/pluriel, masculin/féminin) ;
 * - difficulté 2 : phrases plus longues, plusieurs ordres possibles (« ce matin » au début ou à la fin).
 */
export const SENTENCES_PER_SERIES = 3;

const plain = (order) => order.replace(/,/g, '');
export const words = (sentence) => plain(sentence.orders[0]).split(' ');

export function makeSeries(difficulty, content, random) {
  return random.shuffle(content.sentences.filter((s) => s.level === Math.min(difficulty, 2))).slice(0, SENTENCES_PER_SERIES).map((s) => ({
    ...s,
    tiles: random.shuffle([...words(s), ...(s.distractors ?? [])].map((text, i) => ({ id: `t${i}`, text }))),
  }));
}

/** La suite posée est-elle un ordre accepté ? */
export function isValid(sentence, placed) {
  const text = placed.join(' ');
  return sentence.orders.some((o) => plain(o) === text);
}

/** Nombre de premiers mots posés qui commencent un ordre accepté (ils restent après une erreur). */
export function goodPrefix(sentence, placed) {
  let best = 0;
  for (const order of sentence.orders) {
    const w = plain(order).split(' ');
    let n = 0;
    while (n < placed.length && w[n] === placed[n]) n++;
    best = Math.max(best, n);
  }
  return best;
}

/** Prochain mot d'un ordre accepté qui prolonge les mots bien placés (indice). */
export function nextWord(sentence, placed) {
  const keep = placed.slice(0, goodPrefix(sentence, placed));
  const order = sentence.orders.map((o) => plain(o).split(' ')).find((w) => keep.every((x, i) => w[i] === x));
  return order[keep.length] ?? null;
}

/** Phrase écrite : celle de l'ordre trouvé (avec ses virgules), majuscule au début, point à la fin. */
export function written(sentence, placed) {
  const text = sentence.orders.find((o) => plain(o) === placed.join(' ')) ?? placed.join(' ');
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}

export function validateContent(content) {
  const errors = [];
  for (const s of content.sentences) {
    const base = [...words(s)].sort().join(' ');
    for (const o of s.orders) if ([...plain(o).split(' ')].sort().join(' ') !== base) errors.push(`${s.id} : l'ordre « ${o} » n'utilise pas les mêmes mots`);
    for (const d of s.distractors ?? []) if (words(s).includes(d)) errors.push(`${s.id} : le piège « ${d} » est aussi un mot de la phrase`);
    if (s.level === 0 && words(s).length !== 3) errors.push(`${s.id} : 3 mots attendus`);
    if (s.level === 1 && !s.distractors?.length) errors.push(`${s.id} : étiquette piège manquante`);
    if (s.level === 1 && !s.rule) errors.push(`${s.id} : explication de l'accord manquante`);
  }
  for (const level of [0, 1, 2]) if (content.sentences.filter((s) => s.level === level).length < SENTENCES_PER_SERIES) errors.push(`niveau ${level} : pas assez de phrases`);
  return errors;
}
