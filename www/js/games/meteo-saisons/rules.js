/**
 * Mission météo et saisons (jeu 22) : règles pures, testées (tests/js/games22-30.test.js).
 * Contenu : content/games/meteo-saisons.json. Une tenue est adaptée si elle contient au moins un objet de chaque
 * besoin (« needs ») et aucun objet inutile (« avoid ») ; les autres objets sont permis. Plusieurs tenues sont justes.
 *
 * - difficulté 0 : soleil ou pluie, ici ;
 * - difficulté 1 : les saisons, en France (le lieu est dit : les saisons ne sont pas les mêmes partout) ;
 * - difficulté 2 : des lieux du monde, nommés et situés.
 */
export const SITUATIONS_PER_SERIES = 3;

export function makeSeries(difficulty, content, random) {
  return random.shuffle(content.situations.filter((s) => s.level === Math.min(difficulty, 2))).slice(0, SITUATIONS_PER_SERIES)
    .map((s) => ({ ...s, offer: random.shuffle(s.offer) }));
}

/** Vérifie une tenue : { ok, missing: [indices des besoins non couverts], wrong: [objets inutiles choisis] }. */
export function check(situation, chosen) {
  const set = new Set(chosen);
  const missing = situation.needs.map((group, i) => (group.some((id) => set.has(id)) ? -1 : i)).filter((i) => i >= 0);
  const wrong = situation.avoid.filter((id) => set.has(id));
  return { ok: !missing.length && !wrong.length, missing, wrong };
}

/** Une tenue juste (le premier objet de chaque besoin), pour l'indice et les tests. */
export function oneSolution(situation) {
  return situation.needs.map((g) => g[0]);
}

export function validateContent(content) {
  const errors = [];
  for (const s of content.situations) {
    for (const id of [...s.offer, ...s.needs.flat(), ...s.avoid]) if (!content.items[id]) errors.push(`${s.id} : objet ${id} inconnu`);
    for (const id of [...s.needs.flat(), ...s.avoid]) if (!s.offer.includes(id)) errors.push(`${s.id} : ${id} n'est pas proposé`);
    if (s.needs.flat().some((id) => s.avoid.includes(id))) errors.push(`${s.id} : un objet est à la fois utile et inutile`);
    if (!s.place) errors.push(`${s.id} : lieu manquant`);
    if (!check(s, oneSolution(s)).ok) errors.push(`${s.id} : pas de solution`);
  }
  for (const level of [0, 1, 2]) if (content.situations.filter((s) => s.level === level).length < SITUATIONS_PER_SERIES) errors.push(`niveau ${level} : pas assez de situations`);
  return errors;
}
