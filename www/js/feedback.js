/**
 * Bouton « Votre avis » (VoteCove : idées et votes des parents), sur la page d'accueil du site et l'espace parent en ligne.
 * Jamais dans l'application ni dans les jeux. L'espace VoteCove vient du serveur (/api/health → feedback) : vide, rien ne
 * s'affiche. Un parent connecté est reconnu par un jeton signé par notre serveur ; aucune clé n'est dans cette page.
 */
const VOTECOVE = 'https://votecove.com';
let loading = null;

function api(path) {
  return fetch(`${apiBase()}${path}`, { credentials: 'same-origin', cache: 'no-store' })
    .then(async (r) => ({ ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) }))
    .catch(() => ({ ok: false, status: 0, data: {} }));
}

/** api/ à côté de cette page : la page d'accueil et l'espace parent sont à la racine du site. */
function apiBase() {
  return new URL('api/', document.baseURI).href;
}

export function feedbackWidget(workspace) {
  loading ??= new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = `${VOTECOVE}/widget.js`;
    script.async = true;
    Object.assign(script.dataset, { workspace, label: 'Votre avis', color: '#1a56b8', position: 'right' });
    script.onload = () => resolve(!!globalThis.Votecove);
    script.onerror = () => resolve(false);
    document.body.append(script);
  });
  return loading;
}

/** Reconnaît le parent connecté dans le widget (ou l'oublie à la déconnexion). */
export async function identifyFeedback(signedIn) {
  if (!loading || !(await loading)) return;
  if (!signedIn) return globalThis.Votecove.identify('');
  const r = await api('feedback/token');
  globalThis.Votecove.identify(r.ok ? r.data.token : '');
}

/** Page d'accueil : affiche le bouton si un espace est configuré ; reconnaît le parent s'il est déjà connecté. */
export async function startFeedback() {
  const health = await api('health');
  if (!health.ok || !health.data.feedback) return;
  await feedbackWidget(health.data.feedback);
  if (health.data.accounts) {
    const r = await api('feedback/token');
    if (r.ok) globalThis.Votecove?.identify(r.data.token);
  }
}
