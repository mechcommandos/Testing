/*
 * Écran de démarrage des applications installées (Android, écran d'accueil iOS ou ordinateur) : la mascotte et le logo
 * restent affichés au moins 3 secondes depuis le lancement, puis s'effacent. L'application Android montre la même image
 * (même taille, centrée, fond blanc) avant le chargement de la page : on passe de l'une à l'autre sans saut.
 * Une seule fois par lancement ; jamais dans un onglet de navigateur ordinaire.
 */
(function () {
  var MIN_MS = 3000;
  var installed = false;
  try {
    installed = document.referrer.indexOf('android-app://com.layjou.games') === 0
      || matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches
      || navigator.standalone === true;
    if (!installed || sessionStorage.getItem('layjou-splash') === '1') return;
    sessionStorage.setItem('layjou-splash', '1');
  } catch (e) {
    if (!installed) return;
  }
  var screen = document.createElement('div');
  screen.setAttribute('role', 'img');
  screen.setAttribute('aria-label', 'Layjou');
  screen.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:#fff;transition:opacity .45s ease';
  var art = document.createElement('img');
  art.src = 'assets/img/splash.webp';
  art.alt = '';
  art.style.cssText = 'width:300px;max-width:80vw;max-height:80vh;height:auto;object-fit:contain';
  screen.appendChild(art);
  document.documentElement.appendChild(screen);
  var wait = Math.max(0, MIN_MS - (window.performance ? performance.now() : 0));
  setTimeout(function () {
    screen.style.opacity = '0';
    setTimeout(function () { screen.remove(); }, 500);
  }, wait);
})();
