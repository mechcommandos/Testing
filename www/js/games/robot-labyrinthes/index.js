/** Le robot des labyrinthes (jeu 6) : composer un programme, l'exécuter, le corriger. */
import { h, clear } from '../../ui/dom.js';
import { shake } from '../shared.js';
import { picto } from '../../ui/pictos.js';
import { expand, hint, LEVELS, MOVE_LABELS, parse, respectsLimit, run } from './rules.js';

const ARROWS = { U: '↑', D: '↓', L: '←', R: '→' };
const ROBOT = picto('robot', 100);
const STAR = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 8l12 26 28 4-20 20 5 28-25-14-25 14 5-28-20-20 28-4z" fill="#f2b705" stroke="#c98a00" stroke-width="4" stroke-linejoin="round"/></svg>';

export function createGame(ctx) {
  const { root, difficulty } = ctx;
  const levels = LEVELS[difficulty];
  const completed = new Set(ctx.progress?.completed?.[difficulty] ?? []);
  let index = Math.max(0, levels.findIndex((l) => !completed.has(l.id)));
  let program = [];
  let pendingRepeat = null;
  let robotAt = null;
  let stepIndex = -1;
  let state;
  let timer = null;
  let destroyed = false;

  function startLevel() {
    program = [];
    pendingRepeat = null;
    stepIndex = -1;
    state = { launches: 0, errors: 0, hints: 0, usedStep: false };
    robotAt = parse(levels[index]).start;
    ctx.activityStart();
    render();
    const level = levels[index];
    ctx.instruct(level.max
      ? `Amène le robot jusqu’à l’étoile avec ${level.max} instructions au plus. Utilise « Répéter ».`
      : 'Amène le robot jusqu’à l’étoile. Choisis les flèches, puis appuie sur Lancer.');
  }

  function render(trail = []) {
    clear(root);
    const level = levels[index];
    const grid = parse(level);
    const board = h('div', { class: 'r-grid', style: { gridTemplateColumns: `repeat(${grid.width}, 1fr)` }, role: 'img', 'aria-label': `Labyrinthe de ${grid.width} sur ${grid.height}` });
    grid.cells.forEach((row, y) => row.forEach((c, x) => {
      const isRobot = robotAt.x === x && robotAt.y === y;
      const isGoal = grid.goal.x === x && grid.goal.y === y;
      board.append(h('div', {
        class: `r-cell${c === '#' ? ' wall' : ''}${trail.some((p) => p.x === x && p.y === y) ? ' trail' : ''}`,
        html: isRobot ? ROBOT : isGoal ? STAR : '',
      }));
    }));

    const palette = h('div', { class: 'r-palette', role: 'group', 'aria-label': 'Instructions' },
      Object.keys(ARROWS).map((m) => h('button', { class: 'r-key', 'aria-label': `ajouter ${MOVE_LABELS[m]}`, onclick: () => add(m) }, ARROWS[m])),
      level.max ? [2, 3, 4, 5, 6, 7].map((n) => h('button', { class: `r-key repeat${pendingRepeat === n ? ' selected' : ''}`, 'aria-label': `répéter ${n} fois l’instruction suivante`, onclick: () => { pendingRepeat = pendingRepeat === n ? null : n; render(); } }, `×${n}`)) : null);

    const programEl = h('ol', { class: 'r-program', 'aria-label': 'Programme' },
      program.length ? program.map((step, i) => h('li', {},
        h('button', { class: `r-step${i === currentStepOf(stepIndex) ? ' current' : ''}`, 'aria-label': `retirer ${describe(step)}`, onclick: () => removeAt(i) },
          typeof step === 'string' ? ARROWS[step] : `${ARROWS[step.move]} ×${step.repeat}`)))
        : h('li', { class: 'r-empty' }, pendingRepeat ? `Choisis la flèche à répéter ${pendingRepeat} fois.` : 'Ton programme est vide.'));

    const counter = level.max ? h('p', { class: `r-limit${program.length > level.max ? ' over' : ''}` }, `${program.length} / ${level.max} instructions`) : null;

    root.append(h('div', { class: 'r-wrap' },
      h('p', { class: 'r-level' }, `Niveau ${index + 1} sur ${levels.length}`),
      board,
      h('div', { class: 'r-side' },
        palette, programEl, counter,
        h('div', { class: 'r-controls' },
          h('button', { class: 'btn big', onclick: launch, disabled: !program.length }, '▶ Lancer'),
          h('button', { class: 'btn ghost', onclick: step, disabled: !program.length }, 'Pas à pas'),
          h('button', { class: 'btn ghost', onclick: reset, disabled: !program.length }, 'Effacer')))));
  }

  function describe(step) {
    return typeof step === 'string' ? MOVE_LABELS[step] : `${MOVE_LABELS[step.move]} ${step.repeat} fois`;
  }

  /** Index de l'instruction (repliée) qui correspond au pas déroulé n. */
  function currentStepOf(n) {
    if (n < 0) return -1;
    let count = 0;
    for (let i = 0; i < program.length; i++) {
      count += typeof program[i] === 'string' ? 1 : program[i].repeat;
      if (n < count) return i;
    }
    return -1;
  }

  function stopAnimation() {
    clearTimeout(timer);
    timer = null;
  }

  function add(move) {
    stopAnimation();
    program.push(pendingRepeat ? { repeat: pendingRepeat, move } : move);
    pendingRepeat = null;
    stepIndex = -1;
    robotAt = parse(levels[index]).start;
    ctx.sfx('tap');
    render();
  }

  function removeAt(i) {
    stopAnimation();
    program.splice(i, 1);
    stepIndex = -1;
    robotAt = parse(levels[index]).start;
    render();
  }

  function reset() {
    stopAnimation();
    program = [];
    pendingRepeat = null;
    stepIndex = -1;
    robotAt = parse(levels[index]).start;
    render();
  }

  /** Lance tout le programme, animé case par case (immédiat si mouvements réduits). */
  function launch() {
    stopAnimation();
    const level = levels[index];
    if (!respectsLimit(level, program)) {
      ctx.instruct(`Trop d’instructions : ${level.max} au maximum. Essaie « Répéter ».`);
      shake(root.querySelector('.r-program'), ctx.reducedMotion);
      return;
    }
    state.launches += 1;
    const result = run(level, program);
    const delay = ctx.reducedMotion ? 0 : 320;
    let i = 0;
    const tick = () => {
      if (destroyed) return;
      robotAt = result.trace[i];
      stepIndex = i - 1;
      render(result.trace.slice(0, i + 1));
      if (i < result.trace.length - 1) {
        i += 1;
        timer = setTimeout(tick, delay);
      } else {
        outcome(result);
      }
    };
    if (delay === 0) {
      robotAt = result.trace.at(-1);
      render(result.trace);
      outcome(result);
    } else {
      tick();
    }
  }

  /** Exécute une instruction dépliée à la fois : pour comprendre ce que fait chaque flèche. */
  function step() {
    stopAnimation();
    state.usedStep = true;
    const moves = expand(program);
    if (stepIndex + 1 >= moves.length) {
      stepIndex = -1;
      robotAt = parse(levels[index]).start;
    }
    const partial = run(levels[index], moves.slice(0, stepIndex + 2));
    stepIndex = partial.trace.length - 2;
    robotAt = partial.trace.at(-1);
    render(partial.trace);
    if (partial.outcome === 'wall') {
      ctx.instruct('Oups, un mur ! Change cette instruction.', { quiet: true });
      shake(root.querySelector('.r-grid'), ctx.reducedMotion);
    } else if (partial.outcome === 'goal') {
      state.launches += 1;
      outcome(partial);
    }
  }

  async function outcome(result) {
    if (result.outcome === 'goal') {
      ctx.sfx('win');
      const level = levels[index];
      await ctx.activityDone({
        success: true, hints: state.hints, errors: state.errors, attempts: state.launches, level: level.id,
        data: { instructions: program.length, usedStep: state.usedStep },
      });
      if (destroyed) return;
      const last = index === levels.length - 1;
      // Le niveau n'est terminé qu'au dernier plateau : c'est là que le jeu passe au niveau suivant.
      ctx.celebrate(() => { index = last ? 0 : index + 1; startLevel(); }, last ? null : `Plateau ${index + 1} sur ${levels.length} réussi.`, { levelDone: last });
      return;
    }
    state.errors += 1;
    ctx.sfx('soft');
    ctx.instruct(result.outcome === 'wall' ? 'Le robot a rencontré un mur. Regarde où il s’est arrêté.' : 'Le robot n’est pas encore arrivé. Ajoute des instructions.', { quiet: true });
    if (state.errors === 3) ctx.offerHint();
  }

  startLevel();

  return {
    hint() {
      state.hints += 1;
      const advice = hint(levels[index], expand(program));
      if (advice.type === 'remove-last') {
        ctx.instruct('Retire la dernière instruction : elle envoie le robot dans un mur.');
        root.querySelector('.r-program li:last-child .r-step')?.classList.add('glow');
      } else if (advice.type === 'add') {
        ctx.instruct(`Essaie d’ajouter : ${MOVE_LABELS[advice.move]}.`);
        root.querySelectorAll('.r-key').forEach((key) => {
          if (key.textContent === ARROWS[advice.move]) key.classList.add('glow');
        });
      }
    },
    repeat() { startLevelPrompt(); },
    destroy() { destroyed = true; stopAnimation(); clear(root); },
  };

  function startLevelPrompt() {
    const level = levels[index];
    ctx.instruct(level.max ? `Amène le robot jusqu’à l’étoile avec ${level.max} instructions au plus.` : 'Amène le robot jusqu’à l’étoile.');
  }
}
