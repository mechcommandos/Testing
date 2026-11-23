/**
 * L'horloge des aventures (jeu 19) : règles pures, testées (tests/js/games13-21.test.js).
 * Une heure est un nombre de minutes depuis minuit (0 à 1439). Les heures s'écrivent « 15 h 30 » et les durées
 * « 1 h 30 min » : jamais la même écriture, pour ne pas confondre heure et durée.
 *
 * - difficulté 0 : heures pleines (régler l'horloge, lire l'horloge) ;
 * - difficulté 1 : demi-heures et quarts d'heure ;
 * - difficulté 2 : durées (combien de temps entre deux heures, à quelle heure ça finit).
 */
export const TASKS_PER_SERIES = 4;

export function formatTime(minutes) {
  const m = ((minutes % 1440) + 1440) % 1440;
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return mm ? `${hh} h ${String(mm).padStart(2, '0')}` : `${hh} h`;
}

export function formatDuration(minutes) {
  const hh = Math.floor(minutes / 60);
  const mm = minutes % 60;
  if (!hh) return `${mm} min`;
  return mm ? `${hh} h ${mm} min` : `${hh} h`;
}

/** Affichage numérique (cadran 24 h) : « 07:30 ». */
export function digital(minutes) {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Angles des aiguilles en degrés (0 = midi, sens horaire). L'aiguille des heures avance avec les minutes. */
export function handAngles(minutes) {
  const m = ((minutes % 720) + 720) % 720;
  return { hour: (m / 720) * 360, minute: ((m % 60) / 60) * 360 };
}

/** Sur une horloge à aiguilles, 3 h et 15 h se voient pareil : on compare modulo 12 heures. */
export function sameClockFace(a, b) {
  return ((a - b) % 720 + 720) % 720 === 0;
}

const MOMENTS = [
  { at: 7 * 60, text: 'Le réveil sonne', picto: 'reveil' },
  { at: 8 * 60, text: 'L’école commence', picto: 'sac-a-dos' },
  { at: 12 * 60, text: 'C’est l’heure du déjeuner', picto: 'pomme' },
  { at: 16 * 60, text: 'C’est l’heure du goûter', picto: 'gateau' },
  { at: 20 * 60, text: 'C’est l’heure de se coucher', picto: 'peluche' },
];

function timeFor(difficulty, random) {
  const hour = random.int(1, 12);
  if (difficulty === 0) return hour * 60;
  return hour * 60 + random.pick([0, 15, 30, 45]);
}

/** Heure d'horloge entre 1 h et 12 h 59 (en minutes) : jamais « 0 h 15 ». */
export function clockTime(minutes) {
  return ((minutes - 60) % 720 + 720) % 720 + 60;
}

/** La bonne réponse et des distracteurs distincts, sans doublon, `n` choix au plus. */
export function uniqueChoices(correct, candidates, n = 3, same = (a, b) => a === b) {
  const out = [correct];
  for (const c of candidates) if (out.length < n && !out.some((o) => same(o, c))) out.push(c);
  return out;
}

function distinctTimes(correct, difficulty, random) {
  // Distracteurs typiques : une heure de plus ou de moins ; aux quarts d'heure, aiguilles inversées et quart voisin.
  const swapped = clockTime(((correct % 60) / 5 || 12) * 60 + (Math.floor(correct / 60) % 12) * 5);
  const candidates = (difficulty === 0 ? [correct + 60, correct - 60, correct + 120] : [swapped, correct + 15, correct - 15, correct + 60]).map(clockTime);
  return random.shuffle(uniqueChoices(correct, candidates, 3, sameClockFace));
}
export function makeSeries(difficulty, random) {
  if (difficulty < 2) {
    const step = difficulty === 0 ? 60 : 15;
    return Array.from({ length: TASKS_PER_SERIES }, (_, i) => {
      const target = timeFor(difficulty, random);
      if (i % 2 === 0) return { kind: 'set', target, step, prompt: `Règle l’horloge sur ${formatTime(target)}.` };
      return { kind: 'read', shown: target, prompt: 'Quelle heure est-il ?', choices: distinctTimes(target, difficulty, random).map((t) => ({ id: String(t), text: formatTime(t) })), correctId: String(target) };
    });
  }
  return random.shuffle(MOMENTS).slice(0, TASKS_PER_SERIES).map((moment, i) => {
    const duration = random.pick([15, 30, 45, 60, 90, 120]);
    if (i % 2 === 0) {
      const start = moment.at + random.pick([0, 15, 30]);
      const choices = random.shuffle(uniqueChoices(duration, [duration + 60, duration + 30, duration - 15].filter((d) => d > 0))).map((d) => ({ id: String(d), text: formatDuration(d) }));
      return { kind: 'duration', start, end: start + duration, picto: moment.picto, prompt: `${moment.text} à ${formatTime(start)}. On a fini à ${formatTime(start + duration)}. Combien de temps cela a-t-il duré ?`, choices, correctId: String(duration) };
    }
    const start = moment.at;
    const end = start + duration;
    const choices = random.shuffle(uniqueChoices(end, [end + 60, end - 30, end + 15].filter((t) => t > start))).map((t) => ({ id: String(t), text: formatTime(t) }));
    return { kind: 'end', start, duration, picto: moment.picto, prompt: `${moment.text} à ${formatTime(start)}. Ça dure ${formatDuration(duration)}. À quelle heure est-ce fini ?`, choices, correctId: String(end) };
  });
}
