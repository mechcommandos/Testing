/**
 * La chasse aux rimes (jeu 46) : règles pures, testées (tests/js/games44-53.test.js).
 * Conscience phonologique, à l'oral : chaque mot est dit à voix haute et illustré.
 * Niveau 1 : quel mot rime avec… (même son à la fin). Niveau 2 : quel mot commence par le même son.
 * Niveau 3 : combien de syllabes (mots choisis sans « e » muet final, pour qu'il n'y ait qu'un seul découpage oral).
 */
export const SERIES_LENGTH = 6;

/** Mots illustrés : id de l'image → mot écrit. */
export const WORDS = {
  bateau: 'bateau', gateau: 'gâteau', velo: 'vélo', moto: 'moto', piano: 'piano',
  lion: 'lion', melon: 'melon', ballon: 'ballon', cochon: 'cochon', mouton: 'mouton', poisson: 'poisson', herisson: 'hérisson',
  chat: 'chat', panda: 'panda', lama: 'lama',
  lapin: 'lapin', sapin: 'sapin', raisin: 'raisin', train: 'train',
  bebe: 'bébé', cle: 'clé', loup: 'loup', hibou: 'hibou', soleil: 'soleil', reveil: 'réveil',
  cheval: 'cheval', chien: 'chien', poire: 'poire', pomme: 'pomme', banane: 'banane', baleine: 'baleine',
  vache: 'vache', voiture: 'voiture', montagne: 'montagne', tortue: 'tortue', tomate: 'tomate', tambour: 'tambour',
  robot: 'robot', renard: 'renard', elephant: 'éléphant', ananas: 'ananas', parapluie: 'parapluie', tournesol: 'tournesol',
};

/** Familles de rimes (le son de la fin). */
export const RHYMES = {
  o: ['bateau', 'gateau', 'velo', 'moto', 'piano'],
  on: ['lion', 'melon', 'ballon', 'cochon', 'mouton', 'poisson', 'herisson'],
  a: ['chat', 'panda', 'lama'],
  in: ['lapin', 'sapin', 'raisin', 'train'],
  e: ['bebe', 'cle'],
  ou: ['loup', 'hibou'],
  eil: ['soleil', 'reveil'],
};

/** Familles du premier son. */
export const ONSETS = {
  ch: ['chat', 'cheval', 'chien'],
  l: ['lapin', 'lion', 'loup', 'lama'],
  p: ['poire', 'pomme', 'panda', 'piano', 'poisson'],
  b: ['bateau', 'ballon', 'banane', 'baleine', 'bebe'],
  v: ['vache', 'velo', 'voiture'],
  m: ['mouton', 'melon', 'moto', 'montagne'],
  t: ['tortue', 'tomate', 'train', 'tambour'],
  r: ['renard', 'raisin', 'robot', 'reveil'],
};

/** Syllabes orales (découpage affiché après la réponse). */
export const SYLLABLES = {
  chat: ['chat'], loup: ['loup'], train: ['train'], cle: ['clé'],
  lapin: ['la', 'pin'], bateau: ['ba', 'teau'], melon: ['me', 'lon'], velo: ['vé', 'lo'], robot: ['ro', 'bot'],
  ballon: ['bal', 'lon'], panda: ['pan', 'da'], sapin: ['sa', 'pin'], cochon: ['co', 'chon'], mouton: ['mou', 'ton'],
  elephant: ['é', 'lé', 'phant'], ananas: ['a', 'na', 'nas'], parapluie: ['pa', 'ra', 'pluie'], tournesol: ['tour', 'ne', 'sol'], herisson: ['hé', 'ris', 'son'],
};

export const familyOf = (families, id) => Object.keys(families).find((k) => families[k].includes(id));

/** Une question « même son » : la cible, un mot de sa famille, deux mots de deux autres familles. */
function sameSound(families, random, prefer = []) {
  const keys = Object.keys(families);
  const wanted = prefer.filter((k) => keys.includes(k));
  // Sons étudiés en classe (révisions choisies par le parent) : une question sur deux en moyenne.
  const fam = wanted.length && random() < 0.6 ? random.pick(wanted) : random.pick(keys);
  const [target, answer] = random.shuffle(families[fam]);
  const others = random.shuffle(keys.filter((k) => k !== fam)).slice(0, 2).map((k) => random.pick(families[k]));
  return { target, answer, options: random.shuffle([answer, ...others]) };
}

export function makeSeries(difficulty, random, { sounds = [] } = {}) {
  const out = [];
  const used = new Set();
  for (let k = 0; out.length < SERIES_LENGTH && k < 300; k++) {
    let q;
    if (difficulty === 2) {
      const ids = Object.keys(SYLLABLES);
      // Autant de mots à 1, 2 et 3 syllabes, en gros.
      const want = (out.length % 3) + 1;
      const word = random.pick(ids.filter((id) => SYLLABLES[id].length === want));
      q = { kind: 'syllables', target: word, answer: String(want), options: ['1', '2', '3'] };
    } else {
      q = { kind: difficulty === 0 ? 'rhyme' : 'onset', ...sameSound(difficulty === 0 ? RHYMES : ONSETS, random, difficulty === 0 ? sounds : []) };
    }
    if (used.has(q.target)) continue;
    used.add(q.target);
    out.push(q);
  }
  return out;
}

