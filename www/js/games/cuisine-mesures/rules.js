/**
 * La cuisine des mesures (jeu 17) : règles pures, testées (tests/js/games13-21.test.js).
 * Une série = une recette de crêpes en 4 étapes. Masses (g, kg) et contenances (mL, L) ne sont jamais mélangées :
 * on pèse la farine, le sucre et le beurre ; on verse le lait et l'eau.
 *
 * - difficulté 0 : comparer (plus long, plus lourd sur la balance, contient le plus) ;
 * - difficulté 1 : mesurer avec des unités simples (verser dans un verre doseur gradué, peser avec des poids, choisir l'unité) ;
 * - difficulté 2 : conversions g ↔ kg et mL ↔ L, puis mesurer une quantité donnée dans l'autre unité.
 */
export const TASKS_PER_SERIES = 4;
export const JUG_MAX = 1000; // mL
export const POUR_STEPS = [50, 100];
export const WEIGHTS = [50, 100, 200, 500]; // g

export const SOLIDS = [
  { id: 'farine', name: 'la farine', of: 'de farine' },
  { id: 'sucre', name: 'le sucre', of: 'de sucre' },
  { id: 'beurre', name: 'le beurre', of: 'de beurre' },
];
export const LIQUIDS = [
  { id: 'lait', name: 'le lait', of: 'de lait' },
  { id: 'eau', name: 'l’eau', of: 'd’eau' },
];
// Comparaisons de masse : la balance penche du côté le plus lourd (vrai pour ces objets de cuisine).
const MASS_PAIRS = [['melon', 'fraise'], ['ananas', 'citron'], ['melon', 'pomme'], ['ananas', 'raisin']];
const NAMES = { melon: 'le melon', fraise: 'la fraise', ananas: 'l’ananas', citron: 'le citron', pomme: 'la pomme', raisin: 'le raisin' };

/** Format français d'un nombre (virgule décimale) : 1.5 → « 1,5 ». */
export function fr(n) {
  return String(n).replace('.', ',');
}

export function formatMass(g) {
  return g >= 1000 && g % 1000 === 0 ? `${g / 1000} kg` : `${g} g`;
}

export function formatVolume(ml) {
  return ml >= 1000 && ml % 1000 === 0 ? `${ml / 1000} L` : `${ml} mL`;
}

function compareTask(kind, random) {
  if (kind === 'length') {
    const [a, b] = random.shuffle([random.int(5, 9), random.int(11, 16)]);
    return { kind: 'compare-length', a, b, prompt: 'Quel ruban est le plus long ?', choices: [{ id: 'a', text: 'Le ruban bleu' }, { id: 'b', text: 'Le ruban rouge' }], correctId: a > b ? 'a' : 'b' };
  }
  if (kind === 'mass') {
    const [heavy, light] = random.pick(MASS_PAIRS);
    const heavyLeft = random() < 0.5;
    const left = heavyLeft ? heavy : light;
    const right = heavyLeft ? light : heavy;
    // Les choix sont dans le même ordre que les plateaux (gauche, droite).
    return { kind: 'compare-mass', left, right, prompt: 'Regarde la balance. Lequel est le plus lourd ?', choices: [left, right].map((id) => ({ id, text: NAMES[id], picto: id })), correctId: heavy };
  }
  const [a, b] = random.shuffle([random.int(2, 4) * 100, random.int(6, 9) * 100]);
  return { kind: 'compare-volume', a, b, prompt: 'Les deux verres sont pareils. Lequel contient le plus de lait ?', choices: [{ id: 'a', text: 'Le verre de gauche' }, { id: 'b', text: 'Le verre de droite' }], correctId: a > b ? 'a' : 'b' };
}

function pourTask(random, inLitres = false) {
  const liquid = random.pick(LIQUIDS);
  const target = inLitres ? random.pick([250, 500, 750]) : random.int(2, 8) * 50;
  const label = inLitres ? `${fr(target / 1000)} L` : `${target} mL`;
  return { kind: 'pour', liquid, target, label, prompt: `Verse ${label} ${liquid.of} dans le verre doseur.`, step: inLitres ? 250 : 50 };
}

function weighTask(random, inKilos = false) {
  const solid = random.pick(SOLIDS);
  const target = inKilos ? random.pick([500, 1000, 1500]) : random.pick([150, 250, 300, 350, 400, 450, 600, 750]);
  const label = inKilos ? `${fr(target / 1000)} kg` : `${target} g`;
  return { kind: 'weigh', solid, target, label, prompt: `Pèse ${label} ${solid.of} : pose des poids sur la balance.` };
}

function unitTask(random) {
  const masse = random() < 0.5;
  const item = masse ? random.pick(SOLIDS) : random.pick(LIQUIDS);
  const correctId = masse ? 'g' : 'mL';
  const choices = random.shuffle([{ id: 'g', text: 'des grammes (g)' }, { id: 'mL', text: 'des millilitres (mL)' }, { id: 'cm', text: 'des centimètres (cm)' }]);
  return { kind: 'unit', item, masse, prompt: masse ? `Pour peser ${item.name}, on compte en…` : `Pour mesurer ${item.name}, on compte en…`, choices, correctId };
}

/** Conversions : une seule bonne réponse, des distracteurs plausibles (erreur d'un facteur 10, unité inversée). */
const CONVERSIONS = [
  { q: '1 kg, c’est combien de grammes ?', a: '1000 g', wrong: ['100 g', '10 g'] },
  { q: '2 kg, c’est combien de grammes ?', a: '2000 g', wrong: ['200 g', '20 g'] },
  { q: '500 g, c’est combien de kilogrammes ?', a: '0,5 kg', wrong: ['5 kg', '50 kg'] },
  { q: '1500 g, c’est combien de kilogrammes ?', a: '1,5 kg', wrong: ['15 kg', '150 kg'] },
  { q: '1 L, c’est combien de millilitres ?', a: '1000 mL', wrong: ['100 mL', '10 mL'] },
  { q: '250 mL, c’est combien de litres ?', a: '0,25 L', wrong: ['2,5 L', '25 L'] },
  { q: '750 mL + 250 mL, ça fait…', a: '1 L', wrong: ['1 kg', '10 L'] },
  { q: '3 L, c’est combien de millilitres ?', a: '3000 mL', wrong: ['300 mL', '30 mL'] },
];

function convertTask(c, random) {
  return { kind: 'convert', prompt: c.q, choices: random.shuffle([c.a, ...c.wrong]).map((t) => ({ id: t, text: t })), correctId: c.a };
}

export function makeSeries(difficulty, random) {
  if (difficulty === 0) return random.shuffle(['length', 'mass', 'volume', random.pick(['length', 'mass', 'volume'])]).map((k) => compareTask(k, random));
  if (difficulty === 1) return random.shuffle([pourTask(random), weighTask(random), unitTask(random), random() < 0.5 ? pourTask(random) : weighTask(random)]);
  const conv = random.shuffle(CONVERSIONS).slice(0, 2).map((c) => convertTask(c, random));
  return [conv[0], weighTask(random, true), conv[1], pourTask(random, true)];
}

/**
 * Inclinaison du fléau de la balance, en degrés (sens horaire, repère SVG où y descend) :
 * positive si le plateau de gauche est le plus lourd (il descend), négative sinon.
 */
export function tiltFor(task) {
  return task.correctId === task.left ? 12 : -12;
}

/** Poids à poser pour atteindre une masse (gourmand, pour l'indice) ; null si impossible. */
export function weightsFor(target) {
  const out = [];
  let rest = target;
  for (const w of [...WEIGHTS].sort((a, b) => b - a)) while (rest >= w) { out.push(w); rest -= w; }
  return rest === 0 ? out : null;
}

export const CONVERSION_LIST = CONVERSIONS;
