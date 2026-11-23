import { nativeApp, shareFile } from '../core/native.js';

/** Mini-outil DOM : crée des éléments sans innerHTML pour le texte (pas d'injection possible). */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs ?? {})) {
    if (value === false || value === null || value === undefined) continue;
    if (key === 'class') el.className = value;
    else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'html') el.innerHTML = value; // réservé aux SVG écrits dans le code, jamais aux données
    else el.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

/** append() natif sans les valeurs vides (le natif écrirait « null » à l'écran). */
export function put(el, ...children) {
  el.append(...children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false));
  return el;
}

export function clear(el) {
  while (el.firstChild) el.firstChild.remove();
  return el;
}

/** Boîte de dialogue modale accessible (dialog natif). Retourne la valeur du bouton choisi. */
export function confirmDialog({ title, text, confirm = 'Confirmer', cancel = 'Annuler', danger = false }) {
  return new Promise((resolve) => {
    // Réponse donnée dès le clic ; l'événement « close » (touche Échap) sert de repli. Une seule réponse.
    let done = false;
    const answer = (ok) => {
      if (done) return;
      done = true;
      if (dialog.open) dialog.close();
      dialog.remove();
      resolve(ok);
    };
    const dialog = h('dialog', { class: 'dialog', 'aria-labelledby': 'dialog-title' },
      h('h2', { id: 'dialog-title' }, title),
      text ? h('p', {}, text) : null,
      h('div', { class: 'row end' },
        h('button', { class: 'btn ghost', value: 'cancel', onclick: () => answer(false) }, cancel),
        h('button', { class: `btn ${danger ? 'danger' : ''}`, value: 'ok', onclick: () => answer(true) }, confirm)));
    dialog.addEventListener('close', () => answer(false));
    document.body.append(dialog);
    dialog.showModal();
  });
}

export function toast(text) {
  const el = h('div', { class: 'toast', role: 'status' }, text);
  document.body.append(el);
  setTimeout(() => el.remove(), 3200);
}

export function download(filename, content, type) {
  // Application iOS : pas de téléchargement, le fichier passe par la feuille de partage.
  if (nativeApp() === 'ios') { shareFile(filename, content); return; }
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
