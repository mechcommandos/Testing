/**
 * ⚙️ CONFIGURATION — tout ce qu'il faut personnaliser avant publication est ici.
 */
import type { WeaponId } from './game/game';

/**
 * Mode bac à sable : les achats sont simulés (aucun débit) et une fausse vidéo remplace
 * la pub quand AdMob n'est pas disponible (navigateur). Actif avec `npm run dev` et
 * `npm run build:sandbox` (APK de démonstration). JAMAIS actif avec `npm run build`.
 */
export const SANDBOX: boolean = import.meta.env.DEV || import.meta.env.MODE === 'sandbox';

/** Politique de confidentialité (lien dans les réglages ; exigé par Apple et Google). */
export const PRIVACY_URL = 'https://layjou.com/confidentialite/';

export const ADMOB = {
  /**
   * Compte AdMob pub-6003645213510535. L'identifiant d'APPLICATION (ca-app-pub-6003645213510535~4833816740)
   * est dans android/app/src/main/res/values/strings.xml et ios/App/App/Info.plist.
   */
  rewarded: {
    android: 'ca-app-pub-6003645213510535/3309442507',
    ios: 'ca-app-pub-6003645213510535/3309442507',
  },
  /**
   * Annonces de test en développement et dans l'APK de démo (`npm run android:debug`),
   * vraies annonces dans le build de production (`npm run build`, `npm run android:release`).
   * Ne cliquez jamais sur vos propres annonces réelles : déclarez votre téléphone dans AdMob › Paramètres › Appareils de test.
   */
  /** Interstitiels : rares (jamais avant la 4ᵉ partie, au plus une fois toutes les 3 parties, 150 s minimum entre deux). */
  interstitial: { android: 'ca-app-pub-6003645213510535/6710677647', ios: 'ca-app-pub-6003645213510535/6710677647', enabled: true, skipFirstGames: 3, everyNGames: 3, minSecondsBetween: 150 },
  testing: import.meta.env.MODE !== 'production',
  /** Mets true si ton public cible inclut les enfants (programme Familles / COPPA). */
  childDirected: false,
};

/** Packs de crédits : les `id` doivent exister comme produits CONSOMMABLES dans Play Console et App Store Connect. */
export interface CreditPack {
  id: string;
  credits: number;
  /** prix affiché tant que le store n'a pas répondu (ou en bac à sable) */
  fallbackPrice: string;
  tag?: 'popular' | 'best';
}

export const CREDIT_PACKS: CreditPack[] = [
  { id: 'layjou_credits_80', credits: 80, fallbackPrice: '0,99 €' },
  { id: 'layjou_credits_500', credits: 500, fallbackPrice: '4,99 €', tag: 'popular' },
  { id: 'layjou_credits_1200', credits: 1200, fallbackPrice: '9,99 €' },
  { id: 'layjou_credits_3000', credits: 3000, fallbackPrice: '19,99 €', tag: 'best' },
];

export const ECONOMY = {
  /** coût en crédits des « continuer » successifs d'une même partie */
  continueCosts: [25, 50, 100],
  /** nombre de « continuer » payables par une vidéo */
  continueByVideo: 2,
  /** boulons gagnés = score / coinDivisor */
  coinDivisor: 12,
  /** boulons offerts par une vidéo dans la boutique, et plafond quotidien */
  adCoins: 60,
  adCoinsPerDay: 5,
  /** cadeau gratuit : délai de recharge (ms) */
  giftCooldown: 4 * 3600 * 1000,
  startCoins: 150,
  startCredits: 30,
  startWeapons: { hammer: 2, laser: 1, chroma: 1, recycle: 2 } as Record<WeaponId, number>,
};

/** Prix des armes : à l'unité en boulons, par lot de 5 en crédits. */
export const WEAPON_PRICES: Record<WeaponId, { coins: number; credits5: number }> = {
  hammer: { coins: 120, credits5: 40 },
  laser: { coins: 180, credits5: 60 },
  chroma: { coins: 220, credits5: 75 },
  recycle: { coins: 90, credits5: 30 },
};
