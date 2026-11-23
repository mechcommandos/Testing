/**
 * Le tracé magique (jeu 31) : règles pures, testées (tests/js/games31-43.test.js).
 * Un chemin est fait d'un ou plusieurs traits (le 4 et le 5 se tracent en deux fois), chacun une ligne brisée dans
 * un cadre de 300 × 200. Chaque trait est découpé en repères réguliers ; le doigt doit les toucher dans l'ordre.
 * Sortir du chemin n'efface rien : on reprend au dernier repère atteint.
 */
export const SERIES = 4;
export const WIDTH = 300;
export const HEIGHT = 200;
export const STEP = 16;      // écart entre deux repères (unités du cadre)
export const TOLERANCE = 26; // distance maximale du doigt à un repère pour le valider

const wave = Array.from({ length: 25 }, (_, i) => [30 + i * 10, 100 + 45 * Math.sin((i / 24) * Math.PI * 2.5)]);
const arc = Array.from({ length: 25 }, (_, i) => { const a = Math.PI - (i / 24) * Math.PI; return [150 + 110 * Math.cos(a), 170 - 120 * Math.sin(a)]; });
const loop = Array.from({ length: 33 }, (_, i) => { const a = -Math.PI / 2 - (i / 32) * Math.PI * 2; return [150 + 70 * Math.cos(a), 100 + 70 * Math.sin(a)]; });
const snail = Array.from({ length: 41 }, (_, i) => { const a = (i / 40) * Math.PI * 3.6; const r = 12 + i * 2; return [150 + r * Math.cos(a), 100 + r * Math.sin(a) * 0.85]; });

/** Chemins par niveau : traits, image de départ et d'arrivée, consigne. */
export const PATHS = [
  [
    { id: 'droite', strokes: [[[30, 100], [270, 100]]], from: 'lapin', to: 'carotte', say: 'Aide le lapin à aller jusqu’à sa carotte.' },
    { id: 'descente', strokes: [[[40, 40], [260, 165]]], from: 'abeille', to: 'tournesol', say: 'Aide l’abeille à rejoindre la fleur.' },
    { id: 'montee', strokes: [[[40, 165], [260, 40]]], from: 'chat', to: 'maison', say: 'Aide le chat à rentrer à la maison.' },
    { id: 'verticale', strokes: [[[150, 20], [150, 180]]], from: 'coccinelle', to: 'feuille', say: 'Aide la coccinelle à descendre sur la feuille.' },
    { id: 'escalier', strokes: [[[30, 165], [100, 165], [100, 100], [170, 100], [170, 40], [270, 40]]], from: 'robot', to: 'etoile', say: 'Aide le robot à monter l’escalier jusqu’à l’étoile.' },
  ],
  [
    { id: 'vagues', strokes: [wave], from: 'poisson', to: 'bateau', say: 'Aide le poisson à nager sur les vagues jusqu’au bateau.' },
    { id: 'zigzag', strokes: [[[30, 145], [78, 55], [126, 145], [174, 55], [222, 145], [270, 55]]], from: 'abeille', to: 'fleur', say: 'Suis le zigzag de l’abeille jusqu’à la fleur.' },
    { id: 'arc', strokes: [arc], from: 'lapin', to: 'carotte', say: 'Fais sauter le lapin par-dessus la colline.' },
    { id: 'rond', strokes: [loop], from: 'chien', to: 'ballon', say: 'Fais un grand rond avec le chien jusqu’à son ballon.' },
    { id: 'escargot', strokes: [snail], from: 'coccinelle', to: 'fraise', say: 'Suis la spirale de la coccinelle jusqu’à la fraise.' },
  ],
  [
    { id: '1', strokes: [[[128, 62], [160, 30], [160, 178]]], from: null, to: null, say: 'Trace le chiffre 1.' },
    { id: '2', strokes: [[[112, 68], [122, 42], [148, 30], [174, 38], [184, 62], [172, 92], [114, 172], [192, 172]]], from: null, to: null, say: 'Trace le chiffre 2.' },
    { id: '3', strokes: [[[114, 46], [140, 30], [170, 34], [182, 58], [168, 88], [140, 100], [168, 110], [184, 138], [172, 166], [140, 176], [110, 160]]], from: null, to: null, say: 'Trace le chiffre 3.' },
    { id: '4', strokes: [[[158, 30], [108, 130], [196, 130]], [[168, 88], [168, 178]]], from: null, to: null, say: 'Trace le chiffre 4, en deux traits.' },
    { id: '5', strokes: [[[126, 32], [120, 96], [152, 88], [178, 104], [184, 136], [168, 166], [136, 176], [110, 162]], [[126, 32], [182, 32]]], from: null, to: null, say: 'Trace le chiffre 5, en deux traits.' },
  ],
];

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Repères réguliers le long d'une ligne brisée (le premier et le dernier point sont toujours inclus). */
export function checkpoints(points, step = STEP) {
  const out = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const [a, b] = [points[i - 1], points[i]];
    const n = Math.max(1, Math.round(dist(a, b) / step));
    for (let k = 1; k <= n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  return out;
}

/**
 * Nouveau rang atteint quand le doigt est en p : on valide le repère attendu (et les suivants s'ils sont aussi
 * sous le doigt). Un repère plus loin n'est jamais validé si le précédent ne l'est pas.
 */
export function advance(marks, index, p, tolerance = TOLERANCE) {
  let i = index;
  while (i < marks.length && dist(marks[i], p) <= tolerance) i += 1;
  return i;
}

export function makeSeries(difficulty, random) {
  const pool = PATHS[Math.min(difficulty, 2)];
  // Chiffres : dans l'ordre (1 à 5), en commençant à un rang au hasard ; sinon, au hasard.
  if (difficulty >= 2) {
    const start = random.int(0, pool.length - SERIES);
    return pool.slice(start, start + SERIES);
  }
  return random.shuffle(pool).slice(0, SERIES);
}
