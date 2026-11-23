/**
 * L'atelier des puzzles et des suites (jeu 7) : règles pures, testées (tests/js/games7-11.test.js).
 * Les activités alternent : un puzzle, puis une série de 3 suites, puis un puzzle…
 *
 * Puzzles : 4, 9 ou 16 pièces (2×2, 3×3, 4×4) d'une image dessinée dans le code (scenes.js).
 * Suites :
 * - difficulté 0 : motif AB (deux éléments qui alternent) ;
 * - difficulté 1 : motif ABC ;
 * - difficulté 2 : deux règles à la fois — la forme alterne sur 2, la couleur tourne sur 3.
 * On montre au moins un cycle complet, puis on demande l'élément suivant. Une seule réponse est valable.
 */
export const GRID = [2, 3, 4];
export const SUITES_PER_ACTIVITY = 3;
export const SHAPES = ['rond', 'carre', 'triangle', 'fleur'];
export const COLORS = { rouge: '#e5484d', bleu: '#3e7bfa', jaune: '#f5b82e', vert: '#3aa65b' };
export const SKILLS = { puzzle: ['spatial', 'visual-discrimination'], suite: ['sequencing', 'visual-discrimination'] };

// ---------- Puzzles ----------

/** Pièces mélangées ; une pièce porte l'index de sa case (0 = en haut à gauche). Jamais déjà en ordre. */
export function makePuzzle(difficulty, random, sceneIds) {
  const n = GRID[difficulty];
  const ids = Array.from({ length: n * n }, (_, i) => i);
  let order;
  do { order = random.shuffle(ids); } while (order.every((v, i) => v === i));
  return { n, scene: random.pick(sceneIds), pieces: order.map((slot) => ({ id: slot, x: slot % n, y: Math.floor(slot / n) })) };
}

export function fitsSlot(piece, slotIndex) {
  return piece.id === slotIndex;
}

// ---------- Suites ----------

const sameToken = (a, b) => a.shape === b.shape && a.color === b.color;
const tokenId = (t) => `${t.shape}-${t.color}`;

/** Éléments distincts deux à deux, par la forme et par la couleur (repérables même sans voir les couleurs). */
function distinctTokens(random, count) {
  const shapes = random.shuffle(SHAPES).slice(0, count);
  const colors = random.shuffle(Object.keys(COLORS)).slice(0, count);
  return shapes.map((shape, i) => ({ shape, color: colors[i] }));
}

export function makeSuite(difficulty, random) {
  let items;
  let expected;
  let distractors;
  if (difficulty < 2) {
    const period = difficulty === 0 ? 2 : 3;
    const tokens = distinctTokens(random, period);
    const shown = difficulty === 0 ? 5 : 6;
    items = Array.from({ length: shown }, (_, i) => tokens[i % period]);
    expected = tokens[shown % period];
    // Distracteurs : les autres éléments du motif, plus un élément étranger si besoin d'un troisième choix.
    const others = tokens.filter((t) => !sameToken(t, expected));
    const usedShapes = new Set(tokens.map((t) => t.shape));
    const usedColors = new Set(tokens.map((t) => t.color));
    const stranger = { shape: SHAPES.find((s) => !usedShapes.has(s)), color: Object.keys(COLORS).find((c) => !usedColors.has(c)) };
    distractors = [...others, stranger].slice(0, 2);
  } else {
    const shapes = random.shuffle(SHAPES).slice(0, 2);
    const colors = random.shuffle(Object.keys(COLORS)).slice(0, 3);
    const at = (i) => ({ shape: shapes[i % 2], color: colors[i % 3] });
    items = Array.from({ length: 6 }, (_, i) => at(i)); // un cycle complet (2 × 3)
    expected = at(6);
    // Bonne forme mais mauvaise couleur, bonne couleur mais mauvaise forme, puis tout faux.
    const wrongColor = colors.find((c) => c !== expected.color);
    const wrongShape = shapes.find((s) => s !== expected.shape);
    distractors = [{ shape: expected.shape, color: wrongColor }, { shape: wrongShape, color: expected.color }, { shape: wrongShape, color: colors.find((c) => c !== expected.color && c !== wrongColor) }];
  }
  const choices = random.shuffle([expected, ...distractors]).map((t) => ({ ...t, id: tokenId(t) }));
  return { items, expected: { ...expected, id: tokenId(expected) }, choices, period: difficulty === 0 ? 2 : difficulty === 1 ? 3 : 6 };
}

/** Une suite affichée prolonge-t-elle bien sa propre règle ? (utilisé par les tests) */
export function followsRule(suite) {
  const all = [...suite.items, suite.expected];
  return all.every((t, i) => i < suite.period || sameToken(t, all[i - suite.period]));
}
