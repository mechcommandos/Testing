/*
 * Publicités : vidéos récompensées AdMob via @capacitor-community/admob.
 * Dans un navigateur (pas de natif), une fausse publicité de 5 s est affichée
 * pour pouvoir tester le déroulement du jeu.
 */
(function () {
  const cfg = window.LAYJOU_CONFIG.ads;
  const Cap = window.Capacitor;
  const isNative = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  const AdMob = isNative ? Cap.Plugins.AdMob : null;
  const platform = isNative ? Cap.getPlatform() : 'web';

  let ready = false;      // une vidéo est préchargée
  let loading = null;     // promesse de chargement en cours
  let initDone = null;

  function adId() {
    return platform === 'ios' ? cfg.rewarded.ios : cfg.rewarded.android;
  }

  let privacyRequired = false;
  /** Vrai quand les règles de consentement de Google exigent un accès aux options de confidentialité (EEE, Royaume-Uni, Suisse). */
  function hasPrivacyOptions() { return !!AdMob && privacyRequired; }
  async function showPrivacyOptions() {
    if (!AdMob) return;
    try { await AdMob.showPrivacyOptionsForm(); } catch (e) { console.warn('privacy options', e); }
  }

  async function init() {
    if (!AdMob) return;
    if (initDone) return initDone;
    initDone = (async () => {
      try {
        await AdMob.initialize({ initializeForTesting: cfg.testMode });
        // Consentement RGPD (UMP) + suivi iOS (ATT)
        try {
          const info = await AdMob.requestConsentInfo();
          if (info && info.isConsentFormAvailable && info.status === 'REQUIRED') {
            await AdMob.showConsentForm();
          }
          privacyRequired = !!info && String(info.privacyOptionsRequirementStatus) === 'REQUIRED';
        } catch (e) { console.warn('consent', e); }
        if (platform === 'ios') {
          try {
            const st = await AdMob.trackingAuthorizationStatus();
            if (st && st.status === 'notDetermined') await AdMob.requestTrackingAuthorization();
          } catch (e) { console.warn('att', e); }
        }
      } catch (e) { console.warn('admob init', e); }
      preload();
    })();
    return initDone;
  }

  function preload() {
    if (!AdMob || ready) return Promise.resolve(ready);
    if (loading) return loading;
    loading = AdMob.prepareRewardVideoAd({ adId: adId(), isTesting: cfg.testMode })
      .then(() => { ready = true; })
      .catch((e) => { console.warn('rewarded load', e); ready = false; })
      .then(() => { loading = null; return ready; });
    return loading;
  }

  /** Affiche une vidéo récompensée. Résout `true` si la récompense est acquise. */
  async function showRewarded() {
    if (!AdMob) return simulate();
    await init();
    if (!ready) await preload();
    if (!ready) return false;

    return new Promise((resolve) => {
      let rewarded = false, done = false;
      const handles = [];
      const finish = () => {
        if (done) return; done = true;
        handles.forEach((h) => Promise.resolve(h).then((x) => x && x.remove && x.remove()));
        ready = false;
        preload();                       // prépare la suivante
        resolve(rewarded);
      };
      handles.push(AdMob.addListener('onRewardedVideoAdReward', () => { rewarded = true; }));
      handles.push(AdMob.addListener('onRewardedVideoAdDismissed', () => setTimeout(finish, 50)));
      handles.push(AdMob.addListener('onRewardedVideoAdFailedToShow', finish));
      AdMob.showRewardVideoAd().then((r) => { if (r) rewarded = true; }).catch(finish);
    });
  }

  function simulate() {
    return new Promise((resolve) => {
      const el = document.createElement('div');
      el.className = 'sim-ad';
      el.innerHTML = '<div class="sim-ad-box"><div class="sim-ad-tag"></div><div class="sim-ad-emoji">🎬</div><div class="sim-ad-count"></div></div>';
      el.querySelector('.sim-ad-tag').textContent = t('simAd');
      document.body.appendChild(el);
      let n = 5;
      const tick = () => {
        if (n <= 0) { el.remove(); resolve(true); return; }
        el.querySelector('.sim-ad-count').textContent = t('simAdSkip', { n });
        n--; setTimeout(tick, 1000);
      };
      tick();
    });
  }

  window.Ads = { init, preload, showRewarded, isNative, hasPrivacyOptions, showPrivacyOptions };
})();
