/*
 * Configuration Layjou Puzzle.
 *
 * AdMob : compte pub-6003645213510535, application ca-app-pub-6003645213510535~4833816740
 * (identifiant d'application dans android/app/src/main/res/values/strings.xml et ios/App/App/Info.plist).
 * `testMode` reste à false pour les stores ; `npm run android:demo` le passe à true le temps de compiler l'APK de démo.
 * Ne cliquez jamais sur vos propres annonces réelles : déclarez votre téléphone dans AdMob › Paramètres › Appareils de test.
 */
window.LAYJOU_CONFIG = {
  ads: {
    testMode: false,
    rewarded: {
      android: 'ca-app-pub-6003645213510535/3309442507',
      ios: 'ca-app-pub-6003645213510535/3309442507',
    },
    // Interstitiels rares entre deux niveaux : jamais avant le 4ᵉ, au plus un niveau sur 3, 150 s minimum entre deux.
    interstitial: { android: 'ca-app-pub-6003645213510535/6710677647', ios: 'ca-app-pub-6003645213510535/6710677647', enabled: true, skipFirstGames: 3, everyNGames: 3, minSecondsBetween: 150 },
  },
  // Politique de confidentialité (lien dans l'écran d'accueil ; exigé par Apple et Google).
  privacyUrl: 'https://layjou.com/confidentialite/',
  game: {
    continueSeconds: 60,     // temps ajouté après une vidéo récompensée
    maxContinues: 3,         // nombre de "continuer" par partie
    boosterPrice: 60,        // prix d'un bonus en pièces
    freezeSeconds: 15,
  },
};
