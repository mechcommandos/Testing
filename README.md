# Layjou Run

Jeu de course sans fin sur 3 voies, en 3D (three.js), avec le petit robot comme héros.
Le même code web tourne dans le navigateur, sur Android et sur iOS (via Capacitor).

## Organisation

- `www/` : le jeu (`index.html`, `game.js`, `ads.js`, `assets/`, `vendor/`)
- `android/` : projet Android (Gradle)
- `ios/` : projet iOS (Xcode, dépendances par Swift Package Manager)
- `capacitor.config.json` : identifiant `com.layjou.run`, nom de l'application

## Jouer dans le navigateur

```
npm start        # puis ouvrir http://localhost:8000
```

Commandes : glisser à gauche / à droite pour changer de voie, vers le haut pour sauter,
vers le bas pour passer sous les portiques. Au clavier : flèches.

## Android

Il faut Node 22+, un JDK 21 et le SDK Android (plateforme 36).

```
npm install
npx cap sync android
cd android && ./gradlew assembleDebug
```

L'APK sort dans `android/app/build/outputs/apk/debug/app-debug.apk`.

## iOS

Il faut un Mac avec Xcode 16 ou plus récent, et un compte développeur Apple pour installer sur un iPhone.

```
npm install
npx cap sync ios
npx cap open ios
```

Dans Xcode : choisir son équipe dans *Signing & Capabilities*, puis lancer sur un simulateur ou un iPhone.

## Publicité : vidéo récompensée AdMob

À la fin d'une partie, le bouton « Continuer avec une vidéo » relance la course si le joueur regarde
la vidéo jusqu'au bout (une fois par partie). Le bouton n'existe que dans les applications mobiles.

Le projet utilise les **identifiants de test de Google**. Avant de publier, remplacez-les par les vôtres :

| Quoi | Où |
| --- | --- |
| Blocs d'annonces « avec récompense » (Android et iOS) | `www/ads.js`, constante `REWARDED_UNITS` |
| Identifiant d'application Android | `android/app/src/main/res/values/strings.xml`, `admob_app_id` |
| Identifiant d'application iOS | `ios/App/App/Info.plist`, `GADApplicationIdentifier` |

Après une modification dans `www/`, relancer `npx cap sync`.
