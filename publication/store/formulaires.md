# Formulaires des consoles — réponses pour les 6 jeux Layjou

Ces réponses décrivent **les fichiers fournis dans ce kit** (AAB de l'archive `Layjou-AAB-Google-Play.zip`, et IPA recompilées depuis les sources actuelles). Si vous modifiez la configuration publicitaire (par exemple pour viser les enfants, voir § 1), plusieurs réponses changent : elles sont signalées.

Ce que font les 6 jeux (vérifié dans le code) :
- Aucun compte, aucune donnée personnelle demandée, aucun serveur à nous : la progression reste **sur l'appareil**.
- Publicités **Google AdMob** : vidéos récompensées facultatives et interstitiels rares entre deux parties (jamais pendant les premières, au plus une fois toutes les 3 parties) ; dans Battle et Kart, l'achat « Sans Pubs » supprime les interstitiels.
- Formulaire de consentement de Google (UMP) pour l'Europe, le Royaume-Uni et la Suisse, et accès à « Confidentialité des pubs » dans le jeu.
- iOS : la fenêtre App Tracking Transparency (ATT) s'affiche avant les annonces personnalisées.
- Android : autorisation `AD_ID` présente (identifiant publicitaire utilisé pour les annonces).
- Achats intégrés (Battle, Blocks, Kart) via Google Play Billing et l'App Store, sans serveur.
- Rappels facultatifs dans Battle et Kart : notifications locales, programmées sur l'appareil.
- Aucun outil d'analyse (pas de Firebase ni d'Analytics), aucun chat, aucun multijoueur, aucun contenu créé par les joueurs.
- Lien vers la politique de confidentialité dans chaque jeu : réglages (Battle, Blocks, Kart), accueil (Bubble, Puzzle), menu (Run).

Adresses à utiliser partout (à héberger, voir le guide) :
- Politique de confidentialité : `https://layjou.com/confidentialite/`
- Assistance : `https://layjou.com/support/`
- Site : `https://layjou.com` (avec `app-ads.txt` à la racine)

---

## 1. Décision préalable : le public cible

| | Option A — 13 ans et plus (**recommandée pour publier maintenant**) | Option B — inclure les enfants |
|---|---|---|
| Correspond aux fichiers fournis | **Oui** | Non : il faut recompiler (je peux le faire) |
| Annonces | personnalisées si le joueur accepte (meilleurs revenus) | non personnalisées, adaptées aux enfants |
| Play Console › Public cible | 13-15, 16-17, 18 ans et plus | ajouter les tranches de moins de 13 ans → programme Familles |
| Code à changer | rien | `childDirected: true` (Battle, Kart, Blocks), `tagForChildDirectedTreatment` et `tagForUnderAgeOfConsent` (Bubble, Puzzle, Run), retrait de la demande ATT et de `AD_ID` |
| Risque | Google peut estimer que la fiche « attire involontairement les enfants » et demander l'option B | revenus publicitaires plus faibles |

Avec l'option A : à la question « Votre application pourrait-elle attirer involontairement les enfants ? », répondez **Non** et expliquez si besoin : « Jeux d'arcade et de réflexion destinés aux adolescents et aux adultes ; aucun personnage sous licence pour enfants, aucune mention des enfants dans la fiche. » Si Google refuse, passez à l'option B (une mise à jour suffit).

---

## 2. Google Play Console — « Contenu de l'application »

(menu **Surveiller et améliorer › Règles et programmes › Contenu de l'application**, ou **Tableau de bord › Configurer votre application**)

| Section | Réponse |
|---|---|
| Politique de confidentialité | `https://layjou.com/confidentialite/` |
| Accès à l'application | **Toutes les fonctionnalités sont disponibles sans restriction d'accès** |
| Annonces | **Oui, mon application contient des annonces** |
| Identifiant publicitaire | **Oui**. Utilisations : **Publicité ou marketing**, **Analyse**, **Prévention des fraudes, sécurité et conformité** (option B : Non, après retrait de `AD_ID`) |
| Classification du contenu | Questionnaire IARC : réponses dans la `fiche.md` de chaque jeu (§ 5). Adresse e-mail de contact demandée. |
| Public cible et contenu | Option A : **13-15 ans, 16-17 ans, 18 ans et plus** ; attrait pour les enfants : **Non** (voir § 1) |
| Sécurité des données | § 3 ci-dessous |
| Applications gouvernementales | **Non** |
| Fonctionnalités financières | **Mon application ne propose aucune de ces fonctionnalités** |
| Santé | **Mon application ne propose aucune fonctionnalité liée à la santé** |
| Applications d'actualités | **Non** |
| Autorisations sensibles (photos, position, contacts…) | aucune utilisée ; Battle et Kart demandent seulement l'autorisation de notifications (rappels facultatifs) |

## 3. Google Play — « Sécurité des données »

**Questions générales**

| Question | Réponse |
|---|---|
| Votre application collecte-t-elle ou partage-t-elle certains des types de données utilisateur requis ? | **Oui** (via le SDK Google Mobile Ads) |
| Toutes les données utilisateur collectées par votre application sont-elles chiffrées en transit ? | **Oui** |
| Quels sont les moyens de créer un compte ? | **Mon application ne permet pas de créer de compte** |
| Proposez-vous un moyen de demander la suppression des données ? | **Non** (aucun compte ; la progression s'efface en désinstallant le jeu ; l'identifiant publicitaire se réinitialise dans les réglages Android) |

**Types de données** (identiques pour les 6 jeux)

| Catégorie › type | Collectées | Partagées | Traitement éphémère | Obligatoire ou facultatif | Finalités |
|---|---|---|---|---|---|
| Position › **Position approximative** | Oui | Oui | Non | Obligatoire | Publicité ou marketing ; Analyse ; Prévention des fraudes, sécurité et conformité |
| Activité dans l'application › **Interactions avec l'application** | Oui | Oui | Non | Obligatoire | Publicité ou marketing ; Analyse |
| Infos et performances de l'application › **Journaux de plantage** | Oui | Oui | Non | Obligatoire | Analyse |
| Infos et performances de l'application › **Diagnostics** | Oui | Oui | Non | Obligatoire | Analyse |
| Appareil ou autres ID › **Appareil ou autres ID** | Oui | Oui | Non | Obligatoire | Publicité ou marketing ; Analyse ; Prévention des fraudes, sécurité et conformité |

Non collectés : informations personnelles (nom, e-mail…), informations financières (les paiements passent par Google Play, le jeu ne les reçoit pas), messages, photos, contacts, historique de navigation, fichiers, calendrier, santé, audio.

⚠️ La liste de Google pour son SDK (page AdMob « Prepare for Google Play's Data safety section ») n'a pas pu être consultée depuis l'environnement de préparation : comparez avec elle au moment de remplir, elle fait foi.

## 4. App Store Connect — « Confidentialité de l'app »

**Collectez-vous des données, vous ou vos partenaires tiers ?** → **Oui, nous collectons des données** (via le SDK Google Mobile Ads).

| Catégorie Apple | Type | Utilisations | Liée à l'identité | Utilisée pour le suivi |
|---|---|---|---|---|
| Identifiants | **Identifiant de l'appareil** | Publicité tierce, Analyse | Non | **Oui** |
| Données d'utilisation | **Données publicitaires** | Publicité tierce | Non | **Oui** |
| Données d'utilisation | **Interaction avec le produit** | Publicité tierce, Analyse | Non | **Oui** |
| Localisation | **Localisation approximative** | Publicité tierce, Analyse | Non | **Oui** |
| Diagnostics | **Données de plantage**, **Données de performances**, **Autres données de diagnostic** | Analyse | Non | Non |

- « Suivi » = Oui parce que les annonces personnalisées sont possibles lorsque le joueur l'autorise (fenêtre ATT). Option B : tout passe à « Non » pour le suivi.
- Achats intégrés : traités par Apple, le jeu ne collecte pas d'historique d'achat → rien à déclarer.
- Même avertissement qu'au § 3 : vérifiez avec la page AdMob « Prepare for Apple's App Store data disclosure requirements ».

## 5. App Store Connect — autres rubriques

| Rubrique | Réponse |
|---|---|
| Classification par âge | réponses dans la `fiche.md` de chaque jeu (§ 5) — attendu : Kart 9+, Battle 9+, Blocks/Bubble/Puzzle/Run 4+ |
| Conçu pour les enfants (Kids) | **Non** (la catégorie Enfants interdit presque toutes les pubs tierces) |
| Conformité à l'exportation (chiffrement) | `ITSAppUsesNonExemptEncryption = NO` est dans les 6 projets : aucune question à l'envoi. Si la question apparaît (ancienne IPA de Bubble) : l'app n'utilise que le chiffrement standard fourni par le système (HTTPS) → **aucun chiffrement non exempté** |
| Droits sur le contenu | **Non**, l'app ne contient pas de contenu tiers nécessitant des droits |
| Informations pour la vérification | Connexion requise : **Non** ; coordonnées : vos nom, téléphone et e-mail ; notes : texte anglais de la `fiche.md` (§ 3) |
| Prix et disponibilité | Gratuit ; tous les pays (ou la liste de votre choix) |
| Achats intégrés (Battle, Blocks, Kart) | tableau dans la `fiche.md` ; signer d'abord l'accord « Paid Apps » (Accords, taxes et banques) |
| Identifiant publicitaire (IDFA) | plus de questionnaire dédié : c'est couvert par « Confidentialité de l'app » et la fenêtre ATT |

## 6. Questionnaire d'âge Apple — réponses communes

| Rubrique | Réponse (6 jeux) |
|---|---|
| Contrôles intégrés : contrôle parental, vérification de l'âge | Non |
| Accès Web illimité | Non |
| Contenu généré par les utilisateurs | Non |
| Réseaux sociaux, messagerie et chat | Non |
| Partage de position | Non |
| **Publicité** | **Oui** |
| Grossièretés ou humour grossier, horreur/peur, alcool/tabac/drogues, rencontres | Aucun |
| Informations médicales, santé et bien-être | Aucun |
| Thèmes suggestifs, sexualité ou nudité | Aucun |
| Jeux d'argent, jeux d'argent simulés, concours | Non |
| Violence de dessin animé ou fantastique | Kart et Battle : **Rare/légère** ; autres : Aucune |
| Violence réaliste, violence prolongée | Aucune |
| Coffres à butin (loot boxes) | **Kart : Oui** (coffre aléatoire ouvrable avec des crédits achetés) ; autres : Non |

## 7. Questionnaire IARC (Google Play) — réponses communes

Catégorie **Jeu** ; adresse e-mail de contact. Puis :

| Question | Kart | Battle | Blocks | Bubble | Puzzle | Run |
|---|---|---|---|---|---|---|
| Violence | Oui, dessin animé/fantastique, sur des personnages non humains, sans sang | Oui, dessin animé/fantastique, sur des monstres, sans sang | Non | Non | Non | Non |
| Peur, sexualité, langage, substances, humour grossier | Non | Non | Non | Non | Non | Non |
| Jeux d'argent réels ou simulés | Non | Non | Non | Non | Non | Non |
| Achats numériques | Oui | Oui | Oui | Non | Non | Non |
| Objets aléatoires achetables avec de l'argent réel | **Oui** | Non | Non | Non | Non | Non |
| Interaction entre utilisateurs, partage de position, accès Internet illimité | Non | Non | Non | Non | Non | Non |
| Résultat attendu | PEGI 3 ou 7, achats intégrés (dont objets aléatoires) | PEGI 7, achats intégrés | PEGI 3, achats intégrés | PEGI 3 | PEGI 3 | PEGI 3 |

## 8. AdMob

1. **Créer une app AdMob par jeu et par plateforme** (12 apps) et un bloc « Récompensé » dans chacune. Aujourd'hui les 6 jeux utilisent la même app (`~4833816740`), le même bloc récompensé (`/3309442507`) et le même bloc interstitiel (`/6710677647`) sur Android et iOS : les annonces fonctionnent, mais une app AdMob ne peut être associée qu'à **une** fiche de store, donc 11 des 12 versions apparaîtront comme non associées (moins d'annonces, suivi des revenus confus, risque de limitation). Envoyez-moi les 12 identifiants d'app et de bloc : je les intègre et je recompile.
2. Publier `app-ads.txt` à la racine de `https://layjou.com` (fichier prêt : `site/app-ads.txt`) et déclarer `https://layjou.com` comme site du développeur dans les deux consoles.
3. Après publication : AdMob › Applications › associer chaque app à sa fiche Google Play ou App Store ; AdMob examine l'app (quelques jours) avant de servir toutes les annonces.
4. Configurer le message RGPD (Confidentialité et messages › RGPD) et le message ATT pour iOS (facultatif, s'affiche avant la fenêtre d'Apple).
