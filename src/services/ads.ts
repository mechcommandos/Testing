/**
 * Publicités : vidéos récompensées AdMob (@capacitor-community/admob).
 *
 * - Consentement RGPD via la plateforme UMP de Google (obligatoire en Europe).
 * - Une vidéo est préchargée en permanence pour s'afficher sans attente.
 * - La récompense n'est accordée que si le SDK confirme que la vidéo a été vue en entier.
 * - Dans un navigateur, en mode bac à sable, une fausse vidéo de 3 s permet de tester les parcours.
 */
import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  AdmobConsentStatus,
  MaxAdContentRating,
  RewardAdPluginEvents,
} from '@capacitor-community/admob';
import { ADMOB, SANDBOX } from '../config';
import { t } from '../i18n';
import { suspendAudio } from './audio';

const native = Capacitor.isNativePlatform();
const platform = Capacitor.getPlatform();

let ready = false; // SDK initialisé et autorisé à demander des pubs
let loaded = false;
let loading: Promise<boolean> | null = null;
let privacyOptions = false;
let retry = 0;

function unitId(): string {
  return platform === 'ios' ? ADMOB.rewarded.ios : ADMOB.rewarded.android;
}

async function preload(): Promise<boolean> {
  if (!ready) return false;
  if (loaded) return true;
  if (loading) return loading;
  loading = AdMob.prepareRewardVideoAd({ adId: unitId(), isTesting: ADMOB.testing })
    .then(() => {
      loaded = true;
      retry = 0;
      return true;
    })
    .catch((e) => {
      console.warn('[ads] chargement impossible', e);
      // nouvelle tentative espacée (30 s, 60 s, 120 s… plafonnée à 5 min)
      const delay = Math.min(300, 30 * 2 ** retry++) * 1000;
      setTimeout(() => void preload(), delay);
      return false;
    })
    .finally(() => {
      loading = null;
    });
  return loading;
}

export const ads = {
  async init(): Promise<void> {
    if (!native) return;
    try {
      await AdMob.initialize({
        initializeForTesting: ADMOB.testing,
        tagForChildDirectedTreatment: ADMOB.childDirected,
        maxAdContentRating: MaxAdContentRating.General,
      });

      // iOS : autorisation de suivi (ATT) avant le formulaire de consentement
      if (platform === 'ios') {
        const { status } = await AdMob.trackingAuthorizationStatus();
        if (status === 'notDetermined') await AdMob.requestTrackingAuthorization();
      }

      let info = await AdMob.requestConsentInfo({ tagForUnderAgeOfConsent: ADMOB.childDirected });
      if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) {
        info = await AdMob.showConsentForm();
      }
      privacyOptions = String(info.privacyOptionsRequirementStatus) === 'REQUIRED';
      ready = info.canRequestAds;
    } catch (e) {
      console.warn('[ads] initialisation', e);
      // sans réponse du service de consentement, on tente quand même (annonces non personnalisées côté SDK)
      ready = true;
    }
    void preload();
  },

  /** Une vidéo peut-elle être proposée ? (en bac à sable web : toujours) */
  available(): boolean {
    return native ? ready : SANDBOX;
  },

  /** Le formulaire « options de confidentialité » doit-il être accessible dans les réglages ? */
  hasPrivacyOptions(): boolean {
    return native && privacyOptions;
  },

  async showPrivacyOptions(): Promise<void> {
    try {
      await AdMob.showPrivacyOptionsForm();
    } catch (e) {
      console.warn('[ads] options de confidentialité', e);
    }
  },

  /**
   * Affiche une vidéo récompensée.
   * @returns true uniquement si la récompense est acquise (vidéo vue jusqu'au bout).
   */
  async showRewarded(): Promise<boolean> {
    if (!native) return SANDBOX ? fakeAd() : false;
    if (!ready) return false;
    if (!loaded && !(await preload())) return false;

    return new Promise<boolean>((resolve) => {
      let earned = false;
      let done = false;
      const handles: Promise<{ remove: () => Promise<void> }>[] = [];
      const finish = (ok: boolean) => {
        if (done) return;
        done = true;
        handles.forEach((h) => void h.then((x) => x.remove()));
        loaded = false;
        void preload();
        resolve(ok);
      };
      handles.push(
        AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
          earned = true;
        }),
        AdMob.addListener(RewardAdPluginEvents.Dismissed, () => finish(earned)),
        AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => finish(false)),
      );
      suspendAudio();
      AdMob.showRewardVideoAd().catch((e) => {
        console.warn('[ads] affichage impossible', e);
        finish(earned);
      });
    });
  },
};

/** Fausse publicité pour tester les parcours dans le navigateur. */
function fakeAd(): Promise<boolean> {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'fake-ad';
    el.innerHTML = `<div class="fake-ad-box"><b>${t('simAd')}</b><p>${t('simAdText')}</p><span class="fake-ad-count">3</span></div>`;
    document.body.appendChild(el);
    let n = 3;
    const count = el.querySelector('.fake-ad-count')!;
    const iv = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(iv);
        el.remove();
        resolve(true);
      } else count.textContent = String(n);
    }, 700);
  });
}
