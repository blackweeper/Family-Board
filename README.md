# Family Board 2.0

Console familiale en français, pensée pour l’iPad en paysage. [Ouvrir Family Board](https://blackweeper.github.io/Family-Board/).

Cinq jeux pour 2 à 4 personnes autour du même iPad : Boum Safari, Lagon des Trésors, Prisme Express, Pico et la Cascade et À table !

Les jeux fonctionnent hors ligne après le premier chargement. Les favoris restent sur l’appareil. Le bouton **Plein écran** agrandit chaque jeu et utilise le plein écran natif si le navigateur le permet.

## Développement

Servez le dossier en HTTP avec `python -m http.server 8000`, puis ouvrez `http://localhost:8000/`. Le catalogue se trouve dans `catalog.js`. Les jeux maison sont lancés par leur identifiant dans `app.js`.

Le service worker conserve le launcher, ses ressources locales et les jeux maison après le premier chargement en ligne. Incrémentez la version du cache dans `sw.js` lors d’une mise à jour des fichiers précachés.

## Publication

GitHub Pages publie la racine de la branche `main`. Sur l’iPad, ouvrez le site dans Safari puis utilisez **Partager → Sur l’écran d’accueil** pour l’installer.
