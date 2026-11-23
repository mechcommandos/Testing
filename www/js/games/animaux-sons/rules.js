/**
 * Les animaux et leurs sons (jeu 2) : règles pures, testées (tests/js/games2-4.test.js).
 * Contenu : content/games/animaux-sons.json ; sons : content/audio.json.
 *
 * Trois modes, choisis au début de chaque série :
 * - 'cry'     : un cri est joué, l'enfant touche l'animal. Seulement si le son est activé ET que tous les cris
 *               de la série sont de vrais enregistrements (pas des sons provisoires) ;
 * - 'name'    : le nom de l'animal est dit à voix haute (synthèse vocale), l'enfant touche l'animal ;
 * - 'habitat' : l'animal est montré, l'enfant touche l'endroit où il vit. Seul mode sans son.
 * Un résultat n'est crédité de la compétence d'écoute (« music ») qu'en mode 'cry' : un son provisoire ou
 * absent ne compte jamais comme une reconnaissance sonore.
 */
export const SERIES = 4;
export const CHOICES = [2, 3, 4];

export const SKILLS = {
  cry: ['living-world', 'music'],
  name: ['living-world', 'vocabulary'],
  habitat: ['living-world'],
};

/** Animaux d'une difficulté pour les modes cri et nom (difficulté 1 : toujours habitats). */
export function soundPool(content, difficulty) {
  return content.animals.filter((a) => a.cry && (difficulty === 0 ? a.familiar : !a.familiar));
}

export function habitatPool(content, difficulty) {
  if (difficulty === 0) return content.animals.filter((a) => a.familiar);
  if (difficulty === 2) return content.animals.filter((a) => !a.familiar);
  return content.animals;
}

export function pickMode(difficulty, { content, clips, soundOn, speechOn }) {
  if (difficulty === 1) return 'habitat';
  const pool = soundPool(content, difficulty);
  if (soundOn && pool.length >= CHOICES[difficulty] && pool.every((a) => clips[a.cry]?.placeholder === false)) return 'cry';
  if (speechOn) return 'name';
  return 'habitat';
}

/** Repli quand un cri ne peut pas être joué : la voix si elle est disponible, sinon les habitats. */
export function fallbackMode(mode, { speechOn }) {
  if (mode === 'cry' && speechOn) return 'name';
  return 'habitat';
}

export function makeQuestion(difficulty, mode, content, random, avoid = new Set()) {
  const n = CHOICES[difficulty];
  if (mode === 'habitat') {
    const pool = habitatPool(content, difficulty).filter((a) => !avoid.has(a.id));
    const target = random.pick(pool.length ? pool : habitatPool(content, difficulty));
    const others = random.shuffle(content.habitats.filter((x) => x.id !== target.habitat)).slice(0, n - 1);
    const choices = random.shuffle([content.habitats.find((x) => x.id === target.habitat), ...others]);
    return {
      mode, target, correctId: target.habitat,
      prompt: `Où vit ${target.name} ?`,
      choices: choices.map((x) => ({ id: x.id, picto: x.picto, text: x.label, aria: x.label })),
    };
  }
  const pool = soundPool(content, difficulty);
  const fresh = pool.filter((a) => !avoid.has(a.id));
  const target = random.pick(fresh.length ? fresh : pool);
  const others = random.shuffle(pool.filter((a) => a.id !== target.id)).slice(0, n - 1);
  const choices = random.shuffle([target, ...others]);
  return {
    mode, target, correctId: target.id,
    prompt: mode === 'cry' ? 'Écoute bien. Quel animal fait ce cri ?' : `Où est ${target.name} ?`,
    choices: choices.map((a) => ({ id: a.id, picto: a.picto, aria: a.name })),
  };
}

/** Une série de questions, sans répéter un animal dans la même série. */
export function makeSeries(difficulty, mode, content, random) {
  const used = new Set();
  return Array.from({ length: SERIES }, () => {
    const q = makeQuestion(difficulty, mode, content, random, used);
    used.add(q.target.id);
    return q;
  });
}

/** Vérifie le contenu : habitats connus, émojis distincts, cris déclarés dans audio.json. */
export function validateContent(content, clips = null) {
  const errors = [];
  const habitats = new Set(content.habitats.map((x) => x.id));
  const pictos = new Set();
  for (const a of content.animals) {
    if (!habitats.has(a.habitat)) errors.push(`${a.id} : habitat inconnu ${a.habitat}`);
    if (pictos.has(a.picto)) errors.push(`${a.id} : image en double`);
    pictos.add(a.picto);
    if (clips && a.cry && !clips[a.cry]) errors.push(`${a.id} : son ${a.cry} absent de audio.json`);
  }
  for (const d of [0, 2]) if (soundPool(content, d).length < CHOICES[d] + 1) errors.push(`difficulté ${d} : pas assez d'animaux avec un cri`);
  return errors;
}
