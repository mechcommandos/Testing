/**
 * La chasse aux différences (jeu 14) : deux images presque pareilles ; toucher chaque différence, sur l'une ou l'autre.
 * Un compteur montre ce qu'il reste à trouver ; l'indice entoure une zone. Sur petit écran, les images sont l'une
 * sous l'autre, chacune sur toute la largeur.
 */
import { clear, h } from '../../ui/dom.js';
import { seriesDots } from '../choices.js';
import { HEIGHT, hitTest, KIND_LABEL, makeScene, SCENES_PER_SERIES, WIDTH } from './rules.js';

const NS = 'http://www.w3.org/2000/svg';

function shapeMarkup(o) {
  const s = o.size / 2;
  const { x, y, color } = o;
  switch (o.shape) {
    case 'rond': return `<circle cx="${x}" cy="${y}" r="${s}" fill="${color}"/>`;
    case 'carre': return `<rect x="${x - s}" y="${y - s}" width="${o.size}" height="${o.size}" rx="${s * 0.25}" fill="${color}"/>`;
    case 'triangle': return `<path d="M${x} ${y - s}L${x + s} ${y + s * 0.85}H${x - s}Z" fill="${color}" stroke-linejoin="round"/>`;
    case 'etoile': {
      const pts = Array.from({ length: 10 }, (_, i) => {
        const r = i % 2 ? s * 0.45 : s;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        return `${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`;
      });
      return `<polygon points="${pts.join(' ')}" fill="${color}"/>`;
    }
    case 'coeur': return `<path d="M${x} ${y + s * 0.9}C${x - s * 1.3} ${y - s * 0.1} ${x - s * 0.6} ${y - s * 1.1} ${x} ${y - s * 0.35}C${x + s * 0.6} ${y - s * 1.1} ${x + s * 1.3} ${y - s * 0.1} ${x} ${y + s * 0.9}Z" fill="${color}"/>`;
    case 'fleur': {
      const p = s * 0.42;
      const petals = [0, 72, 144, 216, 288].map((deg) => {
        const a = (deg - 90) * (Math.PI / 180);
        return `<circle cx="${(x + Math.cos(a) * s * 0.55).toFixed(1)}" cy="${(y + Math.sin(a) * s * 0.55).toFixed(1)}" r="${p.toFixed(1)}" fill="${color}"/>`;
      }).join('');
      return `${petals}<circle cx="${x}" cy="${y}" r="${(s * 0.32).toFixed(1)}" fill="#ffd36e"/>`;
    }
    default: return '';
  }
}

function sceneSvg(objects, label) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);
  svg.setAttribute('class', 'd-scene');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', label);
  svg.innerHTML = `<rect width="${WIDTH}" height="${HEIGHT}" rx="18" fill="#fffaf0"/><path d="M0 250Q100 230 200 248T400 244V300H0Z" fill="#dff2e3"/>${objects.map(shapeMarkup).join('')}<g class="d-marks"></g>`;
  return svg;
}

function mark(svg, d, cls, r = 34) {
  const c = document.createElementNS(NS, 'circle');
  c.setAttribute('cx', d.x);
  c.setAttribute('cy', d.y);
  c.setAttribute('r', r);
  c.setAttribute('class', cls);
  svg.querySelector('.d-marks').append(c);
}

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  let index;
  let scene;
  let found;
  let errors;
  let hints;
  let svgs;
  let counter;
  let finishing = false;
  let destroyed = false;

  function newSeries() {
    index = 0;
    errors = 0;
    hints = 0;
    ctx.activityStart();
    start();
  }

  function remaining() {
    return scene.differences.length - found.size;
  }

  function start() {
    scene = makeScene(difficulty, random);
    found = new Set();
    finishing = false;
    svgs = [sceneSvg(scene.left, 'Image de gauche'), sceneSvg(scene.right, 'Image de droite')];
    svgs.forEach((svg) => svg.addEventListener('click', (e) => tap(svg, e)));
    counter = h('p', { class: 'd-counter', 'aria-live': 'polite' });
    clear(root);
    root.append(h('div', { class: 'c-game spot' },
      seriesDots(SCENES_PER_SERIES, index),
      counter,
      h('div', { class: 'd-pair' }, svgs)));
    updateCounter();
    ctx.instruct(`Trouve les ${scene.differences.length} différences entre les deux images.`);
  }

  function updateCounter() {
    const n = remaining();
    counter.textContent = n ? `Encore ${n} différence${n > 1 ? 's' : ''} à trouver` : 'Tout est trouvé !';
  }

  function tap(svg, e) {
    if (finishing) return;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
    const id = hitTest(scene.differences, found, pt.x, pt.y);
    if (!id) {
      errors += 1;
      ctx.sfx('soft');
      if (errors % 4 === 0) ctx.offerHint();
      return;
    }
    found.add(id);
    const d = scene.differences.find((x) => x.id === id);
    svgs.forEach((s) => { s.querySelectorAll('.d-hint').forEach((c) => c.remove()); mark(s, d, 'd-found'); });
    ctx.sfx('good');
    updateCounter();
    ctx.instruct(remaining() ? `Bravo : ${KIND_LABEL[d.kind]}.` : 'Tu as trouvé toutes les différences !', { quiet: remaining() > 0 });
    if (!remaining()) {
      finishing = true;
      ctx.afterSpeech(() => {
        if (destroyed) return;
        index += 1;
        if (index < SCENES_PER_SERIES) start();
        else finish();
      }, ctx.reducedMotion ? 400 : 1200);
    }
  }

  async function finish() {
    await ctx.activityDone({ success: true, hints, errors, attempts: SCENES_PER_SERIES, level: null, data: { differences: scene.differences.length * SCENES_PER_SERIES } });
    if (!destroyed) ctx.celebrate(newSeries);
  }

  newSeries();

  return {
    hint() {
      if (!scene || finishing) return;
      const d = scene.differences.find((x) => !found.has(x.id));
      if (!d) return;
      hints += 1;
      // Une zone assez large autour de la différence, décalée au hasard pour ne pas la donner exactement.
      const zone = { x: d.x + random.int(-14, 14), y: d.y + random.int(-14, 14) };
      svgs.forEach((s) => mark(s, zone, 'd-hint', 70));
    },
    repeat() { if (scene) ctx.instruct(`Trouve les différences entre les deux images. ${counter.textContent}.`); },
    destroy() { destroyed = true; clear(root); },
  };
}
