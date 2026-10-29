'use strict';
/* Build de distribution de Last Signal.
   Produit dans dist/ une version minifiée puis obfusquée, prête à héberger
   (itch.io, Netlify, GitHub Pages…). Ne modifie jamais les sources : le jeu
   reste jouable en ouvrant index.html directement, sans aucune dépendance.
   Utilisation : npm install  puis  npm run build */
const fs = require('fs');
const path = require('path');
const { minify: minifyJS } = require('terser');
const { minify: minifyHTML } = require('html-minifier-terser');
const JavaScriptObfuscator = require('javascript-obfuscator');
const csso = require('csso');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

// L'ordre des scripts est lu depuis index.html pour rester synchronisé.
const html = read('index.html');
const scripts = [...html.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map(m => m[1]);

(async () => {
  // 1. Concaténer les scripts dans l'ordre, puis minifier le tout.
  const bundleSrc = scripts.map(f => '/* ' + f + ' */\n' + read(f)).join('\n;\n');
  const min = await minifyJS(bundleSrc, {
    compress: { passes: 2 },
    mangle: true,
    format: { comments: false }
  });

  // 2. Obfusquer. Réglages pensés pour un jeu à 60 images/s : on renomme les
  //    identifiants et on chiffre les chaînes, sans aplatir le flux de contrôle
  //    ni injecter de code mort (trop coûteux). renameGlobals reste à false
  //    pour préserver l'API partagée window.DS entre les anciens modules.
  const obf = JavaScriptObfuscator.obfuscate(min.code, {
    compact: true,
    renameGlobals: false,
    identifierNamesGenerator: 'hexadecimal',
    stringArray: true,
    stringArrayThreshold: 0.8,
    stringArrayEncoding: ['base64'],
    stringArrayWrappersCount: 2,
    stringArrayWrappersType: 'function',
    splitStrings: true,
    splitStringsChunkLength: 10,
    transformObjectKeys: false,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    numbersToExpressions: false,
    selfDefending: false,
    simplify: true,
    unicodeEscapeSequence: false
  }).getObfuscatedCode();

  // 3. Minifier le CSS.
  const css = csso.minify(read('css/style.css')).css;

  // 4. Réécrire index.html : CSS minifié et un seul script empaqueté.
  //    app.min.js reste dans js/ pour que « ../assets/ » pointe sur dist/assets/.
  const page = html
    .replace('<link rel="stylesheet" href="css/style.css">', '<link rel="stylesheet" href="style.min.css">')
    .replace(/\s*<script src="js\/[^"]+"><\/script>/g, '')
    .replace('</body>', '  <script src="js/app.min.js"></script>\n</body>');
  const pageMin = await minifyHTML(page, {
    collapseWhitespace: true, removeComments: true, minifyCSS: true, minifyJS: false
  });

  // 5. Écrire dist/.
  fs.rmSync(dist, { recursive: true, force: true });
  fs.mkdirSync(path.join(dist, 'js'), { recursive: true });
  fs.writeFileSync(path.join(dist, 'index.html'), pageMin);
  fs.writeFileSync(path.join(dist, 'style.min.css'), css);
  fs.writeFileSync(path.join(dist, 'js', 'app.min.js'), obf);
  fs.cpSync(path.join(root, 'assets'), path.join(dist, 'assets'), { recursive: true });

  // 6. Rapport.
  const kb = n => (n / 1024).toFixed(0) + ' Ko';
  const srcJs = scripts.reduce((n, f) => n + read(f).length, 0);
  const assets = fs.readdirSync(path.join(dist, 'assets')).reduce((n, f) => n + fs.statSync(path.join(dist, 'assets', f)).size, 0);
  console.log('Build écrit dans dist/ :');
  console.log('  js/app.min.js   ' + kb(fs.statSync(path.join(dist, 'js', 'app.min.js')).size) + '   (source ' + kb(srcJs) + ')');
  console.log('  style.min.css   ' + kb(fs.statSync(path.join(dist, 'style.min.css')).size));
  console.log('  index.html      ' + kb(fs.statSync(path.join(dist, 'index.html')).size));
  console.log('  assets/         ' + kb(assets) + ' (' + fs.readdirSync(path.join(dist, 'assets')).length + ' fichiers)');
})();
