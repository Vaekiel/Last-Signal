# Dernier Signal

Un jeu incrémental (clicker) de survie spatiale, entièrement en français, en pixel-art.

Votre vaisseau, l'**ARCHE-09**, s'est égaré après un saut hyperspatial raté. Récupérez des débris, construisez des modules, gardez l'équipage en vie, puis sautez de secteur en secteur jusqu'à pouvoir envoyer un dernier signal vers la Terre.

L'esprit s'inspire de [DodecaDragons](https://demonin.com/games/dodecaDragons/) : des onglets qui se débloquent au fil de la partie, des nombres qui grimpent vite et plusieurs couches de prestige qui s'empilent.

## Jouer

Ouvrez `index.html` dans un navigateur. Il n'y a rien à installer : le jeu tourne hors ligne, mais les polices pixel viennent de Google Fonts.

La partie est sauvegardée automatiquement dans le navigateur, toutes les 15 secondes et à la fermeture de l'onglet. Pour changer d'appareil, utilisez l'export et l'import de code dans **Options**.

### Raccourcis

| Touche | Action |
| --- | --- |
| `Espace` ou clic sur le vaisseau | Récupérer des débris |
| `2` | Forer la glace |
| `3` | Scanner le secteur |
| `4` | Réparer le vaisseau |
| `5` | Synthèse vitale (oxygène et vivres d'urgence) |
| `M` | Ouvrir la transmission en attente |
| `Échap` | Fermer une fenêtre |

## Mécaniques

**Survie.** Chaque membre d'équipage consomme de l'oxygène et des vivres. Si l'un des deux vient à manquer, la production chute de 65 % et un membre meurt toutes les 45 secondes. La coque s'use avec le temps et les aléas. Sous 50 %, le rendement baisse ; à 0 %, une brèche fait perdre une partie de la soute.

**Modules.** Dix-sept modules, du réacteur solaire à la forge à plasma. Leur coût croît à chaque niveau et leur production double aux paliers (niveaux 10, 25, 50, 100…). La plupart consomment de l'énergie ou de la glace : un réseau sous-alimenté tourne au ralenti.

**Onglets à débloquer**, dans l'ordre où ils apparaissent :

1. **Recherche** : 44 technologies réparties en quatre paliers, débloqués selon le secteur.
2. **Équipage** : réveiller des dormeurs et les affecter à des postes (ingénieurs, techniciens, botanistes, scientifiques).
3. **Expéditions** : des sondes à durée fixe qui rapportent un butin indexé sur votre production, avec un risque de perte.
4. **Navigation** : le premier prestige. Le saut hyperspatial remet le cycle à zéro et rapporte des **échos stellaires**, qui donnent un bonus passif et achètent des **archives** permanentes. Chaque secteur a ses propres règles.
5. **Spécimen** : une créature trouvée après le premier saut. On la nourrit, elle mue et donne des bonus.
6. **Anomalies** : six défis avec handicap, chacun récompensé par un bonus permanent.
7. **Signal** : le second prestige. Il faut construire l'antenne depuis la Porte du Silence (secteur 6), puis émettre le Signal. Cela remet tout le voyage à zéro et rapporte des **fragments de signal**, qui achètent automatisations et multiplicateurs. Le but final est de transmettre le Dernier Signal.

**Transmissions.** Des événements à choix arrivent dans la messagerie (icône d'enveloppe) et disparaissent au bout de 2 min 30 s.

**Absence.** Pendant votre absence, ou quand l'onglet est en arrière-plan, l'équipage passe en veille : la consommation est réduite et personne ne meurt. La production continue jusqu'à 12 heures.

## Structure

```
index.html          page du jeu
css/style.css       interface pixel-art (adaptée au mobile)
js/data.js          contenu et équilibrage : ressources, modules, recherches, secteurs…
js/engine.js        moteur de simulation, sans DOM (testable sous Node)
js/pixelforge.js    moteur de pixel-art ombré (reliefs, dégradés limités, tramage, contours)
js/sprites.js       icônes pixel-art 32×32 construites en volumes
js/scene.js         rendu canvas : fond en parallaxe, vaisseau modulaire, planètes, Spécimen
js/ui.js            construction de l'interface et mises à jour ciblées
js/main.js          démarrage, boucle de jeu, sauvegardes
tools/simulation.js joueur automatique pour vérifier l'équilibrage
```

Tous les chiffres d'équilibrage se trouvent dans `js/data.js`. Après une modification, lancez la simulation :

```
node tools/simulation.js 10 3
```

Elle simule 10 heures de jeu à 3 clics par seconde et affiche le moment de chaque saut et de chaque émission. Avec l'équilibrage actuel, ce joueur automatique fait son premier saut vers 10 min, sa première émission vers 1 h et gagne en un peu moins de 3 h. Un joueur humain mettra plutôt 6 à 8 heures.
