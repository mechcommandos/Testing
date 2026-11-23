/**
 * Le laboratoire des mécanismes (jeu 27) : règles pures, testées (tests/js/games22-30.test.js).
 * Simplifications (documentées) : pas de frottement, planche et cordes sans poids, poulies parfaites, engrenages
 * qui ne glissent pas. Les nombres sont choisis pour que la bonne réponse soit nette.
 *
 * - difficulté 0 : le levier — un poids P à la distance a du point d'appui se soulève avec une force F à la distance b
 *   si F × b ≥ P × a ;
 * - difficulté 1 : les poulies — la force nécessaire est le poids divisé par le nombre de brins qui portent la charge ;
 *   une poulie fixe seule ne réduit pas la force, elle change son sens ;
 * - difficulté 2 : les engrenages — deux roues qui se touchent tournent en sens contraire ; la petite roue tourne
 *   plus vite (tours × dents conservés).
 */
export const TASKS_PER_SERIES = 3;

export function lifts({ weight, weightArm, force, forceArm }) {
  return force * forceArm >= weight * weightArm;
}

/** Planche de 10 cases : rocher à la case 0, enfant à la case 10, point d'appui à la case f. */
export function leverArms(fulcrum, length = 10) {
  return { weightArm: fulcrum, forceArm: length - fulcrum };
}

export function pulleyForce(weight, ropes) {
  return weight / ropes;
}

/** Sens de la dernière roue d'un train d'engrenages (1 = comme la première, -1 = inverse). */
export function gearDirection(count) {
  return count % 2 === 1 ? 1 : -1;
}

/** Tours de la roue menée pour un tour de la roue menante. */
export function gearTurns(driverTeeth, drivenTeeth) {
  return driverTeeth / drivenTeeth;
}

function leverTask(kind, random) {
  if (kind === 'fulcrum') {
    // Rocher 4 fois plus lourd que la force de l'enfant : il faut un bras de levier côté enfant 4 fois plus long.
    const options = [{ id: 'pres', f: 2, label: 'Près du rocher' }, { id: 'milieu', f: 5, label: 'Au milieu' }, { id: 'loin', f: 8, label: 'Près de l’enfant' }];
    return { kind: 'lever-fulcrum', weight: 4, force: 1, options: random.shuffle(options), correctId: options.find((o) => lifts({ weight: 4, force: 1, ...leverArms(o.f) })).id, prompt: 'Le rocher est 4 fois plus lourd que la force de l’enfant. Où placer le point d’appui pour le soulever ?' };
  }
  const options = [{ id: 'bout', arm: 8, label: 'Au bout de la planche' }, { id: 'milieu', arm: 4, label: 'Au milieu de la planche' }, { id: 'pres', arm: 1, label: 'Tout près du point d’appui' }];
  return { kind: 'lever-push', weight: 3, weightArm: 2, force: 1, options: random.shuffle(options), correctId: 'bout', prompt: 'Le point d’appui est placé. Où appuyer pour soulever la caisse avec le moins de force ?' };
}

function leverMiddle(random) {
  // Point d'appui au milieu : bras égaux, il faudrait une force égale au poids.
  const ok = lifts({ weight: 4, force: 1, ...leverArms(5) });
  return { kind: 'lever-middle', weight: 4, force: 1, options: random.shuffle([{ id: 'oui', label: 'Oui' }, { id: 'non', label: 'Non' }]), correctId: ok ? 'oui' : 'non', prompt: 'Le point d’appui est au milieu. Le rocher est 4 fois plus lourd que la force de l’enfant. Peut-il le soulever ?' };
}

function pulleyTask(random, weight = random.pick([20, 40])) {
  const strength = weight / 4;
  const options = [{ id: '1', ropes: 1, label: 'Une poulie fixe (1 brin)' }, { id: '2', ropes: 2, label: 'Une poulie mobile (2 brins)' }, { id: '4', ropes: 4, label: 'Un palan à 4 brins' }];
  return { kind: 'pulley', weight, strength, options: random.shuffle(options), correctId: options.find((o) => pulleyForce(weight, o.ropes) <= strength).id, prompt: `Le sac pèse ${weight} kg. L’enfant peut tirer l’équivalent de ${strength} kg. Quel système permet de le soulever ?` };
}

function pulleyWhy(random) {
  const options = random.shuffle([{ id: 'sens', label: 'À tirer vers le bas au lieu de soulever vers le haut' }, { id: 'force', label: 'À diviser la force par deux' }, { id: 'rien', label: 'À rien du tout' }]);
  return { kind: 'pulley-fixed', options, correctId: 'sens', prompt: 'Avec une seule poulie fixe, la force reste la même. À quoi sert-elle alors ?' };
}

function gearTask(kind, random, count = random.pick([2, 3, 4])) {
  if (kind === 'direction') {
    const dir = gearDirection(count);
    return { kind: 'gear-direction', count, options: random.shuffle([{ id: 'same', label: 'Dans le même sens que la première' }, { id: 'other', label: 'Dans l’autre sens' }]), correctId: dir === 1 ? 'same' : 'other', prompt: `La première roue tourne dans le sens des aiguilles d’une montre. ${count} roues se touchent en file. Dans quel sens tourne la dernière ?` };
  }
  const [big, small] = random.pick([[20, 10], [24, 8], [30, 10]]);
  const turns = gearTurns(big, small);
  return { kind: 'gear-speed', big, small, options: random.shuffle([turns, turns + 1, 1].filter((v, i, a) => a.indexOf(v) === i)).map((n) => ({ id: String(n), label: `${n} tour${n > 1 ? 's' : ''}` })), correctId: String(turns), prompt: `La grande roue a ${big} dents, la petite ${small} dents. Quand la grande fait 1 tour, combien de tours fait la petite ?` };
}

export function makeSeries(difficulty, random) {
  // Trois questions différentes par série (jamais deux fois la même).
  if (difficulty === 0) return random.shuffle([leverTask('fulcrum', random), leverTask('push', random), leverMiddle(random)]);
  if (difficulty === 1) {
    const [w1, w2] = random.shuffle([20, 40]);
    return random.shuffle([pulleyTask(random, w1), pulleyWhy(random), pulleyTask(random, w2)]);
  }
  const [c1, c2] = random.shuffle([2, 3, 4]);
  return random.shuffle([gearTask('direction', random, c1), gearTask('speed', random), gearTask('direction', random, c2)]);
}

export const SIMPLIFICATIONS = [
  'Pas de frottement : dans la réalité, il faut un peu plus de force.',
  'La planche du levier et les cordes ne pèsent rien.',
  'Les engrenages ne glissent jamais : chaque dent pousse une dent.',
];
