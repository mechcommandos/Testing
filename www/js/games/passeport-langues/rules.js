/**
 * Le passeport des langues (jeu 26) : règles pures, testées (tests/js/games22-30.test.js).
 * Vocabulaire anglais : associer le mot (entendu, et écrit) à son image. Pas de micro : l'enfant écoute et touche.
 * Les mots sont dits par la voix anglaise de l'appareil ; sans voix anglaise, le mot est écrit (lecture).
 *
 * - difficulté 0 : couleurs et animaux ;
 * - difficulté 1 : objets du quotidien ;
 * - difficulté 2 : petites phrases.
 */
export const QUESTIONS_PER_SERIES = 6;
export const CHOICES = 3;

export const COLORS = [
  { en: 'red', fr: 'rouge', color: '#e5484d' }, { en: 'blue', fr: 'bleu', color: '#3b82f6' }, { en: 'yellow', fr: 'jaune', color: '#f5c518' },
  { en: 'green', fr: 'vert', color: '#3aa65b' }, { en: 'orange', fr: 'orange', color: '#f08a3c' }, { en: 'pink', fr: 'rose', color: '#ef5f95' },
  { en: 'purple', fr: 'violet', color: '#8b6fe8' }, { en: 'black', fr: 'noir', color: '#23324d' }, { en: 'white', fr: 'blanc', color: '#ffffff' },
];
export const ANIMALS = [
  { en: 'cat', fr: 'le chat', picto: 'chat' }, { en: 'dog', fr: 'le chien', picto: 'chien' }, { en: 'cow', fr: 'la vache', picto: 'vache' },
  { en: 'pig', fr: 'le cochon', picto: 'cochon' }, { en: 'duck', fr: 'le canard', picto: 'canard' }, { en: 'horse', fr: 'le cheval', picto: 'cheval' },
  { en: 'lion', fr: 'le lion', picto: 'lion' }, { en: 'fish', fr: 'le poisson', picto: 'poisson' }, { en: 'rabbit', fr: 'le lapin', picto: 'lapin' },
  { en: 'sheep', fr: 'le mouton', picto: 'mouton' }, { en: 'owl', fr: 'le hibou', picto: 'hibou' }, { en: 'elephant', fr: 'l’éléphant', picto: 'elephant' },
];
export const OBJECTS = [
  { en: 'apple', fr: 'la pomme', picto: 'pomme' }, { en: 'banana', fr: 'la banane', picto: 'banane' }, { en: 'umbrella', fr: 'le parapluie', picto: 'parapluie' },
  { en: 'ball', fr: 'le ballon', picto: 'ballon' }, { en: 'car', fr: 'la voiture', picto: 'voiture' }, { en: 'train', fr: 'le train', picto: 'train' },
  { en: 'boat', fr: 'le bateau', picto: 'bateau' }, { en: 'bike', fr: 'le vélo', picto: 'velo' }, { en: 'key', fr: 'la clé', picto: 'cle' },
  { en: 'cake', fr: 'le gâteau', picto: 'gateau' }, { en: 'present', fr: 'le cadeau', picto: 'cadeau' }, { en: 'hat', fr: 'le bonnet', picto: 'bonnet' },
];
export const PHRASES = [
  { en: 'I like apples.', fr: 'J’aime les pommes.', picto: 'pomme' }, { en: 'It is raining.', fr: 'Il pleut.', picto: 'pluie' },
  { en: 'The sun is hot.', fr: 'Le soleil est chaud.', picto: 'soleil' }, { en: 'The cat is sleeping.', fr: 'Le chat dort.', picto: 'chat' },
  { en: 'I have a red ball.', fr: 'J’ai un ballon rouge.', picto: 'ballon' }, { en: 'It is snowing.', fr: 'Il neige.', picto: 'neige' },
  { en: 'Happy birthday!', fr: 'Joyeux anniversaire !', picto: 'gateau' }, { en: 'Look at the boat.', fr: 'Regarde le bateau.', picto: 'bateau' },
];

function pool(difficulty) {
  if (difficulty === 0) return [...COLORS.map((c) => ({ ...c, kind: 'color' })), ...ANIMALS.map((a) => ({ ...a, kind: 'picto' }))];
  if (difficulty === 1) return OBJECTS.map((o) => ({ ...o, kind: 'picto' }));
  return PHRASES.map((p) => ({ ...p, kind: 'picto' }));
}

/** Série : 6 questions, chacune avec 3 images distinctes du même genre (couleurs entre elles, images entre elles). */
export function makeSeries(difficulty, random) {
  const all = pool(Math.min(difficulty, 2));
  return random.shuffle(all).slice(0, QUESTIONS_PER_SERIES).map((target) => {
    const same = all.filter((x) => x.kind === target.kind && x.en !== target.en && (x.picto ?? x.color) !== (target.picto ?? target.color));
    const choices = random.shuffle([target, ...random.shuffle(same).slice(0, CHOICES - 1)]);
    return { target, choices, correctId: target.en };
  });
}
