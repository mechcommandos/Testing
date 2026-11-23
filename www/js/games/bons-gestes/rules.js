/**
 * La planète des bons gestes (jeu 9) : règles pures, testées (tests/js/games8-10.test.js).
 * Contenu : content/games/bons-gestes.json — le référentiel de tri affiché à l'écran est celui qui sert à corriger.
 *
 * - difficulté 0 : trier 6 objets entre 2 bacs (bac jaune, verre) ;
 * - difficulté 1 : trier 6 objets entre 4 bacs (bac jaune, verre, compost, poubelle) ;
 * - difficulté 2 : 4 situations du quotidien, choisir le geste utile.
 */
export const ITEMS_PER_SERIES = 6;
export const SITUATIONS_PER_SERIES = 4;

export function binsFor(difficulty, content) {
  const ids = content.referential.binsByDifficulty[Math.min(difficulty, 1)];
  return ids.map((id) => content.referential.bins.find((b) => b.id === id));
}

export function makeSeries(difficulty, content, random) {
  if (difficulty === 2) {
    return random.shuffle(content.situations).slice(0, SITUATIONS_PER_SERIES).map((s) => ({
      kind: 'situation', situation: s, correctId: s.options.find((o) => o.best).id,
      prompt: `${s.text} Que fais-tu ?`,
      choices: random.shuffle(s.options).map((o) => ({ id: o.id, text: o.text, aria: o.text, className: 'long' })),
    }));
  }
  const bins = binsFor(difficulty, content);
  const allowed = new Set(bins.map((b) => b.id));
  const pool = content.items.filter((i) => allowed.has(i.bin));
  // Au moins un objet par bac, puis le reste au hasard, sans répétition.
  const picks = bins.map((b) => random.pick(pool.filter((i) => i.bin === b.id)));
  const rest = random.shuffle(pool.filter((i) => !picks.includes(i))).slice(0, ITEMS_PER_SERIES - picks.length);
  return random.shuffle([...picks, ...rest]).map((item) => ({
    kind: 'item', item, correctId: item.bin,
    prompt: `Où va ${item.name} ?`,
    choices: bins.map((b) => ({ id: b.id, picto: b.picto, text: b.label, aria: `${b.label} : ${b.detail}`, className: `bin bin-${b.id}` })),
  }));
}

export function validateContent(content) {
  const errors = [];
  const bins = new Set(content.referential.bins.map((b) => b.id));
  for (const level of content.referential.binsByDifficulty) for (const id of level) if (!bins.has(id)) errors.push(`bac inconnu : ${id}`);
  const ids = new Set();
  for (const i of content.items) {
    if (!bins.has(i.bin)) errors.push(`${i.id} : bac ${i.bin} absent du référentiel`);
    if (ids.has(i.id)) errors.push(`${i.id} : en double`);
    ids.add(i.id);
    if (!i.why) errors.push(`${i.id} : explication manquante`);
  }
  for (const b of content.referential.bins) if (!content.items.some((i) => i.bin === b.id)) errors.push(`bac ${b.id} sans objet`);
  for (const s of content.situations) {
    if (s.options.filter((o) => o.best).length !== 1) errors.push(`${s.id} : il faut exactement un geste utile`);
    if (s.options.some((o) => !o.why)) errors.push(`${s.id} : explication manquante`);
  }
  if (content.situations.length < SITUATIONS_PER_SERIES) errors.push('pas assez de situations');
  return errors;
}
