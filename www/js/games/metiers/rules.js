/**
 * À chacun son métier (jeu 34) : règles pures, testées (tests/js/games31-43.test.js).
 * Métiers au féminin et au masculin, en alternance. Niveau 1 : l'outil ; niveau 2 : le lieu de travail ;
 * niveau 3 : une devinette « qui suis-je ? ». Chaque outil et chaque lieu n'appartient qu'à un métier.
 */
export const SERIES = 5;

export const JOBS = {
  coiffeuse: { name: 'la coiffeuse', look: { hat: 'long', shirt: '#ef5f95' }, tool: 'ciseaux', riddle: 'Je coupe et je coiffe les cheveux.' },
  facteur: { name: 'le facteur', look: { hat: 'cap', hatColor: '#1a56b8', shirt: '#f5b82e' }, tool: 'enveloppe', riddle: 'J’apporte les lettres et les colis dans les boîtes aux lettres.' },
  jardiniere: { name: 'la jardinière', look: { hat: 'straw', shirt: '#3aa65b' }, tool: 'arrosoir', riddle: 'Je plante des fleurs et je m’occupe des parcs.' },
  patissier: { name: 'le pâtissier', look: { hat: 'toque', shirt: '#ffffff' }, tool: 'gateau', riddle: 'Je prépare des gâteaux et des tartes.' },
  menuisiere: { name: 'la menuisière', look: { hat: 'helmet', hatColor: '#f5b82e', shirt: '#e07a3f' }, tool: 'marteau', riddle: 'Je fabrique des meubles en bois.' },
  dentiste: { name: 'le dentiste', look: { hat: 'short', shirt: '#9fd3f5', cross: true }, tool: 'brosse-dents', riddle: 'Je soigne les dents et j’apprends à bien les brosser.' },
  pilote: { name: 'la pilote', look: { hat: 'cap', hatColor: '#23324d', shirt: '#23324d' }, tool: 'helicoptere', place: 'nuage', riddle: 'Je conduis un hélicoptère ou un avion, haut dans le ciel.' },
  marin: { name: 'le marin', look: { hat: 'sailor', shirt: '#ffffff', stripes: true }, tool: 'ancre', place: 'mer', riddle: 'Je navigue sur la mer avec mon bateau.' },
  fermiere: { name: 'la fermière', look: { hat: 'straw', shirt: '#c4473a' }, tool: 'vache', place: 'ferme', riddle: 'Je m’occupe des vaches et des poules, et je cultive les champs.' },
  conducteur: { name: 'le conducteur de train', look: { hat: 'cap', hatColor: '#c4473a', shirt: '#5b6b85' }, tool: 'train', riddle: 'Je conduis un train de gare en gare.' },
  veterinaire: { name: 'la vétérinaire', look: { hat: 'long', shirt: '#3aa65b', cross: true }, riddle: 'Je soigne les animaux malades.' },
  forestiere: { name: 'la garde forestière', look: { hat: 'ranger', shirt: '#6b8f3a' }, place: 'foret', riddle: 'Je protège les arbres et les animaux de la forêt.' },
  guide: { name: 'le guide de montagne', look: { hat: 'beanie', hatColor: '#e5484d', shirt: '#1a56b8' }, place: 'montagne', riddle: 'J’accompagne les randonneurs jusqu’aux sommets.' },
  polaire: { name: 'la chercheuse polaire', look: { hat: 'beanie', hatColor: '#1fb3c6', shirt: '#e5484d' }, place: 'banquise', riddle: 'J’étudie la glace et les manchots, là où il fait très froid.' },
  safari: { name: 'le guide de safari', look: { hat: 'ranger', shirt: '#c9a24d' }, place: 'savane', riddle: 'Je montre les lions et les girafes aux visiteurs.' },
  pompier: { name: 'le pompier', look: { hat: 'helmet', hatColor: '#e5484d', shirt: '#23324d' }, riddle: 'J’éteins les incendies et je porte secours aux blessés.' },
  boulangere: { name: 'la boulangère', look: { hat: 'toque', shirt: '#f5e3c2' }, riddle: 'Je prépare le pain très tôt le matin.' },
  professeur: { name: 'le professeur des écoles', look: { hat: 'short', shirt: '#8b6fe8' }, riddle: 'J’apprends à lire, à écrire et à compter aux enfants.' },
};

export const TOOL_NAMES = {
  ciseaux: 'les ciseaux', enveloppe: 'l’enveloppe', arrosoir: 'l’arrosoir', gateau: 'le gâteau', marteau: 'le marteau',
  'brosse-dents': 'la brosse à dents', helicoptere: 'l’hélicoptère', ancre: 'l’ancre', vache: 'la vache', train: 'le train',
};
export const PLACE_NAMES = {
  nuage: 'le ciel', mer: 'la mer', ferme: 'la ferme', foret: 'la forêt', montagne: 'la montagne', banquise: 'la banquise', savane: 'la savane',
};

export const PLACE_WHERE = {
  nuage: 'dans le ciel', mer: 'sur la mer', ferme: 'à la ferme', foret: 'dans la forêt', montagne: 'en montagne', banquise: 'sur la banquise', savane: 'dans la savane',
};

const cap = (s) => s[0].toUpperCase() + s.slice(1);
const she = (job) => (JOBS[job].name.startsWith('la ') ? 'elle' : 'il');
const listSay = (names) => `${names.slice(0, -1).join(', ')} ou ${names.at(-1)} ?`;

export function makeSeries(difficulty, random) {
  const ids = Object.keys(JOBS);
  if (difficulty === 0) {
    const pool = random.shuffle(ids.filter((j) => JOBS[j].tool)).slice(0, SERIES);
    return pool.map((job) => {
      const others = random.shuffle(ids.filter((j) => j !== job && JOBS[j].tool)).slice(0, 2).map((j) => JOBS[j].tool);
      const options = random.shuffle([JOBS[job].tool, ...others]);
      return { kind: 'tool', job, correctId: JOBS[job].tool, options,
        prompt: `Voici ${JOBS[job].name}. De quoi a-t-${she(job)} besoin ? ${cap(listSay(options.map((o) => TOOL_NAMES[o])))}`,
        why: `Oui ! ${cap(JOBS[job].name)} a besoin de ${TOOL_NAMES[JOBS[job].tool]}.`.replace('de les ', 'des ').replace('de le ', 'du ') };
    });
  }
  if (difficulty === 1) {
    const pool = random.shuffle(ids.filter((j) => JOBS[j].place)).slice(0, SERIES);
    return pool.map((job) => {
      const others = random.shuffle(ids.filter((j) => j !== job && JOBS[j].place)).slice(0, 2).map((j) => JOBS[j].place);
      const options = random.shuffle([JOBS[job].place, ...others]);
      return { kind: 'place', job, correctId: JOBS[job].place, options,
        prompt: `Où travaille ${JOBS[job].name} ? ${cap(listSay(options.map((o) => PLACE_NAMES[o])))}`,
        why: `Oui ! ${cap(JOBS[job].name)} travaille ${PLACE_WHERE[JOBS[job].place]}.` };
    });
  }
  const pool = random.shuffle(ids).slice(0, SERIES);
  return pool.map((job) => {
    const options = random.shuffle([job, ...random.shuffle(ids.filter((j) => j !== job)).slice(0, 2)]);
    return { kind: 'riddle', job, correctId: job, options,
      prompt: `${JOBS[job].riddle} Qui suis-je ? ${cap(listSay(options.map((o) => JOBS[o].name)))}`,
      why: `Oui, c’est ${JOBS[job].name} !` };
  });
}
