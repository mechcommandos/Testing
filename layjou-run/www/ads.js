/* =========================================================
   Vidéos récompensées AdMob (applications Android et iOS).
   Sur le web, `ads.available` vaut false et rien ne s'affiche.
   ========================================================= */

// Compte AdMob pub-6003645213510535, application ca-app-pub-6003645213510535~4833816740
// (identifiant d'application dans android/app/src/main/res/values/strings.xml et ios/App/App/Info.plist).
const REWARDED_UNITS = {
  android: 'ca-app-pub-6003645213510535/3309442507',
  ios: 'ca-app-pub-6003645213510535/3309442507',
};
// Annonces de test : false pour les stores ; `npm run android:demo` le passe à true le temps de compiler l'APK de démo.
// Ne cliquez jamais sur vos propres annonces réelles : déclarez votre téléphone dans AdMob › Paramètres › Appareils de test.
const TEST_ADS = false;
// Interstitiels rares avant une nouvelle course : jamais avant la 4ᵉ, au plus une course sur 3, 150 s minimum entre deux.
const INTERSTITIAL = { android: 'ca-app-pub-6003645213510535/6710677647', ios: 'ca-app-pub-6003645213510535/6710677647', enabled: true, skipFirstGames: 3, everyNGames: 3, minSecondsBetween: 150 };
// Politique de confidentialité (lien dans le menu ; exigé par Apple et Google).
export const PRIVACY_URL = 'https://layjou.com/confidentialite/';

const core = window.capacitorExports;
const platform = core?.Capacitor?.getPlatform?.() ?? 'web';
const AdMob = core?.Capacitor?.isNativePlatform?.() ? core.registerPlugin('AdMob') : null;

let pending = null;      // résolution de la vidéo en cours
let rewarded = false;
let retryTimer = 0;
let interLoaded = false, interGames = 0, interSince = 0, interLast = Date.now();
function preloadInter() {
  const I = INTERSTITIAL;
  if (!AdMob || !I || !I.enabled || interLoaded) return;
  AdMob.prepareInterstitial({ adId: I[platform], isTesting: TEST_ADS }).then(() => { interLoaded = true; }).catch((e) => console.warn('[ads] interstitiel', e));
}

export const ads = {
  available: !!AdMob && !!REWARDED_UNITS[platform],
  ready: false,
  privacyRequired: false,
  onChange: () => {},

  async init() {
    if (!this.available) return;
    try {
      // Consentement (RGPD) puis autorisation de suivi sur iOS
      let consent = await AdMob.requestConsentInfo();
      if (consent.isConsentFormAvailable && consent.status === 'REQUIRED') consent = await AdMob.showConsentForm();
      this.privacyRequired = String(consent.privacyOptionsRequirementStatus) === 'REQUIRED';
      if (consent.canRequestAds === false) { this.available = false; this.onChange(); return; }
    } catch (e) { /* pas de formulaire configuré : on continue */ }
    try {
      if (platform === 'ios') await AdMob.requestTrackingAuthorization();
    } catch (e) { /* refus ou indisponible */ }
    try {
      await AdMob.initialize({ initializeForTesting: TEST_ADS });
      AdMob.addListener('onRewardedVideoAdReward', () => { rewarded = true; });
      AdMob.addListener('onRewardedVideoAdDismissed', () => finish());
      AdMob.addListener('onRewardedVideoAdFailedToShow', () => finish());
      this.load();
      preloadInter();
    } catch (e) { this.available = false; this.onChange(); }
  },

  /** Vrai quand les règles de consentement de Google exigent un accès aux options de confidentialité (EEE, Royaume-Uni, Suisse). */
  /** Avant chaque course : affiche parfois un interstitiel et attend sa fermeture. */
  async maybeInterstitial() {
    const I = INTERSTITIAL;
    interGames++; interSince++;
    if (!AdMob || !I || !I.enabled) return;
    if (!interLoaded) { preloadInter(); return; }
    if (interGames <= I.skipFirstGames || interSince < I.everyNGames || Date.now() - interLast < I.minSecondsBetween * 1000) return;
    await new Promise((resolve) => {
      const hs = [];
      const done = () => { hs.forEach((h) => Promise.resolve(h).then((x) => x && x.remove && x.remove())); interLoaded = false; interSince = 0; interLast = Date.now(); preloadInter(); resolve(); };
      hs.push(AdMob.addListener('interstitialAdDismissed', done), AdMob.addListener('interstitialAdFailedToShow', done));
      AdMob.showInterstitial().catch(done);
    });
  },

  hasPrivacyOptions() { return !!AdMob && this.privacyRequired; },

  /** Formulaire de Google pour modifier son consentement publicitaire ; réactive les vidéos si le joueur les accepte. */
  async showPrivacyOptions() {
    if (!AdMob) return;
    try {
      await AdMob.showPrivacyOptionsForm();
      const c = await AdMob.requestConsentInfo();
      if (c.canRequestAds && !this.available && REWARDED_UNITS[platform]) { this.available = true; await this.init(); this.onChange(); }
    } catch (e) { /* formulaire indisponible */ }
  },

  async load() {
    if (!this.available || this.ready) return;
    clearTimeout(retryTimer);
    try {
      await AdMob.prepareRewardVideoAd({ adId: REWARDED_UNITS[platform], isTesting: TEST_ADS });
      this.ready = true;
    } catch (e) {
      retryTimer = setTimeout(() => this.load(), 30000);   // pas d'annonce ou pas de réseau
    }
    this.onChange();
  },

  /** Affiche la vidéo. Résout à true si le joueur l'a regardée jusqu'à la récompense. */
  show() {
    if (!this.available || !this.ready || pending) return Promise.resolve(false);
    this.ready = false; rewarded = false;
    this.onChange();
    return new Promise((resolve) => {
      pending = resolve;
      AdMob.showRewardVideoAd().catch(() => finish());
    });
  },
};

function finish() {
  if (!pending) return;
  const resolve = pending; pending = null;
  resolve(rewarded);
  ads.load();   // prépare la vidéo suivante
}
