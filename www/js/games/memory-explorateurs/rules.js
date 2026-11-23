/**
 * Le memory des explorateurs (jeu 5) : règles pures, testées (tests/js/games5-12.test.js).
 *
 * - difficulté 0 : 6 cartes, 3 paires d'images identiques ;
 * - difficulté 1 : 12 cartes, 6 paires animal ↔ habitat (un animal par habitat : une seule association possible) ;
 * - difficulté 2 : 16 cartes, 8 paires calcul ↔ résultat (résultats tous différents : une seule association possible).
 * Pas de chronomètre. Un retournement sans paire fait partie du jeu : il est compté (« retournements »), pas noté
 * comme une erreur.
 */
export const SIZES = [6, 12, 16];
export const COLUMNS = [3, 4, 4];

export const PICTURES = [
  { picto: 'pomme', label: 'une pomme' }, { picto: 'velo', label: 'un vélo' }, { picto: 'tortue', label: 'une tortue' },
  { picto: 'etoile', label: 'une étoile' }, { picto: 'ballon', label: 'un ballon' }, { picto: 'tournesol', label: 'un tournesol' },
  { picto: 'baleine', label: 'une baleine' }, { picto: 'fraise', label: 'une fraise' }, { picto: 'train', label: 'un train' },
];

export function makeDeck(difficulty, random, { animals } = {}) {
  const cards = [];
  const add = (pair, a, b) => {
    cards.push({ id: `${pair}a`, pair, ...a });
    cards.push({ id: `${pair}b`, pair, ...b });
  };
  if (difficulty === 0) {
    random.shuffle(PICTURES).slice(0, 3).forEach((p, i) => add(i, p, p));
  } else if (difficulty === 1) {
    if (!animals) throw new Error('Contenu des animaux requis');
    random.shuffle(animals.habitats).slice(0, 6).forEach((habitat, i) => {
      const animal = random.pick(animals.animals.filter((a) => a.habitat === habitat.id));
      add(i, { picto: animal.picto, label: animal.name, kind: 'animal' }, { picto: habitat.picto, label: habitat.label, kind: 'habitat' });
    });
  } else {
    operations(random, 8).forEach((op, i) => add(i, { text: op.text, label: op.spoken, kind: 'calcul' }, { text: String(op.result), label: String(op.result), kind: 'résultat' }));
  }
  return random.shuffle(cards);
}

/** Calculs adaptés (additions jusqu'à 10 + 10, soustractions sans nombre négatif), résultats tous différents. */
export function operations(random, count) {
  const ops = [];
  const results = new Set();
  for (let guard = 0; ops.length < count && guard < 1000; guard++) {
    let op;
    if (random() < 0.6) {
      const a = random.int(1, 10);
      const b = random.int(1, 10);
      op = { text: `${a} + ${b}`, spoken: `${a} plus ${b}`, result: a + b };
    } else {
      const a = random.int(3, 15);
      const b = random.int(1, a - 1);
      op = { text: `${a} − ${b}`, spoken: `${a} moins ${b}`, result: a - b };
    }
    if (results.has(op.result)) continue;
    results.add(op.result);
    ops.push(op);
  }
  return ops;
}

export function isMatch(a, b) {
  return !!a && !!b && a.id !== b.id && a.pair === b.pair;
}

/**
 * Carte à montrer brièvement pour l'indice : le partenaire de la carte ouverte s'il a déjà été vu,
 * sinon une carte déjà vue et pas encore trouvée, sinon une carte au hasard.
 */
export function hintCard(cards, { openId = null, seen = new Set(), matched = new Set() }, random) {
  const open = cards.find((c) => c.id === openId);
  const hidden = cards.filter((c) => !matched.has(c.id) && c.id !== openId);
  if (open) {
    const partner = cards.find((c) => c.pair === open.pair && c.id !== open.id);
    if (partner && seen.has(partner.id)) return partner.id;
  }
  const seenHidden = hidden.filter((c) => seen.has(c.id));
  return (seenHidden.length ? random.pick(seenHidden) : random.pick(hidden))?.id ?? null;
}

/** Un plateau sauvegardé est-il réutilisable pour cette difficulté ? */
export function isValidSave(save, difficulty) {
  if (!save || save.difficulty !== difficulty || !Array.isArray(save.cards) || save.cards.length !== SIZES[difficulty]) return false;
  const ids = new Set(save.cards.map((c) => c.id));
  return ids.size === save.cards.length && (save.matched ?? []).every((id) => ids.has(id)) && (save.matched ?? []).length < save.cards.length;
}
