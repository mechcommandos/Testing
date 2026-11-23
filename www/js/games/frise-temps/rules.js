/**
 * La frise du temps (jeu 43) : règles pures, testées (tests/js/games31-43.test.js).
 * Dates arrondies (« vers », « il y a environ ») ; les années négatives sont avant J.-C. Deux événements comparés
 * sont toujours séparés d'au moins un siècle, pour que la réponse soit nette.
 */
export const EVENTS = [
  { id: 'dinosaures', name: 'Les derniers dinosaures', year: -66000000, when: 'il y a 66 millions d’années' },
  { id: 'humains', name: 'Les premiers humains comme nous', year: -300000, when: 'il y a environ 300 000 ans' },
  { id: 'lascaux', name: 'Les peintures de la grotte de Lascaux', year: -16000, when: 'il y a environ 18 000 ans' },
  { id: 'villages', name: 'Les premiers villages de paysans', year: -8000, when: 'il y a environ 10 000 ans' },
  { id: 'pyramides', name: 'Les pyramides d’Égypte', year: -2500, when: 'vers 2500 avant J.-C.' },
  { id: 'gaule', name: 'Jules César conquiert la Gaule', year: -50, when: 'vers 50 avant J.-C.' },
  { id: 'charlemagne', name: 'Charlemagne devient empereur', year: 800, when: 'en l’an 800' },
  { id: 'chateaux', name: 'Les châteaux forts en pierre', year: 1100, when: 'vers 1100' },
  { id: 'imprimerie', name: 'L’imprimerie de Gutenberg', year: 1450, when: 'vers 1450' },
  { id: 'colomb', name: 'Christophe Colomb arrive en Amérique', year: 1492, when: 'en 1492' },
  { id: 'revolution', name: 'La Révolution française', year: 1789, when: 'en 1789' },
  { id: 'locomotive', name: 'La première locomotive à vapeur', year: 1804, when: 'en 1804' },
  { id: 'avion', name: 'Le premier vol en avion', year: 1903, when: 'en 1903' },
  { id: 'lune', name: 'Les premiers pas sur la Lune', year: 1969, when: 'en 1969' },
  { id: 'web', name: 'L’invention du Web', year: 1989, when: 'en 1989' },
];
export const MIN_GAP = 100;

const byId = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
export const event = (id) => byId[id];

/** Paire d'événements bien séparés dans le temps. */
export function pair(random) {
  for (;;) {
    const [a, b] = random.shuffle(EVENTS).slice(0, 2);
    if (Math.abs(a.year - b.year) >= MIN_GAP) return [a, b];
  }
}

/** Quatre événements, deux à deux séparés d'au moins un siècle. */
export function four(random) {
  for (;;) {
    const list = random.shuffle(EVENTS).slice(0, 4);
    const sorted = [...list].sort((x, y) => x.year - y.year);
    if (sorted.every((e, i) => i === 0 || e.year - sorted[i - 1].year >= MIN_GAP)) return list;
  }
}

export function chronological(list) {
  return [...list].sort((a, b) => a.year - b.year).map((e) => e.id);
}

const DATED = EVENTS.filter((e) => e.year >= 800 && e.id !== 'chateaux'); // une date précise, pas une période
/** Minuscule au début seulement après un article (« les pyramides »), jamais pour un nom propre (« Jules César »). */
const lc = (name) => (/^(Les|La|Le|L’) /.test(name) || name.startsWith('L’') ? name[0].toLowerCase() + name.slice(1) : name);

export function makeSeries(difficulty, random) {
  if (difficulty === 0) {
    return Array.from({ length: 5 }, () => {
      const [a, b] = pair(random);
      const first = a.year < b.year ? a : b;
      return { kind: 'pair', options: [a.id, b.id], correctId: first.id, say: `Qu’est-ce qui s’est passé en premier : ${lc(a.name)}, ou ${lc(b.name)} ?`, why: `${first.name} : ${first.when}. ${(first === a ? b : a).name} : ${(first === a ? b : a).when}.` };
    });
  }
  if (difficulty === 1) {
    return Array.from({ length: 3 }, () => {
      const list = four(random);
      return { kind: 'order', events: list.map((e) => e.id), order: chronological(list), say: 'Range ces événements du plus ancien au plus récent : touche d’abord le plus ancien.' };
    });
  }
  const dates = random.shuffle(DATED).slice(0, 3).map((e) => {
    const others = random.shuffle(DATED.filter((x) => Math.abs(x.year - e.year) >= 40)).slice(0, 2).map((x) => String(x.year));
    return { kind: 'date', options: random.shuffle([String(e.year), ...others]), correctId: String(e.year), say: `En quelle année ? ${e.name}.`, why: `${e.name} : ${e.when}.`, id: e.id };
  });
  const spans = [['avion', 'lune'], ['revolution', 'avion'], ['colomb', 'revolution'], ['locomotive', 'avion'], ['imprimerie', 'colomb'], ['lune', 'web']];
  const durations = random.shuffle(spans).slice(0, 2).map(([x, y]) => {
    const a = event(x);
    const b = event(y);
    const d = b.year - a.year;
    const options = random.shuffle([d, d + 10, d - 10 > 0 ? d - 10 : d + 20].map(String));
    return { kind: 'duration', options, correctId: String(d), say: `${a.name} : ${a.year}. ${b.name} : ${b.year}. Combien d’années les séparent ?`, why: `${b.year} moins ${a.year}, cela fait ${d} ans.` };
  });
  return random.shuffle([...dates, ...durations]);
}
