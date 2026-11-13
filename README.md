# LayJou Bubble

Jeu de match-3 avec le robot **LayJou** : échange deux bulles voisines pour en aligner 3 ou plus.
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

## Avant de publier : AdMob

Le projet utilise les **identifiants de test Google**. À remplacer par les vôtres (https://apps.admob.com) :

1. `www/js/config.js` : blocs d'annonces récompensées Android et iOS, puis `testing: false`.
2. `android/app/src/main/res/values/strings.xml` : `admob_app_id`.
3. `ios/App/App/Info.plist` : `GADApplicationIdentifier` (et compléter `SKAdNetworkItems` avec la liste fournie par Google).

Puis `npx cap sync`. Pour le Play Store il faut un build signé avec votre propre clé (`./gradlew bundleRelease`).
