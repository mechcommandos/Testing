/**
 * Le sondage de la classe (jeu 40) : règles pures, testées (tests/js/games31-43.test.js).
 * Sondages inventés (aucun vrai enfant). Jamais d'égalité pour la catégorie la plus ou la moins choisie.
 * Niveau 1 : pictogrammes (une image = un enfant) ; niveau 2 : diagramme en barres gradué de 2 en 2 ;
 * niveau 3 : construire le diagramme à partir d'un tableau.
 */
export const TOPICS = [
  { id: 'fruits', title: 'Quel est ton fruit préféré ?', items: ['pomme', 'banane', 'fraise', 'raisin'], names: { pomme: 'la pomme', banane: 'la banane', fraise: 'la fraise', raisin: 'le raisin' } },
  { id: 'animaux', title: 'Quel animal aimerais-tu avoir ?', items: ['chat', 'chien', 'lapin', 'poisson'], names: { chat: 'le chat', chien: 'le chien', lapin: 'le lapin', poisson: 'le poisson' } },
  { id: 'meteo', title: 'Quel temps préfères-tu ?', items: ['soleil', 'pluie', 'neige', 'vent'], names: { soleil: 'le soleil', pluie: 'la pluie', neige: 'la neige', vent: 'le vent' } },
];

/** Effectifs sans égalité entre le plus grand et le deuxième, ni entre le plus petit et l'avant-dernier. */
export function makeCounts(random, min, max, n = 4) {
  for (;;) {
    const counts = Array.from({ length: n }, () => random.int(min, max));
    const sorted = [...counts].sort((a, b) => a - b);
    if (sorted[n - 1] !== sorted[n - 2] && sorted[0] !== sorted[1]) return counts;
  }
}

function numberChoices(answer, random, others = []) {
  const set = [answer];
  for (const c of [...others, answer + 1, answer - 1, answer + 2, answer - 2]) if (c >= 0 && !set.includes(c) && set.length < 3) set.push(c);
  return random.shuffle(set).map(String);
}

export function questions(survey, random, level) {
  const { topic, counts } = survey;
  const name = (i) => topic.names[topic.items[i]];
  const max = counts.indexOf(Math.max(...counts));
  const min = counts.indexOf(Math.min(...counts));
  const i = random.int(0, 3);
  let j = random.int(0, 3);
  while (j === i || counts[j] === counts[i]) j = (j + 1) % 4;
  const [big, small] = counts[i] > counts[j] ? [i, j] : [j, i];
  const total = counts.reduce((a, b) => a + b, 0);
  const pool = [
    { kind: 'count', say: `Combien d’enfants ont choisi ${name(i)} ?`, correctId: String(counts[i]), options: numberChoices(counts[i], random, counts.filter((c) => c !== counts[i])) },
    { kind: 'pick', say: 'Quelle réponse a été la plus choisie ?', correctId: topic.items[max], options: topic.items },
    { kind: 'pick', say: 'Quelle réponse a été la moins choisie ?', correctId: topic.items[min], options: topic.items },
    { kind: 'count', say: `Combien d’enfants de plus ont choisi ${name(big)} plutôt que ${name(small)} ?`, correctId: String(counts[big] - counts[small]), options: numberChoices(counts[big] - counts[small], random, [counts[big] + counts[small]]) },
  ];
  if (level >= 1) pool.push({ kind: 'count', say: 'Combien d’enfants ont répondu au sondage, en tout ?', correctId: String(total), options: numberChoices(total, random, [total + 2, total - 3]) });
  return pool;
}

export function makeSeries(difficulty, random) {
  const topics = random.shuffle(TOPICS);
  if (difficulty === 2) return topics.slice(0, 2).map((topic) => ({ kind: 'build', topic, counts: makeCounts(random, 1, 10) }));
  const [min, max] = difficulty === 0 ? [1, 8] : [2, 16];
  const out = [];
  for (const topic of topics.slice(0, 2)) {
    const survey = { topic, counts: makeCounts(random, min, max) };
    for (const q of random.shuffle(questions(survey, random, difficulty)).slice(0, 2)) out.push({ ...q, survey });
  }
  return out;
}

/** Vérifie un diagramme construit : liste des barres fausses. */
export function wrongBars(target, built) {
  return target.map((c, i) => (built[i] === c ? -1 : i)).filter((i) => i >= 0);
}
