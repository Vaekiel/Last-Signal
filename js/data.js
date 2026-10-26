/* Dernier Signal — contenu du jeu (ressources, modules, recherches, etc.).
   Tout l'équilibrage chiffré se trouve dans ce fichier. */
'use strict';
(function (DS) {
  DS.VERSION = '1.0.0';

  // ------------------------------------------------------------------ ressources
  // eco : bénéficie des bonus d'économie (échos, ARK, Spécimen…)
  // capped : stock limité par une capacité
  DS.RES = {
    metal:  { name: 'Métal',    unit: 'métal',    icon: 'metal',  color: '#cfd8e6', eco: true },
    ice:    { name: 'Glace',    unit: 'glace',    icon: 'ice',    color: '#7fdcff' },
    energy: { name: 'Énergie',  unit: 'énergie',  icon: 'energy', color: '#ffd23a', capped: true },
    oxygen: { name: 'Oxygène',  unit: 'O₂',       icon: 'oxygen', color: '#59b9ff', capped: true },
    food:   { name: 'Vivres',   unit: 'vivres',   icon: 'food',   color: '#7fe35a', capped: true },
    data:   { name: 'Données',  unit: 'données',  icon: 'data',   color: '#c792ff', eco: true },
    alloy:  { name: 'Alliages', unit: 'alliages', icon: 'alloy',  color: '#e07bff', eco: true }
  };
  DS.RES_ORDER = ['metal', 'ice', 'energy', 'oxygen', 'food', 'data', 'alloy'];

  DS.START = { metal: 10, ice: 10, energy: 50, oxygen: 120, food: 90, data: 0, alloy: 0 };
  DS.BASE_CAP = { energy: 100, oxygen: 150, food: 120 };
  DS.BASE_CREW = 3;
  DS.BASE_CREW_MAX = 6;
  DS.CREW_USE = { oxygen: 0.15, food: 0.06 };   // par membre et par seconde
  DS.HULL_DECAY = 0.02;                          // % de coque perdu par seconde
  DS.JUMP_DIVISOR = 1e4;                         // métal du cycle pour 1 écho
  DS.JUMP_EXP = 0.25;                            // exposant du gain d'échos
  DS.FRAG_DIVISOR = 15;                          // échos du cycle pour 1 fragment
  DS.FRAG_EXP = 0.27;                            // exposant du gain de fragments
  DS.MILESTONES = [10, 25, 50, 100, 150, 200, 250, 300, 400, 500, 600, 800, 1000];

  // ------------------------------------------------------------------ équipage
  DS.ROLES = [
    { id: 'engineer',   name: 'Ingénieurs',    one: 'Ingénieur',    res: ['metal', 'alloy'],   icon: 'tools',  text: 'métal et alliages' },
    { id: 'technician', name: 'Techniciens',   one: 'Technicien',   res: ['energy', 'ice'],    icon: 'energy', text: 'énergie et glace' },
    { id: 'botanist',   name: 'Botanistes',    one: 'Botaniste',    res: ['oxygen', 'food'],   icon: 'food',   text: 'oxygène et vivres' },
    { id: 'scientist',  name: 'Scientifiques', one: 'Scientifique', res: ['data'],             icon: 'flask',  text: 'données' }
  ];

  // ------------------------------------------------------------------ modules
  // cost : coût du niveau 0, multiplié par growth à chaque niveau
  // prod / use : par niveau et par seconde ; cap : capacité ajoutée par niveau
  DS.MODULES = [
    { id: 'solar', name: 'Réacteur solaire', room: 'solar', icon: 'energy',
      desc: 'Convertit la lumière stellaire en énergie.',
      cost: { metal: 10 }, growth: 1.16, prod: { energy: 1 }, cap: { energy: 30 } },
    { id: 'drone', name: 'Drone récupérateur', room: 'drone', icon: 'debris',
      desc: 'Automatise la collecte de débris dans le secteur.',
      cost: { metal: 15 }, growth: 1.15, prod: { metal: 0.5 }, use: { energy: 0.1 } },
    { id: 'collector', name: 'Collecteur de glace', room: 'ice', icon: 'ice',
      desc: 'Fore les astéroïdes glacés qui dérivent autour de la coque.',
      cost: { metal: 25 }, growth: 1.16, prod: { ice: 0.4 }, use: { energy: 0.15 } },
    { id: 'condenser', name: 'Condenseur d’oxygène', room: 'oxygen', icon: 'oxygen',
      desc: 'Extrait l’oxygène de la glace par électrolyse.',
      cost: { metal: 40, ice: 15 }, growth: 1.19, prod: { oxygen: 0.6 }, use: { ice: 0.25, energy: 0.2 }, cap: { oxygen: 60 } },
    { id: 'greenhouse', name: 'Serre hydroponique', room: 'greenhouse', icon: 'food',
      desc: 'Fait pousser de quoi nourrir l’équipage.',
      cost: { metal: 55, ice: 25 }, growth: 1.19, prod: { food: 0.3 }, use: { ice: 0.15, energy: 0.2 }, cap: { food: 50 } },
    { id: 'battery', name: 'Banc de batteries', room: 'battery', icon: 'energy',
      desc: 'Stocke l’énergie pour les pics de consommation.',
      cost: { metal: 80 }, growth: 1.3, cap: { energy: 200 },
      unlock: s => (s.mods.solar || 0) >= 3, lock: '3 réacteurs solaires' },
    { id: 'lab', name: 'Laboratoire', room: 'lab', icon: 'flask',
      desc: 'Analyse les débris et produit des données scientifiques.',
      cost: { metal: 120, ice: 40 }, growth: 1.22, prod: { data: 0.15 }, use: { energy: 0.4 },
      unlock: s => !!s.flags.scanned, lock: 'Scanner le secteur une première fois' },
    { id: 'extractor', name: 'Extracteur de métal', room: 'extractor', icon: 'metal',
      desc: 'Une foreuse lourde qui débite les plus grosses épaves.',
      cost: { metal: 700 }, growth: 1.17, prod: { metal: 4 }, use: { energy: 0.5 },
      unlock: s => !!s.research.extractor, lock: 'Recherche « Extracteur de métal »' },
    { id: 'foundry', name: 'Fonderie orbitale', room: 'foundry', icon: 'alloy',
      desc: 'Fond le métal en alliages ultrarésistants.',
      cost: { metal: 600, ice: 100 }, growth: 1.24, prod: { alloy: 0.08 }, use: { metal: 1.5, energy: 0.6 },
      unlock: s => !!s.research.metallurgy, lock: 'Recherche « Métallurgie »' },
    { id: 'cryo', name: 'Module cryogénique', room: 'cryo', icon: 'cryo',
      desc: 'Deux capsules de sommeil supplémentaires pour l’équipage.',
      cost: { metal: 400, alloy: 5 }, growth: 1.8, use: { energy: 0.3 }, crewCap: 2,
      unlock: s => !!s.research.cryogenics, lock: 'Recherche « Cryogénie »' },
    { id: 'nanites', name: 'Essaim de nanites', room: 'nanites', icon: 'hull',
      desc: 'Des milliers de micro-robots colmatent la coque en continu.',
      cost: { alloy: 15, data: 40 }, growth: 1.3, hull: 0.04, use: { energy: 0.5 },
      unlock: s => !!s.research.nanites, lock: 'Recherche « Assemblage nanite »' },
    { id: 'array', name: 'Réseau de capteurs', room: 'array', icon: 'antenna',
      desc: 'Intercepte les transmissions des stations mortes.',
      cost: { metal: 3000, alloy: 25 }, growth: 1.25, prod: { data: 0.8 }, use: { energy: 1 },
      unlock: s => !!s.research.deepscan, lock: 'Recherche « Télémétrie lointaine »' },
    { id: 'fusion', name: 'Réacteur à fusion', room: 'fusion', icon: 'energy',
      desc: 'Fusionne l’hydrogène de la glace en une énergie colossale.',
      cost: { metal: 4e4, alloy: 150 }, growth: 1.2, prod: { energy: 25 }, use: { ice: 3 }, cap: { energy: 600 },
      unlock: s => !!s.research.fusion, lock: 'Recherche « Fusion froide »' },
    { id: 'harvester', name: 'Moissonneuse orbitale', room: 'harvester', icon: 'debris',
      desc: 'Avale des épaves entières et recrache du métal trié.',
      cost: { metal: 8e4, alloy: 250 }, growth: 1.18, prod: { metal: 60, ice: 5 }, use: { energy: 5 },
      unlock: s => !!s.research.harvester, lock: 'Recherche « Moissonneuses orbitales »' },
    { id: 'biodome', name: 'Biodôme', room: 'biodome', icon: 'food',
      desc: 'Un écosystème complet sous une coupole de verre.',
      cost: { metal: 6e4, alloy: 200 }, growth: 1.2, prod: { food: 5, oxygen: 8 }, use: { energy: 4, ice: 2 }, cap: { food: 500, oxygen: 600 },
      unlock: s => !!s.research.biodome, lock: 'Recherche « Biodômes »' },
    { id: 'quantum', name: 'Calculateur quantique', room: 'quantum', icon: 'data',
      desc: 'Calcule en parallèle dans des millions d’univers voisins.',
      cost: { metal: 3e5, alloy: 1000 }, growth: 1.2, prod: { data: 20 }, use: { energy: 10 },
      unlock: s => !!s.research.quantum, lock: 'Recherche « Calcul quantique »' },
    { id: 'plasma', name: 'Forge à plasma', room: 'plasma', icon: 'alloy',
      desc: 'Un arc de plasma qui fond le métal en alliages à la chaîne.',
      cost: { metal: 8e5, alloy: 2500 }, growth: 1.2, prod: { alloy: 5 }, use: { metal: 80, energy: 15 },
      unlock: s => !!s.research.plasma, lock: 'Recherche « Forge à plasma »' }
  ];
  DS.TIER1 = ['solar', 'drone', 'collector', 'condenser', 'greenhouse', 'battery'];

  // ------------------------------------------------------------------ recherches
  // tier 1 : toujours ; 2 : à partir du secteur 2 ; 3 : secteur 4 ; 4 : secteur 6
  // perm : découverte conservée lors des sauts
  const mod = (id, x) => E => { E.mod[id] = (E.mod[id] || 1) * x; };
  DS.RESEARCH = [
    { id: 'gloves', tier: 1, icon: 'tools', name: 'Gants magnétiques', effect: 'Récupération ×2',
      desc: 'Des gants aimantés qui attirent les petits débris.', cost: { data: 3, metal: 20 }, fx: E => { E.click *= 2; } },
    { id: 'droneOpt', tier: 1, icon: 'debris', name: 'Optimisation des drones', effect: 'Drones ×2',
      desc: 'De meilleurs algorithmes de tri pour les drones récupérateurs.', cost: { data: 8, metal: 60 }, fx: mod('drone', 2) },
    { id: 'photo', tier: 1, icon: 'energy', name: 'Cellules photovoltaïques', effect: 'Réacteurs solaires ×2',
      desc: 'Des cellules récupérées sur un satellite mort.', cost: { data: 12, metal: 90 }, fx: mod('solar', 2) },
    { id: 'diamond', tier: 1, icon: 'pickaxe', name: 'Forets diamantés', effect: 'Collecteurs de glace ×2',
      desc: 'Des têtes de forage taillées dans un noyau de comète.', cost: { data: 15, metal: 120 }, fx: mod('collector', 2) },
    { id: 'filters', tier: 1, icon: 'oxygen', name: 'Filtres biomimétiques', effect: 'Oxygène consommé −30 %',
      desc: 'Des membranes inspirées des branchies recyclent l’air expiré.', cost: { data: 20, ice: 60 }, fx: E => { E.o2Use *= 0.7; } },
    { id: 'cryogenics', tier: 1, perm: true, icon: 'cryo', name: 'Cryogénie', effect: 'Onglet Équipage',
      desc: 'Réveille les dormeurs en toute sécurité et débloque le module cryogénique.', cost: { data: 25, ice: 100 }, fx: () => {} },
    { id: 'crops', tier: 1, icon: 'food', name: 'Cultures accélérées', effect: 'Serres ×2',
      desc: 'Un éclairage pulsé qui double la vitesse de croissance.', cost: { data: 30, ice: 120 }, fx: mod('greenhouse', 2) },
    { id: 'electro', tier: 1, icon: 'oxygen', name: 'Électrolyse avancée', effect: 'Condenseurs ×2',
      desc: 'Des électrodes en alliage rare pour une électrolyse plus efficace.', cost: { data: 35, ice: 150 }, fx: mod('condenser', 2) },
    { id: 'hangar', tier: 1, perm: true, icon: 'planet', name: 'Hangar à sondes', effect: 'Onglet Expéditions',
      desc: 'Remet en état le hangar pour envoyer des sondes dans le secteur.', cost: { data: 40, metal: 400 }, fx: () => {} },
    { id: 'spectral', tier: 1, icon: 'flask', name: 'Analyse spectrale', effect: 'Laboratoires ×2',
      desc: 'Lit la composition des débris à distance.', cost: { data: 50, metal: 500 }, fx: mod('lab', 2) },
    { id: 'extractor', tier: 1, icon: 'metal', name: 'Extracteur de métal', effect: 'Nouveau module',
      desc: 'Les plans d’une foreuse lourde retrouvés dans une épave.', cost: { data: 60, metal: 700 }, fx: () => {} },
    { id: 'metallurgy', tier: 1, icon: 'alloy', name: 'Métallurgie', effect: 'Nouveau module',
      desc: 'Débloque la fonderie orbitale et la production d’alliages.', cost: { data: 80, metal: 1200 }, fx: () => {} },
    { id: 'assist', tier: 1, icon: 'debris', name: 'Récupération assistée', effect: 'Clic +5 % du métal/s',
      desc: 'Chaque récupération manuelle rapporte aussi 5 % de votre production de métal par seconde.', cost: { data: 150, metal: 3000 }, fx: E => { E.clickPct += 0.05; } },
    { id: 'graphene', tier: 1, icon: 'energy', name: 'Cellules à graphène', effect: 'Capacités ×2',
      desc: 'Double la capacité des batteries, des réservoirs et des réserves.', cost: { data: 200, metal: 5000 }, fx: E => { E.cap *= 2; } },
    { id: 'armor', tier: 1, icon: 'hull', name: 'Blindage réactif', effect: 'Usure de la coque −40 %',
      desc: 'Des plaques qui se durcissent à l’impact.', cost: { data: 300, alloy: 10 }, fx: E => { E.hullDecay *= 0.6; } },
    { id: 'robotArm', tier: 1, icon: 'tools', name: 'Bras robotisé', effect: '2 récupérations auto/s',
      desc: 'Un bras articulé récupère des débris à votre place.', cost: { data: 400, alloy: 25 }, fx: E => { E.autoClick += 2; } },
    { id: 'nanites', tier: 1, icon: 'hull', name: 'Assemblage nanite', effect: 'Nouveau module',
      desc: 'Débloque l’essaim de nanites qui répare la coque.', cost: { data: 500, alloy: 35 }, fx: () => {} },
    { id: 'logistics', tier: 1, icon: 'wrench', name: 'Logistique', effect: 'Coût des modules −20 %',
      desc: 'Une gestion plus fine des pièces détachées.', cost: { data: 700, alloy: 50 }, fx: E => { E.cost *= 0.8; } },
    { id: 'deepscan', tier: 1, icon: 'antenna', name: 'Télémétrie lointaine', effect: 'Nouveau module',
      desc: 'Débloque le réseau de capteurs.', cost: { data: 900, alloy: 70 }, fx: () => {} },
    { id: 'hangar2', tier: 1, icon: 'planet', name: 'Second hangar', effect: '+1 expédition simultanée',
      desc: 'Une deuxième baie de lancement pour les sondes.', cost: { data: 1200, alloy: 90 }, req: 'hangar', fx: E => { E.slots += 1; } },
    { id: 'recycle', tier: 1, icon: 'debris', name: 'Recyclage intégral', effect: 'Économie ×1,5',
      desc: 'Rien ne se perd : métal, données et alliages ×1,5.', cost: { data: 1600, alloy: 120 }, fx: E => { E.eco *= 1.5; } },
    { id: 'foundry2', tier: 1, icon: 'alloy', name: 'Coulée continue', effect: 'Fonderies ×2',
      desc: 'Les fonderies ne refroidissent plus entre deux coulées.', cost: { data: 2000, alloy: 150 }, req: 'metallurgy', fx: mod('foundry', 2) },
    { id: 'navigation', tier: 1, perm: true, icon: 'radar', name: 'Cartographie hyperspatiale', effect: 'Saut hyperspatial',
      desc: 'Calcule un couloir de saut vers le secteur suivant. Débloque l’onglet Navigation.', cost: { data: 3500, alloy: 300 }, fx: () => {} },

    { id: 'swarm', tier: 2, icon: 'debris', name: 'Essaims de drones', effect: 'Drones ×3',
      desc: 'Les drones coopèrent en essaims coordonnés.', cost: { data: 1500, alloy: 120 }, fx: mod('drone', 3) },
    { id: 'deepDrill', tier: 2, icon: 'metal', name: 'Forage profond', effect: 'Extracteurs ×3',
      desc: 'Les extracteurs atteignent le cœur des épaves.', cost: { data: 2500, alloy: 180 }, req: 'extractor', fx: mod('extractor', 3) },
    { id: 'fusion', tier: 2, icon: 'energy', name: 'Fusion froide', effect: 'Nouveau module',
      desc: 'Débloque le réacteur à fusion.', cost: { data: 3000, alloy: 220 }, fx: () => {} },
    { id: 'hibernation', tier: 2, icon: 'cryo', name: 'Hibernation partielle', effect: 'Consommation −30 %',
      desc: 'L’équipage dort par roulement et consomme moins d’oxygène et de vivres.', cost: { data: 3500, alloy: 250 }, fx: E => { E.o2Use *= 0.7; E.foodUse *= 0.7; } },
    { id: 'harvester', tier: 2, icon: 'debris', name: 'Moissonneuses orbitales', effect: 'Nouveau module',
      desc: 'Débloque la moissonneuse orbitale.', cost: { data: 5000, alloy: 350 }, fx: () => {} },
    { id: 'biodome', tier: 2, icon: 'food', name: 'Biodômes', effect: 'Nouveau module',
      desc: 'Débloque le biodôme.', cost: { data: 6000, alloy: 400 }, fx: () => {} },
    { id: 'synergy', tier: 2, icon: 'crew', name: 'Synergie d’équipage', effect: 'Bonus des rôles ×2',
      desc: 'Des protocoles de travail en binôme.', cost: { data: 8000, alloy: 500 }, fx: E => { E.roleMult *= 2; } },
    { id: 'longrange', tier: 2, icon: 'planet', name: 'Sondes longue portée', effect: 'Butin des expéditions ×1,5',
      desc: 'Des sondes plus endurantes qui fouillent plus loin.', cost: { data: 10000, alloy: 600 }, fx: E => { E.expReward *= 1.5; } },
    { id: 'robotArm2', tier: 2, icon: 'tools', name: 'Bras robotisés II', effect: '+8 récupérations auto/s',
      desc: 'Une rangée complète de bras articulés.', cost: { data: 15000, alloy: 800 }, req: 'robotArm', fx: E => { E.autoClick += 8; } },
    { id: 'quantum', tier: 2, icon: 'data', name: 'Calcul quantique', effect: 'Nouveau module',
      desc: 'Débloque le calculateur quantique.', cost: { data: 25000, alloy: 1200 }, fx: () => {} },
    { id: 'selfheal', tier: 2, icon: 'hull', name: 'Coque auto-cicatrisante', effect: 'Usure −50 %, nanites ×3',
      desc: 'Un polymère vivant comble les fissures.', cost: { data: 40000, alloy: 2000 }, fx: E => { E.hullDecay *= 0.5; E.mod.nanites = (E.mod.nanites || 1) * 3; } },
    { id: 'plasma', tier: 2, icon: 'alloy', name: 'Forge à plasma', effect: 'Nouveau module',
      desc: 'Débloque la forge à plasma.', cost: { data: 60000, alloy: 3000 }, fx: () => {} },
    { id: 'hangar3', tier: 2, icon: 'planet', name: 'Troisième hangar', effect: '+1 expédition simultanée',
      desc: 'Une troisième baie de lancement.', cost: { data: 80000, alloy: 4000 }, req: 'hangar2', fx: E => { E.slots += 1; } },

    { id: 'resonance', tier: 3, icon: 'echo', name: 'Résonance stellaire', effect: 'Économie ×(1 + log₁₀ échos)',
      desc: 'Les échos stellaires amplifient la production de métal, données et alliages.', cost: { data: 3e5, alloy: 2e4 }, fx: (E, s) => { E.eco *= 1 + Math.log10(1 + s.echoesEarned); } },
    { id: 'heavyHarvest', tier: 3, icon: 'debris', name: 'Moissonneuses lourdes', effect: 'Moissonneuses ×3',
      desc: 'Des mâchoires capables d’avaler un croiseur.', cost: { data: 6e5, alloy: 4e4 }, req: 'harvester', fx: mod('harvester', 3) },
    { id: 'fusion2', tier: 3, icon: 'energy', name: 'Confinement magnétique', effect: 'Réacteurs à fusion ×3',
      desc: 'Un plasma plus dense et plus stable.', cost: { data: 8e5, alloy: 5e4 }, req: 'fusion', fx: mod('fusion', 3) },
    { id: 'maintenance', tier: 3, icon: 'tools', name: 'Maintenance autonome', effect: 'Réparation automatique',
      desc: 'La coque est réparée automatiquement dès qu’elle passe sous 60 %.', cost: { data: 1e6, alloy: 6e4 }, fx: E => { E.autoRepair = true; } },
    { id: 'entangle', tier: 3, icon: 'data', name: 'Intrication', effect: 'Calculateurs ×3',
      desc: 'Des paires de qubits intriqués à travers le vaisseau.', cost: { data: 2e6, alloy: 1e5 }, req: 'quantum', fx: mod('quantum', 3) },
    { id: 'plasma2', tier: 3, icon: 'alloy', name: 'Plasma stable', effect: 'Forges à plasma ×3',
      desc: 'Un arc qui ne s’éteint jamais.', cost: { data: 4e6, alloy: 2e5 }, req: 'plasma', fx: mod('plasma', 3) },
    { id: 'singularity', tier: 3, icon: 'echo', name: 'Micro-singularité', effect: 'Économie ×3',
      desc: 'Un trou noir de la taille d’un grain de sable, enfermé au cœur du vaisseau.', cost: { data: 1e7, alloy: 5e5 }, fx: E => { E.eco *= 3; } },

    { id: 'antenna', tier: 4, icon: 'antenna', name: 'Antenne de transmission', effect: 'Onglet Signal',
      desc: 'Les plans d’une antenne assez puissante pour porter un message jusqu’à la Terre.', cost: { data: 3e7, alloy: 2e6 }, fx: () => {} }
  ];
  DS.TIER_SECTOR = { 1: 0, 2: 1, 3: 3, 4: 5 };

  // ------------------------------------------------------------------ archives (échos)
  DS.ARCHIVES = [
    { id: 'cargo', icon: 'cloud', name: 'Fret de secours', base: 1, growth: 2.5, max: 8,
      text: l => 'Chaque cycle démarre avec ' + DS.fmt(100 * Math.pow(3, l)) + ' métal et ' + DS.fmt(40 * Math.pow(3, l)) + ' glace en plus.',
      fx: (E, l) => { E.startRes = l; } },
    { id: 'ark', icon: 'echo', name: 'Protocoles ARK', base: 2, growth: 2.6,
      text: l => 'Métal, données et alliages ×1,5 par niveau (actuellement ×' + DS.fmt(Math.pow(1.5, l)) + ').',
      fx: (E, l, s) => { if (!s.anomaly.active) E.eco *= Math.pow(1.5, l); } },
    { id: 'gauntlet', icon: 'tools', name: 'Gantelets stellaires', base: 1, growth: 3,
      text: l => 'Récupération manuelle ×2 par niveau (actuellement ×' + DS.fmt(Math.pow(2, l)) + ').',
      fx: (E, l) => { E.click *= Math.pow(2, l); } },
    { id: 'life', icon: 'oxygen', name: 'Écologie fermée', base: 2, growth: 2.4, max: 10,
      text: l => 'Énergie, glace, oxygène et vivres ×1,4 par niveau (actuellement ×' + DS.fmt(Math.pow(1.4, l)) + ').',
      fx: (E, l) => { E.life *= Math.pow(1.4, l); } },
    { id: 'memory', icon: 'data', name: 'Mémoire synthétique', base: 3, growth: 3,
      text: l => 'Données ×2 par niveau (actuellement ×' + DS.fmt(Math.pow(2, l)) + ').',
      fx: (E, l) => { E.res.data = (E.res.data || 1) * Math.pow(2, l); } },
    { id: 'shield', icon: 'hull', name: 'Bouclier de phase', base: 2, growth: 2, max: 6,
      text: l => 'Usure et dégâts de la coque −20 % par niveau (actuellement −' + Math.round((1 - Math.pow(0.8, l)) * 100) + ' %).',
      fx: (E, l) => { E.hullDecay *= Math.pow(0.8, l); E.hullHit *= Math.pow(0.8, l); } },
    { id: 'veteran', icon: 'crew', name: 'Équipage vétéran', base: 4, growth: 3, max: 5,
      text: l => '+1 membre d’équipage éveillé au départ et +1 capsule par niveau (actuellement +' + l + ').',
      fx: (E, l) => { E.startCrew += l; E.crewMax += l; } },
    { id: 'probes', icon: 'planet', name: 'Sondes quantiques', base: 3, growth: 2.5, max: 5,
      text: l => 'Expéditions 15 % plus rapides et butin ×1,25 par niveau.',
      fx: (E, l) => { E.expSpeed *= Math.pow(0.85, l); E.expReward *= Math.pow(1.25, l); } },
    { id: 'keepTech', icon: 'flask', name: 'Archives techniques', base: 8, growth: 1, max: 1,
      text: () => 'Les technologies de premier niveau sont conservées lors des sauts.',
      fx: E => { E.keepTech = true; } },
    { id: 'automata', icon: 'wrench', name: 'Automates de bord', base: 6, growth: 1, max: 1,
      text: () => 'Construit automatiquement les modules de base (solaire, drones, glace, oxygène, serres, batteries).',
      fx: E => { E.autoTier1 = true; } },
    { id: 'drive', icon: 'radar', name: 'Moteur de saut optimisé', base: 5, growth: 3,
      text: l => 'Échos gagnés ×1,25 par niveau (actuellement ×' + DS.fmt(Math.pow(1.25, l)) + ').',
      fx: (E, l) => { E.echoGain *= Math.pow(1.25, l); } }
  ];

  // ------------------------------------------------------------------ améliorations du Signal
  DS.SIGNAL_UPG = [
    { id: 'eternal', icon: 'echo', name: 'Écho éternel', cost: 1, max: 1,
      text: 'Le bonus passif des échos stellaires est doublé.', fx: E => { E.echoPower *= 2; } },
    { id: 'autobuild', icon: 'wrench', name: 'Chantier autonome', cost: 1, max: 1,
      text: 'Construit automatiquement tous les modules débloqués.', fx: E => { E.autoTier1 = true; E.autoAll = true; } },
    { id: 'autotech', icon: 'flask', name: 'IA de recherche', cost: 2, max: 1,
      text: 'Lance automatiquement les recherches dès qu’elles sont abordables.', fx: E => { E.autoResearch = true; } },
    { id: 'autojump', icon: 'radar', name: 'Pilote automatique', cost: 2, max: 1,
      text: 'Déclenche le saut hyperspatial dès que le gain atteint votre seuil.', fx: E => { E.autoJump = true; } },
    { id: 'memoryCore', icon: 'data', name: 'Noyau mémoriel', cost: 6, max: 1,
      text: 'Toutes les technologies sont conservées lors des sauts.', fx: E => { E.keepTech = true; E.keepAllTech = true; } },
    { id: 'bond', icon: 'specimen', name: 'Lien symbiotique', cost: 3, max: 1,
      text: 'Le Spécimen conserve la moitié de son expérience quand le Signal est émis.', fx: E => { E.keepSpecimen = true; } },
    { id: 'amp', icon: 'antenna', name: 'Amplificateur', cost: 3, growth: 3,
      text: 'Toute l’économie ×5 par niveau.', fx: (E, l) => { E.eco *= Math.pow(5, l); } },
    { id: 'harmonics', icon: 'fragment', name: 'Harmoniques', cost: 5, max: 1,
      text: 'Fragments de signal gagnés ×2.', fx: E => { E.fragGain *= 2; } },
    { id: 'final', icon: 'star', name: 'Le Dernier Signal', cost: 25, max: 1, final: true,
      text: 'Transmettre le message final de l’ARCHE-09 vers la Terre.', fx: () => {} }
  ];

  // ------------------------------------------------------------------ antenne du Signal
  DS.ANTENNA = [
    { name: 'Fondations du pylône', cost: { metal: 2e9, alloy: 5e6 } },
    { name: 'Réflecteur parabolique', cost: { metal: 1e10, alloy: 2e7, data: 1e7 } },
    { name: 'Émetteur à intrication', cost: { metal: 5e10, alloy: 1e8, data: 5e7 } }
  ];

  // ------------------------------------------------------------------ Spécimen
  DS.SPEC_XP = { base: 25, growth: 1.6 };
  DS.SPEC_FEED = [
    { res: 'food', w: 4 }, { res: 'data', w: 1 }, { res: 'alloy', w: 3 }, { res: 'metal', w: 0.02 }
  ];
  DS.SPEC_STAGES = [
    { lvl: 0,  name: 'Œuf',               perk: null },
    { lvl: 3,  name: 'Larve',             perk: 'Symbiose : l’équipage consomme 25 % de vivres en moins.' },
    { lvl: 8,  name: 'Rôdeur',            perk: 'Instinct de chasse : butin des expéditions ×1,5.' },
    { lvl: 15, name: 'Chrysalide',        perk: 'Carapace : usure de la coque −50 %.' },
    { lvl: 25, name: 'Léviathan',         perk: 'Faim cosmique : échos gagnés ×1,5.' },
    { lvl: 40, name: 'Dévoreur d’étoiles', perk: 'Gravité : drones et moissonneuses ×10.' },
    { lvl: 60, name: 'Entité',            perk: 'Écho vivant : fragments de signal ×2.' }
  ];

  // ------------------------------------------------------------------ anomalies (défis)
  DS.ANOMALIES = [
    { id: 'blackout', icon: 'energy', name: 'Nuit noire', goal: 1e6,
      desc: 'Un nuage de poussière masque toutes les étoiles du secteur.',
      handicap: 'Production d’énergie ×0,2.', reward: 'Énergie ×3 pour toujours.',
      apply: E => { E.res.energy = (E.res.energy || 1) * 0.2; }, rewardFx: E => { E.res.energy = (E.res.energy || 1) * 3; } },
    { id: 'skeleton', icon: 'crew', name: 'Équipage fantôme', goal: 3e6,
      desc: 'Les capsules refusent de s’ouvrir. Vous êtes seul à bord.',
      handicap: 'Un seul membre d’équipage, aucun réveil possible.', reward: 'Bonus des rôles ×2 et +1 membre au départ.',
      apply: E => { E.crewLock = 1; }, rewardFx: E => { E.roleMult *= 2; E.startCrew += 1; E.crewMax += 1; } },
    { id: 'breach', icon: 'hull', name: 'Coque percée', goal: 1e7,
      desc: 'Une pluie de micrométéorites a criblé la coque.',
      handicap: 'Usure de la coque ×12.', reward: 'Usure −50 % et réparations ×3 plus efficaces.',
      apply: E => { E.hullDecay *= 12; }, rewardFx: E => { E.hullDecay *= 0.5; E.repair *= 3; } },
    { id: 'silence', icon: 'data', name: 'Silence radio', goal: 5e7,
      desc: 'Une interférence brouille tous les instruments scientifiques.',
      handicap: 'Données ×0,1.', reward: 'Données ×3 pour toujours.',
      apply: E => { E.res.data = (E.res.data || 1) * 0.1; }, rewardFx: E => { E.res.data = (E.res.data || 1) * 3; } },
    { id: 'inflation', icon: 'metal', name: 'Pénurie', goal: 2e8,
      desc: 'Les pièces détachées se font rares dans ce coin de l’espace.',
      handicap: 'Le coût des modules grimpe 8 % plus vite.', reward: 'Coût des modules ×0,5.',
      apply: E => { E.growthAdd += 0.08; }, rewardFx: E => { E.cost *= 0.5; } },
    { id: 'handsoff', icon: 'tools', name: 'Sans les mains', goal: 1e9,
      desc: 'Les sas sont bloqués : impossible de sortir récupérer quoi que ce soit.',
      handicap: 'Aucune récupération manuelle ni automatique.', reward: 'Récupération ×5 et +5 récupérations auto/s.',
      apply: E => { E.noClick = true; }, rewardFx: E => { E.click *= 5; E.autoClick += 5; } }
  ];

  // ------------------------------------------------------------------ secteurs
  DS.SECTORS = [
    { name: 'Ceinture d’Hélios', planet: 'terra', res: {}, text: 'Aucune particularité.',
      desc: 'Un cimetière de coques métalliques balayé par les vents stellaires. Aucun signal habité.' },
    { name: 'Nébuleuse de Verre', planet: 'ice', res: { ice: 2, energy: 0.8 }, text: 'Glace ×2 • Énergie ×0,8',
      desc: 'Des cristaux géants reflètent la lumière d’étoiles disparues.' },
    { name: 'Champ des Veilleurs', planet: 'violet', res: { data: 2 }, events: 1.5, text: 'Données ×2 • Transmissions plus fréquentes',
      desc: 'Un réseau silencieux de satellites observe votre vaisseau.' },
    { name: 'Secteur d’Orion', planet: 'mars', res: { metal: 2 }, hull: 1.5, text: 'Métal ×2 • Usure de la coque ×1,5',
      desc: 'D’anciennes routes commerciales, jonchées d’épaves de cargos.' },
    { name: 'Nébuleuse Triskel', planet: 'gas', res: { alloy: 2, energy: 0.6 }, text: 'Alliages ×2 • Énergie ×0,6',
      desc: 'Un nuage ionisé où les panneaux solaires s’essoufflent.' },
    { name: 'Porte du Silence', planet: 'dark', res: { metal: 1.5, data: 1.5, alloy: 1.5 }, crew: 1.3, text: 'Économie ×1,5 • Consommation ×1,3',
      desc: 'Un couloir stellaire plus ancien que toutes les cartes. D’ici, un signal pourrait porter jusqu’à la Terre.' }
  ];
  DS.sector = function (i) {
    if (i < DS.SECTORS.length) return DS.SECTORS[i];
    const base = DS.SECTORS[1 + ((i - DS.SECTORS.length) % 4)];
    const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    return Object.assign({}, base, {
      name: 'Au-delà du Voile ' + (roman[i - DS.SECTORS.length] || (i - DS.SECTORS.length + 1)),
      desc: 'Plus aucune carte ne couvre cette région. Les étoiles y semblent étrangement familières.',
      planet: ['ice', 'violet', 'mars', 'gas'][(i - DS.SECTORS.length) % 4]
    });
  };

  // ------------------------------------------------------------------ expéditions
  // reward : { ressource: [secondes de production, minimum] }
  DS.EXPEDITIONS = [
    { id: 'wrecks', icon: 'debris', name: 'Ceinture d’épaves', time: 30, risk: 0.05,
      desc: 'Une petite sonde inspecte un champ de débris tout proche.',
      cost: { energy: 15 }, reward: { metal: [40, 40], ice: [30, 15] } },
    { id: 'beacon', icon: 'antenna', name: 'Balise abandonnée', time: 60, risk: 0.08,
      desc: 'Une transmission ancienne contient peut-être des plans utiles.',
      cost: { energy: 30, food: 5 }, reward: { data: [150, 15], metal: [40, 30] } },
    { id: 'cloud', icon: 'cloud', name: 'Nuage organique', time: 90, risk: 0.1,
      desc: 'Des particules comestibles flottent dans une nébuleuse voisine.',
      cost: { energy: 40, oxygen: 10 }, reward: { food: [400, 60], oxygen: [300, 60], ice: [120, 60] } },
    { id: 'station', icon: 'alloy', name: 'Station déserte', time: 180, risk: 0.12,
      desc: 'Une installation industrielle abandonnée regorge d’alliages.',
      cost: { energy: 80, food: 15 }, reward: { alloy: [300, 15], metal: [120, 100] },
      unlock: s => (s.mods.foundry || 0) > 0 || s.sector > 0, lock: 'Construire une fonderie' },
    { id: 'vault', icon: 'star', name: 'Coffre interstellaire', time: 420, risk: 0.15,
      desc: 'Une longue expédition à la recherche de machines d’un autre âge.',
      cost: { energy: 200, food: 40, oxygen: 40 }, reward: { alloy: [700, 60], data: [700, 80], metal: [700, 500] },
      unlock: s => s.sector >= 1, lock: 'Atteindre le secteur 2' },
    { id: 'biowreck', icon: 'specimen', name: 'Épave biologique', time: 240, risk: 0.12,
      desc: 'Une épave couverte de spores. Le Spécimen semble attiré par elle.',
      cost: { energy: 120, food: 30 }, reward: { specimen: [1, 50] },
      unlock: s => s.specimen.found, lock: 'Découvrir le Spécimen' },
    { id: 'rift', icon: 'clock', name: 'Faille temporelle', time: 900, risk: 0.2,
      desc: 'Une déchirure dans l’espace-temps. Ce qui en revient a parfois vécu des heures.',
      cost: { energy: 500, oxygen: 100, food: 100 }, reward: { metal: [2400, 5000], data: [2400, 2000], alloy: [2400, 500] },
      unlock: s => s.sector >= 3, lock: 'Atteindre le secteur 4' }
  ];

  // ------------------------------------------------------------------ transmissions (événements à choix)
  // fx : variations de ressources ; R(res, secondes, minimum) = butin indexé sur la production
  DS.EVENTS = [
    { id: 'cargo', tag: 'SIGNAL INCONNU', icon: 'ship', title: 'Un cargo silencieux',
      desc: 'Un immense cargo dérive dans l’ombre d’une lune. Son réacteur est intact, mais l’accès paraît dangereux.',
      choices: R => [
        { label: 'Aborder l’épave', fx: { energy: -20, metal: R('metal', 120, 80), data: R('data', 90, 10) }, risk: { p: 0.2, fx: { hull: -10 } } },
        { label: 'Récupérer à distance', fx: { metal: R('metal', 40, 30) } }
      ] },
    { id: 'storm', tag: 'ANOMALIE STELLAIRE', icon: 'energy', title: 'Tempête de particules',
      desc: 'Une vague d’ions énergétiques frappe les panneaux de votre vaisseau.',
      choices: R => [
        { label: 'Absorber le flux', fx: { energy: R('capEnergy', 0.6, 0), hull: -8 } },
        { label: 'Fermer les volets', fx: { energy: -10 } }
      ] },
    { id: 'pod', tag: 'APPEL DE DÉTRESSE', icon: 'cryo', title: 'Une capsule de secours',
      desc: 'Une capsule autonome émet une faible transmission. À l’intérieur, un survivant en hypersommeil.',
      choices: R => [
        { label: 'Accueillir le survivant', fx: { food: -15, crew: 1 } },
        { label: 'Démonter la capsule', fx: { metal: R('metal', 60, 40), ice: R('ice', 60, 25) } }
      ] },
    { id: 'garden', tag: 'DÉCOUVERTE', icon: 'food', title: 'Un jardin abandonné',
      desc: 'Dans un habitat déserté, des plantes survivent encore grâce à un cycle d’eau fermé.',
      choices: R => [
        { label: 'Récolter les cultures', fx: { food: R('capFood', 0.6, 40) } },
        { label: 'Étudier le système', fx: { data: R('data', 150, 20), ice: R('ice', 60, 30) } }
      ] },
    { id: 'meteors', tag: 'AVARIE', icon: 'hull', title: 'Pluie de micrométéorites',
      desc: 'Des centaines de petits impacts résonnent contre la coque extérieure.',
      choices: R => [
        { label: 'Réparer immédiatement', fx: { metal: -R('metal', 30, 30), hull: 5 } },
        { label: 'Encaisser les dégâts', fx: { hull: -12, alloy: R('alloy', 120, 5) } }
      ] },
    { id: 'observatory', tag: 'ARCHIVE DÉTECTÉE', icon: 'data', title: 'Un observatoire oublié',
      desc: 'L’antenne capte un paquet de données compressées, protégé par un protocole ancien.',
      choices: R => [
        { label: 'Décrypter le paquet', fx: { energy: -30, data: R('data', 240, 40) } },
        { label: 'Revendre les composants', fx: { metal: R('metal', 80, 50) } }
      ] },
    { id: 'trader', tag: 'CONTACT', icon: 'crew', title: 'Un marchand nomade',
      desc: 'Un petit vaisseau bricolé propose d’échanger des pièces. Son pilote parle une langue inconnue, mais les chiffres sont universels.',
      choices: R => [
        { label: 'Échanger du métal', fx: { metal: -R('metal', 60, 60), alloy: R('alloy', 400, 12) } },
        { label: 'Acheter des vivres', fx: { metal: -R('metal', 20, 20), food: R('capFood', 0.5, 30) } },
        { label: 'Décliner poliment', fx: {} }
      ] },
    { id: 'comet', tag: 'DÉCOUVERTE', icon: 'ice', title: 'Une comète glacée',
      desc: 'Une comète passe à portée de harpon. Sa queue scintille de cristaux d’eau.',
      choices: R => [
        { label: 'Harponner la comète', fx: { energy: -25, ice: R('ice', 400, 150) } },
        { label: 'L’observer', fx: { data: R('data', 60, 15) } }
      ] },
    { id: 'mites', tag: 'AVARIE', icon: 'debris', title: 'Des mites métalliques',
      desc: 'Un essaim de micro-machines dévore le métal stocké dans la soute.',
      choices: R => [
        { label: 'Purger la soute', fx: { energy: -40 } },
        { label: 'Les laisser faire', fx: { metal: R('pctMetal', -0.15, 0), hull: -5 } }
      ] },
    { id: 'station', tag: 'RAVITAILLEMENT', icon: 'oxygen', title: 'Une station automatique',
      desc: 'Une station de ravitaillement fonctionne encore. Son système de paiement aussi.',
      choices: R => [
        { label: 'Faire le plein', fx: { metal: -R('metal', 40, 30), oxygen: R('capOxygen', 1, 0), food: R('capFood', 1, 0) } },
        { label: 'Pirater le terminal', fx: { data: R('data', 300, 30), hull: -6 } }
      ] },
    { id: 'battle', tag: 'VESTIGES', icon: 'alloy', title: 'Les débris d’une bataille',
      desc: 'Deux flottes se sont affrontées ici il y a des siècles. Les épaves sont encore chaudes de radiations.',
      choices: R => [
        { label: 'Fouiller les épaves', fx: { alloy: R('alloy', 600, 20), metal: R('metal', 100, 60) }, risk: { p: 0.3, fx: { hull: -12 } } },
        { label: 'Passer son chemin', fx: {} }
      ] },
    { id: 'ghost', tag: 'SIGNAL INCONNU', icon: 'echo', title: 'Un écho fantôme',
      desc: 'Une voix répète en boucle votre propre signal de détresse… envoyé dans trois jours.',
      when: s => s.sector >= 1,
      choices: R => [
        { label: 'Remonter la source', fx: { energy: -50, echoes: 1 } },
        { label: 'Enregistrer et analyser', fx: { data: R('data', 300, 50) } }
      ] },
    { id: 'song', tag: 'BIOLOGIE', icon: 'specimen', title: 'Le chant du Spécimen',
      desc: 'Le Spécimen émet une vibration grave qui fait trembler les cloisons. L’équipage n’arrive plus à dormir.',
      when: s => s.specimen.found,
      choices: R => [
        { label: 'L’écouter', fx: { specimen: R('specXp', 0.5, 10), food: -10 } },
        { label: 'L’anesthésier', fx: { data: R('data', 60, 20) } }
      ] }
  ];

  // Aléas automatiques (pas de choix)
  DS.HAZARDS = [
    { text: 'micro-tempête détectée dans le secteur', fx: { hull: -5 } },
    { text: 'impact d’un débris sur la coque', fx: { hull: -7 } },
    { text: 'surtension dans le réseau électrique', fx: { pctEnergy: -0.3 } },
    { text: 'fuite dans un réservoir d’oxygène', fx: { pctOxygen: -0.15 } },
    { text: 'contamination d’une partie des vivres', fx: { pctFood: -0.12 } }
  ];

  // ------------------------------------------------------------------ objectifs
  const lvl = id => s => [Math.min(1, s.mods[id] || 0), 1];
  const res = id => s => [s.research[id] ? 1 : 0, 1];
  DS.OBJECTIVES = [
    { icon: 'debris', title: 'Récupérer des débris', desc: 'Cliquez sur « Récupérer des débris » pour amasser du métal.', goal: s => [Math.min(5, s.stats.clicks), 5] },
    { icon: 'energy', title: 'Installer un réacteur solaire', desc: 'Augmente la production d’énergie de votre vaisseau.', goal: lvl('solar'), reward: { metal: 10 } },
    { icon: 'debris', title: 'Installer un drone récupérateur', desc: 'Les drones ramassent le métal à votre place.', goal: lvl('drone'), reward: { metal: 15 } },
    { icon: 'ice', title: 'Installer un collecteur de glace', desc: 'La glace alimente l’oxygène et les serres.', goal: lvl('collector'), reward: { ice: 15 } },
    { icon: 'oxygen', title: 'Installer un condenseur d’oxygène', desc: 'Votre équipage respire. Ne l’oubliez pas.', goal: lvl('condenser'), reward: { oxygen: 40 } },
    { icon: 'food', title: 'Installer une serre hydroponique', desc: 'Les rations de survie ne dureront pas.', goal: lvl('greenhouse'), reward: { food: 30 } },
    { icon: 'scan', title: 'Scanner le secteur', desc: 'Le scanner récupère des données et débloque la recherche.', goal: s => [s.flags.scanned ? 1 : 0, 1] },
    { icon: 'flask', title: 'Rechercher les gants magnétiques', desc: 'Votre première technologie : la récupération manuelle double.', goal: res('gloves') },
    { icon: 'flask', title: 'Construire un laboratoire', desc: 'Les laboratoires produisent des données en continu.', goal: lvl('lab'), reward: { data: 10 } },
    { icon: 'debris', title: 'Posséder 10 drones', desc: 'Au niveau 10, chaque module double sa production.', goal: s => [Math.min(10, s.mods.drone || 0), 10] },
    { icon: 'cryo', title: 'Maîtriser la cryogénie', desc: 'Réveillez l’équipage endormi dans les capsules.', goal: res('cryogenics') },
    { icon: 'crew', title: 'Affecter un membre d’équipage', desc: 'Chaque rôle améliore une partie de la production.', goal: s => [Math.min(1, DS.assigned(s)), 1] },
    { icon: 'planet', title: 'Remettre le hangar en état', desc: 'Envoyez des sondes explorer le secteur.', goal: res('hangar') },
    { icon: 'planet', title: 'Réussir une expédition', desc: 'Les sondes ramènent du butin proportionnel à votre production.', goal: s => [Math.min(1, s.stats.exps), 1] },
    { icon: 'alloy', title: 'Produire des alliages', desc: 'Recherchez la métallurgie et construisez une fonderie.', goal: s => [Math.min(25, Math.floor(s.stats.alloy || 0)), 25] },
    { icon: 'radar', title: 'Cartographier l’hyperespace', desc: 'Le seul moyen de quitter ce secteur.', goal: res('navigation') },
    { icon: 'radar', title: 'Effectuer un saut hyperspatial', desc: 'Sacrifiez vos installations pour gagner des échos stellaires.', goal: s => [Math.min(1, s.stats.jumps), 1] },
    { icon: 'echo', title: 'Acheter une archive', desc: 'Les archives stellaires sont permanentes.', goal: s => [Object.values(s.archives).some(v => v > 0) ? 1 : 0, 1] },
    { icon: 'specimen', title: 'Nourrir le Spécimen', desc: 'Quelque chose s’est accroché à la coque pendant le saut.', goal: s => [Math.min(3, s.specimen.level), 3] },
    { icon: 'radar', title: 'Atteindre le secteur 3', desc: 'Chaque secteur a ses propres règles.', goal: s => [Math.min(2, s.stats.maxSector), 2] },
    { icon: 'anomaly', title: 'Stabiliser une anomalie', desc: 'Les anomalies offrent des bonus permanents.', goal: s => [Math.min(1, Object.keys(s.anomaly.done).length), 1] },
    { icon: 'radar', title: 'Atteindre la Porte du Silence', desc: 'Le secteur 6, d’où un signal pourrait porter jusqu’à la Terre.', goal: s => [Math.min(5, s.stats.maxSector), 5] },
    { icon: 'antenna', title: 'Construire l’antenne', desc: 'Trois étapes pour une antenne capable de joindre la Terre.', goal: s => [Math.min(3, s.signal.antenna), 3] },
    { icon: 'fragment', title: 'Émettre le Signal', desc: 'Tout recommencer, mais avec des fragments de signal.', goal: s => [Math.min(1, s.signal.emissions), 1] },
    { icon: 'star', title: 'Transmettre le Dernier Signal', desc: 'Accumulez assez de fragments pour envoyer le message final.', goal: s => [s.signal.won ? 1 : 0, 1] }
  ];

  // ------------------------------------------------------------------ onglets
  DS.TABS = [
    { id: 'ship',      label: 'Vaisseau',    icon: 'ship',     title: 'Poste de commandement', sub: 'Vous êtes seuls aux confins de l’espace. Chaque ressource compte.' },
    { id: 'modules',   label: 'Modules',     icon: 'wrench',   title: 'Modules du vaisseau', sub: 'Construisez et améliorez les systèmes qui vous maintiennent en vie.' },
    { id: 'research',  label: 'Recherche',   icon: 'flask',    title: 'Centre de recherche', sub: 'Transformez les données récupérées en technologies décisives.', when: s => !!s.flags.scanned },
    { id: 'crew',      label: 'Équipage',    icon: 'crew',     title: 'Équipage', sub: 'Réveillez les dormeurs et confiez-leur un poste.', when: s => !!s.flags.crew },
    { id: 'exps',      label: 'Expéditions', icon: 'planet',   title: 'Expéditions', sub: 'Envoyez des sondes explorer les vestiges du secteur.', when: s => !!s.flags.exps },
    { id: 'nav',       label: 'Navigation',  icon: 'radar',    title: 'Navigation stellaire', sub: 'Quittez le secteur et conservez vos découvertes.', when: s => !!s.flags.nav },
    { id: 'specimen',  label: 'Spécimen',    icon: 'specimen', title: 'Le Spécimen', sub: 'Une créature venue d’ailleurs, qui grandit quand on la nourrit.', when: s => s.specimen.found },
    { id: 'anomalies', label: 'Anomalies',   icon: 'anomaly',  title: 'Anomalies', sub: 'Des zones instables qui récompensent les équipages téméraires.', when: s => s.stats.maxSector >= 2 },
    { id: 'signal',    label: 'Signal',      icon: 'antenna',  title: 'Le Dernier Signal', sub: 'Construire l’antenne et appeler la Terre.', when: s => s.stats.maxSector >= 5 || s.signal.emissions > 0 },
    { id: 'journal',   label: 'Journal',     icon: 'journal',  title: 'Journal de bord', sub: 'L’historique de votre survie.' },
    { id: 'options',   label: 'Options',     icon: 'gear',     title: 'Options', sub: 'Sauvegarde, affichage et raccourcis.' }
  ];
})(typeof window !== 'undefined' ? (window.DS = window.DS || {}) : (globalThis.DS = globalThis.DS || {}));
