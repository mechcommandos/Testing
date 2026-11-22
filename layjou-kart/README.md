# Layjou Kart 🏁💖

Jeu de course de karts pour **Android et iOS**, construit avec **Capacitor 8** (HTML5 Canvas + Vite, sans moteur tiers).
Layjou, le petit robot au cœur rose, affronte les 7 monstres de *Layjou Battle* sur 15 circuits répartis dans 5 Coupes, plus 5 défis.

| | |
|---|---|
| Identifiant d'application | `com.layjou.kart` |
| Version | 1.0.0 |
| APK de démonstration | [`release/LayjouKart-1.0.0-demo.apk`](release/) (achats simulés, publicités de test) |
| Sources iOS | `ios/App/App.xcodeproj` · archive complète : [`release/LayjouKart-ios-sources.zip`](release/) |
| Langues | Français, anglais (détection automatique) |
| Orientation | Portrait, une main |

---

## Le jeu

- **Course en pseudo-3D** (route projetée segment par segment) : virages, côtes, tunnels néon, tremplins, plaques de boost, obstacles, décors animés.
- **Pilotage tactile** : glisser le doigt à gauche ou à droite pour tourner, accélération automatique. Toucher l'écran pour utiliser l'objet, glisser vers le bas pour le lancer derrière.
- **Dérapage et mini-turbo** : tourner fort dans un virage déclenche un dérapage qui se charge en 3 niveaux (bleu, rose, doré), puis donne un turbo au relâchement.
- **Départ turbo** (toucher l'écran pendant le « 1 »), **figures** sur les tremplins (toucher en l'air), **pièces** qui augmentent la vitesse de pointe (jusqu'à 10).
- **10 objets** tirés des boîtes, selon la position (les derniers reçoivent des objets de rattrapage) : Pile Turbo, Triple Turbo, Flaque Gloupy, Cœur Chercheur, Triple Blaster, Bulle Bouclier, Aimant à Pièces, Bombe Pinz, Mode Prisme, Orage Glitch.
- **Jauge Cœur et arme spéciale** : la jauge se remplit en ramassant des pièces, en réussissant des mini-turbos et en touchant les rivaux. Pleine, elle déclenche l'arme équipée : 7 armes reprises de *Layjou Battle* avec un comportement propre à la course.
- **Points d'action et combos** : chaque action rapporte des points (dérapages, dépassements, touches, figures). Enchaînées, elles multiplient le score jusqu'à ×2. Le score donne 1 à 3 étoiles par épreuve.
- **5 Coupes** (Bonbon-Ville, Port Néon, Désert de Cristal, Lune Givrée, Cœur du Glitch), chacune avec 3 courses de 3 tours et 1 défi : Course aux pièces, Contre-la-montre, ou duel contre un boss (Krakenox, Drakonis, Anti-Jou). Les étoiles débloquent les Coupes suivantes.
- **Garage** : 10 skins (Layjou et son kart changent de couleurs), 10 accessoires avec un petit bonus de course, 7 armes spéciales et 6 karts aux statistiques différentes (vitesse, accélération, maniabilité, dérapage).
- **Lune Givrée** : piste glissante (adhérence réduite).
- Tout est **vectoriel et synthétisé** : graphismes Canvas, sons et musique WebAudio, moteur au son variable. L'application ne contient presque aucune image et reste légère.

### Les personnages (repris de Layjou Battle)

Layjou est le pilote principal, dessiné de dos en course (casque, antenne qui ondule au vent, écouteurs, accessoires qui flottent) et de face dans les menus et sur le podium. Les 7 familles de monstres de *Layjou Battle* deviennent ses rivaux, chacun avec son kart, sa personnalité et son objet fétiche :

| Rival | Kart | Personnalité |
|---|---|---|
| Gloupy | Bolide | gélatine joyeuse, adore les flaques |
| Pinz | Requin | agressif, lance des bombes |
| Bzzork | Fusée | rapide, tire en rafale |
| Rokko | Buggy | lourd : pousse fort dans les contacts |
| Tentakl | Traîneau | excellent en virage |
| Drakito | Requin | spécialiste du turbo |
| Anti-Jou | Glitch-X | le grand rival, chasse au Cœur Chercheur |

Dans chaque monde, les rivaux prennent les couleurs de leurs variantes de *Layjou Battle* (Gloupy Givre, Pinz d'Acier, Bzzork Rubis, etc.).

## Monétisation

| Mécanisme | Où | Détail |
|---|---|---|
| **Vidéo récompensée AdMob pour continuer** | « Prolongation ? » quand on finit hors du podium | +1 tour pour tout le monde, avec Turbo Doré, jauge spéciale pleine et Triple Turbo pour le joueur (1 vidéo gratuite par course) |
| | « Encore un peu ? » quand le temps d'un défi est écoulé | +15 secondes |
| **Crédits (achat intégré) pour continuer** | mêmes écrans | Prolongation : 15, puis 30, puis 60 crédits dans la session · +15 s : 10, 20, 40 crédits |
| **Autres vidéos récompensées** | Résultats | doubler les pièces gagnées |
| | Boutique | +8 crédits, 5 fois par jour |
| | Roue de la chance | 3 tours bonus par jour |
| | Coffre gratuit | l'ouvrir tout de suite |
| | Garage | débloquer certains objets en plusieurs vidéos (skin Néon, Cornes, Buggy Cristal) |
| **Crédits (achat intégré)** | Boutique | 5 packs consommables (80 → 6 000 crédits) |
| | Garage | skins, accessoires, armes et karts premium |
| | Boutique | packs de pièces contre crédits |
| **Achats uniques** | Boutique | *Pack de Départ* (skin Galaxie, Fusée Bonbon, crédits et pièces) et *Sans Pubs* |
| **Interstitiels AdMob** | entre deux courses | rares : 1 toutes les 3 courses au plus, jamais dans les 4 premières, jamais après 2 échecs d'affilée, supprimés par *Sans Pubs* |

Plugins utilisés : [`@capacitor-community/admob`](https://github.com/capacitor-community/admob) et [`@capgo/native-purchases`](https://github.com/Cap-go/capacitor-native-purchases) (Google Play Billing et StoreKit 2).

## Flow Engine : l'algorithme de rétention

Fichiers : [`src/core/retention.js`](src/core/retention.js) (entre les courses) et `director()` dans [`src/game/race.js`](src/game/race.js) (pendant la course).

1. **Difficulté dynamique** : un indice de maîtrise (−1 à +1) est mis à jour après chaque course à partir de la place obtenue, de l'écart et des prolongations utilisées. Il règle le rythme des rivaux, leur agressivité avec les objets et la chance du joueur aux boîtes. L'objectif est une course serrée, gagnée de justesse.
2. **Directeur de course** : un élastique garde le peloton groupé autour du joueur. Les rivaux trop loin devant lèvent le pied. Les 3 rivaux les plus proches derrière s'accrochent. Le leader subit une pression constante. L'effet est renforcé au dernier tour pour viser une arrivée à la photo.
3. **Garde-fous anti-frustration** : clémence sur une épreuve après chaque échec, 3 premières courses plus douces, rivaux moins agressifs avec les objets après une série d'échecs, reprise facilitée après une absence.
4. **Courbe de tension** : la difficulté monte sur les 3 courses d'une Coupe et redescend au défi, avec un cycle sur la session.
5. **Boucles de récompense** :
   - série de session (pièces jusqu'à ×1,5, pour l'envie de faire « encore une course ») ;
   - coffre de session tous les 3 podiums ;
   - cadeau quotidien sur 7 jours, 3 missions par jour avec un bonus ;
   - roue de la chance, coffre gratuit toutes les 3 h, cadeau de retour ;
   - niveaux, étoiles qui débloquent les mondes, records par épreuve.
6. **Prochain objectif et « presque ! »** : l'accueil affiche le but le plus proche (mission, objet, niveau, monde). Les résultats indiquent l'écart qui manquait pour la place au-dessus.
7. **Conseil adapté** après un échec (hors-piste, dérapage, bouclier, arme spéciale, pièces).
8. **Rappels** : notifications locales sur demande du joueur (cadeau du jour, coffre prêt, retour à J+3), proposées après le 3ᵉ podium et jamais au lancement.

Ces mécaniques restent loyales : pas de faux compte à rebours, et la difficulté n'est jamais gonflée pour pousser à l'achat.

---

## Démarrage

Prérequis : Node 20+, JDK 21 et Android SDK (API 36) pour Android ; macOS et Xcode 16+ pour iOS.

```bash
npm install
npm run dev            # jeu dans le navigateur (http://127.0.0.1:5173)
npm run build          # bundle web de production dans dist/
npm run sync           # build + copie dans android/ et ios/
```

Dans le navigateur, les publicités et les achats sont **simulés** (fenêtre « AD · DEMO », confirmation d'achat) pour tester tous les parcours.
Clavier : flèches ou `Q`/`D` pour tourner, `Espace` pour l'objet (avec `↓` pour lancer derrière), `E` pour l'arme spéciale, `Échap` pour la pause.

### Android

```bash
npm run android:demo     # APK de démonstration : achats simulés tant que le store ne renvoie aucun produit
npm run android          # APK de debug avec le bundle de production
```

#### Publier sur Google Play (App Bundle signé)

Le fichier prêt à envoyer est [`release/LayjouKart-1.0.0-release.aab`](release/LayjouKart-1.0.0-release.aab) : App Bundle de production (vraies annonces, achats réels), signé avec la clé d'envoi Layjou (`layjou-upload-key.jks`, alias `layjou-upload`, la même pour les 6 jeux). La clé et son mot de passe ne sont **jamais** dans ce dépôt : gardez-les en lieu sûr.

Pour recompiler, créez `android/keystore.properties` (ignoré par Git) :

```properties
storeFile=/chemin/absolu/layjou-upload-key.jks
storePassword=********
keyAlias=layjou-upload
keyPassword=********
```

ou définissez les variables d'environnement `LAYJOU_KEYSTORE`, `LAYJOU_KEYSTORE_PASSWORD`, `LAYJOU_KEY_ALIAS` et `LAYJOU_KEY_PASSWORD`, puis `npm run android:bundle` → `android/app/build/outputs/bundle/release/app-release.aab`. Augmentez `versionCode` dans `android/app/build.gradle` à chaque mise à jour.


### iOS

```bash
npm run ios          # build + ouvre ios/App/App.xcodeproj dans Xcode
```

Le projet utilise **Swift Package Manager** (pas de CocoaPods). Dans Xcode : choisir l'équipe de signature, ajouter la capacité *In-App Purchase*, puis *Product › Archive*.
L'archive `release/LayjouKart-ios-sources.zip` contient le projet complet, avec le jeu déjà copié dans `ios/App/App/public` (build de production). Après `npm install`, le projet s'ouvre directement dans Xcode.

---

## À faire avant de publier

1. **AdMob** : les identifiants du compte sont en place (voir la section AdMob ci-dessous). Pour réactiver les interstitiels, créer un bloc *Interstitiel* dans AdMob, le renseigner dans `src/core/config.js` (`ads.android.interstitial`, `ads.ios.interstitial`) et passer `ads.interstitial.enabled` à `true`.
2. **Produits intégrés** : créer dans Google Play Console et App Store Connect les produits dont les identifiants figurent dans `config.js` :
   - consommables : `credits_80`, `credits_450`, `credits_1000`, `credits_2200`, `credits_6000` ;
   - non consommables : `starter_pack`, `remove_ads`.

   Les prix affichés viennent du store. `fallbackPrice` ne sert qu'hors ligne.
3. **Consentement** : configurer un message RGPD dans AdMob (*Confidentialité et messages*). Le formulaire UMP et la demande ATT d'iOS sont déjà appelés au démarrage, et les réglages donnent accès aux options de confidentialité.
4. **Public enfant** : le personnage plaît aux plus jeunes. Si l'app est déclarée « destinée aux enfants » (programme Familles de Google Play, catégorie Enfants d'Apple, COPPA) :
   - mettre `ads.childDirected` à `true` (annonces non personnalisées, classification G, pas de demande de suivi) ;
   - retirer l'autorisation `AD_ID` du manifeste Android ;
   - vérifier les règles de chaque store sur les achats intégrés et les publicités pour enfants.
5. **Validation des achats** : les achats sont livrés côté client. En production, valider les reçus côté serveur (`purchaseToken` sur Android, `jwsRepresentation` sur iOS) avant de créditer.
6. **Fiche store** : icône et bannière prêtes dans `store/`. Ajouter les captures d'écran, la politique de confidentialité (obligatoire avec AdMob), la classification du contenu et la déclaration de sécurité des données.

## AdMob (compte pub-6003645213510535)

| Quoi | Valeur | Où |
| --- | --- | --- |
| Identifiant d'application | `ca-app-pub-6003645213510535~4833816740` | `android/app/src/main/res/values/strings.xml` (`admob_app_id`) et `ios/App/App/Info.plist` (`GADApplicationIdentifier`) |
| Bloc d'annonces avec récompense | `ca-app-pub-6003645213510535/3309442507` | `src/core/config.js` → `ads.android.rewarded` et `ads.ios.rewarded` |

- **Mode test** : annonces de test avec `npm run dev` et dans l'APK de démo (`npm run android:demo`), vraies annonces avec `npm run build`, `npm run sync` et `npm run android:bundle` (réglage automatique : `useTestAds` dans `src/core/config.js`).
- **Ne cliquez jamais sur vos propres annonces réelles.** Déclarez votre téléphone dans AdMob › Paramètres › Appareils de test.
- **app-ads.txt** : publiez le fichier [`app-ads.txt`](/app-ads.txt) de la racine du dépôt à la racine du site indiqué dans les fiches des stores (par exemple `https://layjou.com/app-ads.txt`).
- **Un identifiant par jeu et par plateforme** : le même identifiant d'application sert aujourd'hui aux 6 jeux, sur Android et iOS. AdMob prévoit une application par jeu et par plateforme (12 au total). Créez-les dans AdMob, puis remplacez les identifiants ci-dessus, sinon les statistiques se mélangent et la diffusion peut être limitée une fois les apps associées aux stores.
- **iOS** : compléter `SKAdNetworkItems` dans `Info.plist` avec la [liste de Google](https://developers.google.com/admob/ios/quick-start#update_your_infoplist). Seul l'identifiant de Google (`cstr6suwn9.skadnetwork`) est présent.
- **Interstitiels** : désactivés tant qu'aucun bloc *Interstitiel* n'est créé (seul un bloc avec récompense a été fourni).

## Retours haptiques

Le module `src/core/haptics.js` pilote le moteur haptique d'iOS et le vibreur d'Android (avec repli `navigator.vibrate` dans le navigateur) :
- **effets de base :** cran discret, chocs léger, moyen et fort, motifs de succès, d'alerte et d'erreur ;
- **effets composés :** crescendo de combo, explosion, poussée, fête, échec, et vibrations continues ;
- **limiteur :** deux impulsions sont espacées d'au moins 40 ms, sauf si la seconde est plus forte.

Le joueur peut couper les vibrations : réglage « Vibrations » de la fenêtre Réglages.

## Structure

```
src/
  main.js              point d'entrée
  styles.css           design « candy racing »
  core/
    config.js          ⚙️ identifiants AdMob, produits intégrés, économie
    state.js           sauvegarde locale, monnaies, inventaire, étoiles
    retention.js       🧠 Flow Engine (difficulté, missions, quotidien, objectifs)
    ads.js  iap.js     AdMob et achats intégrés (avec repli simulé)
    audio.js           sons, musique et moteur synthétisés (WebAudio)
    native.js          vibrations, barre d'état, cycle de vie, notifications locales
    i18n.js            textes FR / EN
  game/
    data.js            catalogue : skins, accessoires, armes, karts, rivaux, mondes, circuits, objets
    track.js           construction des circuits (mini-langage de tracé) et thèmes des mondes
    race.js            simulation : physique, dérapage, IA, objets, armes, directeur de course
    render.js          rendu pseudo-3D (route, tunnels, décors, karts, effets)
    kart-art.js        karts et pilotes vus de dos (course) et de face (menus)
    scenery.js         sprites des décors, arche, panneaux, ciels et fonds en parallaxe
    layjou.js          Layjou vectoriel animé (repris de Layjou Battle)
    monsters.js        les 7 familles de monstres (reprises de Layjou Battle)
    fx.js              particules
  ui/
    app.js             coque, accueil, fenêtres (cadeau, missions, roue, coffres, réglages)
    screens.js         Coupes, avant-course, Garage, Boutique
    race-ui.js         commandes, HUD, prolongation, pause, résultats et podium
dev/assets.html        rendu de l'icône, du splash et des visuels store
tools/                 render-assets.cjs (visuels) · compress-splash.py (allège les splash générés)
assets/  store/        sources de l'icône et du splash · icône et bannière Play Store
android/  ios/         projets natifs Capacitor
```

### Ajuster le jeu

- **Circuits** : le champ `layout` de chaque circuit dans `src/game/data.js` utilise un mini-langage :
  - `S60` : ligne droite de 60 segments ;
  - `R3x90` / `L3x90` : virage à droite ou à gauche ;
  - `^20` / `v20` : côte ou descente ;
  - `!b` boost, `!i` boîtes, `!c` pièces, `!j` tremplin, `!t` tunnel, `!o` obstacles.
- **Équilibrage** : `MAXV`, `DRIFT_LV` et `BOOST` dans `race.js`, `ITEM_ODDS` et `POINTS` dans `data.js`, et `difficulty()` dans `retention.js`.
- **Économie** : `CONFIG.economy` et les prix du catalogue.
- **Icône et splash** : `npm run assets` (nécessite Playwright), puis `python3 tools/compress-splash.py`.

## Limites connues

- L'APK n'a pas été testé sur un appareil réel : seulement dans Chromium, avec un pilote automatique, à 60 images/s sur trois tailles d'écran.
- Le projet iOS n'a pas pu être compilé ici, faute de Mac.
- Validation des achats côté client uniquement (pas de serveur).
- Pas de mode multijoueur en ligne : les rivaux sont pilotés par l'IA.
