/**
 * Le tracé magique (jeu 31) : guider un animal jusqu'à son arrivée (ou tracer un chiffre) en suivant les pointillés.
 * Le chemin parcouru se colore ; le prochain repère clignote. L'indice fait parcourir le chemin à une étoile.
 */
import { clear, h } from '../../ui/dom.js';
import { picto } from '../../ui/pictos.js';
import { seriesDots } from '../choices.js';
import { advance, checkpoints, HEIGHT, makeSeries, SERIES, WIDTH } from './rules.js';

const pts = (list) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  let series;
  let index;
  let hints;
  let restarts;
  let destroyed = false;
  let path;           // chemin en cours
  let marks;          // repères de chaque trait
  let stroke;         // trait en cours
  let reached;        // repères validés dans ce trait
  let svg;
  let done = false;
  let hintTimer = null;

  function newSeries() {
    series = makeSeries(difficulty, random);
    index = 0;
    hints = 0;
    restarts = 0;
    ctx.activityStart();
    start();
  }

  function start() {
    path = series[index];
    marks = path.strokes.map((s) => checkpoints(s));
    stroke = 0;
    reached = 1; // le point de départ est donné
    done = false;
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);
    svg.setAttribute('class', 'tm-svg');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', path.say);
    const board = h('div', { class: 'tm-board' }, svg,
      path.from ? icon(path.from, path.strokes[0][0], 'tm-from') : null,
      path.to ? icon(path.to, path.strokes.at(-1).at(-1), 'tm-to') : null);
    clear(root);
    root.append(h('div', { class: 'c-game tm-game' }, seriesDots(SERIES, index), board));
    draw();
    svg.addEventListener('pointerdown', down);
    svg.addEventListener('pointermove', move);
    svg.addEventListener('pointerup', up);
    svg.addEventListener('pointercancel', up);
    ctx.instruct(`${path.say} ${path.from ? 'Pars de l’image et suis les pointillés avec ton doigt.' : 'Pars du point vert et suis les pointillés.'}`);
  }

  function icon(id, [x, y], cls) {
    return h('span', { class: `tm-icon ${cls}`, 'aria-hidden': 'true', style: { left: `${(x / WIDTH) * 100}%`, top: `${(y / HEIGHT) * 100}%` }, html: picto(id, 72) });
  }

  function draw() {
    const guides = path.strokes.map((s, i) => `<polyline points="${pts(s)}" class="tm-guide${i === stroke ? ' current' : ''}"/>`).join('');
    const traced = marks.map((m, i) => {
      const upto = i < stroke ? m.length : i === stroke ? reached : 0;
      return upto > 1 ? `<polyline points="${pts(m.slice(0, upto))}" class="tm-ink"/>` : '';
    }).join('');
    const starts = path.strokes.map((s, i) => `<g class="tm-start${i < stroke ? ' done' : ''}"><circle cx="${s[0][0]}" cy="${s[0][1]}" r="11"/>${path.strokes.length > 1 ? `<text x="${s[0][0]}" y="${s[0][1] + 5}">${i + 1}</text>` : ''}</g>`).join('');
    const next = !done && marks[stroke][reached] ? `<circle class="tm-next" cx="${marks[stroke][reached][0]}" cy="${marks[stroke][reached][1]}" r="9"/>` : '';
    svg.innerHTML = `${guides}${traced}${starts}${next}<circle class="tm-hint" r="10" cx="-20" cy="-20"/>`;
  }

  function point(e) {
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const q = p.matrixTransform(svg.getScreenCTM().inverse());
    return [q.x, q.y];
  }

  let pressing = false;
  function down(e) {
    if (done) return;
    pressing = true;
    svg.setPointerCapture?.(e.pointerId);
    track(e);
  }
  function move(e) { if (pressing) track(e); }
  function up() {
    if (pressing && !done && reached > 1 && reached < marks[stroke].length) restarts += 1; // doigt levé en cours de trait : on reprendra ici
    pressing = false;
  }

  function track(e) {
    const before = reached;
    reached = advance(marks[stroke], reached, point(e));
    if (reached === before) return;
    if (reached >= marks[stroke].length) {
      stroke += 1;
      pressing = false;
      if (stroke >= marks.length) return finishPath();
      reached = 1;
      ctx.sfx('tap');
      ctx.instruct('Bien ! Maintenant, le deuxième trait : pars du point numéro 2.');
    }
    draw();
  }

  function finishPath() {
    done = true;
    stroke = marks.length - 1;
    reached = marks[stroke].length;
    draw();
    svg.classList.add('tm-done');
    ctx.sfx('good');
    ctx.instruct(path.from ? 'Bravo, bien arrivé !' : `Bravo, c’est un beau ${path.id} !`);
    index += 1;
    ctx.afterSpeech(() => { if (destroyed) return; if (index < SERIES) start(); else finish(); }, 900);
  }

  async function finish() {
    await ctx.activityDone({ success: true, hints, errors: 0, attempts: SERIES, level: null, data: { paths: series.map((p) => p.id), restarts } });
    if (!destroyed) ctx.celebrate(newSeries);
  }

  /** Indice : une étoile parcourt le reste du trait en cours. */
  function showHint() {
    if (!svg || done) return;
    clearInterval(hintTimer);
    const route = marks[stroke].slice(Math.max(0, reached - 1));
    let i = 0;
    hintTimer = setInterval(() => {
      const dot = svg.querySelector('.tm-hint');
      if (!dot || i >= route.length || destroyed) { clearInterval(hintTimer); dot?.setAttribute('cx', '-20'); return; }
      dot.setAttribute('cx', route[i][0]);
      dot.setAttribute('cy', route[i][1]);
      i += 1;
    }, ctx.reducedMotion ? 120 : 60);
  }

  newSeries();

  return {
    hint() { hints += 1; showHint(); },
    repeat() { if (path) ctx.instruct(path.say); },
    destroy() { destroyed = true; clearInterval(hintTimer); clear(root); },
  };
}
