/**
 * Les histoires à remettre en ordre (jeu 16) : règles pures, testées (tests/js/games13-21.test.js).
 * Contenu : content/games/histoires-ordre.json — chaque histoire liste ses ordres acceptés (« orders ») :
 * une variante cohérente (petit-déjeuner avant ou après les dents) n'est jamais comptée comme fausse.
 *
 * - difficulté 0 : histoires de 3 images ;
 * - difficulté 1 : 4 images ;
 * - difficulté 2 : 5 images avec une cause et sa conséquence, expliquées à la fin.
 */
export const STORIES_PER_SERIES = 3;

export function makeSeries(difficulty, content, random) {
  const pool = content.stories.filter((s) => s.level === Math.min(difficulty, 2));
  return random.shuffle(pool).slice(0, STORIES_PER_SERIES).map((story) => ({ story, cards: random.shuffle(story.steps) }));
}

/** La suite posée est-elle un ordre accepté (complet) ? */
export function isValidOrder(story, ids) {
  return story.orders.some((o) => o.length === ids.length && o.every((id, i) => id === ids[i]));
}

/** Plus long début de `ids` qui commence au moins un ordre accepté : ces cartes restent en place après une erreur. */
export function validPrefix(story, ids) {
  let best = 0;
  for (const o of story.orders) {
    let n = 0;
    while (n < ids.length && o[n] === ids[n]) n++;
    best = Math.max(best, n);
  }
  return best;
}

/** Indice : la prochaine carte d'un ordre accepté qui prolonge les cartes déjà bien placées. */
export function nextCard(story, ids) {
  const keep = ids.slice(0, validPrefix(story, ids));
  const order = story.orders.find((o) => keep.every((id, i) => o[i] === id));
  return order[keep.length] ?? null;
}

export function validateContent(content) {
  const errors = [];
  const sizes = { 0: 3, 1: 4, 2: 5 };
  for (const s of content.stories) {
    const ids = s.steps.map((x) => x.id);
    if (ids.length !== sizes[s.level]) errors.push(`${s.id} : ${ids.length} images au lieu de ${sizes[s.level]}`);
    if (!s.orders.length) errors.push(`${s.id} : aucun ordre accepté`);
    for (const o of s.orders) {
      if (o.length !== ids.length || new Set(o).size !== ids.length || o.some((id) => !ids.includes(id))) errors.push(`${s.id} : ordre ${o.join('')} incomplet ou inconnu`);
    }
    if (s.level === 2 && !s.why) errors.push(`${s.id} : explication cause-conséquence manquante`);
    if (s.steps.some((x) => !x.text || !x.picto)) errors.push(`${s.id} : image ou texte manquant`);
  }
  for (const level of [0, 1, 2]) if (content.stories.filter((s) => s.level === level).length < STORIES_PER_SERIES) errors.push(`niveau ${level} : pas assez d'histoires`);
  return errors;
}
