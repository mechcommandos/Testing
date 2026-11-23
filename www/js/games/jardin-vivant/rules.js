/**
 * Le jardin vivant (jeu 23) : simulation pure, testée (tests/js/games22-30.test.js). Les jours passent quand on touche
 * « Jour suivant » : aucune attente réelle.
 *
 * Règles simplifiées (documentées dans docs/jeux.md) :
 * - une plante pousse d'un stade par jour (graine → pousse → plante → adulte) si elle a de l'eau et pas de pucerons ;
 * - chaque jour, elle perd une goutte d'eau (3 au plus) ; sans eau, elle fane et ne pousse plus jusqu'à l'arrosage ;
 * - arroser donne 2 gouttes ; une plante déjà pleine d'eau n'en prend pas plus (« trop d'eau ») ;
 * - à partir de la difficulté 1, des pucerons arrivent au jour 2 sur une plante et l'empêchent de pousser :
 *   les coccinelles les mangent ;
 * - difficulté 2 : un plant de tomates adulte ne donne des tomates que si une fleur est épanouie dans le jardin
 *   (elle attire les abeilles, qui pollinisent).
 */
export const MAX_STAGE = 3;
export const MAX_WATER = 3;

export const GOALS = [
  { plots: 1, seeds: ['fleur'], text: 'Fais fleurir une fleur.', done: (s) => s.plots.some((p) => p.plant === 'fleur' && p.stage === MAX_STAGE && !p.wilted) },
  { plots: 3, seeds: ['fleur'], aphids: true, text: 'Fais grandir 3 fleurs jusqu’au bout.', done: (s) => s.plots.filter((p) => p.plant && p.stage === MAX_STAGE && !p.wilted).length >= 3 },
  { plots: 4, seeds: ['fleur', 'tomate'], aphids: true, bees: true, text: 'Récolte des tomates sur 2 plants. Les abeilles aident les tomates : il leur faut des fleurs.', done: (s) => s.plots.filter((p) => p.plant === 'tomate' && p.fruit).length >= 2 },
];

export function newGarden(difficulty) {
  const goal = GOALS[Math.min(difficulty, 2)];
  return { day: 1, difficulty: Math.min(difficulty, 2), plots: Array.from({ length: goal.plots }, () => ({ plant: null, stage: 0, water: 0, wilted: false, aphids: false, fruit: false })), aphidsArrived: false, bees: false, events: [] };
}

const clone = (s) => ({ ...s, plots: s.plots.map((p) => ({ ...p })), events: [] });

export function plant(state, i, kind) {
  const s = clone(state);
  const p = s.plots[i];
  if (p.plant) { s.events.push('occupied'); return s; }
  Object.assign(p, { plant: kind, stage: 0, water: 1, wilted: false, aphids: false, fruit: false });
  s.events.push('planted');
  return s;
}

export function water(state, i) {
  const s = clone(state);
  const p = s.plots[i];
  if (!p.plant) { s.events.push('nothing'); return s; }
  if (p.water >= MAX_WATER) { s.events.push('too-much'); return s; }
  p.water = Math.min(MAX_WATER, p.water + 2);
  if (p.wilted) { p.wilted = false; s.events.push('revived'); } else s.events.push('watered');
  return s;
}

export function ladybugs(state) {
  const s = clone(state);
  const had = s.plots.some((p) => p.aphids);
  s.plots.forEach((p) => { p.aphids = false; });
  s.events.push(had ? 'aphids-eaten' : 'no-aphids');
  return s;
}

export function nextDay(state) {
  const s = clone(state);
  const goal = GOALS[s.difficulty];
  s.day += 1;
  // Les abeilles viennent s'il y a une fleur épanouie (avant la pousse du jour).
  s.bees = !!goal.bees && s.plots.some((p) => p.plant === 'fleur' && p.stage === MAX_STAGE && !p.wilted);
  for (const p of s.plots) {
    if (!p.plant) continue;
    p.water = Math.max(0, p.water - 1);
    if (p.water === 0) { if (!p.wilted) s.events.push('wilted'); p.wilted = true; continue; }
    if (p.wilted || p.aphids) continue;
    if (p.stage < MAX_STAGE) p.stage += 1;
    else if (p.plant === 'tomate' && s.bees && !p.fruit) { p.fruit = true; s.events.push('fruit'); }
  }
  // Les pucerons arrivent une fois, au jour 2, sur la plante la plus avancée.
  if (goal.aphids && !s.aphidsArrived && s.day >= 2) {
    const target = s.plots.filter((p) => p.plant).sort((a, b) => b.stage - a.stage)[0];
    if (target) { target.aphids = true; s.aphidsArrived = true; s.events.push('aphids'); }
  }
  return s;
}

export function goalReached(state) {
  return GOALS[state.difficulty].done(state);
}

/** Conseil du jardinier : la prochaine action utile. */
export function advice(state) {
  const goal = GOALS[state.difficulty];
  if (state.plots.some((p) => p.aphids)) return { action: 'ladybugs', text: 'Des pucerons mangent une plante : appelle les coccinelles !' };
  const thirsty = state.plots.findIndex((p) => p.plant && (p.wilted || p.water <= 1));
  if (thirsty >= 0) return { action: 'water', plot: thirsty, text: state.plots[thirsty].wilted ? 'Une plante a fané : arrose-la vite.' : 'Une plante a bientôt soif : arrose-la.' };
  const empty = state.plots.findIndex((p) => !p.plant);
  if (goal.bees && !state.plots.some((p) => p.plant === 'fleur')) return { action: 'plant', plot: empty, kind: 'fleur', text: 'Plante une fleur : elle attirera les abeilles pour les tomates.' };
  if (goal.bees && state.plots.filter((p) => p.plant === 'tomate').length < 2 && empty >= 0) return { action: 'plant', plot: empty, kind: 'tomate', text: 'Plante des tomates.' };
  if (empty >= 0 && !goal.bees) return { action: 'plant', plot: empty, kind: goal.seeds[0], text: 'Plante une graine dans la terre vide.' };
  return { action: 'day', text: 'Tout va bien : passe au jour suivant pour voir pousser le jardin.' };
}
