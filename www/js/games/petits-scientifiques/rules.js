/**
 * Les petits scientifiques (jeu 8) : règles pures, testées (tests/js/games8-10.test.js).
 * Contenu : content/games/petits-scientifiques.json (simplifications documentées dans le fichier).
 *
 * Chaque expérience : prédire (jamais noté), observer, lire l'explication.
 * - difficulté 0 : flotte ou coule (objets du quotidien) ;
 * - difficulté 1 : circuit électrique (pile, fils, interrupteur, ampoule) ;
 * - difficulté 2 : ce dont une graine a besoin (eau, lumière).
 */
export const EXPERIMENTS_PER_SERIES = 4;
export const SKILLS = [['physics', 'problem-solving'], ['physics', 'problem-solving'], ['living-world', 'problem-solving']];

export const PREDICTIONS = [
  [{ id: 'flotte', picto: 'flotte', text: 'Il flotte' }, { id: 'coule', picto: 'coule', text: 'Il coule' }],
  [{ id: 'oui', picto: 'ampoule', text: 'L’ampoule s’allume' }, { id: 'non', picto: 'ampoule-eteinte', text: 'Elle reste éteinte' }],
  [{ id: 'verte', picto: 'pousse', text: 'Elle pousse, bien verte' }, { id: 'pale', picto: 'pousse-pale', text: 'Elle pousse, mais pâle' }, { id: 'rien', picto: 'graine', text: 'Rien ne pousse' }],
];

// ---------- Circuit ----------

/** Toutes les combinaisons pile / interrupteur / fils. */
export function circuitScenarios() {
  const out = [];
  for (const battery of [true, false]) {
    for (const switchClosed of [true, false]) {
      for (const wired of [true, false]) out.push({ id: `c-${+battery}${+switchClosed}${+wired}`, battery, switchClosed, wired });
    }
  }
  return out;
}

/** L'ampoule s'allume seulement si la boucle est complète et qu'une pile fait circuler le courant. */
export function lampLit({ battery, switchClosed, wired }) {
  return battery && switchClosed && wired;
}

export function circuitText(s) {
  return `Pile : ${s.battery ? 'oui' : 'non'}. Interrupteur : ${s.switchClosed ? 'fermé' : 'ouvert'}. Fils : ${s.wired ? 'tous branchés' : 'un fil débranché'}.`;
}

export function circuitWhy(s) {
  if (lampLit(s)) return 'Le circuit forme une boucle complète, de la pile à l’ampoule et retour : le courant passe, l’ampoule s’allume.';
  const reasons = [];
  if (!s.battery) reasons.push('il n’y a pas de pile pour faire circuler le courant');
  if (!s.switchClosed) reasons.push('l’interrupteur ouvert coupe la boucle');
  if (!s.wired) reasons.push('un fil débranché coupe la boucle');
  return `L’ampoule reste éteinte : ${reasons.join(', et ')}. Le courant ne passe que dans une boucle complète, avec une pile.`;
}

// ---------- Séries ----------

export function makeSeries(difficulty, content, random) {
  const n = EXPERIMENTS_PER_SERIES;
  if (difficulty === 0) {
    // Au moins un objet qui flotte et un qui coule.
    const floats = content.float.filter((o) => o.floats);
    const sinks = content.float.filter((o) => !o.floats);
    const picks = [random.pick(floats), random.pick(sinks)];
    const rest = random.shuffle(content.float.filter((o) => !picks.includes(o))).slice(0, n - 2);
    return random.shuffle([...picks, ...rest]).map((o) => ({
      kind: 'float', id: o.id, object: o, outcome: o.floats ? 'flotte' : 'coule', why: o.why,
      prompt: `On pose ${o.name} dans l’eau. Il flotte ou il coule ?`,
    }));
  }
  if (difficulty === 1) {
    const all = circuitScenarios();
    const lit = all.filter(lampLit);
    const dark = all.filter((s) => !lampLit(s));
    const picks = [lit[0], random.pick(dark)];
    const rest = random.shuffle(dark.filter((s) => !picks.includes(s))).slice(0, n - 2);
    return random.shuffle([...picks, ...rest]).map((s) => ({
      kind: 'circuit', id: s.id, circuit: s, outcome: lampLit(s) ? 'oui' : 'non', why: circuitWhy(s),
      prompt: `${circuitText(s)} L’ampoule va-t-elle s’allumer ?`,
    }));
  }
  return random.shuffle(content.plants).slice(0, n).map((p) => ({
    kind: 'plant', id: p.id, plant: p, outcome: p.result, why: p.why,
    prompt: `${p.text} Au bout de deux semaines, que se passe-t-il ?`,
  }));
}

export function validateContent(content) {
  const errors = [];
  const ids = new Set();
  for (const o of content.float) {
    if (ids.has(o.id)) errors.push(`${o.id} : en double`);
    ids.add(o.id);
    if (typeof o.floats !== 'boolean' || !o.why) errors.push(`${o.id} : incomplet`);
  }
  if (content.float.filter((o) => o.floats).length < 2 || content.float.filter((o) => !o.floats).length < 2) errors.push('flotte ou coule : il faut des deux');
  for (const p of content.plants) {
    // Cohérence avec la règle simplifiée : sans eau rien ne germe ; avec de l'eau, la lumière fait la différence.
    const expected = !p.water ? 'rien' : p.light ? 'verte' : 'pale';
    if (p.result !== expected) errors.push(`${p.id} : résultat incohérent avec la règle`);
    if (!p.why) errors.push(`${p.id} : explication manquante`);
  }
  if (content.plants.length < EXPERIMENTS_PER_SERIES) errors.push('pas assez de scénarios de plantes');
  return errors;
}
