/**
 * Les détectives des catégories (jeu 15) : règles pures, testées (tests/js/games13-21.test.js).
 * Contenu : content/games/detectives-categories.json — règles (boîtes) et propriétés de chaque image.
 * Une image n'entre dans une règle que si sa propriété y est renseignée : les cas ambigus sont exclus du contenu.
 *
 * - difficulté 0 : 1 règle, 2 boîtes ;
 * - difficulté 1 : 1 règle, 3 boîtes ;
 * - difficulté 2 : l'enfant choisit entre deux règles ; les deux classements sont justes.
 */
export const ITEMS_PER_SERIES = 6;

/** Boîtes d'une règle, éventuellement restreintes à une liste d'identifiants. */
export function boxesFor(content, ruleId, only = null) {
  const boxes = content.rules[ruleId].boxes;
  return only ? boxes.filter((b) => only.includes(b.id)) : boxes;
}

/** Tirage de `n` images valables pour toutes les règles données, avec au moins une image par boîte de chaque règle. */
export function pickItems(content, rules, random, n = ITEMS_PER_SERIES) {
  const pool = content.items.filter((i) => rules.every(({ rule, boxes }) => boxes.some((b) => b.id === i[rule])));
  for (let attempt = 0; attempt < 200; attempt++) {
    const picks = random.shuffle(pool).slice(0, Math.min(n, pool.length));
    if (rules.every(({ rule, boxes }) => boxes.every((b) => picks.some((i) => i[rule] === b.id)))) return picks;
  }
  throw new Error(`Pas assez d'images pour ${rules.map((r) => r.rule).join(' + ')}`);
}

/** Une série : la règle (ou les deux règles au choix en difficulté 2) et les images à ranger. */
export function makeSeries(difficulty, content, random) {
  const level = content.levels[String(Math.min(difficulty, 2))];
  if (difficulty >= 2) {
    const [a, b] = random.pick(level);
    const rules = [a, b].map((rule) => ({ rule, boxes: boxesFor(content, rule) }));
    return { choice: rules, items: pickItems(content, rules, random) };
  }
  const [rule, only] = random.pick(level);
  const rules = [{ rule, boxes: boxesFor(content, rule, only) }];
  return { choice: null, rule: rules[0], items: pickItems(content, rules, random) };
}

/** Questions d'une série une fois la règle connue (choisie par l'enfant en difficulté 2). */
export function questions(content, rule, items) {
  return items.map((item) => ({
    item, correctId: item[rule.rule],
    prompt: `Où ranges-tu ${item.name} ?`,
    choices: rule.boxes.map((b) => ({ id: b.id, picto: b.picto, text: b.label, aria: b.label, className: 'box' })),
  }));
}

export function validateContent(content) {
  const errors = [];
  const ids = new Set();
  for (const i of content.items) {
    if (ids.has(i.id)) errors.push(`${i.id} : en double`);
    ids.add(i.id);
    for (const [ruleId, rule] of Object.entries(content.rules)) {
      if (i[ruleId] !== undefined && !rule.boxes.some((b) => b.id === i[ruleId])) errors.push(`${i.id} : ${ruleId} = ${i[ruleId]} n'est pas une boîte`);
    }
  }
  for (const [d, entries] of Object.entries(content.levels)) {
    for (const entry of entries) {
      const rules = d === '2' ? entry : [entry[0]];
      for (const r of rules) if (!content.rules[r]) errors.push(`niveau ${d} : règle ${r} inconnue`);
      if (d !== '2' && entry[1]) for (const b of entry[1]) if (!content.rules[entry[0]]?.boxes.some((x) => x.id === b)) errors.push(`niveau ${d} : boîte ${b} inconnue`);
    }
  }
  return errors;
}
