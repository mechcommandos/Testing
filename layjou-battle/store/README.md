# Publier les jeux Layjou sur Google Play et l'App Store

Ce dossier contient tout ce qu'il faut pour remplir les fiches des 6 jeux :

| Jeu | Identifiant | Catégorie | Publicités | Achats intégrés | État |
|---|---|---|---|---|---|
| [Layjou Battle](battle/fiche.md) | `com.layjou.battle` | Action | récompensées + interstitiels | 7 produits | prêt |
| [Layjou Bubble](bubble/fiche.md) | `com.layjou.bubble` | Puzzle | récompensées | aucun | prêt |
| [Layjou Puzzle](puzzle/fiche.md) | `com.layjou.puzzle` | Puzzle | récompensées | aucun | prêt |
| [Layjou Run](run/fiche.md) | `com.layjou.run` | Arcade | récompensées | aucun | prêt (français uniquement) |
| [Layjou Blocks](blocks/fiche.md) | `com.layjou.blocks` | Puzzle | récompensées | 4 produits | prêt |
| [Layjou Kart](kart/fiche.md) | à confirmer | Course | à définir | à définir | **en développement** |

Pour chaque jeu : `fiche.md` (textes à copier-coller en FR et EN, catégorie, classification, produits, corrections à faire dans le code), `google-play/` et `app-store-iphone/` (captures prêtes à envoyer), `captures-brutes/` (sans légende). Les icônes et bannières sont dans `../brand/layjou-<jeu>/`. La politique de confidentialité est dans [politique-de-confidentialite.md](politique-de-confidentialite.md).

---

## 1. Les comptes (une seule fois pour les 6 jeux)

| Compte | Coût | À savoir |
|---|---|---|
| Google Play Console | 25 $, une seule fois | Compte **personnel** créé après le 13/11/2023 : chaque jeu doit passer par un **test fermé avec au moins 12 testeurs pendant 14 jours d'affilée** avant d'accéder à la production. Un compte **Organisation** (numéro D-U-N-S requis) n'a pas cette obligation. |
| Apple Developer Program | 99 $ par an | Signer le **Paid Apps Agreement** (et renseigner banque et fiscalité) avant de créer les achats intégrés de Battle et Blocks. |
| AdMob | gratuit | Le compte doit être vérifié avant de servir des annonces ; créer une app AdMob par jeu et par plateforme (12 apps pour les 6 jeux). |
| Profil de paiement Google | gratuit | Nécessaire pour vendre les achats intégrés (Battle, Blocks). |

Conseil : utilisez le même nom de développeur partout (par exemple « Layjou ») et un site web unique, par exemple `layjou.com`, qui hébergera la politique de confidentialité et le fichier `app-ads.txt`.

## 2. Décisions à prendre avant de remplir les fiches

### a) Le public cible — la décision la plus importante
Les jeux Layjou (robot mignon, couleurs vives) plaisent clairement aux enfants. Google demande si la fiche « pourrait attirer les enfants » et applique alors le **programme Familles**.

**Recommandation : déclarer un public qui inclut les enfants et traiter tous les joueurs comme des enfants.** C'est la voie la plus simple et la plus sûre :
- Play Console : tranches d'âge incluant moins de 13 ans → AdMob sert automatiquement des annonces conformes au programme Familles.
- Dans le code : annonces non personnalisées et adaptées aux enfants, pas de demande de suivi sur iOS, pas d'identifiant publicitaire.
  - Battle : `ads.childDirected = true` dans `src/core/config.js` (tout est déjà branché).
  - Blocks : `ADMOB.childDirected = true` dans `src/config.ts`.
  - Bubble, Puzzle, Run : ajouter `tagForChildDirectedTreatment: true` et `tagForUnderAgeOfConsent: true` à `AdMob.initialize(...)`, `npa: true` au chargement des vidéos, et supprimer l'appel à `requestTrackingAuthorization()`.
  - Android : retirer l'autorisation publicitaire, ajoutée automatiquement par le SDK AdMob :
    `<uses-permission android:name="com.google.android.gms.permission.AD_ID" tools:node="remove" />`
- Conséquence : revenus publicitaires plus faibles (annonces non personnalisées).
- App Store : **ne pas** choisir la catégorie « Enfants » (elle interdit presque toutes les publicités tierces) ; rester en catégorie Jeux avec une classification 4+ ou 9+.

L'autre option (public 13 ans et plus uniquement) garde les annonces personnalisées, mais Google peut refuser la fiche s'il juge qu'elle attire les enfants.

### b) L'iPad
Les 6 projets iOS sont déclarés iPhone **et** iPad. Apple exige alors des captures iPad 13" (2064 × 2752). Les jeux étant conçus en portrait pour téléphone, **je recommande de les passer en iPhone uniquement** : dans Xcode, cible App › General › Supported Destinations, retirer iPad (ou `TARGETED_DEVICE_FAMILY = 1`). Les iPad pourront toujours les installer, en mode compatibilité.

### c) Ce qu'il vous faut héberger
1. **Politique de confidentialité** (obligatoire avec AdMob) : publiez [politique-de-confidentialite.md](politique-de-confidentialite.md) sur votre site, par exemple `https://layjou.com/confidentialite`, après avoir rempli les champs entre crochets.
2. **app-ads.txt** à la racine du site déclaré dans les fiches (`https://layjou.com/app-ads.txt`), avec votre identifiant d'éditeur AdMob — modèle dans [app-ads.txt.exemple](app-ads.txt.exemple).
3. Une **adresse e-mail de contact** (affichée sur les fiches).

## 3. Google Play, étape par étape (pour chaque jeu)

1. **Corriger le code** : liste « À faire dans le code » de la `fiche.md` du jeu (identifiants AdMob réels, signature release, icône).
2. **Construire l'App Bundle signé** (`.aab`, obligatoire) : `./gradlew bundleRelease` dans `android/`. Gardez précieusement votre keystore (sauvegarde hors du dépôt) ; activez **Play App Signing** à la création de l'app.
3. **Créer l'app** dans la Play Console : nom, langue par défaut français, « Jeu », « Gratuit ».
4. **Contenu de l'application** (menu Règles et programmes › Contenu de l'application) :
   - Politique de confidentialité : l'URL hébergée.
   - Annonces : **oui, l'app contient des annonces**.
   - Accès à l'app : tout est accessible sans compte.
   - Identifiant publicitaire : « oui » si vous gardez les annonces personnalisées, « non » si vous avez retiré `AD_ID` (option enfants).
   - Classification du contenu : questionnaire IARC (voir la fiche du jeu ; résultat attendu PEGI 3, ou PEGI 7 pour Battle).
   - Public cible et contenu : voir § 2a.
   - Sécurité des données : voir § 5.
   - Applications d'actualités, gouvernementales, financières, santé : non.
5. **Fiche principale du Play Store** : titre, descriptions courte et complète (fiche du jeu), icône 512, bannière 1024 × 500, captures `google-play/` (2 minimum, 8 maximum par type d'appareil), catégorie, e-mail, site web.
6. **Produits intégrés** (Battle, Blocks) : Monétiser › Produits › Produits intégrés, avec exactement les identifiants de la fiche.
7. **Test fermé** : créer une piste de test fermé, inviter au moins 12 testeurs (adresses Gmail ou groupe Google), qui doivent accepter l'invitation et garder l'app installée 14 jours. Pendant ce temps : vérifier pubs et achats sur de vrais téléphones.
8. **Demander l'accès à la production**, puis publier. Lier ensuite l'app dans AdMob (Applications › Associer à une plateforme d'applications) : AdMob examine l'app (2 à 3 jours en général) et sert peu d'annonces pendant ce temps.

## 4. App Store, étape par étape (pour chaque jeu)

1. **Sur un Mac avec Xcode 26 ou plus récent** (obligatoire pour tout envoi depuis le 28 avril 2026) : `npm install`, `npx cap sync ios`, ouvrir `ios/App/App.xcodeproj`.
2. Dans Xcode : choisir votre équipe (Signing & Capabilities), ajouter la capacité **In-App Purchase** (Battle, Blocks), régler les destinations (§ 2b), vérifier version 1.0 / build 1.
3. Ajouter un fichier **PrivacyInfo.xcprivacy** à la cible App (exigé par Apple pour les API « à raison déclarée ») : le stockage local de Capacitor utilise `UserDefaults` → déclarer `NSPrivacyAccessedAPICategoryUserDefaults` avec la raison `CA92.1`. Le SDK Google Mobile Ads fournit son propre manifeste.
4. **App Store Connect › Mes apps › +** : nom, langue principale français, identifiant de lot (`com.layjou.<jeu>`), SKU (par exemple `layjou-battle`).
5. **Informations sur l'app** : sous-titre, catégorie, classification par âge (nouveau questionnaire : niveaux 4+, 9+, 13+, 16+, 18+), URL de confidentialité.
6. **Confidentialité de l'app** : voir § 6.
7. **Achats intégrés** (Battle, Blocks) : Monétisation › Achats intégrés, mêmes identifiants que sur Google Play, avec une capture de l'écran d'achat pour la vérification.
8. **Version 1.0** : captures `app-store-iphone/` (1 à 10, 1206 × 2622), texte promotionnel, description, mots-clés, URL d'assistance, informations pour la vérification (pas de compte nécessaire ; préciser que les vidéos récompensées sont facultatives).
9. Xcode › Product › Archive › Distribute App › App Store Connect, puis sélectionner le build dans la version et **Soumettre pour vérification**. Testez d'abord avec TestFlight.

## 5. Formulaire « Sécurité des données » (Google Play)

Les jeux n'envoient eux-mêmes aucune donnée : pas de compte, progression enregistrée **sur le téléphone**. Les données à déclarer viennent du SDK Google Mobile Ads (AdMob) :

| Type de données | Collectée | Partagée | Finalités |
|---|---|---|---|
| Position approximative (déduite de l'adresse IP) | oui | oui | Publicité, Analyse, Prévention de la fraude |
| Activité dans l'app › Interactions avec l'app | oui | oui | Publicité, Analyse |
| Infos et performances › Journaux de plantage, Diagnostics | oui | oui | Analyse |
| Appareil ou autres identifiants (identifiant publicitaire / identifiant d'ensemble d'applications) | oui | oui | Publicité, Prévention de la fraude |

- Données chiffrées en transit : **oui** (TLS).
- Suppression des données : aucun compte ; la progression s'efface en désinstallant le jeu. Les données publicitaires relèvent de Google (lien vers ses règles dans la politique de confidentialité).
- Battle et Blocks : les achats passent par la facturation Google Play ; le jeu ne transmet aucune donnée d'achat à un serveur.
- Layjou Run charge ses polices depuis Google Fonts (l'adresse IP est transmise à Google) : à embarquer dans l'app pour supprimer cet appel.

⚠️ Ces réponses suivent la documentation du SDK Google Mobile Ads telle que résumée par les recherches ; les pages officielles de Google n'ont pas pu être ouvertes depuis cet environnement. Vérifiez-les au moment du remplissage sur la page « Google Play's Data safety section » d'AdMob (developers.google.com/admob/android/privacy/play-data-disclosure).

## 6. « Confidentialité de l'app » (App Store)

Données collectées par le SDK Google Mobile Ads :

| Catégorie Apple | Type | Usage | Liée à l'identité | Suivi |
|---|---|---|---|---|
| Localisation | Localisation approximative | Publicité tierce, Analyse | non | voir ci-dessous |
| Identifiants | Identifiant de l'appareil | Publicité tierce | non | voir ci-dessous |
| Données d'utilisation | Interactions avec le produit, Données publicitaires | Publicité tierce, Analyse | non | voir ci-dessous |
| Diagnostics | Données de plantage, Données de performances, Autres diagnostics | Analyse | non | non |

- **Suivi** : « oui » pour l'identifiant de l'appareil et les données publicitaires si les annonces personnalisées sont activées (le jeu demande alors l'autorisation ATT au lancement) ; **aucun suivi** si vous suivez l'option enfants du § 2a.
- Même avertissement qu'au § 5 : à vérifier sur la page « App Store data disclosure » d'AdMob (developers.google.com/admob/ios/privacy/data-disclosure).

## 7. Spécifications des visuels fournis

| Visuel | Taille | Fichier |
|---|---|---|
| Icône Play Store | 512 × 512 PNG | `brand/layjou-<jeu>/store/play-icon-512.png` |
| Bannière Play Store | 1024 × 500 | `brand/layjou-<jeu>/store/feature-graphic-1024x500.png` |
| Captures Google Play (téléphone) | 1080 × 1920 JPEG, 9:16 | `store/<jeu>/google-play/` |
| Captures App Store (iPhone) | 1206 × 2622 JPEG sans transparence | `store/<jeu>/app-store-iphone/` |
| Icône d'app (Android et iOS) | 1024 × 1024 + calques adaptatifs | `brand/layjou-<jeu>/` → `npx capacitor-assets generate` |

Les captures sont de vrais écrans des jeux (parties jouées automatiquement), mis en page avec une légende en français. Pour une fiche anglaise, réutilisez les captures brutes ou demandez une version avec légendes anglaises. Layjou Kart n'a pas encore de captures : le jeu n'est pas terminé.

## 8. Exigences techniques déjà respectées

- Android : `targetSdkVersion 36` (exigé pour toute nouvelle app ou mise à jour depuis le 31 août 2026), `minSdkVersion 24`, orientation portrait.
- iOS : cible iOS 15, Capacitor 8 sans CocoaPods, `ITSAppUsesNonExemptEncryption = NO` (sauf Bubble : à ajouter).
- Identifiants d'app tous différents (`com.layjou.*`).

## Sources

Vérifiées dans les pages officielles (novembre 2026) : developer.android.com (niveau d'API cible, App Bundle), developer.apple.com (prix du programme, spécifications des captures, limites de texte, classification par âge et date du 31 janvier 2026, Xcode 26 depuis le 28 avril 2026, ATT, Paid Apps Agreement, restauration des achats).
Issues de résumés de recherche, pages Google non consultables d'ici : frais Google Play, test fermé (12 testeurs ; certains articles anciens parlent de 20), limites de texte Play, données collectées par AdMob, programme Familles, examen des apps AdMob. À confirmer dans la Play Console et l'aide AdMob.
