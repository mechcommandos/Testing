// Mesure d'audience (Google Tag Manager) avec accord préalable.
// Rien n'est chargé ni déposé tant que le visiteur n'a pas cliqué sur « Accepter ». Le choix est gardé 6 mois sur
// l'appareil (localStorage « layjou-consent »), puis redemandé. « Refuser » est aussi simple qu'« Accepter ».
// Les fonctions publicitaires de Google restent refusées dans tous les cas (mode de consentement).
// Un élément [data-consent-open] (page Cookies) rouvre le choix.
// À part, sans cookie ni accord nécessaire : un signal de visite interne (page vue, plateforme), compté côté serveur
// sous forme d'empreinte quotidienne, jamais envoyé dans les applications des stores.
(() => {
  // Applications des stores (Android, iOS) : jamais de mesure d'audience (applications pour enfants : règles d'Apple
  // et du programme Familles de Google). Même détection que js/core/native.js.
  try {
    if (/LayjouIOS\//.test(navigator.userAgent)) return;
    if (document.referrer.indexOf('android-app://com.layjou.games') === 0) sessionStorage.setItem('layjou-twa', '1');
    if (sessionStorage.getItem('layjou-twa') === '1') return;
  } catch { /* stockage indisponible : site */ }
  const GTM_ID = 'GTM-KZ7FKVDT';
  // data-banner="off" (application des jeux) : pas de bandeau ; la mesure ne se fait que si l'accord a été donné sur le site.
  const NO_BANNER = document.currentScript?.dataset.banner === 'off';
  // Racine du site, déduite de l'adresse de ce script (…/js/consent.js), sur toutes les pages et dans l'application.
  const BASE = (document.currentScript?.src || `${location.origin}/js/consent.js`).replace(/js\/consent\.js.*$/, '');
  // Mesure interne sans cookie (espace admin), indépendante de Google et du choix ci-dessous : une visite par page.
  try {
    let page = location.pathname.slice(new URL(BASE).pathname.length).replace(/(index)?\.html$/, '').replace(/\/+$/, '');
    page = page.toLowerCase().replace(/[^a-z0-9/-]/g, '').replace(/\//g, '-').slice(0, 40) || 'accueil';
    if (document.querySelector('meta[name="layjou-page"]')) page = document.querySelector('meta[name="layjou-page"]').content;
    if (/^[a-z0-9-]{1,40}$/.test(page) && typeof fetch === 'function') {
      fetch(`${BASE}api/analytics/event`, {
        method: 'POST', keepalive: true, credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-Layjou': '1' },
        body: JSON.stringify({ type: 'visit', page, platform: 'web' }),
      }).catch(() => {});
    }
  } catch { /* mesure facultative */ }
  const KEY = 'layjou-consent';
  const MAX_AGE = 183 * 24 * 3600 * 1000;
  const lang = (document.documentElement.lang || 'fr').slice(0, 2);
  const T = {
    fr: { text: 'Avec votre accord, Layjou mesure sa fréquentation avec Google Analytics (pages vues, appareil), pour savoir quels jeux plaisent. Aucune publicité, aucun profil publicitaire.', accept: 'Accepter', refuse: 'Refuser', more: 'En savoir plus', aria: 'Cookies de mesure d’audience' },
    en: { text: 'With your consent, Layjou measures its audience with Google Analytics (pages viewed, device) to learn which games children enjoy. No ads, no advertising profile.', accept: 'Accept', refuse: 'Decline', more: 'Learn more', aria: 'Audience measurement cookies' },
    es: { text: 'Con su consentimiento, Layjou mide su audiencia con Google Analytics (páginas vistas, dispositivo) para saber qué juegos gustan. Sin publicidad ni perfil publicitario.', accept: 'Aceptar', refuse: 'Rechazar', more: 'Más información', aria: 'Cookies de medición de audiencia' },
  }[lang] ?? null;
  const t = T ?? {
    text: 'Avec votre accord, Layjou mesure sa fréquentation avec Google Analytics (pages vues, appareil), pour savoir quels jeux plaisent. Aucune publicité, aucun profil publicitaire.', accept: 'Accepter', refuse: 'Refuser', more: 'En savoir plus', aria: 'Cookies de mesure d’audience',
  };

  const read = () => {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || 'null');
      return v && Date.now() - v.at < MAX_AGE ? v.choice : null;
    } catch { return null; }
  };
  const save = (choice) => { try { localStorage.setItem(KEY, JSON.stringify({ choice, at: Date.now() })); } catch { /* choix pour cette visite seulement */ } };

  let loaded = false;
  function loadGtm() {
    if (loaded) return;
    loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    window.gtag('js', new Date());
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
    document.head.append(s);
  }

  /** Après un refus : efface les cookies Google Analytics déjà déposés (sur ce domaine et le domaine parent). */
  function clearCookies() {
    const host = location.hostname;
    const domains = ['', host, `.${host}`, `.${host.split('.').slice(-2).join('.')}`];
    for (const c of document.cookie.split(';')) {
      const name = c.split('=')[0].trim();
      if (!/^(_ga|_gid|_gat)/.test(name)) continue;
      for (const d of domains) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? `; domain=${d}` : ''}`;
    }
  }

  function style() {
    if (document.getElementById('consent-style')) return;
    const st = document.createElement('style');
    st.id = 'consent-style';
    st.textContent = '.cookie-consent{position:fixed;left:12px;right:12px;bottom:12px;z-index:60;max-width:640px;margin:0 auto;background:#fff;color:#23324d;border:1px solid #d8e1ec;border-radius:18px;box-shadow:0 10px 40px rgba(10,20,40,.25);padding:16px 18px;font:15px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}'
      + '.cookie-consent p{margin:0 0 12px}.cookie-consent a{color:#1a56b8}.cookie-consent-actions{display:flex;gap:10px;flex-wrap:wrap}'
      + '.cookie-consent button{flex:1 1 140px;min-height:44px;border-radius:12px;font:inherit;font-weight:700;cursor:pointer;border:2px solid #1a56b8}'
      + '.cookie-consent .c-yes{background:#1a56b8;color:#fff}.cookie-consent .c-no{background:#fff;color:#1a56b8}'
      + 'html[data-theme="dark"] .cookie-consent{background:#1f2733;color:#e8eef7;border-color:#323d4d}html[data-theme="dark"] .cookie-consent .c-no{background:transparent;color:#9cc2ff;border-color:#9cc2ff}html[data-theme="dark"] .cookie-consent a{color:#9cc2ff}';
    document.head.append(st);
  }

  function banner() {
    if (document.querySelector('.cookie-consent')) return;
    style();
    const cookiesUrl = `${BASE}cookies/`;
    const box = document.createElement('div');
    box.className = 'cookie-consent';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', t.aria);
    const p = document.createElement('p');
    p.textContent = `${t.text} `;
    const a = document.createElement('a');
    a.href = cookiesUrl;
    a.textContent = t.more;
    p.append(a);
    const actions = document.createElement('div');
    actions.className = 'cookie-consent-actions';
    const no = document.createElement('button');
    no.type = 'button'; no.className = 'c-no'; no.textContent = t.refuse;
    const yes = document.createElement('button');
    yes.type = 'button'; yes.className = 'c-yes'; yes.textContent = t.accept;
    no.addEventListener('click', () => { save('denied'); clearCookies(); box.remove(); });
    yes.addEventListener('click', () => { save('granted'); box.remove(); loadGtm(); });
    actions.append(no, yes);
    box.append(p, actions);
    document.body.append(box);
  }

  const start = () => {
    const choice = read();
    if (choice === 'granted') loadGtm();
    else if (choice !== 'denied' && !NO_BANNER) banner();
    document.addEventListener('click', (e) => {
      if (!e.target.closest?.('[data-consent-open], a[href$="#gerer-cookies"]')) return;
      e.preventDefault();
      try { localStorage.removeItem(KEY); } catch { /* rien */ }
      banner();
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
