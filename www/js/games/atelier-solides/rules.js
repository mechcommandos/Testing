/**
 * L'atelier des solides (jeu 49) : règles pures, testées (tests/js/games44-53.test.js).
 * Niveau 1 : reconnaître un solide par son nom. Niveau 2 : à quel solide ressemble un objet de tous les jours.
 * Niveau 3 : propriétés (faces, sommets, rouler ou non) ; une seule bonne réponse parmi les cartes.
 */
export const SERIES_LENGTH = 6;

export const SOLIDS = {
  cube: { name: 'le cube', faces: 6, vertices: 8, rolls: false },
  pave: { name: 'le pavé', faces: 6, vertices: 8, rolls: false },
  boule: { name: 'la boule', faces: 0, vertices: 0, rolls: true },
  cylindre: { name: 'le cylindre', faces: 2, vertices: 0, rolls: true },
  cone: { name: 'le cône', faces: 1, vertices: 1, rolls: true },
  pyramide: { name: 'la pyramide', faces: 5, vertices: 5, rolls: false },
};

export const OBJECTS = {
  de: { name: 'le dé', solid: 'cube' },
  boite: { name: 'la boîte à chaussures', solid: 'pave' },
  orange: { name: 'l’orange', solid: 'boule' },
  canette: { name: 'la canette', solid: 'cylindre' },
  cornet: { name: 'le cornet de glace', solid: 'cone' },
  tente: { name: 'la tente', solid: 'pyramide' },
  brique: { name: 'la brique de lait', solid: 'pave' },
  bille: { name: 'la bille', solid: 'boule' },
  bougie: { name: 'la bougie', solid: 'cylindre' },
  chapeau: { name: 'le chapeau pointu de fête', solid: 'cone' },
};

/** Questions de propriétés : answer, et les cartes proposées (une seule convient). */
export const PROPERTIES = [
  { say: 'Quel solide a 6 faces carrées, toutes pareilles ?', answer: 'cube', options: ['cube', 'pave', 'pyramide'], why: 'Le cube a 6 faces carrées, toutes de la même taille. Le pavé a des faces rectangles.' },
  { say: 'Quel solide peut rouler dans tous les sens ?', answer: 'boule', options: ['boule', 'cylindre', 'cube'], why: 'La boule n’a ni face plate ni coin : elle roule dans tous les sens. Le cylindre roule seulement tout droit.' },
  { say: 'Quel solide a deux faces plates en forme de disque, et peut rouler ?', answer: 'cylindre', options: ['cylindre', 'cone', 'boule'], why: 'Le cylindre a un disque en haut et un disque en bas, et il roule sur le côté.' },
  { say: 'Quel solide a une pointe et une seule face plate, un disque ?', answer: 'cone', options: ['cone', 'pyramide', 'cylindre'], why: 'Le cône a un disque à la base et une pointe en haut.' },
  { say: 'Quel solide a une base carrée et 4 faces en triangle ?', answer: 'pyramide', options: ['pyramide', 'cone', 'cube'], why: 'La pyramide a une base carrée et 4 triangles qui se rejoignent en haut.' },
  { say: 'Quel solide ressemble à une boîte à chaussures, plus longue que large ?', answer: 'pave', options: ['pave', 'cube', 'cylindre'], why: 'Le pavé a 6 faces rectangles : il est plus long que large, comme une boîte à chaussures.' },
  { say: 'Lequel de ces solides ne peut pas rouler ?', answer: 'cube', options: ['cube', 'boule', 'cylindre'], why: 'Le cube n’a que des faces plates et des coins : il glisse, mais il ne roule pas.' },
  { say: 'Lequel de ces solides ne peut pas rouler ?', answer: 'pyramide', options: ['pyramide', 'boule', 'cone'], why: 'La pyramide n’a que des faces plates : elle ne roule pas.' },
  { say: 'Combien de faces a un cube ?', answer: '6', options: ['4', '6', '8'], why: 'Un cube a 6 faces : dessus, dessous, devant, derrière, gauche et droite.' },
  { say: 'Combien de sommets, c’est-à-dire de coins, a un cube ?', answer: '8', options: ['6', '8', '12'], why: 'Un cube a 8 sommets : 4 en haut et 4 en bas.' },
  { say: 'Combien de faces a une pyramide à base carrée ?', answer: '5', options: ['4', '5', '6'], why: 'La base carrée, plus 4 triangles : 5 faces.' },
];

export function makeSeries(difficulty, random) {
  const ids = Object.keys(SOLIDS);
  if (difficulty === 0) {
    return random.shuffle(ids).slice(0, SERIES_LENGTH).map((answer) => ({
      kind: 'name', answer, options: random.shuffle([answer, ...random.shuffle(ids.filter((s) => s !== answer)).slice(0, 2)]),
    }));
  }
  if (difficulty === 1) {
    // Six objets de six solides différents.
    const bySolid = random.shuffle(ids).map((s) => random.pick(Object.keys(OBJECTS).filter((o) => OBJECTS[o].solid === s)));
    return bySolid.slice(0, SERIES_LENGTH).map((object) => {
      const answer = OBJECTS[object].solid;
      return { kind: 'object', object, answer, options: random.shuffle([answer, ...random.shuffle(ids.filter((s) => s !== answer)).slice(0, 2)]) };
    });
  }
  return random.shuffle(PROPERTIES).slice(0, SERIES_LENGTH).map((p) => ({ kind: 'property', ...p, options: random.shuffle(p.options) }));
}
