/**
 * L'assiette équilibrée (jeu 53) : règles pures, testées (tests/js/games44-53.test.js).
 * Familles d'aliments simplifiées pour les enfants, sans jugement (« tous les jours » / « de temps en temps »).
 * Niveau 1 : trouver l'aliment d'une famille. Niveau 2 : compléter un repas (légume ou fruit, féculent, et viande,
 * poisson ou œuf). Niveau 3 : tous les jours ou de temps en temps, et le goûter le plus équilibré.
 */
export const SERIES_LENGTH = 6;

export const FAMILIES = {
  'fruits-legumes': { name: 'les fruits et légumes', of: 'des fruits et légumes', one: 'un fruit ou un légume' },
  feculents: { name: 'les féculents', of: 'des féculents', one: 'un féculent, comme le pain, les pâtes ou le riz' },
  laitiers: { name: 'les produits laitiers', of: 'des produits laitiers', one: 'un produit laitier' },
  proteines: { name: 'la viande, le poisson et les œufs', of: 'viande, poisson, œufs', one: 'une viande, un poisson ou un œuf' },
  sucres: { name: 'les produits sucrés', of: 'des produits sucrés', one: 'un produit sucré' },
};

/** Aliments : famille, et « tous les jours » (daily) ou « de temps en temps ». picto : image de la bibliothèque, sinon dessin du jeu. */
export const FOODS = {
  pomme: { name: 'la pomme', family: 'fruits-legumes', daily: true, picto: 'pomme' },
  banane: { name: 'la banane', family: 'fruits-legumes', daily: true, picto: 'banane' },
  fraise: { name: 'la fraise', family: 'fruits-legumes', daily: true, picto: 'fraise' },
  carotte: { name: 'la carotte', family: 'fruits-legumes', daily: true, picto: 'carotte' },
  tomate: { name: 'la tomate', family: 'fruits-legumes', daily: true, picto: 'tomate' },
  brocoli: { name: 'le brocoli', family: 'fruits-legumes', daily: true },
  pain: { name: 'le pain', family: 'feculents', daily: true },
  pates: { name: 'les pâtes', family: 'feculents', daily: true },
  riz: { name: 'le riz', family: 'feculents', daily: true },
  lait: { name: 'le lait', family: 'laitiers', daily: true },
  yaourt: { name: 'le yaourt', family: 'laitiers', daily: true },
  fromage: { name: 'le fromage', family: 'laitiers', daily: true },
  oeuf: { name: 'l’œuf', family: 'proteines', daily: true },
  poisson: { name: 'le poisson', family: 'proteines', daily: true, picto: 'poisson' },
  poulet: { name: 'le poulet', family: 'proteines', daily: true },
  gateau: { name: 'le gâteau', family: 'sucres', daily: false, picto: 'gateau' },
  bonbons: { name: 'les bonbons', family: 'sucres', daily: false },
  soda: { name: 'le soda', family: 'sucres', daily: false },
  eau: { name: 'l’eau', family: null, daily: true },
};

const MEAL = ['fruits-legumes', 'feculents', 'proteines'];
const of = (family) => Object.keys(FOODS).filter((f) => FOODS[f].family === family);

/** Goûters proposés : le premier est le plus équilibré. */
export const SNACKS = [
  [['pomme', 'yaourt'], ['bonbons', 'soda'], ['gateau', 'soda']],
  [['pain', 'fromage'], ['gateau', 'bonbons'], ['soda', 'gateau']],
  [['banane', 'lait'], ['bonbons', 'gateau'], ['soda', 'bonbons']],
];

export function makeSeries(difficulty, random) {
  if (difficulty === 0) {
    const families = random.shuffle(['fruits-legumes', 'feculents', 'laitiers', 'proteines', 'fruits-legumes', 'laitiers']);
    return families.map((family) => {
      const answer = random.pick(of(family));
      const others = random.shuffle(Object.keys(FAMILIES).filter((f) => f !== family)).slice(0, 2).map((f) => random.pick(of(f)));
      return { kind: 'family', family, answer, options: random.shuffle([answer, ...others]) };
    });
  }
  if (difficulty === 1) {
    return Array.from({ length: SERIES_LENGTH }, () => {
      const missing = random.pick(MEAL);
      const plate = MEAL.filter((f) => f !== missing).map((f) => random.pick(of(f)));
      const answer = random.pick(of(missing));
      // Pièges : un aliment d'une famille déjà dans l'assiette, et un produit sucré.
      const sameAgain = random.pick(of(FOODS[plate[0]].family).filter((f) => f !== plate[0]));
      return { kind: 'meal', plate, missing, answer, options: random.shuffle([answer, sameAgain, random.pick(of('sucres'))]) };
    });
  }
  const daily = random.shuffle(['pomme', 'carotte', 'pain', 'eau', 'yaourt', 'brocoli']).slice(0, 2);
  const sometimes = random.shuffle(['gateau', 'bonbons', 'soda']).slice(0, 2);
  const items = random.shuffle([...daily, ...sometimes]).map((food) => ({ kind: 'often', food, answer: FOODS[food].daily ? 'daily' : 'sometimes', options: ['daily', 'sometimes'] }));
  const snacks = random.shuffle(SNACKS).slice(0, 2).map((list) => ({ kind: 'snack', answer: '0', snacks: list, options: random.shuffle(['0', '1', '2']) }));
  return random.shuffle([...items, ...snacks]);
}
