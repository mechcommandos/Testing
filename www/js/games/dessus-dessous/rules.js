/**
 * Dessus, dessous, à gauche (jeu 32) : règles pures, testées (tests/js/games31-43.test.js).
 * Scène de 300 × 220. Chaque niveau a un décor et des emplacements (zones à toucher) ; une consigne vise une seule zone.
 * Gauche et droite sont celles de l'enfant qui regarde l'écran.
 */
export const SERIES = 5;
export const OBJECTS = [
  { id: 'ballon', name: 'le ballon' }, { id: 'chat', name: 'le chat' }, { id: 'peluche', name: 'la peluche' },
  { id: 'pomme', name: 'la pomme' }, { id: 'reveil', name: 'le réveil' }, { id: 'lapin', name: 'le lapin' },
  { id: 'chien', name: 'le chien' }, { id: 'cadeau', name: 'le cadeau' },
];

/**
 * Zones : rectangle à toucher (x, y, w, h) et place de l'objet (ox, oy, taille ; behind = dessiné derrière le décor).
 * asked = zones qui peuvent être demandées (les autres servent de leurres).
 */
export const LEVELS = [
  {
    scene: 'table',
    zones: [
      { id: 'sur', words: 'sur la table', rect: [88, 30, 124, 74], obj: [124, 50, 52] },
      { id: 'sous', words: 'sous la table', rect: [96, 118, 108, 74], obj: [126, 134, 48] },
      { id: 'cote', words: 'à côté de la table', rect: [222, 110, 72, 90], obj: [232, 140, 50] },
    ],
    asked: ['sur', 'sous'],
  },
  {
    scene: 'boite',
    zones: [
      { id: 'dans', words: 'dans la boîte', rect: [96, 84, 108, 34], obj: [126, 70, 48, 'inside'] },
      { id: 'devant', words: 'devant la boîte', rect: [92, 160, 116, 58], obj: [124, 150, 52] },
      { id: 'derriere', words: 'derrière la boîte', rect: [100, 6, 100, 60], obj: [128, 26, 46, 'behind'] },
    ],
    asked: ['dans', 'devant', 'derriere'],
  },
  {
    scene: 'deux',
    zones: [
      { id: 'gauche', words: 'à gauche de la boîte', rect: [4, 100, 56, 100], obj: [8, 130, 48] },
      { id: 'entre', words: 'entre la boîte et le panier', rect: [134, 100, 58, 100], obj: [138, 130, 48] },
      { id: 'droite', words: 'à droite du panier', rect: [252, 100, 46, 100], obj: [250, 130, 46] },
    ],
    asked: ['gauche', 'entre', 'droite'],
  },
];

export function zoneById(difficulty, id) {
  return LEVELS[difficulty].zones.find((z) => z.id === id);
}

export function makeSeries(difficulty, random) {
  const level = LEVELS[Math.min(difficulty, 2)];
  const objects = random.shuffle(OBJECTS);
  // Chaque position demandée au moins une fois, puis au hasard ; jamais deux fois la même d'affilée.
  const targets = random.shuffle(level.asked);
  while (targets.length < SERIES) {
    const next = random.pick(level.asked.filter((a) => a !== targets.at(-1)));
    targets.push(next);
  }
  return targets.map((target, i) => {
    const object = objects[i % objects.length];
    const zone = level.zones.find((z) => z.id === target);
    const side = target === 'gauche' ? ' Ta gauche, c’est le côté de ta main gauche.' : target === 'droite' ? ' Ta droite, c’est le côté de ta main droite.' : '';
    return { object, target, prompt: `Mets ${object.name} ${zone.words}.${side}` };
  });
}
