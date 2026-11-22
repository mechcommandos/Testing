# Kit de publication des 6 jeux Layjou — Google Play et App Store

Tout ce qu'il faut pour remplir les fiches et les formulaires des 6 jeux, en français et en anglais.

| Jeu | Identifiant | Catégorie | Âge attendu (Apple / PEGI) | Achats intégrés | Fiche |
|---|---|---|---|---|---|
| Layjou Kart | `com.layjou.kart` | Course | 9+ / PEGI 3-7 | 6 produits | [store/kart/fiche.md](store/kart/fiche.md) |
| Layjou Battle | `com.layjou.battle` | Action | 9+ / PEGI 7 | 6 produits | [store/battle/fiche.md](store/battle/fiche.md) |
| Layjou Blocks | `com.layjou.blocks` | Puzzle | 4+ / PEGI 3 | 4 produits | [store/blocks/fiche.md](store/blocks/fiche.md) |
| Layjou Bubble | `com.layjou.bubble` | Puzzle | 4+ / PEGI 3 | aucun | [store/bubble/fiche.md](store/bubble/fiche.md) |
| Layjou Puzzle | `com.layjou.puzzle` | Puzzle | 4+ / PEGI 3 | aucun | [store/puzzle/fiche.md](store/puzzle/fiche.md) |
| Layjou Run | `com.layjou.run` | Arcade | 4+ / PEGI 3 | aucun | [store/run/fiche.md](store/run/fiche.md) (français uniquement) |

## Contenu du kit

| Dossier / fichier | Contenu |
|---|---|
| `store/<jeu>/fiche.md` | Textes à copier-coller (nom, sous-titre, descriptions FR/EN, mots-clés, texte promo), catégorie, réponses aux questionnaires d'âge, achats intégrés, notes pour la vérification Apple |
| [store/formulaires.md](store/formulaires.md) | Réponses aux formulaires communs : contenu de l'app et sécurité des données (Google), confidentialité de l'app et conformité (Apple), public cible, AdMob |
| `store/<jeu>/google-play/{fr,en}/` | Captures Google Play 1080 × 1920 |
| `store/<jeu>/app-store-iphone/{fr,en}/` | Captures iPhone 1206 × 2622 (taille obligatoire « 6,3" Dynamic Island ») |
| `store/<jeu>/app-store-ipad/{fr,en}/` | Captures iPad 13" 2064 × 2752 (obligatoires : les jeux sont déclarés iPhone + iPad) |
| `store/<jeu>/captures-brutes/` | Les mêmes écrans sans légende ; `iap-en/` = capture de la boutique pour la vérification des achats Apple |
| `brand/layjou-<jeu>/store/` | Icône Play 512 × 512 (PNG 32 bits) et bannière 1024 × 500 (PNG 24 bits) |
| `site/` | Pages à mettre en ligne sur layjou.com : politique de confidentialité, assistance, `app-ads.txt` |
| `Layjou-AAB-Google-Play.zip` (envoyé à part) | Les 6 App Bundles signés à envoyer sur Google Play (code de version 2) ; dans le dépôt : `*/release/*-release.aab` |
| `store/politique-de-confidentialite.md`, `store/assistance.md` | Textes sources des pages du site |
| `outils/` | Scripts qui ont produit les captures, les fiches et le site (pour les régénérer après une mise à jour) |

---

## Étape 0 — Ce que vous devez faire avant tout

1. **Mettre en ligne le dossier `site/`** à la racine de `layjou.com` (n'importe quel hébergement de pages statiques) :
   - `https://layjou.com/confidentialite/` → politique de confidentialité (exigée par Google, Apple et AdMob, et ouverte par le lien présent dans chaque jeu) ;
   - `https://layjou.com/support/` → page d'assistance (URL d'assistance obligatoire sur l'App Store) ;
   - `https://layjou.com/app-ads.txt` → déjà rempli avec votre identifiant d'éditeur `pub-6003645213510535`.

   Avant, remplacez dans les deux pages les champs entre crochets : nom de l'éditeur, pays ou adresse, e-mail de contact. Le plus simple : envoyez-les-moi et je régénère les pages. Sinon, éditez `VALEURS` dans `outils/site.py` puis lancez `python3 outils/site.py`. Si vous préférez une autre adresse que `layjou.com/confidentialite/`, dites-le-moi : elle est aussi inscrite dans les 6 jeux.
2. **Choisir le public cible** : 13 ans et plus (correspond aux fichiers fournis, recommandé) ou enfants inclus (recompilation nécessaire). Voir [formulaires.md § 1](store/formulaires.md).
3. **Recompiler les 6 IPA** (étape 3 ci-dessous) : celles que vous avez sont antérieures aux correctifs de ce kit.

## Étape 1 — Les comptes (une seule fois)

| Compte | Coût | À savoir |
|---|---|---|
| Google Play Console | 25 $ une fois | Compte **personnel** récent : chaque jeu doit passer par un **test fermé** (12 testeurs pendant 14 jours d'affilée selon les dernières informations disponibles ; vérifiez le chiffre affiché dans votre console) avant d'accéder à la production. Un compte **Organisation** (numéro D-U-N-S) n'a pas cette obligation. |
| Apple Developer Program | 99 $ par an | Signer l'accord **Paid Apps** (banque et fiscalité) avant de créer les achats de Battle, Blocks et Kart. |
| AdMob | gratuit | Créer une app AdMob par jeu et par plateforme : voir [formulaires.md § 8](store/formulaires.md). |
| Profil de paiement Google | gratuit | Nécessaire pour vendre les achats intégrés. |

## Étape 2 — Google Play (pour chaque jeu)

1. **Créer l'application** : nom (fiche § 2), langue par défaut **Français (France)**, Jeu, Gratuit.
2. **Contenu de l'application** : toutes les réponses sont dans [formulaires.md § 2 à 3](store/formulaires.md) ; la classification IARC est au § 5 de la fiche du jeu.
3. **Fiche principale** : nom, description courte, description complète (fiche § 2 et § 4), icône 512, bannière 1024 × 500, captures `google-play/fr/`. Ajouter ensuite la traduction **Anglais (États-Unis)** avec les textes EN et les captures `google-play/en/` (sauf Layjou Run, en français uniquement).
4. **Catégorie et coordonnées** : catégorie de la fiche, e-mail, site `https://layjou.com`.
5. **Produits intégrés** (Battle, Blocks, Kart) : Monétiser › Produits › Produits intégrés, avec exactement les identifiants de la fiche (§ 6).
6. **Test fermé** : créer la piste, téléverser l'AAB du jeu (archive `Layjou-AAB-Google-Play.zip`), accepter **Play App Signing**, inviter les testeurs. Vérifiez sur de vrais téléphones les vidéos, les achats et le lien « Politique de confidentialité ».
7. **Demander l'accès à la production**, puis publier. Ensuite, dans AdMob, associer chaque app à sa fiche.

Les AAB sont signés avec votre clé d'envoi `layjou-upload` (celle que je vous ai envoyée) : gardez le fichier `.jks` et ses mots de passe en lieu sûr, ils sont nécessaires pour chaque mise à jour.

## Étape 3 — Recompiler les IPA (sur Mac, Xcode 26 ou plus récent)

Vos IPA actuelles ne contiennent pas les correctifs suivants, faits depuis :
- **lien vers la politique de confidentialité dans chaque jeu** : Apple l'exige (règle 5.1.1) et refuse souvent une app qui ne l'a pas ;
- bouton « Confidentialité des pubs » dans Bubble, Puzzle et Run (consentement RGPD) ;
- manifeste de confidentialité `PrivacyInfo.xcprivacy` (API « à raison déclarée ») ;
- déclaration de chiffrement de Bubble, polices intégrées dans Run ;
- nouveaux identifiants AdMob et interstitiels rares dans les 6 jeux (« Sans Pubs » de retour dans Battle et Kart) ;
- **numéro de build 2**, pour pouvoir envoyer même si un build 1 est déjà sur TestFlight.

Pour chaque jeu, depuis la branche à jour du dépôt :

| Jeu | Dossier | Commandes |
|---|---|---|
| Blocks | racine du dépôt | `npm install && npm run ios:sync` |
| Battle | `layjou-battle/` | `npm install && npm run sync` |
| Kart | `layjou-kart/` | `npm install && npm run sync` |
| Bubble | `layjou-bubble/` | `npm install && npx cap sync ios` |
| Puzzle | `layjou-puzzle/` | `npm install && npx cap sync ios` |
| Run | `layjou-run/` | `npm install && npx cap sync ios` |

Puis ouvrir `ios/App/App.xcodeproj` dans Xcode : choisir votre équipe (Signing & Capabilities) ; ajouter la capacité **In-App Purchase** pour Battle, Blocks et Kart ; vérifier l'identifiant (`com.layjou.<jeu>`), version et build 2 ; puis **Product › Archive › Distribute App › App Store Connect**.

⚠️ Sur App Store Connect, chaque jeu doit avoir sa propre fiche avec son identifiant (`com.layjou.kart`, `com.layjou.battle`…). Une fiche créée avec `com.layjou.app` ne peut recevoir aucun de ces 6 jeux.

## Étape 4 — App Store Connect (pour chaque jeu)

1. **Mes apps › + › Nouvelle app** : plateformes iOS, nom (fiche § 3), langue principale **Français (France)**, identifiant de lot `com.layjou.<jeu>`, UGS par exemple `layjou-kart`.
2. **Informations sur l'app** : sous-titre, catégorie, URL de confidentialité, classification par âge (réponses au § 5 de la fiche), droits sur le contenu : non.
3. **Confidentialité de l'app** : [formulaires.md § 4](store/formulaires.md).
4. **Achats intégrés** (Battle, Blocks, Kart) : mêmes identifiants que sur Google Play, avec la capture `captures-brutes/iap-en/01-boutique.jpg` pour la vérification.
5. **Version 1.0** : captures iPhone `app-store-iphone/fr/` et iPad `app-store-ipad/fr/`, texte promotionnel, description, mots-clés, URL d'assistance, copyright, notes pour la vérification (fiche § 3, en anglais). Ajouter la localisation **Anglais (États-Unis)** avec les textes et captures `en/` (sauf Run).
6. Sélectionner le build envoyé depuis Xcode (testez d'abord avec TestFlight), puis **Ajouter pour vérification › Envoyer**.

## Points d'attention

- **AdMob** : les 6 jeux partagent aujourd'hui la même app (`~4833816740`), le même bloc récompensé et le même bloc interstitiel sur Android et iOS. Ça fonctionne, mais une app AdMob ne s'associe qu'à une seule fiche de store. Créez 12 apps AdMob (6 jeux × 2 plateformes) avec chacune un bloc « Récompensé » et envoyez-moi les identifiants : je les intègre et je recompile.
- **iPad** : Kart et Battle s'affichent sur iPad dans une colonne de téléphone (bandes sombres sur les côtés) ; les captures iPad le montrent tel quel. Si vous préférez ne pas proposer l'iPad, réglez « Supported Destinations » sur iPhone seulement dans Xcode avant d'archiver : les captures iPad ne seront plus demandées. Ce choix ne peut plus être annulé une fois l'app publiée avec l'iPad.
- **Run** est en français uniquement : fiche en français seulement (pas de localisation anglaise).
- **APK de démonstration** (`*-debug.apk`, `*-demo.apk`) : ce sont des versions de test, avec des pubs de test ; elles ne contiennent pas encore les derniers correctifs. Seuls les AAB sont à publier.
- Les captures sont de vrais écrans des jeux, joués automatiquement ; les légendes s'ajoutent par-dessus. Pour les refaire après une mise à jour : `node publication/outils/captures.cjs` puis `node publication/outils/render-storeshots.cjs`.

## Sources et vérifications

- Vérifié sur developer.apple.com (novembre 2026) : tailles de captures obligatoires (iPhone « Dynamic Island medium » 1179 × 2556 ou 1206 × 2622 ; iPad 13" si l'app fonctionne sur iPad ; 1 à 10 images ; sans transparence), nouveaux niveaux d'âge 4+/9+/13+/16+/18+ et rubriques du questionnaire (publicité, coffres à butin…), obligation de déclarer les données collectées par les SDK tiers, règle ATT (5.1.2), lien de confidentialité dans l'app (5.1.1).
- Vérifié sur developer.android.com : niveau d'API cible 36 exigé pour les nouvelles apps et mises à jour depuis le 31 août 2026 (les 6 jeux ciblent l'API 36).
- **Non vérifiable depuis l'environnement de préparation** (pages Google inaccessibles) : nombre de testeurs du test fermé, liste exacte des données déclarées par le SDK AdMob, rubriques précises de la Play Console. Les réponses données suivent la documentation connue ; comparez-les aux pages officielles au moment de remplir.
