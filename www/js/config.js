/*
 * Configuration Layjou Puzzle.
 *
 * Les identifiants ci-dessous sont les identifiants de TEST officiels de Google.
 * Avant de publier :
 *   1. remplacez `rewarded.android` / `rewarded.ios` par vos blocs d'annonces "Avec récompense" ;
 *   2. remplacez l'ID d'application AdMob dans
 *        android/app/src/main/res/values/strings.xml  (admob_app_id)
 *        ios/App/App/Info.plist                        (GADApplicationIdentifier)
 *   3. passez `testMode` à false.
 */
window.LAYJOU_CONFIG = {
  ads: {
    testMode: true,
    rewarded: {
      android: 'ca-app-pub-3940256099942544/5224354917',
      ios: 'ca-app-pub-3940256099942544/1712485313',
    },
  },
  game: {
    continueSeconds: 60,     // temps ajouté après une vidéo récompensée
    maxContinues: 3,         // nombre de "continuer" par partie
    boosterPrice: 60,        // prix d'un bonus en pièces
    freezeSeconds: 15,
  },
};
