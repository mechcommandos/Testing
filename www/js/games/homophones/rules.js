/**
 * Le tri des homophones (jeu 47) : règles pures, testées (tests/js/games44-53.test.js).
 * Compléter une phrase avec le bon mot parmi deux qui se prononcent pareil, avec l'astuce de remplacement de l'école
 * (« a » → « avait », « est » → « était »…). Niveau 1 : a / à. Niveau 2 : et / est, son / sont.
 * Niveau 3 : on / ont, ou / où, puis un mélange de tous.
 */
export const SERIES_LENGTH = 6;

export const PAIRS = {
  'a-à': { words: ['a', 'à'], rule: 'On écrit « a » quand on peut le remplacer par « avait ». Sinon, on écrit « à ».' },
  'et-est': { words: ['et', 'est'], rule: 'On écrit « est » quand on peut le remplacer par « était ». On écrit « et » quand on peut dire « et puis ».' },
  'son-sont': { words: ['son', 'sont'], rule: 'On écrit « sont » quand on peut le remplacer par « étaient ». On écrit « son » quand on peut dire « mon ».' },
  'on-ont': { words: ['on', 'ont'], rule: 'On écrit « ont » quand on peut le remplacer par « avaient ». On écrit « on » quand on peut dire « il ».' },
  'ou-où': { words: ['ou', 'où'], rule: 'On écrit « où » pour parler d’un lieu (à quel endroit ?). On écrit « ou » quand on peut dire « ou bien ».' },
};

/** Phrases : le trou est « ___ », answer est le mot attendu (en minuscules). */
export const SENTENCES = {
  'a-à': [
    ['Léo ___ un vélo rouge.', 'a'], ['Nous allons ___ la piscine.', 'à'], ['Ma sœur ___ perdu son bonnet.', 'a'],
    ['Il pense ___ son chat.', 'à'], ['Le bébé ___ faim.', 'a'], ['On mange ___ midi.', 'à'], ['Inès ___ trois crayons.', 'a'],
    ['C’est une glace ___ la fraise.', 'à'], ['Papa ___ lavé la voiture.', 'a'], ['Je vais ___ l’école en bus.', 'à'],
  ],
  'et-est': [
    ['Le ciel ___ bleu.', 'est'], ['J’aime les pommes ___ les poires.', 'et'], ['Mon chien ___ très gentil.', 'est'],
    ['Tom ___ Lina jouent au ballon.', 'et'], ['La soupe ___ chaude.', 'est'], ['Il pleut ___ il fait froid.', 'et'],
    ['Elle ___ dans le jardin.', 'est'], ['Un chat ___ un lapin dorment.', 'et'],
  ],
  'son-sont': [
    ['Les fleurs ___ jolies.', 'sont'], ['Lucas range ___ cartable.', 'son'], ['Mes amis ___ arrivés.', 'sont'],
    ['Elle cherche ___ doudou.', 'son'], ['Les oiseaux ___ sur le toit.', 'sont'], ['Il prend ___ goûter.', 'son'],
  ],
  'on-ont': [
    ['Les enfants ___ gagné.', 'ont'], ['___ va au parc ?', 'on'], ['Mes cousins ___ un chien.', 'ont'],
    ['Ce soir, ___ regarde un film.', 'on'], ['Elles ___ fini leurs devoirs.', 'ont'], ['Quand il pleut, ___ prend un parapluie.', 'on'],
  ],
  'ou-où': [
    ['Tu veux du lait ___ du jus ?', 'ou'], ['___ est mon livre ?', 'où'], ['La maison ___ j’habite est bleue.', 'où'],
    ['Rouge ___ vert : choisis une couleur.', 'ou'], ['Je ne sais pas ___ il est.', 'où'], ['On joue dehors ___ dedans ?', 'ou'],
  ],
};

const LEVELS = [['a-à'], ['et-est', 'son-sont'], ['on-ont', 'ou-où', 'mix']];

/** Le mot tel qu'il s'écrit dans la phrase (majuscule en début de phrase). */
export function written(sentence, word) {
  return sentence.startsWith('___') ? word[0].toUpperCase() + word.slice(1) : word;
}

export function fill(sentence, word) {
  return sentence.replace('___', written(sentence, word));
}

export function makeSeries(difficulty, random) {
  const groups = LEVELS[difficulty];
  const perGroup = Math.ceil(SERIES_LENGTH / groups.length);
  const out = [];
  for (const g of groups) {
    const pool = g === 'mix'
      ? random.shuffle(Object.keys(SENTENCES)).flatMap((p) => SENTENCES[p].map(([s, a]) => ({ pair: p, s, a })))
      : SENTENCES[g].map(([s, a]) => ({ pair: g, s, a }));
    const picked = random.shuffle(pool).filter((x) => !out.some((o) => o.sentence === x.s)).slice(0, perGroup);
    for (const x of picked) out.push({ pair: x.pair, sentence: x.s, answer: x.a, options: random.shuffle(PAIRS[x.pair].words) });
  }
  return random.shuffle(out).slice(0, SERIES_LENGTH);
}
