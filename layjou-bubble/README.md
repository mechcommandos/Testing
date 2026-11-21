# Layjou Bubble

Jeu de match-3 avec le robot **Layjou** : échange deux bulles voisines pour en aligner 3 ou plus.
Web (HTML/CSS/JS sans framework) empaqueté avec **Capacitor 8** pour Android et iOS, pubs récompensées **AdMob** pour continuer une partie.

## Le jeu

- 30 niveaux, 3 types d'objectifs : atteindre un score, briser la glace, faire descendre des batteries.
- Bulles spéciales : 4 alignées → bulle-ligne, forme en L/T → bulle-bombe, 5 alignées → bulle arc-en-ciel ; elles se combinent entre elles.
- Plus de coups ? Une **pub récompensée** donne +5 coups (`continueMoves` dans `www/js/config.js`).
- Français / anglais selon la langue de l'appareil, progression enregistrée localement.

## Structure

| Dossier | Contenu |
| --- | --- |
| `www/` | Le jeu (`js/engine.js` logique, `js/game.js` interface, `js/levels.js` niveaux, `js/ads.js` AdMob) |
| `android/` | Projet Android Studio (Capacitor) |
| `ios/` | Projet Xcode (Capacitor, dépendances via Swift Package Manager) |
| `assets/` | Sources de l'icône et de l'écran de démarrage |
| `release/` | APK de debug prêt à installer |
| `tests/` | Tests du moteur et test navigateur |

## Commandes

```bash
npm install
npm start              # jouer dans le navigateur (la pub y est simulée)
npm test               # tests du moteur
npm run android:apk    # APK debug -> android/app/build/outputs/apk/debug/
npm run ios:open       # ouvre le projet dans Xcode (macOS requis)
npm run assets         # régénère icônes et splash depuis assets/
```

Android : JDK 21 et Android SDK 36. iOS : macOS + Xcode 16 ou plus, puis choisir son équipe de signature dans Xcode.

## AdMob (compte pub-6003645213510535)

| Quoi | Valeur | Où |
| --- | --- | --- |
| Identifiant d'application | `ca-app-pub-6003645213510535~7951613295` | `android/app/src/main/res/values/strings.xml` (`admob_app_id`) et `ios/App/App/Info.plist` (`GADApplicationIdentifier`) |
| Bloc d'annonces avec récompense | `ca-app-pub-6003645213510535/3086524765` | `www/js/config.js` → `admob.rewarded` |

- **Mode test** : `testing` reste à `false` dans `www/js/config.js` pour les stores. `npm run android:demo` le passe à `true` le temps de compiler l'APK de démo, puis le remet à `false`.
- **Ne cliquez jamais sur vos propres annonces réelles.** Déclarez votre téléphone dans AdMob › Paramètres › Appareils de test.
- **app-ads.txt** : publiez le fichier [`app-ads.txt`](/app-ads.txt) de la racine du dépôt à la racine du site indiqué dans les fiches des stores (par exemple `https://layjou.com/app-ads.txt`).
- **Un identifiant par jeu et par plateforme** : le même identifiant d'application sert aujourd'hui aux 6 jeux, sur Android et iOS. AdMob prévoit une application par jeu et par plateforme (12 au total). Créez-les dans AdMob, puis remplacez les identifiants ci-dessus, sinon les statistiques se mélangent et la diffusion peut être limitée une fois les apps associées aux stores.
- **iOS** : compléter `SKAdNetworkItems` dans `Info.plist` avec la [liste de Google](https://developers.google.com/admob/ios/quick-start#update_your_infoplist). Seul l'identifiant de Google (`cstr6suwn9.skadnetwork`) est présent.

## Retours haptiques

Le module `www/js/haptique.js` pilote le moteur haptique d'iOS et le vibreur d'Android (avec repli `navigator.vibrate` dans le navigateur) :
- **effets de base :** cran discret, chocs léger, moyen et fort, motifs de succès, d'alerte et d'erreur ;
- **effets composés :** crescendo de combo, explosion, poussée, fête, échec, et vibrations continues ;
- **limiteur :** deux impulsions sont espacées d'au moins 40 ms, sauf si la seconde est plus forte.

Le joueur peut couper les vibrations : bouton « Vibrations » de l'accueil et de la pause.

Après chaque modification de `www/`, relancer `npx cap sync`. Pour le Play Store il faut un build signé avec votre propre clé (`./gradlew bundleRelease`).
