# Family Board 2.0

Console familiale en français, pensée pour l’iPad en paysage. [Ouvrir Family Board](https://blackweeper.github.io/Family-Board/).

- **Maison** — Family Slingshot, Memory Battle, Puissance 4, Dé magique, Catapult Challenge, Treasure Quest et Cartes mystères.
- **Web** — Labyrinthe spatial, Animal Slider et Memory des super-vilains, hébergés par Toy Theater.
- **iPad** — Thinkrolls 2, Monument Valley 2 et Toca Boca World via l’App Store belge.

Les favoris sont conservés dans le stockage local du navigateur. Les jeux Toy Theater s’ouvrent sur leur site. Dix jeux HTMLGames se lancent dans le launcher, avec leurs jaquettes officielles. Ces jeux nécessitent Internet et peuvent afficher des publicités. Les repères d’âge sont indicatifs. Le fichier ads.txt du fournisseur est publié sous le chemin du projet GitHub Pages. Les fiches iPad renvoient vers l’App Store. Pour lancer une app installée, utilisez son icône ou le bouton d’ouverture de l’App Store. Un lien universel nécessite une association entre le site et l’application de l’éditeur. [Documentation Apple](https://developer.apple.com/documentation/xcode/allowing-apps-and-websites-to-link-to-your-content).

## Développement

Servez le dossier en HTTP avec `python -m http.server 8000`, puis ouvrez `http://localhost:8000/`. Le catalogue se trouve dans `catalog.js`. Les jeux maison sont lancés par leur identifiant dans `app.js`. Pour remplacer une entrée externe par un jeu maison, conservez son identifiant afin de préserver les favoris, changez son type et ajoutez le lancement dans `app.js`.

Le service worker conserve le launcher, ses ressources locales et les jeux maison après le premier chargement en ligne. Incrémentez la version du cache dans `sw.js` lors d’une mise à jour des fichiers précachés.

## Publication

GitHub Pages publie la racine de la branche `main`. Sur l’iPad, ouvrez le site dans Safari puis utilisez **Partager → Sur l’écran d’accueil** pour l’installer.
