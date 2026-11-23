/**
 * Les détectives de la lecture (jeu 25) : règles pures, testées (tests/js/games22-30.test.js).
 * Contenu : content/games/detectives-lecture.json — chaque enquête : phrases, indices (numéros des phrases utiles),
 * question, réponses, explication.
 *
 * - difficulté 0 : textes courts, un indice ;
 * - difficulté 1 : deux indices à relever ;
 * - difficulté 2 : inférence (la réponse n'est pas écrite telle quelle, plusieurs indices à rapprocher).
 * L'aide audio (texte lu à voix haute) est facultative ; une enquête lue avec elle est enregistrée comme aidée.
 */
export const CASES_PER_SERIES = 2;

export function makeSeries(difficulty, content, random) {
  return random.shuffle(content.cases.filter((c) => c.level === Math.min(difficulty, 2))).slice(0, CASES_PER_SERIES)
    .map((c) => ({ ...c, choices: random.shuffle(c.choices) }));
}

/**
 * Toucher une phrase : indice demandé, phrase utile (elle écarte une fausse piste : jamais une erreur, mais pas
 * obligatoire), déjà trouvée, ou phrase qui n'aide pas.
 */
export function tapSentence(theCase, found, i) {
  if (found.includes(i)) return 'already';
  if (theCase.clues.includes(i)) return 'clue';
  return theCase.useful?.includes(i) ? 'useful' : 'not-clue';
}

export const allFound = (theCase, found) => theCase.clues.every((i) => found.includes(i));

export function validateContent(content) {
  const errors = [];
  const need = { 0: 1, 1: 2 };
  for (const c of content.cases) {
    if ([...c.clues, ...(c.useful ?? [])].some((i) => i < 0 || i >= c.sentences.length)) errors.push(`${c.id} : indice hors du texte`);
    if ((c.useful ?? []).some((i) => c.clues.includes(i))) errors.push(`${c.id} : une phrase est à la fois indice et utile`);
    if (need[c.level] !== undefined && c.clues.length !== need[c.level]) errors.push(`${c.id} : ${need[c.level]} indice(s) attendu(s)`);
    if (c.level === 2 && c.clues.length < 2) errors.push(`${c.id} : une inférence rapproche au moins deux indices`);
    if (!c.choices.some((x) => x.id === c.answer)) errors.push(`${c.id} : réponse absente des choix`);
    if (new Set(c.choices.map((x) => x.id)).size !== c.choices.length) errors.push(`${c.id} : choix en double`);
    if (!c.why) errors.push(`${c.id} : explication manquante`);
  }
  for (const level of [0, 1, 2]) if (content.cases.filter((c) => c.level === level).length < CASES_PER_SERIES) errors.push(`niveau ${level} : pas assez d'enquêtes`);
  return errors;
}
