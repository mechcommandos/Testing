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

  ads: {
    useTestAds: true,
    /** true si l'app vise un public enfant (COPPA / programme Familles) : pubs non personnalisées + contenu « G ». */
    childDirected: false,
    android: {
      rewarded: 'ca-app-pub-3940256099942544/5224354917',
      interstitial: 'ca-app-pub-3940256099942544/1033173712',
    },
    ios: {
      rewarded: 'ca-app-pub-3940256099942544/1712485313',
      interstitial: 'ca-app-pub-3940256099942544/4411468910',
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
