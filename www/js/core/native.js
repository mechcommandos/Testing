/**
 * Application des stores ou site ? L'application Android (Trusted Web Activity) est reconnue à son lancement par le
 * référent « android-app://com.layjou.games » (gardé pour la session : il disparaît dès la navigation suivante),
 * l'application iOS par son agent utilisateur « LayjouIOS/… ».
 * Dans les applications : pas d'achat de l'offre Famille ni de lien vers un paiement (règles d'Apple et de Google),
 * pas de mesure d'audience (applications pour enfants). Même détection dans js/consent.js (script classique).
 */
export function nativeApp() {
  try {
    if (/LayjouIOS\//.test(navigator.userAgent)) return 'ios';
    if (document.referrer.startsWith('android-app://com.layjou.games')) sessionStorage.setItem('layjou-twa', '1');
    if (sessionStorage.getItem('layjou-twa') === '1') return 'android';
  } catch { /* stockage indisponible : site */ }
  return null;
}

export const inStoreApp = () => nativeApp() !== null;

if (typeof document !== 'undefined' && inStoreApp()) document.documentElement.classList.add('native-app');

// Application iOS : pas de zoom par pincement (le site garde le zoom, utile pour l'accessibilité).
if (typeof document !== 'undefined' && nativeApp() === 'ios') {
  document.querySelector('meta[name="viewport"]')?.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
}

/**
 * Pont vers l'application iOS (WKWebView) : window.webkit.messageHandlers.layjou.postMessage({ cmd, … }).
 * Retourne true si le message est parti, false hors de l'application iOS.
 */
export function nativeCall(cmd, data = {}) {
  try {
    const bridge = globalThis.webkit?.messageHandlers?.layjou;
    if (nativeApp() !== 'ios' || !bridge) return false;
    bridge.postMessage({ cmd, ...data });
    return true;
  } catch {
    return false;
  }
}

/** Petite vibration de retour (iOS) : « success » (réussite) ou « light » (appui). Jamais pour une erreur. */
export const haptic = (kind = 'light') => nativeCall('haptic', { kind });

/** iOS : la page en PDF A4 dans la feuille de partage (imprimer, Fichiers, mail). */
export const nativeShare = (title) => nativeCall('share', { title });

function toBase64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** iOS : un fichier (texte, Blob ou ArrayBuffer) dans la feuille de partage. Retourne une promesse de true/false. */
export async function shareFile(name, content) {
  if (typeof content === 'string') return nativeCall('shareFile', { name, text: content });
  try {
    const buffer = await new Blob([content]).arrayBuffer(); // Blob, ArrayBuffer ou tableau d'octets
    return nativeCall('shareFile', { name, base64: toBase64(new Uint8Array(buffer)) });
  } catch {
    return false;
  }
}

/** Ouvre un lien externe : dans l'application iOS par la vue Safari intégrée (https seulement), sinon un nouvel onglet. */
export function openExternal(url) {
  if (nativeApp() === 'ios') {
    nativeCall('openExternal', { url });
    return;
  }
  window.open(url, '_blank', 'noopener');
}
