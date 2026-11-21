// Layjou Bubble — rewarded ads through @capacitor-community/admob.
// In a plain browser (no native shell) a short simulated ad is shown so the flow can be tested.

const cfg = window.LAYJOU_CONFIG.admob;
const cap = window.capacitorExports;
const native = !!(cap && cap.Capacitor.isNativePlatform());
const AdMob = native ? cap.registerPlugin('AdMob') : null;
const platform = native ? cap.Capacitor.getPlatform() : 'web';
const adId = cfg.rewarded[platform];

let ready = false;
let privacyRequired = false;
let loading = null;

function preload() {
  if (!AdMob || ready) return Promise.resolve(ready);
  if (!loading) {
    loading = AdMob.prepareRewardVideoAd({ adId, isTesting: cfg.testing })
      .then(() => { ready = true; })
      .catch((e) => { console.warn('[ads] load failed', e); ready = false; })
      .then(() => { loading = null; return ready; });
  }
  return loading;
}

export async function initAds() {
  if (!AdMob) return;
  try {
    await AdMob.initialize({ initializeForTesting: cfg.testing });
    // GDPR / UMP consent (shows Google's form where it is required).
    try {
      const info = await AdMob.requestConsentInfo();
      if (info.isConsentFormAvailable && info.status === 'REQUIRED') await AdMob.showConsentForm();
      privacyRequired = String(info.privacyOptionsRequirementStatus) === 'REQUIRED';
    } catch (e) { console.warn('[ads] consent', e); }
    // iOS App Tracking Transparency prompt.
    if (platform === 'ios') { try { await AdMob.requestTrackingAuthorization(); } catch (e) { /* ignore */ } }
    preload();
  } catch (e) {
    console.warn('[ads] init failed', e);
  }
}

/** True when Google's consent rules require an "ad privacy options" entry point (EEA, UK, Switzerland). */
export function hasPrivacyOptions() { return !!AdMob && privacyRequired; }
/** Opens Google's privacy options form so the player can change their ad consent choices. */
export async function showPrivacyOptions() {
  if (!AdMob) return;
  try { await AdMob.showPrivacyOptionsForm(); } catch (e) { console.warn('[ads] privacy options', e); }
}

/**
 * Shows a rewarded ad.
 * @returns {Promise<'rewarded'|'skipped'|'unavailable'>}
 */
export async function showRewarded(texts) {
  if (!AdMob) return simulate(texts);
  if (!(await preload())) return 'unavailable';
  ready = false;
  let rewarded = false;
  const handles = [];
  const closed = new Promise((resolve) => {
    handles.push(AdMob.addListener('onRewardedVideoAdReward', () => { rewarded = true; }));
    handles.push(AdMob.addListener('onRewardedVideoAdDismissed', () => resolve(true)));
    handles.push(AdMob.addListener('onRewardedVideoAdFailedToShow', () => resolve(false)));
  });
  let shown;
  try {
    AdMob.showRewardVideoAd().then(() => { rewarded = true; }).catch(() => {});
    shown = await closed;
  } finally {
    for (const h of handles) Promise.resolve(h).then((x) => x && x.remove && x.remove());
    preload(); // get the next one ready
  }
  if (!shown) return 'unavailable';
  return rewarded ? 'rewarded' : 'skipped';
}

function simulate(texts) {
  return new Promise((resolve) => {
    const el = document.getElementById('fakeAd');
    const count = document.getElementById('fakeAdCount');
    document.getElementById('fakeAdText').textContent = texts.fakeAd;
    let n = 3;
    count.textContent = n;
    el.classList.add('show');
    const timer = setInterval(() => {
      n--;
      count.textContent = n;
      if (n <= 0) {
        clearInterval(timer);
        el.classList.remove('show');
        resolve('rewarded');
      }
    }, 800);
  });
}
