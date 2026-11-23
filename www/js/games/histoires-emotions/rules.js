/**
 * Les histoires des émotions (jeu 10) : règles pures, testées (tests/js/games8-10.test.js).
 * Contenu : content/games/histoires-emotions.json (à faire relire par un ou une spécialiste de l'enfance).
 *
 * - difficulté 0 : une scène, un personnage, 2 émotions proposées ;
 * - difficulté 1 : une scène, deux personnages, 3 émotions proposées pour chacun ;
 * - difficulté 2 : une scène, des idées de réponses et leurs conséquences.
 * Toutes les réponses sont acceptées : on reformule, on n'évalue pas. Rien n'est enregistré sur l'émotion choisie.
 */
export const SCENES_PER_SERIES = [4, 3, 3];

function emotionChoices(content, plausible, count, random) {
  const yes = content.emotions.filter((e) => plausible.includes(e.id));
  const no = content.emotions.filter((e) => !plausible.includes(e.id));
  const first = random.pick(yes);
  const others = random.shuffle([...yes.filter((e) => e !== first), ...no]).slice(0, count - 1);
  return random.shuffle([first, ...others]).map((e) => ({ id: e.id, picto: e.picto, text: e.label.replace(/^la /, ''), aria: e.label }));
}

export function makeSeries(difficulty, content, random) {
  const n = SCENES_PER_SERIES[difficulty];
  if (difficulty === 0) {
    return random.shuffle(content.simple).slice(0, n).map((s) => ({
      kind: 'simple', scene: s,
      steps: [{ who: s.who, plausible: s.plausible, choices: emotionChoices(content, s.plausible, 2, random) }],
    }));
  }
  if (difficulty === 1) {
    return random.shuffle(content.duo).slice(0, n).map((s) => ({
      kind: 'duo', scene: s,
      steps: s.characters.map((c) => ({ who: c.who, plausible: c.plausible, choices: emotionChoices(content, c.plausible, 3, random) })),
    }));
  }
  return random.shuffle(content.responses).slice(0, n).map((s) => ({ kind: 'responses', scene: s, options: random.shuffle(s.options) }));
}

/** Reformulation, jamais un verdict : l'émotion choisie est accueillie, d'autres sont proposées si besoin. */
export function reflect(content, step, chosenId) {
  const chosen = content.emotions.find((e) => e.id === chosenId);
  if (step.plausible.includes(chosenId)) return `Oui, ${step.who} peut ressentir ${chosen.noun}.`;
  const usual = step.plausible.map((id) => content.emotions.find((e) => e.id === id).noun);
  return `Peut-être. Souvent, dans cette situation, on ressent plutôt ${usual.join(' ou ')}. Chacun peut ressentir les choses différemment.`;
}

export function validateContent(content) {
  const errors = [];
  const ids = new Set(content.emotions.map((e) => e.id));
  const check = (where, plausible) => {
    if (!plausible.length) errors.push(`${where} : aucune émotion proposée`);
    for (const id of plausible) if (!ids.has(id)) errors.push(`${where} : émotion inconnue ${id}`);
  };
  for (const s of content.simple) {
    check(s.id, s.plausible);
    if (content.emotions.length - s.plausible.length < 1) errors.push(`${s.id} : il faut au moins une autre émotion à proposer`);
  }
  for (const s of content.duo) {
    if (s.characters.length !== 2) errors.push(`${s.id} : deux personnages attendus`);
    for (const c of s.characters) check(`${s.id}/${c.who}`, c.plausible);
  }
  for (const s of content.responses) {
    if (s.options.length < 2) errors.push(`${s.id} : au moins deux idées de réponse`);
    for (const o of s.options) if (!o.consequence) errors.push(`${s.id}/${o.id} : conséquence manquante`);
  }
  for (const [d, n] of SCENES_PER_SERIES.entries()) {
    const pool = [content.simple, content.duo, content.responses][d];
    if (pool.length < n) errors.push(`difficulté ${d} : pas assez de scènes`);
  }
  return errors;
}
