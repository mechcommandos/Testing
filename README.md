# Layjou Battle 🤖💖

Jeu de combat de robots en temps réel pour **Android et iOS**, construit avec **Capacitor 8** (HTML5 Canvas + Vite, sans moteur tiers).
Layjou, le petit robot au cœur rose, affronte des monstres géants à travers 5 mondes et 25 niveaux, puis dans une Arène infinie.

| | |
|---|---|
| Identifiant d'application | `com.layjou.battle` |
| Version | 1.0.0 |
| APK de test | [`release/LayjouBattle-1.0.0-debug.apk`](release/) |
| Langues | Français, Anglais (détection automatique) |

---

## Le jeu

- **Combat temps réel** : frappe en combo (3 coups), arme secondaire, **parade** (maintenir), **esquive**, **Super Cœur** (ultime), **points faibles** à toucher directement sur le monstre.
- **Lecture claire des attaques** : icône jaune = pare, icône rouge = esquive. Une parade au dernier moment étourdit l'ennemi.
- **7 familles d'ennemis** animés de façon procédurale (Gloupy, Pinz, Bzzork, Rokko, Tentakl, Drakito, et le boss final *Anti-Jou*), 5 boss avec phase « enragée ».
- **5 mondes** aux décors animés : Bonbon-Ville, Port Néon, Désert de Cristal, Lune Givrée, Cœur du Glitch.
- **Hangar** : 10 skins, 10 accessoires (bonus passifs légers), 7 armes aux comportements différents.
- **Labo** : 4 améliorations permanentes plafonnées par le niveau du joueur.
- **Arène infinie** : vagues successives, record personnel.
- Tout est **vectoriel et synthétisé** (graphismes Canvas, sons WebAudio) : aucun fichier image ou audio à embarquer, l'application reste très légère.

Le héros est redessiné en vectoriel à partir de l'illustration d'origine pour pouvoir être animé, recoloré (skins) et équipé.

## Monétisation

| Mécanisme | Où | Détail |
|---|---|---|
| **Vidéo récompensée AdMob** | Écran « Continuer ? » après un K.O. | 1 reprise gratuite par combat (60 % de PV + Super chargé) |
| | Écran de résultat | Doubler les pièces gagnées |
| | Boutique | +8 crédits, 5 fois par jour |
| | Roue de la chance | 3 tours bonus par jour |
| | Hangar | Débloquer certains objets (ex. skin Néon : 5 vidéos) |
| **Crédits (achat intégré)** | Boutique | 5 packs consommables (80 → 6 000 crédits) |
| | « Continuer ? » | Reprise payante : 25, puis 50, puis 100 crédits |
| | Hangar | Skins, accessoires et armes premium |
| | Boutique | Packs de pièces contre crédits |
| **Achats uniques** | Boutique | *Pack de Départ* (skin + arme + crédits + pièces) et *Sans Pubs* |
| **Interstitiels AdMob** | Entre deux combats | Rares : 1 tous les 3 combats au plus, jamais dans les 4 premiers, jamais après 2 défaites d'affilée, supprimés par *Sans Pubs* |

Plugins utilisés : [`@capacitor-community/admob`](https://github.com/capacitor-community/admob) et [`@capgo/native-purchases`](https://github.com/Cap-go/capacitor-native-purchases) (Google Play Billing + StoreKit 2).

## Flow Engine — l'algorithme de rétention

Fichier : [`src/core/retention.js`](src/core/retention.js). Objectif : garder le joueur dans la « zone de flow » et lui donner à chaque instant une raison de relancer un combat.

1. **Difficulté dynamique (DDA)** — un indice de maîtrise (−1 … +1) est mis à jour après chaque combat à partir de la performance réelle (victoire, PV restants, PV restants de l'ennemi, reprises). Il module les PV et dégâts ennemis, la durée des télégraphes, la cadence d'attaque et la durée des points faibles pour viser des **victoires serrées** (≈ 30 % de PV restants).
2. **Garde-fous anti-frustration** — −10 % de difficulté par défaite sur un même niveau (jusqu'à −30 %), démarrage en douceur sur les 3 premiers combats, reprise facilitée après une absence.
3. **Courbe de tension** — cycle montée / pic / respiration sur 4 combats.
4. **Boucles de récompense** — série de session (jusqu'à ×1,5 de pièces, « encore un combat »), coffre de session toutes les 3 victoires, cadeau quotidien sur 7 jours, 3 missions par jour + bonus, roue, coffre gratuit toutes les 3 h, cadeau de retour.
5. **Prochain objectif** — l'écran de résultat et l'accueil affichent le but le plus proche d'être atteint (mission, amélioration, objet, niveau, boss).
6. **Conseil adapté** après une défaite, selon la façon dont le combat a été perdu.
7. **Rappels** — notifications locales opt-in (cadeau du jour, coffre prêt, retour à J+3), proposées après la 3ᵉ victoire et jamais au lancement.

Ces mécaniques restent loyales : pas de faux compte à rebours, pas de difficulté gonflée pour pousser à l'achat, et les interstitiels sont suspendus quand le joueur enchaîne les défaites.

---

## Publication sur les stores

Le dossier [`store/`](store/README.md) contient le guide de publication Google Play / App Store des 6 jeux Layjou : fiches à copier-coller (FR/EN), captures d'écran prêtes à envoyer, réponses aux formulaires de confidentialité, politique de confidentialité et `app-ads.txt`. Les icônes des 6 jeux sont dans [`brand/`](brand/) (régénérables avec `npm run icons`).

## Démarrage

Prérequis : Node 20+, JDK 21 et Android SDK (API 36) pour Android ; macOS + Xcode 16+ pour iOS.

```bash
npm install
npm run dev          # jeu dans le navigateur (http://127.0.0.1:5173)
npm run build        # bundle web dans dist/
npm run sync         # build + copie dans android/ et ios/
```

Dans le navigateur, les publicités et les achats sont **simulés** (fenêtre « AD · DEMO », confirmation d'achat) afin de tester tous les parcours.
Clavier : `J` frappe · `K` arme · `L` Super · `Espace` parer · `A` esquive.

### Android

```bash
npm run android                      # → android/app/build/outputs/apk/debug/app-debug.apk
```

Version publiable (App Bundle signé) : créer `android/keystore.properties` (non versionné) :

```properties
storeFile=/chemin/absolu/layjou.keystore
storePassword=********
keyAlias=layjou
keyPassword=********
```

puis `npm run android:bundle` → `android/app/build/outputs/bundle/release/app-release.aab`.

### iOS

```bash
npm run ios          # build + ouvre ios/App/App.xcodeproj dans Xcode
```

Le projet utilise **Swift Package Manager** (pas de CocoaPods). Dans Xcode : choisir l'équipe de signature, activer la capacité *In-App Purchase*, puis *Product › Archive*.
Les sources iOS sont générées et configurées ; la compilation nécessite un Mac (elle n'a pas pu être exécutée dans l'environnement de génération).

---

## À faire avant de publier

1. **AdMob** — remplacer les identifiants de test :
   - blocs d'annonces dans [`src/core/config.js`](src/core/config.js) (`ads.android`, `ads.ios`) et passer `useTestAds` à `false` ;
   - identifiant d'application Android dans `android/app/src/main/res/values/strings.xml` (`admob_app_id`) ;
   - identifiant d'application iOS dans `ios/App/App/Info.plist` (`GADApplicationIdentifier`), et compléter `SKAdNetworkItems` avec la [liste de Google](https://developers.google.com/admob/ios/quick-start#update_your_infoplist).
2. **Produits intégrés** — créer dans Google Play Console et App Store Connect les produits dont les identifiants figurent dans `config.js` :
   `credits_80`, `credits_450`, `credits_1000`, `credits_2200`, `credits_6000` (consommables), `starter_pack`, `remove_ads` (non consommables). Les prix affichés viennent du store ; `fallbackPrice` ne sert qu'hors ligne.
3. **Consentement** — configurer un message RGPD dans AdMob (*Confidentialité et messages*) : le formulaire UMP et la demande ATT d'iOS sont déjà appelés au démarrage, et les réglages du jeu donnent accès aux options de confidentialité.
4. **Public enfant** — le personnage plaît aux plus jeunes. Si l'app est déclarée « destinée aux enfants » (programme Familles de Google Play, catégorie Enfants d'Apple, COPPA), mettre `ads.childDirected` à `true` (annonces non personnalisées, classification G, pas de demande de suivi), retirer l'autorisation `AD_ID` du manifeste Android, et vérifier les règles de chaque store sur les achats intégrés et les publicités pour enfants.
5. **Validation des achats** — les achats sont livrés côté client. Pour la production, valider les reçus côté serveur (`purchaseToken` Android / `jwsRepresentation` iOS) avant de créditer.
6. **Fiche store** — captures d'écran, politique de confidentialité (obligatoire avec AdMob), classification du contenu, déclaration de sécurité des données.

## Structure

```
src/
  main.js              point d'entrée
  styles.css           design « candy-tech »
  core/
    config.js          ⚙️ identifiants AdMob, produits intégrés, économie
    state.js           sauvegarde locale, monnaies, inventaire, statistiques de combat
    retention.js       🧠 Flow Engine (DDA, missions, quotidien, objectifs)
    ads.js  iap.js     AdMob et achats intégrés (avec repli simulé sur le web)
    audio.js           sons et musique synthétisés (WebAudio)
    native.js          haptique, barre d'état, cycle de vie, notifications locales
    i18n.js            textes FR / EN
  game/
    data.js            catalogue : skins, accessoires, armes, monstres, mondes, récompenses
    layjou.js          rendu vectoriel animé du héros (poses, skins, accessoires, armes)
    monsters.js        rendu des 7 familles d'ennemis
    backgrounds.js     décors des 5 mondes
    battle.js          moteur de combat
    fx.js              particules, textes flottants, secousses
  ui/
    app.js             coque, accueil, fenêtres (cadeau, missions, roue, coffres, réglages)
    screens.js         boutique, hangar, labo, carte
    battle-ui.js       HUD, commandes, « Continuer ? », résultat
assets/                sources de l'icône et du splash (générées par `npm run assets`)
tools/render-assets.cjs  rendu de l'icône / du splash depuis le moteur du jeu
android/  ios/         projets natifs Capacitor
```

### Ajuster le jeu

- **Équilibrage** : `stageEnemyHp`, `stageEnemyDmg`, `stageCoins`, `ATTACKS`, `ARCHETYPES`, `UPGRADES` dans `src/game/data.js`.
- **Nouveau skin** : ajouter une palette dans `SKINS` — il apparaît automatiquement dans le hangar.
- **Icône / splash** : `npm run assets` (nécessite `npm i -D playwright` la première fois). Pour utiliser l'illustration d'origine en haute définition, remplacer les PNG de `assets/` puis lancer `npx capacitor-assets generate --android --ios`.
