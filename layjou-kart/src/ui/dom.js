/* Petits utilitaires DOM : sélecteurs, modales, toasts, compteurs animés. */
import { Audio } from '../core/audio.js';
import { fmt } from '../core/util.js';
import { IC } from './icons.js';
import { Haptic } from '../core/haptics.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Registre partagé entre écrans (évite les imports circulaires). */
export const UI = {};

export function el(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html.trim();
  return tpl.content.firstElementChild;
}

/** Délégation de clics : `data-act="nom"` → handlers.nom(el, ev). */
export function bindActions(root, handlers) {
  root.addEventListener('click', (ev) => {
    const node = ev.target.closest('[data-act]');
    if (!node || !root.contains(node) || node.disabled || node.classList.contains('is-disabled')) return;
    const fn = handlers[node.dataset.act];
    if (fn) { if (!node.dataset.quiet) { Audio.sfx('click'); Haptic.tap(); } fn(node, ev); }
  });
}

const modalStack = [];
/**
 * @param {{html:string, cls?:string, dismissible?:boolean, onClose?:Function, actions?:object}} o
 */
export function modal(o) {
  const root = $('#modal-root');
  const wrap = el(`<div class="modal-wrap ${o.cls || ''}"><div class="modal-card">${o.dismissible === false ? '' : `<button class="modal-x" data-act="close" aria-label="close">${IC.close}</button>`}${o.html}</div></div>`);
  let closed = false;
  const api = {
    el: wrap,
    close(result) {
      if (closed) return; closed = true;
      const i = modalStack.indexOf(api); if (i >= 0) modalStack.splice(i, 1);
      wrap.classList.add('out'); setTimeout(() => wrap.remove(), 180);
      if (o.onClose) o.onClose(result);
    },
    dismissible: o.dismissible !== false,
  };
  bindActions(wrap, { close: () => api.close(), ...(typeof o.actions === 'function' ? o.actions(api) : o.actions || {}) });
  wrap.addEventListener('click', (ev) => { if (ev.target === wrap && api.dismissible) api.close(); });
  root.appendChild(wrap); modalStack.push(api);
  requestAnimationFrame(() => wrap.classList.add('in'));
  return api;
}
/** Ferme la modale du dessus (bouton retour Android). @returns {boolean} true si une modale était ouverte */
export function closeTopModal() {
  const top = modalStack[modalStack.length - 1];
  if (!top) return false;
  if (top.dismissible) top.close();
  return true;
}
export const hasModal = () => modalStack.length > 0;

export function toast(msg, icon = '') {
  const root = $('#toast-root');
  const node = el(`<div class="toast">${icon}<span>${msg}</span></div>`);
  root.appendChild(node);
  requestAnimationFrame(() => node.classList.add('in'));
  setTimeout(() => { node.classList.remove('in'); setTimeout(() => node.remove(), 260); }, 2200);
}

export function countUp(node, from, to, dur = 700, prefix = '') {
  if (!node) return;
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    node.textContent = prefix + fmt(from + (to - from) * e);
    if (k < 1 && node.isConnected) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Pluie d'icônes d'un élément vers un autre (pièces vers le compteur). */
export function fly(fromEl, toEl, icon, n = 8) {
  if (!fromEl || !toEl) return;
  const a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
  for (let i = 0; i < n; i++) {
    const node = el(`<div class="fly">${icon}</div>`);
    const sx = a.left + a.width / 2 + (Math.random() - 0.5) * 60, sy = a.top + a.height / 2 + (Math.random() - 0.5) * 40;
    node.style.left = sx + 'px'; node.style.top = sy + 'px';
    document.body.appendChild(node);
    const dx = b.left + b.width / 2 - sx, dy = b.top + b.height / 2 - sy;
    node.animate([{ transform: 'translate(0,0) scale(.4)', opacity: 0 }, { transform: `translate(${(Math.random() - 0.5) * 50}px,${-30 - Math.random() * 30}px) scale(1.1)`, opacity: 1, offset: 0.25 }, { transform: `translate(${dx}px,${dy}px) scale(.5)`, opacity: 0.9 }],
      { duration: 650 + i * 45, delay: i * 35, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }).onfinish = () => { node.remove(); if (i < 4) Haptic.select(); if (i === 0) { toEl.classList.remove('bump'); void toEl.offsetWidth; toEl.classList.add('bump'); } };
  }
}

export const reward = (r) => [r.coins ? `<span class="rw">${IC.coin}<b>+${fmt(r.coins)}</b></span>` : '', r.credits ? `<span class="rw">${IC.gem}<b>+${r.credits}</b></span>` : '', r.turbo ? `<span class="rw rw-boost">${IC.bolt}<b>+${r.turbo}</b></span>` : ''].join('');
