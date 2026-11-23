/**
 * L'astronaute du système solaire (jeu 39) : règles pures, testées (tests/js/games31-43.test.js).
 * Contenus simplifiés et exacts. Les tailles et les distances ne sont pas respectées sur les dessins (dit dans le jeu).
 * Niveau 1 : Soleil, Terre, Lune ; niveau 2 : ranger les planètes, puis trois questions ; niveau 3 : jour et nuit,
 * année, saisons, phases de la Lune.
 */
export const SERIES = 5;
export const PLANETS = ['mercure', 'venus', 'terre', 'mars', 'jupiter', 'saturne', 'uranus', 'neptune'];
export const NAMES = {
  soleil: 'Le Soleil', lune: 'La Lune', terre: 'La Terre', etoile: 'Les étoiles', mercure: 'Mercure', venus: 'Vénus',
  mars: 'Mars', jupiter: 'Jupiter', saturne: 'Saturne', uranus: 'Uranus', neptune: 'Neptune',
};

/** Questions à cartes dessinées (astres). La première option est la bonne. */
export const BASICS = [
  { say: 'Qu’est-ce qui nous éclaire et nous chauffe pendant la journée ?', options: ['soleil', 'lune', 'terre'], why: 'Le Soleil : c’est une étoile, une énorme boule de gaz très chaude.' },
  { say: 'Sur quelle planète habitons-nous ?', options: ['terre', 'lune', 'mars'], why: 'Sur la Terre, la planète bleue, couverte d’océans.' },
  { say: 'Qui tourne autour de la Terre ?', options: ['lune', 'soleil', 'jupiter'], why: 'La Lune tourne autour de la Terre : elle en fait le tour en un mois environ.' },
  { say: 'Autour de quoi la Terre tourne-t-elle ?', options: ['soleil', 'lune', 'etoile'], why: 'La Terre tourne autour du Soleil : un tour complet dure un an.' },
  { say: 'Sur quel astre des astronautes ont-ils déjà marché ?', options: ['lune', 'soleil', 'jupiter'], why: 'Sur la Lune, pour la première fois en 1969.' },
  { say: 'La nuit, qu’est-ce qui brille tout petit, très loin dans le ciel ?', options: ['etoile', 'soleil', 'terre'], why: 'Les étoiles : ce sont des soleils, mais tellement loin qu’on les voit comme des petits points.' },
];
export const PLANET_FACTS = [
  { say: 'Quelle est la plus grande planète ?', options: ['jupiter', 'terre', 'mars'], why: 'Jupiter, une géante faite surtout de gaz : plus de mille Terres tiendraient dedans.' },
  { say: 'Quelle planète a de grands anneaux brillants ?', options: ['saturne', 'mars', 'venus'], why: 'Saturne : ses anneaux sont faits de glace et de cailloux.' },
  { say: 'Quelle planète appelle-t-on la planète rouge ?', options: ['mars', 'neptune', 'venus'], why: 'Mars : son sol est couvert de poussière rouge.' },
  { say: 'Quelle planète est la plus proche du Soleil ?', options: ['mercure', 'terre', 'neptune'], why: 'Mercure, la plus petite planète, toute proche du Soleil.' },
  { say: 'Quelle planète est la plus loin du Soleil ?', options: ['neptune', 'mars', 'venus'], why: 'Neptune, une planète bleue et glacée, la huitième.' },
];
/** Niveau 3 : cartes de texte. La première option est la bonne. */
export const SKY = [
  { say: 'Pourquoi fait-il nuit ?', options: ['La Terre tourne sur elle-même', 'Le Soleil s’éteint le soir', 'La Lune cache le Soleil'], why: 'La Terre tourne sur elle-même : notre côté passe dans l’ombre, loin du Soleil. C’est la nuit chez nous et le jour de l’autre côté.' },
  { say: 'Combien de temps la Terre met-elle pour faire un tour sur elle-même ?', options: ['Un jour, 24 heures', 'Une semaine', 'Un an'], why: 'Un jour : 24 heures, avec le jour et la nuit.' },
  { say: 'Combien de temps la Terre met-elle pour faire le tour du Soleil ?', options: ['Un an', 'Un jour', 'Un mois'], why: 'Un an : environ 365 jours.' },
  { say: 'La Lune brille-t-elle toute seule ?', options: ['Non, elle renvoie la lumière du Soleil', 'Oui, comme une lampe', 'Oui, grâce aux étoiles'], why: 'Non : la Lune est éclairée par le Soleil, comme un miroir.' },
  { say: 'Pourquoi y a-t-il des saisons ?', options: ['La Terre est penchée', 'La Terre s’éloigne du Soleil en hiver', 'Le Soleil s’éteint un peu'], why: 'La Terre est penchée : selon le moment de l’année, notre côté reçoit les rayons du Soleil plus droit (été) ou plus de biais (hiver).' },
  { say: 'Quand on voit la Lune toute ronde et éclairée, comment l’appelle-t-on ?', options: ['La pleine lune', 'La nouvelle lune', 'Le croissant'], why: 'La pleine lune. À la nouvelle lune, au contraire, on ne la voit presque pas.' },
  { say: 'De quel côté le Soleil se lève-t-il ?', options: ['À l’est', 'À l’ouest', 'Au nord'], why: 'À l’est, à peu près. Il se couche à l’ouest.' },
];

const pick = (q, random) => ({ ...q, correctId: q.options[0], options: random.shuffle(q.options) });

export function makeSeries(difficulty, random) {
  if (difficulty === 0) return random.shuffle(BASICS).slice(0, SERIES).map((q) => ({ kind: 'astre', ...pick(q, random) }));
  if (difficulty === 1) {
    return [
      { kind: 'order', planets: PLANETS.slice(0, 4), say: 'Range les quatre planètes les plus proches du Soleil : touche d’abord la plus proche, puis la suivante.' },
      { kind: 'order', planets: PLANETS.slice(4), say: 'Range maintenant les quatre géantes, de la plus proche à la plus lointaine du Soleil.' },
      ...random.shuffle(PLANET_FACTS).slice(0, 3).map((q) => ({ kind: 'astre', ...pick(q, random) })),
    ];
  }
  return random.shuffle(SKY).slice(0, SERIES).map((q) => ({ kind: 'text', ...pick(q, random) }));
}
