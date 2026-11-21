/* =========================================================
   Vidéos récompensées AdMob (applications Android et iOS).
   Sur le web, `ads.available` vaut false et rien ne s'affiche.
   ========================================================= */

// Compte AdMob pub-6003645213510535, application ca-app-pub-6003645213510535~7951613295
// (identifiant d'application dans android/app/src/main/res/values/strings.xml et ios/App/App/Info.plist).
const REWARDED_UNITS = {
  android: 'ca-app-pub-6003645213510535/3086524765',
  ios: 'ca-app-pub-6003645213510535/3086524765',
};
// Annonces de test : false pour les stores ; `npm run android:demo` le passe à true le temps de compiler l'APK de démo.
// Ne cliquez jamais sur vos propres annonces réelles : déclarez votre téléphone dans AdMob › Paramètres › Appareils de test.
const TEST_ADS = false;

const core = window.capacitorExports;
const platform = core?.Capacitor?.getPlatform?.() ?? 'web';
const AdMob = core?.Capacitor?.isNativePlatform?.() ? core.registerPlugin('AdMob') : null;

let pending = null;      // résolution de la vidéo en cours
let rewarded = false;
let retryTimer = 0;

export const ads = {
  available: !!AdMob && !!REWARDED_UNITS[platform],
  ready: false,
  onChange: () => {},

  async init() {
    if (!this.available) return;
    try {
      // Consentement (RGPD) puis autorisation de suivi sur iOS
      let consent = await AdMob.requestConsentInfo();
      if (consent.isConsentFormAvailable && consent.status === 'REQUIRED') consent = await AdMob.showConsentForm();
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
    } catch (e) { this.available = false; this.onChange(); }
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
