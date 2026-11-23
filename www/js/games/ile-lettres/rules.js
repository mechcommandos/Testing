/**
 * L'île des lettres et des mots (jeu 4) : règles pures, testées (tests/js/games2-4.test.js).
 * Contenu : content/games/ile-lettres.json (à faire valider) ; sons : content/audio.json.
 *
 * Modes :
 * - difficulté 0 : 'sound' (un son de voyelle est joué, l'enfant touche la lettre) si le son est activé et que
 *   les sons des voyelles sont de vrais enregistrements ; sinon 'visual' (majuscule montrée, trouver la minuscule) ;
 * - difficulté 1 : 'sound' (une syllabe est jouée) aux mêmes conditions ; sinon 'combine' (« p + a », trouver « pa ») ;
 * - difficulté 2 : 'word' (image et mot à trou : compléter avec la bonne syllabe). Le mot est lu à voix haute
 *   par un vrai enregistrement s'il existe, sinon par la synthèse vocale, sinon pas du tout (l'image suffit).
 * Les sons provisoires ne sont jamais utilisés pour noter une reconnaissance sonore.
 */
export const SERIES = 5;

export const SKILLS = {
  sound: ['letters-sounds'],
  visual: ['letters-sounds'],
  combine: ['letters-sounds'],
  word: ['letters-sounds', 'vocabulary'],
};

export function syllables(content) {
  return content.consonants.flatMap((c) => content.syllableVowels.map((v) => ({ id: `${c}${v}`, consonant: c, vowel: v, sound: `syl-${c}${v}` })));
}

export function pickMode(difficulty, { content, clips, soundOn }) {
  if (difficulty === 2) return 'word';
  const ids = difficulty === 0 ? content.vowels.map((v) => v.sound) : syllables(content).map((s) => s.sound);
  if (soundOn && ids.every((id) => clips[id]?.placeholder === false)) return 'sound';
  return difficulty === 0 ? 'visual' : 'combine';
}

export function fallbackMode(difficulty) {
  return difficulty === 0 ? 'visual' : 'combine';
}

function vowelQuestion(mode, content, random, avoid) {
  const fresh = content.vowels.filter((v) => !avoid.has(v.id));
  const target = random.pick(fresh.length ? fresh : content.vowels);
  const others = random.shuffle(content.vowels.filter((v) => v.id !== target.id)).slice(0, 2);
  return {
    mode, key: target.id, target, correctId: target.id, sound: target.sound,
    prompt: mode === 'sound' ? 'Écoute ce son. Quelle lettre fait ce son ?' : `Trouve la même lettre, en minuscule : ${target.name}.`,
    choices: random.shuffle([target, ...others]).map((v) => ({ id: v.id, text: v.lower, aria: `lettre ${v.name}`, className: 'letter' })),
  };
}

function syllableQuestion(mode, content, random, avoid) {
  const all = syllables(content);
  const fresh = all.filter((s) => !avoid.has(s.id));
  const target = random.pick(fresh.length ? fresh : all);
  // Distracteurs proches : même consonne et autre voyelle, même voyelle et autre consonne.
  const sameConsonant = random.pick(all.filter((s) => s.consonant === target.consonant && s.id !== target.id));
  const sameVowel = random.pick(all.filter((s) => s.vowel === target.vowel && s.id !== target.id));
  return {
    mode, key: target.id, target, correctId: target.id, sound: target.sound,
    prompt: mode === 'sound' ? 'Écoute. Quelle syllabe entends-tu ?' : `${target.consonant.toUpperCase()} et ${target.vowel.toUpperCase()}, ensemble, ça fait… ?`,
    choices: random.shuffle([target, sameConsonant, sameVowel]).map((s) => ({ id: s.id, text: s.id, aria: `syllabe ${s.id}`, className: 'letter' })),
  };
}

/** Syllabes candidates pour les mots à trou : toutes celles du contenu. */
function wordSyllables(content) {
  return [...new Set([...content.words.flatMap((w) => w.syllables), ...syllables(content).map((s) => s.id)])];
}

/** Toute syllabe qui, placée dans le trou, forme un mot de la liste est une bonne réponse : on l'exclut des distracteurs. */
export function completions(content, word, gap, syllable) {
  const parts = [...word.syllables];
  parts[gap] = syllable;
  const spelled = parts.join('');
  return content.words.filter((w) => w.syllables.join('') === spelled);
}

function wordQuestion(content, random, avoid) {
  const fresh = content.words.filter((w) => !avoid.has(w.id));
  const target = random.pick(fresh.length ? fresh : content.words);
  const gap = random.int(0, target.syllables.length - 1);
  const correct = target.syllables[gap];
  const distractors = random.shuffle(wordSyllables(content).filter((s) => s !== correct && completions(content, target, gap, s).length === 0)).slice(0, 2);
  const word = target.syllables.join('');
  return {
    mode: 'word', key: target.id, target, gap, correctId: correct, sound: target.sound, word,
    display: target.syllables.map((s, i) => (i === gap ? null : s)),
    prompt: `Complète le mot : ${word}.`,
    choices: random.shuffle([correct, ...distractors]).map((s) => ({ id: s, text: s, aria: `syllabe ${s}`, className: 'letter' })),
  };
}

export function makeQuestion(difficulty, mode, content, random, avoid = new Set()) {
  if (difficulty === 0) return vowelQuestion(mode, content, random, avoid);
  if (difficulty === 1) return syllableQuestion(mode, content, random, avoid);
  return wordQuestion(content, random, avoid);
}

export function makeSeries(difficulty, mode, content, random) {
  const used = new Set();
  return Array.from({ length: SERIES }, () => {
    const q = makeQuestion(difficulty, mode, content, random, used);
    used.add(q.key);
    return q;
  });
}

export function validateContent(content, clips = null) {
  const errors = [];
  const ids = new Set();
  for (const w of content.words) {
    if (w.syllables.length !== 2) errors.push(`${w.id} : 2 syllabes attendues`);
    if (ids.has(w.id)) errors.push(`${w.id} : en double`);
    ids.add(w.id);
    if (clips && !clips[w.sound]) errors.push(`${w.id} : son ${w.sound} absent de audio.json`);
  }
  if (clips) {
    for (const v of content.vowels) if (!clips[v.sound]) errors.push(`${v.id} : son absent de audio.json`);
    for (const s of syllables(content)) if (!clips[s.sound]) errors.push(`${s.id} : son absent de audio.json`);
  }
  return errors;
}
