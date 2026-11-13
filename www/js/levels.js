// LayJou Bubble — level definitions (8 columns x 9 rows).

const LAYOUTS = [
  ['........', '........', '........', '........', '........', '........', '........', '........', '........'],
  ['#......#', '........', '........', '........', '........', '........', '........', '........', '#......#'],
  ['........', '........', '........', '...##...', '...##...', '...##...', '........', '........', '........'],
  ['##....##', '#......#', '........', '........', '........', '........', '........', '#......#', '##....##'],
  ['........', '........', '.#....#.', '.#....#.', '........', '.#....#.', '.#....#.', '........', '........'],
  ['#..##..#', '........', '........', '#......#', '#......#', '........', '........', '........', '#..##..#'],
];

const ICE_PATTERNS = [
  (r, c) => r >= 3 && r <= 5 && c >= 2 && c <= 5,
  (r, c) => r >= 6,
  (r, c) => (r + c) % 2 === 0 && r >= 2,
  (r, c) => c === 3 || c === 4,
  (r, c) => c <= 1 || c >= 6,
  (r, c) => r >= 4,
  (r) => r >= 2 && r <= 6,
];

export const LEVEL_COUNT = 30;

// Average points a casual player scores per move, by number of colours (calibrated with `node tests/engine.test.mjs --calibrate`).
const PER_MOVE = { 4: 1200, 5: 1000, 6: 550 };

export function getLevel(n) {
  const i = n - 1;
  const tier = Math.floor(i / 3); // 0..9
  const type = ['score', 'ice', 'battery'][i % 3];
  const colors = n <= 3 ? 4 : n >= 19 && type !== 'battery' ? 6 : 5;
  let layout = LAYOUTS[n <= 3 ? 0 : (i * 5 + tier) % LAYOUTS.length].slice();
  let moves;
  let goal;
  let iceTotal = 0;

  if (type === 'score') {
    moves = 20 + (tier % 3) * 2;
    goal = { type, target: Math.round((moves * PER_MOVE[colors] * (0.8 + tier * 0.035)) / 500) * 500 };
  } else if (type === 'ice') {
    const pattern = ICE_PATTERNS[tier % ICE_PATTERNS.length];
    const thick = tier >= 4;
    layout = layout.map((row, r) =>
      [...row]
        .map((ch, c) => {
          if (ch === '#' || !pattern(r, c, layout.length, row.length)) return ch;
          iceTotal++;
          return thick && (r + c) % 3 === 0 ? '2' : '1';
        })
        .join('')
    );
    moves = Math.round(16 + iceTotal * (colors === 6 ? 0.7 : 0.45) + (thick ? 6 : 0));
    goal = { type };
  } else {
    const count = 2 + Math.min(3, Math.floor(tier / 2));
    moves = 18 + count * 9;
    goal = { type, count };
  }

  const base = type === 'score' ? goal.target : moves * PER_MOVE[colors] * 0.6;
  const stars = [1, 1.35, 1.75].map((k) => Math.round((base * k) / 100) * 100);
  return { n, layout, colors, moves, goal, iceTotal, stars };
}
