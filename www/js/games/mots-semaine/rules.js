/**
 * Les mots de la semaine (jeu 54) : règles pures, testées (tests/js/plan.test.js).
 * Les mots viennent de la liste saisie par le parent (offre Famille), sinon d'une liste d'exemple.
 * Niveau 1 : recopier (le mot reste affiché, les lettres exactes sont proposées).
 * Niveau 2 : écouter puis écrire (2 lettres en trop). Niveau 3 : dictée (4 lettres en trop).
 * Trait d'union et apostrophe sont déjà placés : seules les lettres sont à trouver.
 */
export const SERIES_LENGTH = 6;
export const SAMPLE_WORDS = ['maison', 'école', 'jardin', 'soleil', 'bateau', 'pomme', 'livre', 'classe', 'fleur', 'lapin', 'cartable', 'chemin'];
const FILLERS = 'aeiourlnstmcpdbéè';
export const FIXED = /[-'’]/;

export function wordsFor(profile) {
  const own = Array.isArray(profile?.words) ? profile.words.filter((w) => typeof w === 'string' && w.length >= 2) : [];
  return own.length >= 3 ? { words: own, sample: false } : { words: SAMPLE_WORDS, sample: true };
}

/** Lettres du mot (en Unicode, « é » compte pour une lettre). */
export const chars = (word) => [...word.normalize('NFC')];

export function makeSeries(difficulty, random, words) {
  const extra = [0, 2, 4][difficulty];
  return random.shuffle(words).slice(0, SERIES_LENGTH).map((word) => {
    const letters = chars(word);
    const needed = letters.filter((c) => !FIXED.test(c));
    const fillers = [];
    while (fillers.length < extra) {
      const c = random.pick([...FILLERS]);
      if (!needed.includes(c) || fillers.length >= extra - 1) fillers.push(c);
    }
    const tiles = random.shuffle([...needed, ...fillers]).map((ch, i) => ({ id: `t${i}`, ch }));
    return { word, letters, tiles };
  });
}

/** Indices des cases fausses (une case vide compte comme fausse). */
export function wrongSlots(letters, placed) {
  return letters.map((c, i) => (FIXED.test(c) || placed[i] === c ? -1 : i)).filter((i) => i >= 0);
}
