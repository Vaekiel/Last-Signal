# Consignes pour les agents IA (ChatGPT, Codex et autres)

Lisez ce fichier en entier avant toute modification du dépôt.

## Votre mission : les graphismes, et seulement les graphismes

*Dernier Signal* est un jeu incrémental de survie spatiale en français, jouable en ouvrant `index.html`. Les mécaniques sont terminées et équilibrées : règles, chiffres, interface et sauvegarde. **Vous n'y touchez pas.**

Vous pouvez améliorer :

- les **icônes** pixel-art ;
- le **vaisseau** (coque, salles, pièces qui apparaissent avec la progression, animations) ;
- les **fonds animés** des secteurs (nébuleuses, étoiles, planètes, objets en dérive, effets) ;
- le **Spécimen** dans sa cuve.

Si une demande vous oblige à sortir de ce périmètre, par exemple changer un coût, un texte, la mise en page ou ajouter un bouton, **ne le faites pas**. Expliquez ce qu'il faudrait modifier et laissez la décision au propriétaire du dépôt.

## Fichiers

### Vous pouvez modifier

| Fichier | Contenu |
| --- | --- |
| `js/pixelforge.js` | Moteur d'ombrage pixel-art : matériaux, dégradés, reliefs, contours |
| `js/sprites.js` | Les 36 icônes 32×32 |
| `js/ship.js` | Le vaisseau : salles, pièces de coque, évolution, animations |
| `js/scene.js` | Fonds de secteur, planètes, astéroïdes, scène animée, Spécimen |
| `assets/*.png` | Images pixel-art facultatives (voir « Images ») |
| `tools/atelier.html` | Page d'aperçu des graphismes |
| Nouveau fichier `js/*.js` | Uniquement du rendu, chargé par une ligne `<script>` ajoutée dans `index.html`, après `js/pixelforge.js` et avant `js/ui.js` |

### Vous ne devez pas modifier

| Fichier | Pourquoi |
| --- | --- |
| `js/data.js` | Contenu et équilibrage : coûts, productions, noms, textes |
| `js/engine.js` | Règles, simulation, sauvegarde |
| `js/ui.js`, `css/style.css`, `index.html` | Interface et mise en page. Seule exception pour `index.html` : ajouter une ligne `<script>` pour un nouveau fichier graphique |
| `js/main.js` | Démarrage, boucle de jeu, sauvegardes |
| `tools/simulation.js`, `tools/simulation-reference.txt`, `tools/verifier-graphismes.js` | Garde-fous de l'équilibrage |
| `AGENTS.md`, `README.md` | Documentation tenue par le propriétaire |

Interdits généraux :

- **Pas de mécanique.** Ne modifiez jamais l'état de la partie, le tirage des événements ou les nombres affichés.
- **Pas de nouvelle dépendance.** Aucune bibliothèque, aucun CDN, aucune étape de compilation, aucun outil de build.
- **Pas de ressource externe.** Le jeu doit marcher en ouvrant `index.html` hors ligne ; seules les polices viennent de Google Fonts.
- **Pas de renommage** d'icône, de salle, de type de planète ou de fonction listés plus bas.

## Contrats à respecter

Le reste du jeu appelle ces fonctions. Gardez leurs noms, leurs paramètres et leurs valeurs de retour ; vous pouvez changer librement leur rendu.

### Moteur (`js/pixelforge.js`)

- `new DS.Forge(largeur, hauteur)` : toile de travail, avec les formes `rect`, `cylV`, `cylH`, `ellipse`, `poly`, `shape`, `line`, `px`, `iso` et le rendu `render(options)`, qui renvoie un `<canvas>` avec 1 px de contour de chaque côté.
- `DS.makeRamp(nom, couleurSombre, couleurClaire, paliers, options)` crée un matériau.
- `DS.ramp(nom)` renvoie les couleurs d'un matériau.
- `DS.forgeBayer(x, y)` donne le seuil de tramage.
- Matériaux existants, à ne pas supprimer : `steel`, `hull`, `hullB`, `dark`, `gold`, `ice`, `leaf`, `violet`, `red`, `wood`, `white`, `skin`, `orange`, `teal`, `rock`, `rockDark`, `pink`, `glass`, `paper`, `navy`, `brass`, `solar`, `solarGold`, `organic`, les lueurs `glowC`, `glowO`, `glowG`, `glowP`, `glowR`, `glowY`, `glowT`, et les `room-<salle>`.

### Icônes (`js/sprites.js`)

- `DS.spriteURL(nom)` renvoie une image `data:` de 34×34 px, c'est-à-dire 32×32 plus le contour. L'interface affiche les icônes à 34 px, ou réduites à 18–26 px : **gardez la grille 32×32**.
- `DS.icon(nom, classe)` renvoie une balise `<img class="px …">`.
- `DS.SPRITE_NAMES` est la liste des noms.
- `DS.spriteTools` et `DS.crystal` sont aussi utilisés par `ship.js` et `scene.js`.
- Ces 36 noms doivent tous exister :
  `alloy anomaly antenna check clock cloud crew cryo data debris echo energy flask food fragment gear heart hull ice journal lock mail map metal oxygen pickaxe planet play radar scan ship specimen star target tools wrench`.
- Pour vous repérer : `metal`, `ice`, `energy`, `oxygen`, `food`, `data` et `alloy` sont les sept ressources de la barre du haut.

### Vaisseau (`js/ship.js`)

- `DS.ROOMS` : une entrée par salle, `{ light, dark, kind, glow }`. Ces identifiants doivent tous exister :
  `solar drone ice oxygen greenhouse battery lab extractor foundry cryo nanites array fusion harvester biodome quantum plasma empty`.
- `DS.roomURL(salle)` renvoie la vignette d'une salle, affichée à ×2 et ×1,5 dans les cartes de modules.
- `DS.drawRoom(F, x, y, w, h, salle, graine)`.
- `DS.SHIP_ROOM = { w: 44, h: 30 }` : taille intérieure d'une salle. L'équipage animé marche dans ces salles.
- `DS.shipSpec(état)` lit l'état de la partie **sans jamais le modifier** et renvoie la description du vaisseau.
- `DS.shipKey(spec)` sert de clé de reconstruction.
- `DS.buildShip(spec)` renvoie au minimum : `canvas, W, H, bx, by, bodyW, bodyH, engines[], lights[], rooms[], flick[], fx{}`.
  - `rooms[]` est utilisé pour placer l'équipage.
  - `fx.drones` et `fx.shield` sont mis à jour par la scène sans reconstruction.
- `DS.drawShipFX(ctx, vaisseau, x, y, t, état, immobile, premierPlan)` dessine les animations par-dessus le vaisseau.

### Scène (`js/scene.js`)

- `new DS.Scene(canvas)` avec :
  - les méthodes `setState(état)`, `frame(dt)`, `burst(type, position)` et `toLogical(événementSouris)` ;
  - les propriétés `cv`, `W`, `H` et `reduced`.
- `burst` reçoit `metal`, `ice`, `data`, `hull`, `oxygen` ou `jump`, et doit ignorer sans erreur tout autre type.
- `reduced = true` signifie : aucune animation, image fixe (préférence « mouvement réduit » ou option du joueur).
- `DS.drawPlanet(ctx, cx, cy, rayon, type, graine, options)` et `DS.planetURL(type, taille, graine)`. Ces types de planète doivent tous exister : `terra ice violet mars gas dark`.
- `DS.drawSpecimen(ctx, 128, 128, niveau, temps, immobile)` gère 7 stades (`DS.SPEC_STAGES` dans `data.js`).

### Lire l'état de la partie

Le rendu reçoit l'objet de partie `s`. **Lecture seule** : n'assignez rien, n'appelez aucune fonction du moteur qui le modifie (`DS.buyModule`, `DS.gain`, `DS.tick`, etc.) et n'émettez aucun événement `DS.emit`.

Champs utiles :

| Champ | Contenu |
| --- | --- |
| `s.mods[id]` | Niveaux des modules |
| `s.research[id]` | Recherches acquises |
| `s.archives[id]` | Archives (prestige) |
| `s.sector` | Secteur actuel, de 0 à 5, puis au-delà |
| `s.jumps` | Nombre de sauts |
| `s.signal.antenna`, `s.signal.emissions` | Antenne du Signal et émissions |
| `s.specimen.found`, `s.specimen.level` | Le Spécimen |
| `s.crew.total` | Taille de l'équipage |
| `s.exps.length` | Expéditions en cours |
| `s.hull` | Coque, en % |
| `s.distress.active` | Détresse vitale |
| `s._c.ratio.energy` | Puissance disponible, de 0 à 1 |

## Direction artistique

Le propriétaire a validé ce qui suit. Gardez-le, sauf demande contraire.

- **Pixel art strict.**
  - `ctx.imageSmoothingEnabled = false` et coordonnées entières.
  - Lumière en haut à gauche.
  - Dégradés de couleurs limités, avec des ombres qui glissent vers le bleu ou le violet.
  - Transitions tramées (matrice de Bayer 4×4).
  - Contour sombre sélectif.
  - Pas d'anticrénelage ni de flou, pas de dégradés CSS dans les dessins.
- **Ambiance générale.** Métal bleu-gris sombre, accents orange (`#ff9a2e`) et cyan (`#46d8ff`), lueurs chaudes aux fenêtres.
- **Icônes.** Volumes ombrés, lisibles même réduites à 26 px.
- **Vaisseau.**
  - Il vole vers la droite : moteurs à gauche, proue arrondie avec cockpit vitré à droite.
  - Les salles forment une grille de deux rangées, de 4 colonnes minimum. Une salle s'allume quand son module est construit.
  - Il doit rester **évolutif** : chaque élément de `DS.shipSpec` produit un détail visible. Vous pouvez enrichir ou redessiner, mais ne retirez aucune correspondance (tableau ci-dessous).
- **Fonds.**
  - Six plans en parallaxe qui défilent vers la gauche : ciel profond, nébuleuse lointaine, planète et lune, étoiles scintillantes, nébuleuse proche, objets.
  - Les calques mesurent 720×320 px et **se raccordent sans couture** horizontalement : le bruit est échantillonné sur un cylindre, voir `seam()`.
- **Le fond d'Hélios (secteur 1, thème `terra`) est validé tel quel** : ne le modifiez pas sans demande explicite.
- **Identité des autres secteurs**, à conserver :

| Secteur | Thème | Signature |
| --- | --- | --- |
| Nébuleuse de Verre | `ice` | nuages cyan, éclats de cristal |
| Champ des Veilleurs | `violet` | nébuleuse magenta, satellites abandonnés |
| Secteur d'Orion | `mars` | nuages orangés, épaves de cargos |
| Nébuleuse Triskel | `gas` | turquoise et ambre, éclairs, géante à anneaux |
| Porte du Silence | `dark` | porte annulaire ancienne, monolithes à runes |

### Évolution du vaisseau : correspondances à conserver

| Champ de `DS.shipSpec` | Source dans la partie | Élément visible |
| --- | --- | --- |
| `rooms` | modules construits | salles éclairées |
| `solar`, `solarBig`, `gold` | Réacteur solaire, recherche « Cellules photovoltaïques » | ailes solaires, plus grandes au niveau 25, cadres dorés |
| `tanks` | Condenseur d'oxygène | réservoirs sur le pont |
| `greenhouse`, `biodome` | Serre, Biodôme | dômes de verre avec plantes |
| `labs`, `dish` | Laboratoire, Réseau de capteurs | observatoires, grande parabole |
| `chimneys` | Fonderie | cheminées qui fument |
| `bowDrill`, `mandibles` | Extracteur, Moissonneuse | foreuse de proue animée, mâchoires |
| `fusion`, `batteries` | Réacteur à fusion, Batteries | nacelle centrale à flamme dorée, blocs de batteries |
| `quantum`, `singularity`, `plasma`, `nanites` | Calculateur quantique, recherche « Micro-singularité », Forge à plasma, Essaim de nanites | cube holographique, sphère en confinement, conduits et étincelles |
| `armor`, `turrets` | recherche « Blindage réactif » | plaques à liseré orange, tourelles |
| `arm` | recherches « Bras robotisé », « Bras robotisés II » | bras articulés animés |
| `hangars` | recherches « Hangar à sondes », « Second hangar », « Troisième hangar » | baies d'où partent les sondes |
| `drills` | Collecteur de glace | bras de forage sous la quille |
| `cargo`, `boom` | recherches « Logistique », « Sondes longue portée » | conteneurs, perche avant |
| `ring` | recherche « Cartographie hyperspatiale » | anneau de saut lumineux |
| `signal` | recherche « Antenne de transmission » et étapes de l'antenne | pylône, parabole puis couronne émettrice |
| `cocoon` | stade du Spécimen | cocon organique sous la quille |
| `shield` | archive « Bouclier de phase » | bulle scintillante |
| `drones` | Drones récupérateurs | drones en orbite |
| `jumps`, `emissions` | sauts et émissions du Signal | encoches peintes sur la proue |

### Images

Les dessins sont faits en code. Si vous ajoutez des images :

- PNG pixel-art à taille réelle, fond transparent, dans `assets/`, 200 Ko maximum chacune ;
- chargées depuis les fichiers graphiques avec un chemin relatif ;
- le dessin en code reste affiché tant que l'image n'est pas chargée, ou si elle échoue ;
- aucune image tirée d'un pack commercial ni d'une source sans licence libre.

## Performances

| Opération | Budget |
| --- | --- |
| `Scene.frame(dt)` | moins de 2 ms par image (actuellement environ 0,7 ms) |
| `DS.buildShip(spec)` | moins de 100 ms ; le vaisseau est reconstruit au plus une fois par seconde, quand sa description change |
| Génération d'un fond de secteur | moins de 500 ms ; une fois par changement de secteur |

Pas de création d'objets lourds à chaque image : préparez les sprites à l'avance et gardez-les en cache.

## Avant de livrer

1. Lancez le contrôle :
   ```
   node tools/verifier-graphismes.js
   ```
   Il échoue si :
   - un fichier hors du périmètre a changé ;
   - un script a une erreur de syntaxe ;
   - une icône, une salle ou une fonction attendue manque ;
   - la simulation d'équilibrage ne donne plus exactement `tools/simulation-reference.txt`.

   Le résultat doit se terminer par `OK`.
2. Ouvrez `tools/atelier.html` dans un navigateur. On y voit toutes les icônes, les salles, les planètes, quatre stades du vaisseau, les fonds des secteurs et le Spécimen. La console ne doit afficher aucune erreur.
3. Ouvrez `index.html` et jouez une minute : cliquez sur le vaisseau, construisez un module, changez d'onglet. Aucune erreur dans la console.

## Façon de travailler

- Travaillez sur une branche dédiée, en petits commits.
- Commentaires de code et messages de commit **en français**, qui décrivent ce qui change à l'écran.
- Imitez le style du code existant : `'use strict'`, fonctions courtes, pas de dépendance, commentaires sobres.
- Décrivez dans la pull request ce qui a changé visuellement, idéalement avec des captures avant et après tirées de `tools/atelier.html`.
