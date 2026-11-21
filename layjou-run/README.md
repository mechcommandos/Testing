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

### AdMob (compte pub-6003645213510535)

| Quoi | Valeur | Où |
| --- | --- | --- |
| Identifiant d'application | `ca-app-pub-6003645213510535~7951613295` | `android/app/src/main/res/values/strings.xml` (`admob_app_id`) et `ios/App/App/Info.plist` (`GADApplicationIdentifier`) |
| Bloc d'annonces avec récompense | `ca-app-pub-6003645213510535/3086524765` | `www/ads.js` → `REWARDED_UNITS` |

- **Mode test** : `TEST_ADS` reste à `false` dans `www/ads.js` pour les stores. `npm run android:demo` le passe à `true` le temps de compiler l'APK de démo, puis le remet à `false`.
- **Ne cliquez jamais sur vos propres annonces réelles.** Déclarez votre téléphone dans AdMob › Paramètres › Appareils de test.
- **app-ads.txt** : publiez le fichier [`app-ads.txt`](/app-ads.txt) de la racine du dépôt à la racine du site indiqué dans les fiches des stores (par exemple `https://layjou.com/app-ads.txt`).
- **Un identifiant par jeu et par plateforme** : le même identifiant d'application sert aujourd'hui aux 6 jeux, sur Android et iOS. AdMob prévoit une application par jeu et par plateforme (12 au total). Créez-les dans AdMob, puis remplacez les identifiants ci-dessus, sinon les statistiques se mélangent et la diffusion peut être limitée une fois les apps associées aux stores.
- **iOS** : compléter `SKAdNetworkItems` dans `Info.plist` avec la [liste de Google](https://developers.google.com/admob/ios/quick-start#update_your_infoplist). Seul l'identifiant de Google (`cstr6suwn9.skadnetwork`) est présent.

Après une modification dans `www/`, relancer `npx cap sync`.

## Retours haptiques

Le module `www/haptique.js` pilote le moteur haptique d'iOS et le vibreur d'Android (avec repli `navigator.vibrate` dans le navigateur) :
- **effets de base :** cran discret, chocs léger, moyen et fort, motifs de succès, d'alerte et d'erreur ;
- **effets composés :** crescendo de combo, explosion, poussée, fête, échec, et vibrations continues ;
- **limiteur :** deux impulsions sont espacées d'au moins 40 ms, sauf si la seconde est plus forte.

Le joueur peut couper les vibrations : bouton « Vibrations » du menu.

