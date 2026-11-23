// Pages publiques : thème clair par défaut, sombre seulement si le visiteur l'a choisi (boutons du pied de page).
// Le thème du système n'est pas suivi. Chargé dans <head>, sans defer, pour appliquer le thème avant le premier affichage.
(() => {
  const root = document.documentElement;
  const KEY = 'layjou-theme';
  root.dataset.theme = 'light';
  try {
    if (localStorage.getItem(KEY) === 'dark') root.dataset.theme = 'dark';
  } catch { /* stockage indisponible : thème clair */ }
  const sync = () => {
    for (const b of document.querySelectorAll('[data-set-theme]')) b.setAttribute('aria-pressed', String(b.dataset.setTheme === root.dataset.theme));
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-set-theme]');
    if (!b) return;
    root.dataset.theme = b.dataset.setTheme;
    try { localStorage.setItem(KEY, b.dataset.setTheme); } catch { /* choix gardé pour cette page seulement */ }
    sync();
  });
  document.addEventListener('DOMContentLoaded', sync);
})();
