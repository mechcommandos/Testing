/**
 * Mascotte animée et petits effets de fête. Tout est en CSS (classes m-*) : avec « Réduire les animations »
 * ou la préférence système, la mascotte reste immobile et les confettis ne sont pas créés.
 */
import { h } from './dom.js';
import { app, reducedMotion } from './state.js';
import { companionSvg } from './companion.js';

const MOODS = ['m-happy', 'm-oops', 'm-wave', 'm-cheer'];
const CONFETTI_COLORS = ['#1a56b8', '#1fb3c6', '#ef5f95', '#f2b705', '#2f8f5b', '#ff8a3d'];

/**
 * Le compagnon de l'enfant : la mascotte en SVG, habillée et nommée selon son album (core/world.js).
 * Il change d'expression quand il réagit (joie, oups, surprise).
 */
export function companion({ size = 120, className = '', tappable = false, pose = 'repos', expression = 'joie' } = {}) {
  const outfit = app.world?.companion.outfit ?? {};
  const body = h('div', { class: 'mascot-img companion-svg', html: companionSvg({ expression, pose, outfit, size }) });
  const wrap = h('div', { class: `mascot-wrap companion ${className}`.trim(), 'aria-hidden': 'true', style: { width: `${size}px` } }, body, h('span', { class: 'mascot-shadow' }));
  wrap.express = (e) => { body.innerHTML = companionSvg({ expression: e, pose, outfit: app.world?.companion.outfit ?? {}, size }); };
  wrap.rest = expression;
  if (tappable) {
    wrap.classList.add('tappable');
    wrap.addEventListener('pointerdown', () => react(wrap, 'happy'));
  }
  return wrap;
}

/** Mascotte (image) qui flotte doucement ; `onTap` la fait réagir quand l'enfant la touche. */
export function mascot({ size = 120, className = '', tappable = false, pose = '' } = {}) {
  // Poses : '' (salut, mascot.png) ou 'bravo' (bras levés, mascot-bravo.png, 325 × 420).
  const src = pose === 'bravo' ? 'assets/img/mascot-bravo.png' : 'assets/img/mascot.png';
  const ratio = pose === 'bravo' ? 420 / 325 : 1.25;
  const wrap = h('div', { class: `mascot-wrap ${className}`.trim(), 'aria-hidden': 'true' },
    h('img', { class: 'mascot-img', src, alt: '', width: size, height: Math.round(size * ratio), draggable: 'false' }),
    h('span', { class: 'mascot-shadow' }));
  if (tappable) {
    wrap.classList.add('tappable');
    wrap.addEventListener('pointerdown', () => react(wrap, 'happy'));
  }
  return wrap;
}

/** Réaction ponctuelle : happy (saut), oops (petit « non » de la tête), wave (salut), cheer (grande fête). */
export function react(wrap, mood) {
  if (!wrap) return;
  wrap.classList.remove(...MOODS);
  void wrap.offsetWidth; // relance l'animation si la même réaction se répète
  wrap.classList.add(`m-${mood}`);
  clearTimeout(wrap.moodTimer);
  // Le compagnon change aussi d'expression le temps de la réaction.
  if (wrap.express) wrap.express({ happy: 'joie', cheer: 'joie', wave: 'joie', oops: 'oups' }[mood] ?? wrap.rest);
  wrap.moodTimer = setTimeout(() => { wrap.classList.remove(`m-${mood}`); if (wrap.express) wrap.express(wrap.rest); }, 1200);
}

/** Pluie de confettis dans `host` (supprimée après l'animation). */
export function confetti(host, count = 42) {
  if (reducedMotion() || !host) return;
  const layer = h('div', { class: 'confetti', 'aria-hidden': 'true' });
  for (let i = 0; i < count; i++) {
    const piece = h('span', {
      style: {
        left: `${Math.random() * 100}%`,
        background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        animationDelay: `${Math.random() * 0.35}s`,
        animationDuration: `${1.4 + Math.random() * 0.9}s`,
        width: `${6 + Math.round(Math.random() * 6)}px`,
        height: `${10 + Math.round(Math.random() * 8)}px`,
        borderRadius: i % 3 === 0 ? '50%' : '2px',
      },
    });
    // Les propriétés personnalisées CSS ne passent pas par Object.assign(style) : setProperty.
    piece.style.setProperty('--drift', `${Math.round(Math.random() * 120 - 60)}px`);
    piece.style.setProperty('--spin', `${Math.round(Math.random() * 720 - 360)}deg`);
    layer.append(piece);
  }
  host.append(layer);
  setTimeout(() => layer.remove(), 2600);
}
