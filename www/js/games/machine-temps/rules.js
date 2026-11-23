/**
 * La machine à remonter le temps (jeu 48) : règles pures, testées (tests/js/games44-53.test.js).
 * Niveau 1 : la phrase parle-t-elle d'hier, de maintenant ou de demain ? (le verbe seul le dit).
 * Niveau 2 : choisir le verbe qui va avec le mot de temps (hier, aujourd'hui, demain…).
 * Niveau 3 : choisir le verbe juste quand il faut aussi accorder avec le sujet (nous, les enfants…).
 */
export const SERIES_LENGTH = 6;

export const TIMES = {
  passe: { label: 'Hier', sub: 'le passé' },
  present: { label: 'Maintenant', sub: 'le présent' },
  futur: { label: 'Demain', sub: 'le futur' },
};

export const WHEN = [
  ['Je suis allé au parc.', 'passe'], ['Nous avons mangé une glace.', 'passe'], ['Lina a lu un livre.', 'passe'],
  ['Il a neigé toute la nuit.', 'passe'], ['Les oiseaux ont chanté.', 'passe'],
  ['Je mange une pomme.', 'present'], ['Tom joue au ballon.', 'present'], ['Il pleut.', 'present'],
  ['Nous dessinons un bateau.', 'present'], ['Le chat dort sur le canapé.', 'present'],
  ['Je partirai en vacances.', 'futur'], ['Nous irons à la piscine.', 'futur'], ['Lina fera un gâteau.', 'futur'],
  ['Il neigera sur la montagne.', 'futur'], ['Les enfants joueront dehors.', 'futur'],
];

/** Niveau 2 : la même action aux trois temps (sujet compris, pour les élisions : j'irai). */
export const VERBS = [
  { end: 'au parc.', forms: { passe: 'je suis allé', present: 'je vais', futur: 'j’irai' } },
  { end: 'un gâteau.', forms: { passe: 'nous avons fait', present: 'nous faisons', futur: 'nous ferons' } },
  { end: 'aux cartes.', forms: { passe: 'tu as joué', present: 'tu joues', futur: 'tu joueras' } },
  { end: 'une soupe.', forms: { passe: 'Léo a mangé', present: 'Léo mange', futur: 'Léo mangera' } },
  { end: 'une chanson.', forms: { passe: 'les filles ont chanté', present: 'les filles chantent', futur: 'les filles chanteront' } },
  { end: 'le puzzle.', forms: { passe: 'vous avez fini', present: 'vous finissez', futur: 'vous finirez' } },
  { end: 'la mer.', forms: { passe: 'nous avons vu', present: 'nous voyons', futur: 'nous verrons' } },
];

export const MARKERS = {
  passe: ['Hier', 'La semaine dernière', 'Hier soir'],
  present: ['Aujourd’hui', 'En ce moment', 'Maintenant'],
  futur: ['Demain', 'L’année prochaine', 'Bientôt'],
};

/** Niveau 3 : temps et accord ; answer est la bonne forme, wrong les deux pièges. */
export const AGREE = [
  ['Demain, nous ___ la mer.', 'verrons', ['verront', 'avons vu']],
  ['Hier, les enfants ___ au foot.', 'ont joué', ['a joué', 'joueront']],
  ['L’été prochain, tu ___ à la montagne.', 'iras', ['ira', 'es allé']],
  ['Hier soir, Lina ___ un film.', 'a regardé', ['ont regardé', 'regardera']],
  ['Demain, vous ___ vos devoirs.', 'finirez', ['finiront', 'avez fini']],
  ['En ce moment, les chats ___.', 'dorment', ['dort', 'dormiront']],
  ['La semaine dernière, nous ___ un château.', 'avons visité', ['ont visité', 'visiterons']],
  ['Bientôt, j’___ huit ans.', 'aurai', ['aura', 'ai eu']],
  ['Aujourd’hui, Tom et Léa ___ des crêpes.', 'font', ['fait', 'feront']],
  ['Plus tard, elles ___ astronautes.', 'seront', ['sera', 'ont été']],
];


export function makeSeries(difficulty, random) {
  if (difficulty === 0) {
    // Deux phrases de chaque temps, mélangées.
    const by = (t) => random.shuffle(WHEN.filter((w) => w[1] === t)).slice(0, 2);
    return random.shuffle([...by('passe'), ...by('present'), ...by('futur')])
      .map(([sentence, answer]) => ({ kind: 'when', sentence, answer, options: ['passe', 'present', 'futur'] }));
  }
  if (difficulty === 1) {
    const times = random.shuffle(['passe', 'present', 'futur', 'passe', 'present', 'futur']);
    return random.shuffle(VERBS).slice(0, SERIES_LENGTH).map((v, i) => {
      const t = times[i];
      const marker = random.pick(MARKERS[t]);
      return { kind: 'form', time: t, marker, sentence: `${marker}, ___ ${v.end}`, answer: v.forms[t], options: random.shuffle(Object.values(v.forms)) };
    });
  }
  return random.shuffle(AGREE).slice(0, SERIES_LENGTH)
    .map(([sentence, answer, wrong]) => ({ kind: 'agree', sentence, answer, options: random.shuffle([answer, ...wrong]) }));
}

/** La phrase complétée (le sujet du niveau 2 prend une majuscule s'il ouvre la phrase). */
export function fill(q, form = q.answer) {
  return q.sentence.replace('___', form).replace(/^./, (c) => c.toUpperCase());
}

