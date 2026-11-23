/**
 * Les explorateurs du numérique (jeu 29) : règles pures, testées (tests/js/games22-30.test.js).
 * Contenu : content/games/explorateurs-numerique.json — situations fictives, un « bon réflexe » par étape, chaque
 * réponse expliquée. Aucun champ de saisie, aucune donnée personnelle demandée : on touche une réponse, c'est tout.
 *
 * - difficulté 0 : situations simples (une étape) ;
 * - difficulté 1 : messages ambigus, affichés comme dans une messagerie ;
 * - difficulté 2 : scénarios en plusieurs étapes.
 */
export const SCENARIOS_PER_SERIES = 3;

export function makeSeries(difficulty, content, random) {
  return random.shuffle(content.scenarios.filter((s) => s.level === Math.min(difficulty, 2))).slice(0, SCENARIOS_PER_SERIES)
    .map((s) => ({ ...s, steps: s.steps.map((st) => ({ ...st, choices: random.shuffle(st.choices) })) }));
}

export const best = (step) => step.choices.find((c) => c.best);

export function validateContent(content) {
  const errors = [];
  for (const s of content.scenarios) {
    if (s.level === 2 && s.steps.length < 2) errors.push(`${s.id} : un scénario du niveau 3 a plusieurs étapes`);
    if (s.level === 1 && !s.message) errors.push(`${s.id} : message à afficher manquant`);
    for (const st of s.steps) {
      if (st.choices.filter((c) => c.best).length !== 1) errors.push(`${s.id} : il faut exactement un bon réflexe par étape`);
      if (st.choices.some((c) => !c.why)) errors.push(`${s.id} : explication manquante`);
    }
  }
  for (const level of [0, 1, 2]) if (content.scenarios.filter((s) => s.level === level).length < SCENARIOS_PER_SERIES) errors.push(`niveau ${level} : pas assez de situations`);
  return errors;
}
