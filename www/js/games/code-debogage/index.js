/**
 * Mission code et débogage (jeu 28) : le programme du robot est faux. « Lancer » l'exécute pas à pas (le bloc en cours
 * s'allume) ; on voit où ça coince. Toucher un bloc propose de le changer ; relancer jusqu'à atteindre l'étoile.
 * L'indice montre le bloc fautif.
 */
import { clear, h } from '../../ui/dom.js';
import { picto } from '../../ui/pictos.js';
import { continueButton, seriesDots } from '../choices.js';
import { edit, LABELS, makeSeries, nodeAt, optionsFor, run } from './rules.js';

const ARROW = { E: 0, S: 90, W: 180, N: 270 };

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  let series;
  let index;
  let program;
  let editing;
  let robot;
  let runs;
  let errors;
  let hints;
  let running = false;
  let solvedNow = false;
  let destroyed = false;
  let timer = null;

  function newSeries() {
    series = makeSeries(difficulty, random);
    index = 0;
    errors = 0;
    hints = 0;
    ctx.activityStart();
    start();
  }

  const cur = () => series[index];

  function start() {
    program = cur().program;
    editing = null;
    runs = 0;
    solvedNow = false;
    robot = { ...startPos(), bump: false, active: null };
    render('Ce programme ne marche pas. Lance-le pour voir ce qui se passe.');
    ctx.instruct('Ce programme devrait mener le robot jusqu’à l’étoile, mais il y a une erreur. Lance-le pour la trouver.');
  }

  function startPos() {
    const g = cur().grid;
    for (let y = 0; y < g.length; y++) { const x = g[y].indexOf('S'); if (x >= 0) return { x, y, dir: cur().dir }; }
    return { x: 0, y: 0, dir: 'E' };
  }

  function block(node, depth = 0) {
    const label = node.op === 'repeter' ? `Répéter ${node.n} fois` : node.op === 'si-mur' ? 'Si mur devant' : node.op === 'tantque' ? 'Tant que l’étoile n’est pas atteinte'
      : node.op === 'variable' ? `${node.name} ← ${node.value}` : LABELS[node.op];
    const editable = optionsFor(node).length > 0;
    const head = h('button', {
      class: `cd-block op-${node.op}${robot.active === node.id ? ' active' : ''}${editing === node.id ? ' editing' : ''}${editable ? '' : ' fixed'}`,
      'data-id': node.id, disabled: running || !editable, onclick: () => { editing = editing === node.id ? null : node.id; render(); },
      'aria-label': editable ? `${label} : toucher pour changer` : label,
    }, label);
    const opts = editing === node.id ? h('div', { class: 'cd-options' }, optionsFor(node).map((o) => h('button', { class: 'chip', onclick: () => change(node.id, o.changes) }, o.label))) : null;
    const kids = [];
    if (node.body) kids.push(h('div', { class: 'cd-inner' }, node.body.map((n) => block(n, depth + 1))));
    if (node.then) kids.push(h('div', { class: 'cd-branch' }, h('span', { class: 'cd-kw' }, 'alors'), h('div', { class: 'cd-inner' }, node.then.map((n) => block(n, depth + 1)))),
      h('div', { class: 'cd-branch' }, h('span', { class: 'cd-kw' }, 'sinon'), h('div', { class: 'cd-inner' }, node.else.map((n) => block(n, depth + 1)))));
    return h('div', { class: 'cd-node' }, head, opts, kids);
  }

  function render(message = '') {
    const g = cur().grid;
    const grid = h('div', { class: 'cd-grid', style: { gridTemplateColumns: `repeat(${g[0].length}, 1fr)` }, role: 'img', 'aria-label': `Robot en colonne ${robot.x + 1}, ligne ${robot.y + 1}` },
      g.flatMap((row, y) => [...row].map((ch, x) => h('span', { class: `cd-cell${ch === '#' ? ' wall' : ''}` },
        ch === 'E' ? h('span', { class: 'cd-star', html: picto('etoile', 34) }) : null,
        robot.x === x && robot.y === y ? h('span', { class: `cd-robot${robot.bump ? ' bump' : ''}`, style: { transform: `rotate(${ARROW[robot.dir]}deg)` }, html: picto('robot', 40) }, h('span', { class: 'cd-dir' })) : null))));
    clear(root);
    root.append(h('div', { class: 'c-game debug' },
      seriesDots(series.length, index),
      h('div', { class: 'cd-layout' }, grid,
        h('div', { class: 'cd-program', 'aria-label': 'Programme' }, h('p', { class: 'cd-title' }, 'Programme'), program.map((n) => block(n)))),
      h('p', { class: 'cd-msg', 'aria-live': 'polite' }, message),
      solvedNow ? null : h('div', { class: 'row center' },
        h('button', { class: 'btn big', disabled: running, onclick: launch }, runs ? 'Relancer' : 'Lancer'),
        h('button', { class: 'btn ghost', disabled: running || program === cur().program, onclick: () => { program = cur().program; editing = null; robot = { ...startPos(), bump: false, active: null }; render('Programme remis comme au début.'); } }, 'Recommencer'))));
  }

  function change(id, changes) {
    program = edit(program, id, changes);
    editing = null;
    ctx.sfx('tap');
    robot = { ...startPos(), bump: false, active: null };
    render('Bloc changé. Relance le programme pour vérifier.');
  }

  function launch() {
    if (running) return;
    running = true;
    runs += 1;
    editing = null;
    const result = run(cur(), program);
    let i = 0;
    const step = () => {
      if (destroyed) return;
      const t = result.trace[i];
      robot = { x: t.x, y: t.y, dir: t.dir, bump: !!t.bump, active: t.id };
      render(i === 0 ? 'Le robot exécute le programme…' : '');
      i += 1;
      // Une boucle sans fin s'arrête vite à l'écran : 24 pas suffisent pour voir que le robot tourne en rond.
      if (i < result.trace.length && i < 24) timer = setTimeout(step, ctx.reducedMotion ? 100 : 320);
      else done(result);
    };
    step();
  }

  function done(result) {
    running = false;
    if (result.ok) return success();
    // Le premier lancer montre l'erreur ; les lancers suivants sans succès comptent comme des essais ratés.
    if (runs > 1) { errors += 1; if (errors % 2 === 0) ctx.offerHint(); }
    ctx.sfx('soft');
    const text = { wall: 'Bong ! Le robot a heurté un mur. Quel bloc l’a envoyé là ?', end: 'Le programme est fini, mais le robot n’est pas sur l’étoile.', limit: 'Le robot tourne en rond sans jamais arriver : la boucle ne s’arrête pas.' }[result.reason];
    robot.active = null;
    render(`${text} Touche le bloc à corriger.`);
    ctx.instruct(text);
  }

  function success() {
    solvedNow = true;
    ctx.sfx('good');
    robot.active = null;
    render('Bravo, le programme est réparé : le robot atteint l’étoile !');
    ctx.instruct('Programme réparé !');
    index += 1;
    const next = index < series.length ? start : finish;
    root.querySelector('.c-game').append(continueButton(index < series.length ? 'Mission suivante' : 'Terminer', () => { if (!destroyed) next(); }));
  }

  async function finish() {
    await ctx.activityDone({ success: true, hints, errors, attempts: series.length, level: null, data: { puzzles: series.map((p) => p.id) } });
    if (!destroyed) ctx.celebrate(newSeries);
  }

  newSeries();

  return {
    hint() {
      if (!series || running || solvedNow) return;
      hints += 1;
      const fault = nodeAt(cur().program, cur().fault);
      root.querySelector(`.cd-block[data-id="${fault.id}"]`)?.classList.add('glow');
      ctx.instruct('Le bloc qui brille contient l’erreur. Touche-le pour le changer.');
    },
    repeat() { if (series) ctx.instruct('Trouve le bloc qui fait échouer le robot, change-le, puis relance.'); },
    destroy() { destroyed = true; clearTimeout(timer); clear(root); },
  };
}

