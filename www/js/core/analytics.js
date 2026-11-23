// Mesure d'audience interne (lue seulement dans l'espace admin). Aucun cookie, aucun identifiant envoyé :
// le serveur ne garde qu'une empreinte quotidienne et la catégorie d'utilisateur (invité / parent).
// Désactivée dans les applications des stores. Ne bloque jamais et ne lève jamais d'erreur.
import { nativeApp } from './native.js';

function platform() {
  try {
    return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true ? 'pwa' : 'web';
  } catch {
    return 'web';
  }
}

export function track(type, data = {}) {
  try {
    if (nativeApp() !== null || typeof fetch !== 'function') return;
    fetch('api/analytics/event', {
      method: 'POST',
      keepalive: true,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Layjou': '1' },
      body: JSON.stringify({ type, platform: platform(), ...data }),
    }).catch(() => {});
  } catch {
    /* mesure facultative */
  }
}

/** Visite d'une page ou de l'application, une fois par chargement. */
export function visit(page) {
  if (!/^[a-z0-9-]{1,40}$/.test(page)) page = 'autre';
  track('visit', { page });
}
