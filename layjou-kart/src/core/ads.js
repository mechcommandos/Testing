/* AdMob : vidéos récompensées + interstitiels (avec repli simulé sur le web). */
import { Capacitor } from '@capacitor/core';
import { CONFIG } from './config.js';
import { S, save } from './state.js';

const native = Capacitor.isNativePlatform();
const platform = Capacitor.getPlatform();
let AdMob = null, RewardEv = null, InterEv = null;
let rewardedReady = false, rewardedLoading = false, interReady = false, interLoading = false;
let hooks = { before() {}, after() {} };

const unit = (kind) => (CONFIG.ads[platform] || CONFIG.ads.android)[kind];
const adOpts = (kind) => ({ adId: unit(kind), isTesting: CONFIG.ads.useTestAds, npa: CONFIG.ads.childDirected, immersiveMode: true });

async function loadRewarded() {
  if (!AdMob || rewardedReady || rewardedLoading) return;
  rewardedLoading = true;
  try { await AdMob.prepareRewardVideoAd(adOpts('rewarded')); rewardedReady = true; } catch { rewardedReady = false; }
  rewardedLoading = false;
}
async function loadInterstitial() {
  if (!AdMob || interReady || interLoading || S.data.noAds || !CONFIG.ads.interstitial.enabled || !unit('interstitial')) return;
  interLoading = true;
  try { await AdMob.prepareInterstitial(adOpts('interstitial')); interReady = true; } catch { interReady = false; }
  interLoading = false;
}

/** Fausse publicité pour le navigateur / le mode démo : permet de tester tous les parcours. */
function fakeAd(label, seconds = 3) {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'fake-ad';
    el.innerHTML = `<div class="fake-ad-box"><div class="fake-ad-tag">AD · DEMO</div><div class="fake-ad-title">${label}</div><div class="fake-ad-bar"><i></i></div><button class="fake-ad-skip" disabled>${seconds}</button></div>`;
    document.body.appendChild(el);
    const btn = el.querySelector('button'), bar = el.querySelector('i');
    requestAnimationFrame(() => { bar.style.transition = `width ${seconds}s linear`; bar.style.width = '100%'; });
    let left = seconds;
    const iv = setInterval(() => { left--; if (left <= 0) { clearInterval(iv); btn.disabled = false; btn.textContent = '✕'; } else btn.textContent = String(left); }, 1000);
    btn.addEventListener('click', () => { el.remove(); resolve(true); });
  });
}

export const Ads = {
  native,
  /** `before`/`after` : coupe le son et met le jeu en pause pendant une pub. */
  setHooks(h) { hooks = { ...hooks, ...h }; },

  async init() {
    if (!native) return;
    try {
      const m = await import('@capacitor-community/admob');
      AdMob = m.AdMob; RewardEv = m.RewardAdPluginEvents; InterEv = m.InterstitialAdPluginEvents;
      await AdMob.initialize({
        initializeForTesting: CONFIG.ads.useTestAds,
        tagForChildDirectedTreatment: CONFIG.ads.childDirected,
        tagForUnderAgeOfConsent: CONFIG.ads.childDirected,
        ...(CONFIG.ads.childDirected ? { maxAdContentRating: m.MaxAdContentRating.General } : {}),
      });
      // Consentement RGPD (UMP) puis autorisation de suivi iOS (ATT)
      try {
        const info = await AdMob.requestConsentInfo({ tagForUnderAgeOfConsent: CONFIG.ads.childDirected });
        if (info.isConsentFormAvailable && info.status === m.AdmobConsentStatus.REQUIRED) await AdMob.showConsentForm();
      } catch { /* pas de formulaire configuré dans AdMob */ }
      if (platform === 'ios' && !CONFIG.ads.childDirected) {
        try { const st = await AdMob.trackingAuthorizationStatus(); if (st.status === 'notDetermined') await AdMob.requestTrackingAuthorization(); } catch { /* iOS < 14 */ }
      }
      AdMob.addListener(RewardEv.FailedToLoad, () => { rewardedReady = false; });
      AdMob.addListener(InterEv.FailedToLoad, () => { interReady = false; });
      loadRewarded(); loadInterstitial();
    } catch (err) { console.warn('[ads] init', err); AdMob = null; }
  },

  /** Ouvre le formulaire de confidentialité (bouton obligatoire dans les réglages en UE). */
  async privacyOptions() { try { if (AdMob) await AdMob.showPrivacyOptionsForm(); } catch { /* non requis */ } },

  /**
   * Affiche une vidéo récompensée.
   * @param {string} label  texte affiché en mode démo
   * @returns {Promise<boolean>} true si la récompense est acquise
   */
  async showRewarded(label = 'Rewarded video') {
    hooks.before();
    let ok = false;
    try {
      if (!AdMob) ok = await fakeAd(label);
      else {
        if (!rewardedReady) await loadRewarded();
        if (rewardedReady) {
          ok = await new Promise((resolve) => {
            let earned = false, settled = false; const subs = [];
            const done = (v) => { if (settled) return; settled = true; subs.forEach((s) => s.then((h) => h.remove()).catch(() => {})); resolve(v); };
            subs.push(AdMob.addListener(RewardEv.Rewarded, () => { earned = true; }));
            subs.push(AdMob.addListener(RewardEv.Dismissed, () => setTimeout(() => done(earned), 120)));
            subs.push(AdMob.addListener(RewardEv.FailedToShow, () => done(false)));
            AdMob.showRewardVideoAd().then(() => { earned = true; }).catch(() => done(earned));
            setTimeout(() => done(earned), 120000);
          });
          rewardedReady = false;
        }
      }
    } catch { ok = false; }
    hooks.after();
    if (ok) { S.data.stats.videos++; save(); }
    loadRewarded();
    return ok;
  },

  /** Interstitiel (la décision d'affichage appartient au Flow Engine). */
  async showInterstitial() {
    if (S.data.noAds) return false;
    if (!AdMob) return false; // pas d'interstitiel simulé : inutile en démo
    if (!interReady) { loadInterstitial(); return false; }
    hooks.before();
    let shown = false;
    try {
      shown = await new Promise((resolve) => {
        let settled = false; const subs = [];
        const done = (v) => { if (settled) return; settled = true; subs.forEach((s) => s.then((h) => h.remove()).catch(() => {})); resolve(v); };
        subs.push(AdMob.addListener(InterEv.Dismissed, () => done(true)));
        subs.push(AdMob.addListener(InterEv.FailedToShow, () => done(false)));
        AdMob.showInterstitial().catch(() => done(false));
        setTimeout(() => done(true), 90000);
      });
    } catch { shown = false; }
    interReady = false; hooks.after(); loadInterstitial();
    return shown;
  },
};
