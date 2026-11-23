/**
 * La rue en sécurité (jeu 35) : règles pures, testées (tests/js/games31-43.test.js).
 * Règles françaises, pour des enfants accompagnés d'un adulte. Niveau 1 : le feu des piétons (on attend le
 * bonhomme vert, et on regarde quand même) ; niveau 2 : où traverser ; niveau 3 : parcours piéton, voiture, vélo.
 * Chaque situation a une seule bonne réponse, expliquée.
 */
export const SERIES = 5;

/** Niveau 1 : feu piéton et feu des voitures. Réponses « oui » ou « non ». */
export const LIGHTS = [
  { scene: { walker: 'green' }, answer: 'oui', say: 'Le bonhomme est vert. Peux-tu traverser, en regardant bien des deux côtés ?', why: 'Oui : le bonhomme vert dit que les piétons peuvent traverser. On regarde quand même à gauche et à droite.' },
  { scene: { walker: 'red' }, answer: 'non', say: 'Le bonhomme est rouge. Peux-tu traverser ?', why: 'Non : bonhomme rouge, on attend sur le trottoir, même si aucune voiture ne vient.' },
  { scene: { walker: 'red', car: true }, answer: 'non', say: 'Le bonhomme est rouge et une voiture arrive. Peux-tu traverser ?', why: 'Non : on attend le bonhomme vert, bien en arrière du bord du trottoir.' },
  { scene: { walker: 'green', car: true, carStopped: true }, answer: 'oui', say: 'Le bonhomme est vert et la voiture est arrêtée. Peux-tu traverser ?', why: 'Oui : le bonhomme est vert et la voiture s’est arrêtée. On traverse en marchant, sans courir.' },
  { scene: { walker: 'blink' }, answer: 'non', say: 'Le bonhomme vert clignote, il va bientôt devenir rouge. Commences-tu à traverser ?', why: 'Non : s’il clignote, on ne commence pas à traverser. On attend le prochain bonhomme vert.' },
  { scene: { walker: 'none', ball: true }, answer: 'non', say: 'Ton ballon roule sur la route. Cours-tu le chercher ?', why: 'Non : on ne court jamais sur la route. On demande à un adulte d’aller le chercher.' },
];

/** Niveaux 2 et 3 : trois cartes, la première est la bonne (mélangées ensuite). */
export const CROSS = [
  { id: 'passage', options: ['passage', 'entre-voitures', 'virage'], say: 'Où vaut-il mieux traverser la rue ?', why: 'Sur le passage piéton : les voitures s’attendent à y voir des piétons.' },
  { id: 'regarder', options: ['regarder', 'courir', 'telephone'], say: 'Avant de traverser, que fais-tu ?', why: 'On s’arrête au bord du trottoir et on regarde à gauche, à droite, puis encore à gauche.' },
  { id: 'main', options: ['main', 'devant', 'seul'], say: 'Tu es petit et tu marches en ville avec un adulte. Comment marches-tu ?', why: 'On donne la main à l’adulte, et on marche du côté des maisons.' },
  { id: 'trottoir', options: ['trottoir', 'route', 'bord'], say: 'Où marches-tu dans la rue ?', why: 'Sur le trottoir, loin du bord de la route.' },
  { id: 'voir', options: ['voir', 'cache', 'sombre'], say: 'Le soir, comment les voitures peuvent-elles bien te voir ?', why: 'Avec des vêtements clairs ou une bande qui brille dans la lumière des phares.' },
];
export const RIDE = [
  { id: 'casque', options: ['casque', 'bonnet', 'rien'], say: 'Tu fais du vélo. Que mets-tu sur ta tête ?', why: 'Un casque bien attaché : en France, il est obligatoire à vélo jusqu’à 12 ans.' },
  { id: 'ceinture', options: ['ceinture', 'debout', 'devant-place'], say: 'Tu montes en voiture. Que fais-tu d’abord ?', why: 'On s’assoit dans son siège ou sur son rehausseur, et on attache sa ceinture.' },
  { id: 'cote', options: ['cote', 'route', 'vite'], say: 'La voiture est garée. De quel côté descends-tu ?', why: 'Du côté du trottoir, jamais du côté de la route.' },
  { id: 'freins', options: ['freins', 'musique', 'couleur'], say: 'Avant de partir à vélo, que vérifies-tu ?', why: 'Que les freins marchent bien, et que le vélo a ses lumières.' },
  { id: 'ecouter', options: ['ecouter', 'casque-audio', 'yeux'], say: 'Un camion de pompiers arrive avec sa sirène. Que fais-tu au bord de la route ?', why: 'On reste sur le trottoir, on écoute et on le laisse passer.' },
  ...CROSS.slice(0, 2),
];

export const LABELS = {
  oui: 'Oui', non: 'Non',
  passage: 'Sur le passage piéton', 'entre-voitures': 'Entre deux voitures garées', virage: 'Juste après un virage',
  regarder: 'Je regarde des deux côtés', courir: 'Je cours vite', telephone: 'Je regarde mon téléphone',
  main: 'Je donne la main', devant: 'Je cours devant', seul: 'Je pars tout seul',
  trottoir: 'Sur le trottoir', route: 'Sur la route', bord: 'Tout au bord du trottoir',
  voir: 'Des habits clairs', cache: 'Derrière une voiture', sombre: 'Des habits sombres',
  casque: 'Un casque', bonnet: 'Un bonnet', rien: 'Rien du tout',
  ceinture: 'J’attache ma ceinture', debout: 'Je reste debout', 'devant-place': 'Je m’assois devant',
  cote: 'Côté trottoir', vite: 'Le plus vite possible',
  freins: 'Les freins', musique: 'La musique', couleur: 'La couleur du vélo',
  ecouter: 'Je reste sur le trottoir', 'casque-audio': 'Je mets mon casque audio', yeux: 'Je ferme les yeux',
};

export function makeSeries(difficulty, random) {
  if (difficulty === 0) return random.shuffle(LIGHTS).slice(0, SERIES).map((q) => ({ kind: 'light', ...q, correctId: q.answer, options: ['oui', 'non'] }));
  const pool = difficulty === 1 ? CROSS : RIDE;
  return random.shuffle(pool).slice(0, SERIES).map((q) => ({ kind: 'card', ...q, correctId: q.options[0], options: random.shuffle(q.options) }));
}

/** Consigne lue : la question, puis les choix (pour les enfants qui ne lisent pas encore). */
export function prompt(q) {
  if (q.kind === 'light') return q.say;
  const l = q.options.map((o) => LABELS[o].toLowerCase());
  return `${q.say} ${l[0][0].toUpperCase()}${l[0].slice(1)}, ${l[1]}, ou ${l[2]} ?`;
}
