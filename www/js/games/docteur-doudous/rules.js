/**
 * Le docteur des doudous (jeu 33) : règles pures, testées (tests/js/games31-43.test.js).
 * Niveaux 1 et 2 : on touche une partie du doudou (corps, puis organes des sens). Niveau 3 : on choisit un geste
 * d'hygiène ou de soin parmi trois cartes. Aucun conseil médical : pour un vrai bobo, on le dit à un adulte.
 */
export const SERIES = 5;

export const PARTS = {
  tete: 'la tête', oreilles: 'les oreilles', yeux: 'les yeux', nez: 'le nez', bouche: 'la bouche',
  ventre: 'le ventre', bras: 'les bras', mains: 'les mains', jambes: 'les jambes', pieds: 'les pieds',
};

export const BODY = [
  { part: 'ventre', say: 'Le doudou a mal au ventre. Montre son ventre.' },
  { part: 'tete', say: 'Le doudou a mal à la tête. Montre sa tête.' },
  { part: 'pieds', say: 'Le doudou a marché longtemps : ses pieds sont fatigués. Montre ses pieds.' },
  { part: 'bras', say: 'Le doudou s’est cogné le bras. Montre son bras.' },
  { part: 'mains', say: 'Le doudou a les mains toutes sales. Montre ses mains.' },
  { part: 'jambes', say: 'Le doudou a couru très vite : ses jambes sont fatiguées. Montre ses jambes.' },
  { part: 'oreilles', say: 'Le doudou a froid aux oreilles. Montre ses oreilles.' },
  { part: 'nez', say: 'Le doudou a le nez qui coule. Montre son nez.' },
];

export const SENSES = [
  { part: 'nez', say: 'Avec quoi le doudou sent-il le parfum de la fleur ? Montre-le.', why: 'On sent les odeurs avec le nez : c’est l’odorat.' },
  { part: 'oreilles', say: 'Avec quoi le doudou entend-il la musique ? Montre-le.', why: 'On entend avec les oreilles : c’est l’ouïe.' },
  { part: 'yeux', say: 'Avec quoi le doudou regarde-t-il les étoiles ? Montre-le.', why: 'On voit avec les yeux : c’est la vue.' },
  { part: 'bouche', say: 'Avec quoi le doudou goûte-t-il la fraise ? Montre-le.', why: 'On goûte avec la langue, dans la bouche : c’est le goût.' },
  { part: 'mains', say: 'Avec quoi le doudou sent-il que la couverture est toute douce ? Montre-le.', why: 'On sent le doux et le piquant avec la peau, surtout le bout des doigts : c’est le toucher.' },
];

/** Gestes du quotidien : la bonne carte en premier (mélangées ensuite). */
export const CARE = [
  { id: 'mains', say: 'Avant de manger, que doit faire le doudou ?', options: ['savon', 'ballon', 'bonnet'], why: 'Avant de manger, on se lave les mains avec du savon, pour enlever les microbes.' },
  { id: 'nez', say: 'Le doudou a le nez qui coule. Que fait-il ?', options: ['mouchoir', 'gateau', 'tablette'], why: 'Il se mouche avec un mouchoir, puis il le jette à la poubelle.' },
  { id: 'dents', say: 'Après le repas du soir, que fait le doudou pour avoir de belles dents ?', options: ['brosse-dents', 'gateau', 'ballon'], why: 'Il se brosse les dents, matin et soir.' },
  { id: 'toux', say: 'Le doudou tousse. Où met-il sa bouche ?', options: ['coude', 'mains-ouvertes', 'personne'], why: 'On tousse dans son coude, pour ne pas mettre de microbes sur ses mains.' },
  { id: 'bobo', say: 'Le doudou s’est fait une égratignure en tombant. Que fait-il ?', options: ['adulte', 'tablette', 'bonnet'], why: 'Il le dit à un adulte, qui saura le soigner.' },
  { id: 'soif', say: 'Il fait très chaud et le doudou a joué longtemps. Que fait-il ?', options: ['gourde', 'bonnet', 'gateau'], why: 'Il boit de l’eau : quand il fait chaud, le corps en a besoin.' },
  { id: 'nuit', say: 'Il est tard et le doudou bâille. Que fait-il ?', options: ['lit', 'tablette', 'ballon'], why: 'Il va se coucher : dormir aide le corps à grandir et à se reposer.' },
];

export const CARE_LABELS = {
  savon: 'Se laver les mains', ballon: 'Jouer au ballon', bonnet: 'Mettre un bonnet', mouchoir: 'Se moucher',
  gateau: 'Manger un gâteau', tablette: 'Jouer sur la tablette', 'brosse-dents': 'Se brosser les dents',
  coude: 'Dans son coude', 'mains-ouvertes': 'Dans ses mains', personne: 'Vers un ami',
  adulte: 'Le dire à un adulte', gourde: 'Boire de l’eau', lit: 'Aller se coucher',
};

export function makeSeries(difficulty, random) {
  if (difficulty === 0) return random.shuffle(BODY).slice(0, SERIES).map((q) => ({ kind: 'part', ...q, why: `Oui, ${PARTS[q.part]} !` }));
  if (difficulty === 1) return random.shuffle(SENSES).slice(0, SERIES).map((q) => ({ kind: 'part', ...q }));
  return random.shuffle(CARE).slice(0, SERIES).map((q) => ({ kind: 'care', ...q, correctId: q.options[0], options: random.shuffle(q.options) }));
}

/** Consigne dite à voix haute pour le niveau 3 : la question, puis les trois choix (pour les enfants qui ne lisent pas). */
export function carePrompt(q) {
  const labels = q.options.map((o) => CARE_LABELS[o].toLowerCase());
  labels[0] = labels[0][0].toUpperCase() + labels[0].slice(1);
  return `${q.say} ${labels.slice(0, -1).join(', ')}, ou ${labels.at(-1)} ?`;
}
