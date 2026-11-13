# Family Board — V1

Prototype de console familiale pour iPad en mode paysage.

## Jeux inclus
- Memory Battle : memory à deux joueurs, scores et alternance.
- Puissance 4 : deux joueurs avec détection des alignements.
- Dé magique : dé numérique à lancer ou résultat d'un vrai dé.
- Catapult Challenge : mini-jeu d'adresse avec score.
- Treasure Quest : quiz coopératif.
- Cartes mystères : première version basée sur le quiz coopératif.

## Déploiement GitHub Pages
1. Ouvrir **Settings → Pages** dans le dépôt.
2. Dans **Build and deployment**, choisir **Deploy from a branch**.
3. Choisir la branche `main` et le dossier `/(root)`, puis enregistrer.
4. Attendre la publication, puis ouvrir `https://blackweeper.github.io/Family-Board/` sur l'iPad.
5. Dans Safari : **Partager → Sur l’écran d’accueil**.

## Mode hors ligne
Le service worker met en cache les fichiers principaux après le premier chargement. La police distante dispose de polices système de secours.

## Limites de cette V1
Prototype initial : pas de profils ni de sauvegarde persistante des scores, pas de reconnaissance automatique des pions, pas de scan QR, et pas d'intégration de jeux commerciaux tiers. Les accessoires physiques (dés/pions/cartes) sont utilisés manuellement en complément de l'écran. Tester sur iPad avant utilisation familiale.
