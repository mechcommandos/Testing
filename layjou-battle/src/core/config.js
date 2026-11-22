/**
 * Layjou Battle — configuration centrale.
 *
 * ⚠️ AVANT PUBLICATION SUR LES STORES :
 *  1. Remplacer les identifiants AdMob de test ci-dessous par les vôtres
 *     (et l'App ID dans android/app/src/main/AndroidManifest.xml + ios/App/App/Info.plist).
 *  2. Passer `useTestAds` à false.
 *  3. Créer dans Google Play Console / App Store Connect les produits intégrés
 *     dont les identifiants figurent dans `iap.products`.
 */
export const CONFIG = {
  appId: 'com.layjou.battle',
  version: '1.0.0',
  /** Politique de confidentialité (lien dans les réglages ; exigé par Apple et Google). */
  privacyUrl: 'https://layjou.com/confidentialite/',

  ads: {
    /**
     * Annonces de test en développement et dans l'APK de démo (`npm run android:demo`),
     * vraies annonces dans le build de production (`npm run build`, `npm run sync`, `npm run android:bundle`).
     * Ne cliquez jamais sur vos propres annonces réelles : déclarez votre téléphone dans AdMob › Paramètres › Appareils de test.
     */
    useTestAds: import.meta.env.MODE !== 'production',
    /** true si l'app vise un public enfant (COPPA / programme Familles) : pubs non personnalisées + contenu « G ». */
    childDirected: false,
    // Compte AdMob pub-6003645213510535 — application ca-app-pub-6003645213510535~4833816740
    android: {
      rewarded: 'ca-app-pub-6003645213510535/3309442507',
      interstitial: 'ca-app-pub-6003645213510535/6710677647',
    },
    ios: {
      rewarded: 'ca-app-pub-6003645213510535/3309442507',
      interstitial: 'ca-app-pub-6003645213510535/6710677647',
    },
    /** Interstitiels : volontairement rares pour ne pas casser la rétention. */
    interstitial: { enabled: true, skipFirstBattles: 4, everyNBattles: 3, minSecondsBetween: 150 },
    /** Plafond quotidien de vidéos récompensées « crédits gratuits ». */
    freeCreditsPerDay: 5,
    freeCreditsAmount: 8,
  },

  iap: {
    /** Achats simulés dans le navigateur (développement / démo). Mettre false si la version web est publiée. */
    webDemo: true,
    /** Sur l'App Store, un identifiant de produit est unique pour tout le compte développeur : Kart utilise déjà
     *  « credits_80 »… donc Battle préfixe ses identifiants iOS (« battle_credits_80 »). Google Play garde les identifiants courts. */
    iosPrefix: 'battle_',
    /** type: 'consumable' | 'nonconsumable' */
    products: [
      { id: 'credits_80', type: 'consumable', credits: 80, fallbackPrice: '0,99 €' },
      { id: 'credits_450', type: 'consumable', credits: 450, bonus: 12, fallbackPrice: '4,99 €' },
      { id: 'credits_1000', type: 'consumable', credits: 1000, bonus: 25, fallbackPrice: '9,99 €', tag: 'popular' },
      { id: 'credits_2200', type: 'consumable', credits: 2200, bonus: 38, fallbackPrice: '19,99 €' },
      { id: 'credits_6000', type: 'consumable', credits: 6000, bonus: 50, fallbackPrice: '49,99 €', tag: 'best' },
      { id: 'starter_pack', type: 'nonconsumable', credits: 300, coins: 5000, skin: 'galaxy', weapon: 'saber', fallbackPrice: '2,99 €' },
      { id: 'remove_ads', type: 'nonconsumable', fallbackPrice: '3,99 €' },
    ],
  },

  economy: {
    startCoins: 200,
    startCredits: 30,
    reviveCosts: [25, 50, 100],
    reviveHpPct: 0.6,
    replayCoinFactor: 0.6,
    coinPacks: [
      { id: 'coins_s', coins: 2500, credits: 40 },
      { id: 'coins_m', coins: 8000, credits: 110 },
      { id: 'coins_l', coins: 25000, credits: 300 },
    ],
    freeChestHours: 3,
    wheelAdSpinsPerDay: 3,
  },
};
