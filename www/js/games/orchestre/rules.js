/**
 * L'orchestre des petits (jeu 11) : règles pures, testées (tests/js/games7-11.test.js).
 * Une séquence s'allume (et se joue, si le son est activé) ; l'enfant la rejoue en touchant les instruments.
 *
 * - difficulté 0 : 2 notes (grave, aiguë), séquences de 2 ;
 * - difficulté 1 : 3 instruments, séquences de 3 ;
 * - difficulté 2 : 4 instruments, séquences de 5.
 * Deux modes, jamais confondus : 'sound' (lumière et son, compétences musique + mémoire) et 'silent'
 * (lumière seule, quand le son est coupé : mémoire seulement). Le mode est fixé pour toute l'activité.
 * Les sons sont synthétisés (core/audio.js, playNote), pas enregistrés.
 */
export const SEQUENCES_PER_ACTIVITY = 3;
export const LENGTHS = [2, 3, 5];
export const SKILLS = { sound: ['music', 'memory'], silent: ['memory'] };

export const PADS = [
  [
    { id: 'grave', label: 'note grave', picto: 'piano', color: '#3e7bfa', instrument: 'piano', frequency: 262 },
    { id: 'aigue', label: 'note aiguë', picto: 'piano-aigu', color: '#e5484d', instrument: 'piano', frequency: 523 },
  ],
  [
    { id: 'piano', label: 'le piano', picto: 'piano', color: '#3e7bfa', instrument: 'piano', frequency: 330 },
    { id: 'trompette', label: 'la trompette', picto: 'trompette', color: '#f5b82e', instrument: 'trompette', frequency: 392 },
    { id: 'tambour', label: 'le tambour', picto: 'tambour', color: '#e5484d', instrument: 'tambour', frequency: 180 },
  ],
  [
    { id: 'piano', label: 'le piano', picto: 'piano', color: '#3e7bfa', instrument: 'piano', frequency: 330 },
    { id: 'trompette', label: 'la trompette', picto: 'trompette', color: '#f5b82e', instrument: 'trompette', frequency: 392 },
    { id: 'cloche', label: 'la cloche', picto: 'cloche', color: '#3aa65b', instrument: 'cloche', frequency: 660 },
    { id: 'tambour', label: 'le tambour', picto: 'tambour', color: '#e5484d', instrument: 'tambour', frequency: 180 },
  ],
];

/** Séquence d'identifiants d'instruments ; jamais plus de deux fois le même à la suite, et pas un seul instrument. */
export function makeSequence(difficulty, random) {
  const ids = PADS[difficulty].map((p) => p.id);
  const length = LENGTHS[difficulty];
  let seq;
  do {
    seq = [];
    while (seq.length < length) {
      const id = random.pick(ids);
      if (seq.length >= 2 && seq.at(-1) === id && seq.at(-2) === id) continue;
      seq.push(id);
    }
  } while (new Set(seq).size === 1);
  return seq;
}

/** 'ok' (bonne note, continuer), 'done' (séquence complète) ou 'wrong'. */
export function checkInput(sequence, inputs) {
  const i = inputs.length - 1;
  if (inputs[i] !== sequence[i]) return 'wrong';
  return inputs.length === sequence.length ? 'done' : 'ok';
}

export function modeFor(soundIsOn) {
  return soundIsOn ? 'sound' : 'silent';
}
