/** Dessins et interactions partagés par les jeux. */

export function shapeSvg(shape, color, scale = 1) {
  const s = Math.round(70 * scale);
  const inner = {
    rond: `<circle cx="50" cy="50" r="40" fill="${color}"/>`,
    carre: `<rect x="12" y="12" width="76" height="76" rx="10" fill="${color}"/>`,
    triangle: `<path d="M50 8l44 80H6z" fill="${color}" stroke-linejoin="round"/>`,
    fleur: `<g fill="${color}"><circle cx="50" cy="26" r="17"/><circle cx="74" cy="44" r="17"/><circle cx="65" cy="72" r="17"/><circle cx="35" cy="72" r="17"/><circle cx="26" cy="44" r="17"/></g><circle cx="50" cy="52" r="13" fill="#ffd36e"/>`,
  }[shape];
  return `<svg viewBox="0 0 100 100" width="${s}" height="${s}" aria-hidden="true" focusable="false">${inner}</svg>`;
}

/** Contour (pot) d'une forme, pour le tri. */
export function outlineSvg(shape) {
  const inner = {
    rond: '<circle cx="50" cy="50" r="34" fill="none" stroke="#5b4a3a" stroke-width="7" stroke-dasharray="10 7"/>',
    carre: '<rect x="18" y="18" width="64" height="64" rx="8" fill="none" stroke="#5b4a3a" stroke-width="7" stroke-dasharray="10 7"/>',
    triangle: '<path d="M50 14l38 70H12z" fill="none" stroke="#5b4a3a" stroke-width="7" stroke-dasharray="10 7" stroke-linejoin="round"/>',
  }[shape];
  return `<svg viewBox="0 0 100 100" width="64" height="64" aria-hidden="true" focusable="false">${inner}</svg>`;
}

const FRUIT_ART = {
  pomme: '<path d="M50 26c-8-8-30-6-32 18c-2 22 14 40 32 36c18 4 34-14 32-36c-2-24-24-26-32-18z" fill="#e5484d"/><path d="M50 26q2-10 10-14" stroke="#6b4423" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M54 22q12-8 18 2q-12 6-18-2z" fill="#3aa65b"/><ellipse cx="36" cy="42" rx="6" ry="9" fill="#fff" opacity=".35"/>',
  poire: '<path d="M50 20c-10 0-12 14-14 22c-10 8-14 20-10 30c6 14 42 14 48 0c4-10 0-22-10-30c-2-8-4-22-14-22z" fill="#c5d84a"/><path d="M50 20q0-8 6-12" stroke="#6b4423" stroke-width="5" fill="none" stroke-linecap="round"/>',
  orange: '<circle cx="50" cy="54" r="32" fill="#f59a23"/><circle cx="50" cy="24" r="4" fill="#6b8f2b"/><path d="M54 22q10-6 16 2q-10 4-16-2z" fill="#3aa65b"/>',
  fraise: '<path d="M50 84c-20-12-30-30-26-44c4-12 48-12 52 0c4 14-6 32-26 44z" fill="#e5484d"/><path d="M30 30q20 10 40 0l-6 10q-14 6-28 0z" fill="#3aa65b"/><g fill="#ffd36e"><circle cx="40" cy="50" r="2"/><circle cx="56" cy="48" r="2"/><circle cx="48" cy="62" r="2"/><circle cx="62" cy="60" r="2"/><circle cx="38" cy="64" r="2"/></g>',
};

export function fruitSvg(fruit, size = 44) {
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true" focusable="false">${FRUIT_ART[fruit]}</svg>`;
}

/** Fait trembler un élément après une erreur (sauf mouvements réduits : bordure seulement). */
export function shake(el, reducedMotion) {
  el.classList.remove('shake', 'oops');
  void el.offsetWidth;
  el.classList.add(reducedMotion ? 'oops' : 'shake');
  setTimeout(() => el.classList.remove('shake', 'oops'), 600);
}

/**
 * Glisser-déposer facultatif, en plus du « toucher puis toucher ».
 * onDrop(targetEl) reçoit l'élément sous le doigt au relâchement (ou null).
 */
export function enableDrag(el, { targetSelector, onDrop, onStart = () => {} }) {
  let start = null;
  let dragging = false;
  const down = (e) => {
    if (e.button > 0) return;
    start = { x: e.clientX, y: e.clientY, id: e.pointerId };
    dragging = false;
  };
  const move = (e) => {
    if (!start || e.pointerId !== start.id) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!dragging && Math.hypot(dx, dy) > 12) {
      dragging = true;
      el.setPointerCapture(e.pointerId);
      el.classList.add('dragging');
      onStart();
    }
    if (dragging) el.style.transform = `translate(${dx}px, ${dy}px) scale(1.08)`;
  };
  const up = (e) => {
    if (!start) return;
    const wasDragging = dragging;
    start = null;
    dragging = false;
    if (!wasDragging) return;
    el.classList.remove('dragging');
    el.style.transform = '';
    el.style.visibility = 'hidden';
    const under = document.elementFromPoint(e.clientX, e.clientY);
    el.style.visibility = '';
    el.dataset.dragged = '1';
    setTimeout(() => delete el.dataset.dragged, 0);
    onDrop(under?.closest(targetSelector) ?? null);
  };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', () => { start = null; dragging = false; el.classList.remove('dragging'); el.style.transform = ''; });
}
