# LayJou Run

Jeu de course sans fin sur 3 voies, en 3D (three.js), avec le petit robot comme héros.

## Lancer

Le jeu est statique, sans étape de build. Il faut juste le servir en HTTP :

```
python3 -m http.server 8000
```

puis ouvrir http://localhost:8000.

## Commandes

- Glisser à gauche / à droite (ou flèches) : changer de voie
- Glisser vers le haut (ou flèche haut / espace) : sauter
- Glisser vers le bas (ou flèche bas) : passer sous les portiques ; en l'air, redescendre vite

## Contenu

- `index.html` : interface (menu, missions, améliorations, fin de partie)
- `game.js` : moteur du jeu
- `assets/robot.png` : le personnage, affiché au menu
- `vendor/` : three.js r160 (licence MIT)

La progression (record, cœurs, missions, améliorations, série de jours) est enregistrée dans le `localStorage` du navigateur.
