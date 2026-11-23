/**
 * Les ombres mystérieuses (jeu 12) : règles pures, testées (tests/js/games5-12.test.js).
 * Contenu : content/games/ombres.json.
 *
 * - difficulté 0 : 2 objets de familles différentes (très différents) ;
 * - difficulté 1 : 3 objets de familles différentes, ombre retournée ou tournée ;
 * - difficulté 2 : 4 objets de la même famille (proches).
 * Les distracteurs ne sont jamais la bonne réponse : identifiants et images tous distincts dans le contenu.
 */
export const SERIES = 5;
export const CHOICES = [2, 3, 4];
/** Transformations de l'ombre en difficulté 1 (l'objet, lui, reste à l'endroit). */
export const ORIENTATIONS = ['flip', 'tilt-left', 'tilt-right', 'flip-tilt'];

export function allItems(content) {
  return content.groups.flatMap((g) => g.items.map((item) => ({ ...item, group: g.id })));
}

export function makeQuestion(difficulty, content, random, avoid = new Set()) {
  const items = allItems(content);
  const n = CHOICES[difficulty];
  let target;
  let others;
  if (difficulty === 2) {
    const groups = content.groups.filter((g) => g.items.some((i) => !avoid.has(i.id)) && g.items.length >= n);
    const group = random.pick(groups.length ? groups : content.groups);
    const pool = items.filter((i) => i.group === group.id);
    const fresh = pool.filter((i) => !avoid.has(i.id));
    target = random.pick(fresh.length ? fresh : pool);
    others = random.shuffle(pool.filter((i) => i.id !== target.id)).slice(0, n - 1);
  } else {
    const fresh = items.filter((i) => !avoid.has(i.id));
    target = random.pick(fresh.length ? fresh : items);
    // Une famille différente par objet : des silhouettes nettement distinctes.
    const groups = random.shuffle(content.groups.filter((g) => g.id !== target.group)).slice(0, n - 1);
    others = groups.map((g) => random.pick(items.filter((i) => i.group === g.id)));
  }
  return {
    target,
    correctId: target.id,
    orientation: difficulty === 1 ? random.pick(ORIENTATIONS) : null,
    prompt: 'Quel objet fait cette ombre ?',
    choices: random.shuffle([target, ...others]).map((i) => ({ id: i.id, picto: i.picto, aria: i.name })),
  };
}

export function makeSeries(difficulty, content, random) {
  const used = new Set();
  return Array.from({ length: SERIES }, () => {
    const q = makeQuestion(difficulty, content, random, used);
    used.add(q.target.id);
    return q;
  });
}

export function validateContent(content) {
  const errors = [];
  const ids = new Set();
  const pictos = new Set();
  for (const item of allItems(content)) {
    if (ids.has(item.id)) errors.push(`${item.id} : identifiant en double`);
    if (pictos.has(item.picto)) errors.push(`${item.id} : image en double`);
    ids.add(item.id);
    pictos.add(item.picto);
  }
  if (content.groups.length < CHOICES[1]) errors.push('pas assez de familles pour la difficulté 2');
  for (const g of content.groups) if (g.items.length < CHOICES[2]) errors.push(`${g.id} : moins de ${CHOICES[2]} objets`);
  return errors;
}
