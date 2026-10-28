/* Vérifie qu'une modification ne touche que la partie graphique du jeu.
   Utilisation : node tools/verifier-graphismes.js [référence git]
   Sans argument, la référence est le dernier commit qui a modifié un fichier protégé,
   c'est-à-dire la dernière modification faite par le propriétaire du dépôt. */
'use strict';
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const sh = cmd => execSync(cmd, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
let ok = true;
const fail = m => { ok = false; console.log('✗ ' + m); };
const pass = m => console.log('✓ ' + m);
const warn = m => console.log('! ' + m);

// ------------------------------------------------------------------ 1. fichiers modifiés
const PROTECTED = new Set(['js/data.js', 'js/engine.js', 'js/ui.js', 'js/main.js', 'css/style.css', 'index.html',
  'tools/simulation.js', 'tools/simulation-reference.txt', 'tools/verifier-graphismes.js', 'AGENTS.md', 'README.md']);
const ref = process.argv[2] || sh('git log -1 --format=%H -- ' + [...PROTECTED].join(' ')) || 'HEAD';
console.log('Référence : ' + sh('git log -1 --format="%h %s" ' + ref) + '\n');
const changed = new Set([
  ...sh('git diff --name-only ' + ref).split('\n'),
  ...sh('git ls-files --others --exclude-standard').split('\n')
].filter(Boolean));

const ALLOWED = [/^js\/pixelforge\.js$/, /^js\/sprites\.js$/, /^js\/ship\.js$/, /^js\/scene\.js$/, /^assets\/[^/]+\.png$/, /^tools\/atelier\.html$/];
const existedAtRef = f => { try { sh('git cat-file -e ' + ref + ':' + f); return true; } catch (e) { return false; } };

for (const f of changed) {
  if (ALLOWED.some(r => r.test(f))) { pass('modification autorisée : ' + f); continue; }
  if (f === 'index.html') {
    const lines = sh('git diff ' + ref + ' -- index.html').split('\n')
      .filter(l => /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l));
    const bad = lines.filter(l => !/^[+-]<script src="js\/[a-z0-9-]+\.js"><\/script>$/.test(l.trim()));
    if (bad.length) fail('index.html : seules des lignes <script src="js/…"> peuvent être ajoutées. Lignes refusées :\n    ' + bad.join('\n    '));
    else pass('index.html : seules des balises <script> de fichiers graphiques ont changé');
    continue;
  }
  if (/^js\/[a-z0-9-]+\.js$/.test(f) && !PROTECTED.has(f) && !existedAtRef(f)) { warn('nouveau fichier graphique : ' + f + ' (vérifiez qu’il ne contient que du rendu)'); continue; }
  fail('fichier hors du périmètre graphique modifié : ' + f);
}
if (!changed.size) pass('aucun fichier modifié depuis ' + ref.slice(0, 7));

// ------------------------------------------------------------------ 2. syntaxe des scripts
for (const f of fs.readdirSync(path.join(root, 'js'))) {
  if (!f.endsWith('.js')) continue;
  try { sh('node --check js/' + f); } catch (e) { fail('erreur de syntaxe dans js/' + f + '\n' + (e.stderr || e.message)); }
}
pass('syntaxe des scripts vérifiée');

// ------------------------------------------------------------------ 3. mécaniques intactes
const out = execSync('node tools/simulation.js 0.75 3', { cwd: root, encoding: 'utf8' });
const reference = fs.readFileSync(path.join(root, 'tools', 'simulation-reference.txt'), 'utf8');
if (out === reference) pass('simulation d’équilibrage identique à la référence : les mécaniques sont intactes');
else fail('la simulation d’équilibrage diffère de tools/simulation-reference.txt : une mécanique a été modifiée');

// ------------------------------------------------------------------ 4. contrats graphiques
const gfx = ['pixelforge', 'sprites', 'ship', 'scene'].map(n => fs.readFileSync(path.join(root, 'js', n + '.js'), 'utf8')).join('\n')
  + fs.readdirSync(path.join(root, 'js')).filter(f => f.endsWith('.js') && !['data.js', 'engine.js', 'ui.js', 'main.js', 'pixelforge.js', 'sprites.js', 'ship.js', 'scene.js'].includes(f))
    .map(f => fs.readFileSync(path.join(root, 'js', f), 'utf8')).join('\n');
const API = ['DS.Forge', 'DS.makeRamp', 'DS.forgeBayer', 'DS.spriteURL', 'DS.icon', 'DS.SPRITE_NAMES', 'DS.spriteTools', 'DS.crystal',
  'DS.ROOMS', 'DS.roomURL', 'DS.drawRoom', 'DS.SHIP_ROOM', 'DS.shipSpec', 'DS.shipKey', 'DS.buildShip', 'DS.drawShipFX',
  'DS.drawPlanet', 'DS.planetURL', 'DS.Scene', 'DS.drawSpecimen'];
const missing = API.filter(a => !new RegExp(a.replace('.', '\\.') + '\\s*=').test(gfx));
if (missing.length) fail('fonctions graphiques attendues par le jeu introuvables : ' + missing.join(', '));
else pass('les ' + API.length + ' fonctions graphiques attendues sont définies');

const ICONS = ['alloy', 'anomaly', 'antenna', 'check', 'clock', 'cloud', 'crew', 'cryo', 'data', 'debris', 'echo', 'energy', 'flask', 'food',
  'fragment', 'gear', 'heart', 'hull', 'ice', 'journal', 'lock', 'mail', 'map', 'metal', 'oxygen', 'pickaxe', 'planet', 'play', 'radar',
  'scan', 'ship', 'specimen', 'star', 'target', 'tools', 'wrench'];
const spritesSrc = fs.readFileSync(path.join(root, 'js', 'sprites.js'), 'utf8');
const noIcon = ICONS.filter(n => !new RegExp('\\bS\\.' + n + '\\s*=').test(spritesSrc));
if (noIcon.length) fail('icônes manquantes dans js/sprites.js : ' + noIcon.join(', '));
else pass('les ' + ICONS.length + ' icônes utilisées par le jeu existent');

const ROOMS = ['solar', 'drone', 'ice', 'oxygen', 'greenhouse', 'battery', 'lab', 'extractor', 'foundry', 'cryo', 'nanites', 'array',
  'fusion', 'harvester', 'biodome', 'quantum', 'plasma', 'empty'];
const noRoom = ROOMS.filter(n => !new RegExp('\\b' + n + ':\\s*\\{\\s*light').test(gfx));
if (noRoom.length) fail('salles manquantes dans DS.ROOMS : ' + noRoom.join(', '));
else pass('les ' + ROOMS.length + ' salles du vaisseau existent');

console.log('\n' + (ok ? 'OK : la modification reste dans le périmètre graphique.' : 'ÉCHEC : corrigez les points marqués ✗ avant de livrer.'));
process.exit(ok ? 0 : 1);
