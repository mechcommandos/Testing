// Accueil : les boutons « iPhone · iPad » et « Android » installent Layjou sur l'appareil (application web).
// Android, Chrome et Edge : invite d'installation du système. iPhone et iPad : pas d'invite possible, on explique
// « Partager → Sur l'écran d'accueil » dans Safari. Ailleurs : on explique comment faire depuis le bon appareil.
(() => {
  let deferred = null;
  const dialog = document.getElementById('s-install');
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event;
  });
  window.addEventListener('appinstalled', () => { deferred = null; });

  // Le service worker de l'application rend l'installation possible depuis l'accueil (même portée que app.html).
  if (dialog && 'serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register(dialog.dataset.sw, { scope: dialog.dataset.scope }).catch(() => {});
  }

  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const text = (key) => dialog.querySelector(`template[data-key="${key}"]`)?.innerHTML ?? '';

  function explain(titleKey, textKey) {
    dialog.querySelector('[data-t="title"]').innerHTML = text(titleKey);
    dialog.querySelector('[data-t="text"]').innerHTML = text(textKey);
    dialog.showModal();
  }

  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-install]');
    if (!button || !dialog || typeof dialog.showModal !== 'function') return; // sinon : le lien ouvre la version web
    event.preventDefault();
    const target = button.dataset.install;
    if (installed()) { location.href = dialog.dataset.app; return; }
    if (target === 'android' && deferred) {
      deferred.prompt();
      const { outcome } = await deferred.userChoice;
      deferred = null;
      if (outcome === 'accepted') explain('doneTitle', 'doneText');
      return;
    }
    if (target === 'ios') explain('iosTitle', isIos ? 'iosText' : 'iosOther');
    else explain('androidTitle', isAndroid ? 'androidText' : 'androidOther');
  });
})();

// Accordéon des collections : une seule ouverte à la fois, même sur les navigateurs qui ignorent <details name>.
document.addEventListener('toggle', (event) => {
  const opened = event.target;
  if (!(opened instanceof HTMLDetailsElement) || !opened.open || opened.getAttribute('name') !== 'collections') return;
  for (const other of document.querySelectorAll('details[name="collections"][open]')) if (other !== opened) other.open = false;
}, true);
