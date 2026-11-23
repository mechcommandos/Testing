# Layjou pour iPhone et iPad

Application iOS de Layjou, version 1.3.0 (build 4). L'application web est **embarquée dans le paquet** et servie par
`SchemeHandler` sous `app://layjou/app.html` (WKWebView en plein écran). Les 54 jeux marchent hors connexion dès le
premier lancement. Le serveur (`https://layjou.com/api`, relayé par `SchemeHandler`) ne sert qu'au compte parent et à la
synchronisation.

- Identifiant : `com.layjou.app` ; iOS 15 et plus ; iPhone et iPad.
- Données (profils, progression) gardées sur l'appareil (IndexedDB de la vue web).
- Fonctions de l'iPhone (`NativeBridge.swift`, messages `layjou`) : voix fr-FR et en-US d'`AVSpeechSynthesizer`,
  vibrations douces (jamais d'alerte d'erreur), bilan en PDF et fichiers via la feuille de partage (imprimer,
  Fichiers, e-mail).
- Aucun renvoi vers le site (règle 2.3.10) : pas de « Version web » ni d'« Installer sur Android ». Les liens
  extérieurs passent par la porte parent, puis par une fenêtre Safari intégrée (`SFSafariViewController`).
- Pas de zoom, de sélection de texte, d'aperçu au clic long ni de rebond du défilement.
- Icône et écran de démarrage générés par `php tools/make-brand-assets.php` (depuis `tools/brand/`).

## Préparer les sources (sur Windows ou Mac)

```
php tools/build-ios.php
```

La commande copie `public/` (app.html, js, css, assets, content, manifest, favicon) dans `ios/www`. Elle vérifie qu'il
n'y a pas de mesure d'audience et compte les jeux, puis produit `build/layjou-ios-<version>.zip`. Relancer après chaque
changement du jeu : la version iOS ne se met plus à jour avec le site.

## Construire (sur un Mac, obligatoire pour iOS)

Un binaire iOS ne peut être compilé et signé que sur macOS, avec Xcode et un compte Apple Developer (99 $/an).

1. Installer Xcode (App Store) et XcodeGen : `brew install xcodegen`.
2. Décompresser l'archive, puis `cd layjou-ios && xcodegen` → crée `Layjou.xcodeproj` ; l'ouvrir dans Xcode.
3. Cible Layjou → *Signing & Capabilities* → choisir l'équipe Apple Developer.
4. Essai : brancher un iPhone, *Run ▶*. Sans compte payant, l'essai sur son propre iPhone est possible 7 jours.
5. Publication : *Product → Archive* → *Distribute App* → App Store Connect (TestFlight, puis revue d'Apple).

Sans Mac : un service de compilation en ligne (Codemagic, GitHub Actions avec une machine macOS, Bitrise) peut faire
les étapes 2 à 5 avec le même dossier et le certificat du compte Apple Developer.

## À vérifier sur un vrai iPhone avant l'envoi

- **Code parent** : `crypto.subtle` (PBKDF2 dans `pin.js`) exige un contexte sécurisé. Vérifier que `app://layjou`
  en est un : créer un code parent, puis le saisir.
- **Passage de la 1.2 à la 1.3** : les données IndexedDB de l'origine `https://layjou.com` ne sont pas visibles depuis
  `app://layjou`. Les profils synchronisés reviennent après connexion du parent (le cookie est migré, il reste
  connecté). Les profils locaux non synchronisés sont perdus. À signaler dans les notes de version.
- Voix anglaise, vibrations, partage du bilan, liens légaux (porte parent → fenêtre Safari).

## Points de revue Apple

- **Paiement** : l'offre Famille est gratuite et active pour tous les parents ; aucun achat dans l'application.
- **Connexion** : connexion Google désactivée ; connexion par code e-mail.
- **Règle 4.2** : jeux embarqués hors connexion, voix natives, partage, vibrations ; le préciser dans les notes de revue.
- **Catégorie Enfants** : pas de publicité, pas d'outil d'analyse, liens sortants derrière la porte parent.
  `js/feedback.js` charge un module de votecove.com : à vérifier qu'il n'est pas affiché dans l'app (sinon le retirer).
