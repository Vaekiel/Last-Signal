/* Dernier Signal — sprites pixel-art.
   Chaque sprite est une grille 16×16 de caractères (palette ci-dessous) ou une
   fonction de dessin. Le contour sombre est ajouté automatiquement. */
'use strict';
(function (DS) {
  const PAL = {
    '1': '#ffffff', '2': '#dfe6f0', '3': '#a9b4c4', '4': '#737f93', '5': '#454e60', '6': '#2a303d',
    'a': '#d6f7ff', 'b': '#79d6ff', 'c': '#2f97e8', 'd': '#1c56a8',
    'e': '#fff7b0', 'f': '#ffd43b', 'g': '#ff9b21', 'h': '#d0570e',
    'i': '#d2ff96', 'j': '#78dc4f', 'k': '#2f9b3c',
    'l': '#f3cbff', 'm': '#c77dff', 'n': '#8b43e3', 'o': '#5a20a3',
    'p': '#ff8080', 'q': '#e8303f', 'r': '#8f1529',
    's': '#a6fff6', 't': '#33e0cf', 'u': '#168a80',
    'v': '#f5c391', 'w': '#a2683a', 'x': '#5c3a1f',
    'y': '#ff6fd8', 'z': '#1b2233'
  };
  const OUTLINE = '#070b14';

  // Petite API de dessin pour les sprites géométriques.
  function painter() {
    const g = Array.from({ length: 16 }, () => Array(16).fill('.'));
    const p = {
      g,
      set(x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < 16 && y < 16) g[y][x] = c; },
      rect(x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) p.set(i, j, c); },
      disc(cx, cy, r, fn) {
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
          const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy);
          if (d <= r) { const c = typeof fn === 'function' ? fn(dx, dy, d) : fn; if (c) p.set(x, y, c); }
        }
      },
      ring(cx, cy, r0, r1, c) {
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
          const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
          if (d >= r0 && d <= r1) p.set(x, y, c);
        }
      },
      line(x0, y0, x1, y1, c, w = 1) {
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1;
        for (let k = 0; k <= n; k++) {
          const x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n;
          for (let a = 0; a < w; a++) for (let b = 0; b < w; b++) p.set(Math.floor(x) + a, Math.floor(y) + b, c);
        }
      },
      poly(pts, fn) {
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
          const px = x + 0.5, py = y + 0.5; let inside = false;
          for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            const [xi, yi] = pts[i], [xj, yj] = pts[j];
            if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
          }
          if (inside) { const c = typeof fn === 'function' ? fn(x, y) : fn; if (c) p.set(x, y, c); }
        }
      }
    };
    return p;
  }

  const S = {};

  S.metal = [
    '................',
    '................',
    '................',
    '.....222222.....',
    '....21111112....',
    '....33333333....',
    '...3333333334...',
    '...4444444444...',
    '..222222222222..',
    '.21111111111112.',
    '.33333333333334.',
    '3333333333333344',
    '4444444444444444',
    '................',
    '................',
    '................'
  ];

  S.ice = [
    '................',
    '.......a........',
    '......aab.......',
    '......abbc......',
    '..a...abbc..a...',
    '..aa..abbc.abc..',
    '..abc.abbc.abc..',
    '.aabc.abbcaabbc.',
    '.abbcaabbcabbbc.',
    '.abbcabbbcabbc..',
    '..bbcabbbcabcc..',
    '..bccabbbccbc...',
    '...cc.bbcc.cd...',
    '......dcdd......',
    '................',
    '................'
  ];

  S.energy = [
    '................',
    '........eeeeef..',
    '.......eeffffg..',
    '......effffgg...',
    '.....effffgg....',
    '....effffgg.....',
    '...efffffffffg..',
    '...eeffffffffg..',
    '.......fffggg...',
    '......ffffgg....',
    '.....fffgg......',
    '....fffg........',
    '...ffg..........',
    '...fg...........',
    '..g.............',
    '................'
  ];

  S.oxygen = [
    '................',
    '......5555......',
    '.......44.......',
    '.....cccccc.....',
    '....cbbbbbbd....',
    '....cabbbbbd....',
    '....c1abbbbd....',
    '....22222222....',
    '....23333332....',
    '....cabbbbbd....',
    '....c1bbbbbd....',
    '....cabbbbbd....',
    '....cbbbbbbd....',
    '.....dddddd.....',
    '................',
    '................'
  ];

  S.food = [
    '................',
    '..........iiij..',
    '........iijjjjk.',
    '......iijjjjjjk.',
    '.....ijjjjjjjjk.',
    '....ijjjjjjkjjk.',
    '...ijjjjjjkjjk..',
    '...ijjjjjkjjjk..',
    '..ijjjjjkjjjk...',
    '..ijjjjkjjjk....',
    '..ijjjkjjjk.....',
    '..ijjkjjkk......',
    '...ikkkk........',
    '..kk............',
    '.kk.............',
    '................'
  ];

  S.data = [
    '................',
    '.....4.4.4.4....',
    '.....4.4.4.4....',
    '...nnnnnnnnnn...',
    '...nmmmmmmmmo...',
    '.44nmllllllmo44.',
    '...nmlttttlmo...',
    '.44nmltsstlmo44.',
    '...nmltsstlmo...',
    '.44nmlttttlmo44.',
    '...nmllllllmo...',
    '...nmmmmmmmmo...',
    '...oooooooooo...',
    '.....4.4.4.4....',
    '.....4.4.4.4....',
    '................'
  ];

  S.alloy = [
    '................',
    '.......ll.......',
    '.....llllll.....',
    '...llllllllll...',
    '.llllllllllllll.',
    '.mmllllllllllnn.',
    '.mmmmllllllnnnn.',
    '.mmmmmmllnnnnnn.',
    '.mmmmmmmnnnnnnn.',
    '.mmmmmmmnnnnnnn.',
    '.mmmmmmmnnnnnnn.',
    '.mmmmmmmnnnnnnn.',
    '...mmmmmnnnnn...',
    '.....mmmnnn.....',
    '.......mn.......',
    '................'
  ];

  S.echo = () => {
    const p = painter();
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = Math.abs(x + 0.5 - 8), dy = Math.abs(y + 0.5 - 8);
      if (Math.sqrt(dx) + Math.sqrt(dy) <= 3.05) p.set(x, y, dx + dy < 2.6 ? '1' : (x < 8 && y < 8 ? 's' : x >= 8 && y >= 8 ? 'u' : 't'));
    }
    return p.g;
  };

  S.fragment = () => {
    const p = painter();
    p.poly([[8, 0.5], [13.5, 7], [8, 15.5], [2.5, 7]], (x, y) => (y < 7 ? (x < 8 ? 'e' : 'f') : (x < 8 ? 'g' : 'h')));
    p.set(6, 4, '1'); p.set(7, 3, '1');
    return p.g;
  };

  S.hull = [
    '................',
    '..dddddddddddd..',
    '..dbbbbbcccccd..',
    '..dbaabbcccccd..',
    '..dbabbbcccccd..',
    '..dbbbbbcccccd..',
    '..dbbbbbcccccd..',
    '..dbbbbbcccccd..',
    '..dbbbbbcccccd..',
    '...dbbbbccccd...',
    '...dbbbbccccd...',
    '....dbbbcccd....',
    '.....dbbccd.....',
    '......dbcd......',
    '.......dd.......',
    '................'
  ];

  S.crew = [
    '................',
    '.....222222.....',
    '....21111112....',
    '...2111111112...',
    '...21dddddd12...',
    '...21dttttd12...',
    '...21dtssdd12...',
    '...2111111112...',
    '....22222222....',
    '...gggg22gggg...',
    '..gggg2222gggg..',
    '..ggg222222ggg..',
    '..gghggggggggh..',
    '..gghggggggggh..',
    '................',
    '................'
  ];

  S.specimen = [
    '................',
    '......jjjj......',
    '....jjjjjjjj....',
    '...jjjiiiijjj...',
    '..jjji1111ijjk..',
    '..jjj11oo11jjk..',
    '..jjj11oo11jjk..',
    '..jjji1111ijjk..',
    '..jjjjiiiijjjk..',
    '..jkjjjjjjjjkk..',
    '..jk.jjjjjj.kk..',
    '..jk.jk..jk.k...',
    '..k..k...k..k...',
    '.....k....k.....',
    '................',
    '................'
  ];

  S.ship = [
    '................',
    '................',
    '.......44.......',
    '......4334......',
    '.....33333333...',
    '...5333333333322',
    'bc5333t33t33t3s2',
    'bc533333333333s1',
    'bc5555555555552.',
    '...5555555555...',
    '.....44...44....',
    '................',
    '................',
    '................',
    '................',
    '................'
  ];

  S.wrench = [
    '................',
    '..........a.a...',
    '.........ab.ab..',
    '.........ab.ab..',
    '.........aabbbb.',
    '........aabbbbc.',
    '.......aabbbbc..',
    '......aabc......',
    '.....aabc.......',
    '....aabc........',
    '...aabc.........',
    '..aabc..........',
    '.aabc...........',
    '.abc............',
    '..c.............',
    '................'
  ];

  S.flask = [
    '................',
    '.....222222.....',
    '......2112......',
    '......2112......',
    '......2112......',
    '.....211112.....',
    '....21111112....',
    '...2yyyyyyyy2...',
    '..2yyyyyyyyyy2..',
    '..2yy1yyyyyyy2..',
    '.2yy11yyyyyyyy2.',
    '.2yyyyyyyyyyyy2.',
    '.22222222222222.',
    '................',
    '................',
    '................'
  ];

  S.planet = () => {
    const p = painter();
    p.disc(8, 8, 5.6, (dx, dy) => {
      const l = -dx * 0.6 - dy * 0.8;
      return l > 2.4 ? 'l' : l > -0.5 ? 'm' : l > -3 ? 'n' : 'o';
    });
    for (let x = 0; x < 16; x++) {
      const y = 8 + (x - 8) * -0.35;
      const behind = Math.abs(x - 8) < 5 && false;
      if (!behind) { p.set(x, Math.round(y), x < 8 ? 'b' : 'c'); }
    }
    p.set(0, 11, '.'); p.set(15, 5, '.');
    return p.g;
  };

  S.radar = () => {
    const p = painter();
    p.ring(8, 8, 5.2, 6.8, 'b');
    p.ring(8, 8, 2, 3.1, 'c');
    p.rect(7, 0, 2, 5, 'a'); p.rect(7, 11, 2, 5, 'a');
    p.rect(0, 7, 5, 2, 'a'); p.rect(11, 7, 5, 2, 'a');
    p.rect(7, 7, 2, 2, '1');
    return p.g;
  };

  S.map = [
    '................',
    '................',
    '.ddd...cc...ddd.',
    '.dbbcccbbccdbbc.',
    '.dbbcbbbbbcdbbc.',
    '.dbbcbbqbbcdbbc.',
    '.dbbcbqqqbcdbbc.',
    '.dbbcbbqbbcdbbc.',
    '.dbbcbbbbbcdbbc.',
    '.dbbcbbbbbcdbbc.',
    '.dbbcbbbbbcdbbc.',
    '.dbbcbbbbbcdbbc.',
    '.ddbcccbbccddbc.',
    '...ddd.cc...dd..',
    '................',
    '................'
  ];

  S.anomaly = [
    '................',
    '.......gg.......',
    '......gffg......',
    '......gffg......',
    '.....gff5fg.....',
    '.....gf55fg.....',
    '....gff55ffg....',
    '....gff55ffg....',
    '...gfff55fffg...',
    '...gfff55fffg...',
    '..gfffffffffg...',
    '..gffff55ffffg..',
    '.gfffff55fffffg.',
    '.hhhhhhhhhhhhhh.',
    '................',
    '................'
  ];

  S.antenna = () => {
    const p = painter();
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const a = Math.hypot(x + 0.5 - 8, y + 0.5 - 5), b = Math.hypot(x + 0.5 - 10.5, y + 0.5 - 2.5);
      if (a <= 6.5 && b > 6.2 && y < 12) p.set(x, y, b < 7.4 ? '1' : x + y < 13 ? '2' : '3');
    }
    p.line(6.5, 8.5, 11, 4, '4');
    p.rect(11, 3, 2, 2, 'g');
    p.rect(7, 11, 2, 3, '4');
    p.rect(5, 14, 6, 1, '5');
    p.set(13, 1, 'b'); p.set(14, 2, 'b'); p.set(15, 3, 'b');
    p.set(13, 0, 'b'); p.set(15, 1, 'b');
    return p.g;
  };

  S.journal = [
    '................',
    '...bbbbbbbbb....',
    '...baaaaaaaab...',
    '...ba5555aaab...',
    '...baaaaaaaab...',
    '...ba555555ab...',
    '...baaaaaaaab...',
    '...ba55555aab...',
    '...baaaaaaaab...',
    '...ba555555ab...',
    '...baaaaaaaab...',
    '...ba5555aaab...',
    '...baaaaaaaab...',
    '...bbbbbbbbbb...',
    '................',
    '................'
  ];

  S.gear = () => {
    const p = painter();
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 8, dy = y + 0.5 - 8, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      const tooth = Math.cos(a * 8) > 0.35;
      if ((d <= 5.2 || (tooth && d <= 7.2)) && d > 2.2) p.set(x, y, dy + dx < -2 ? 'a' : dy + dx < 3 ? 'b' : 'c');
    }
    return p.g;
  };

  S.mail = [
    '................',
    '................',
    '................',
    '.22222222222222.',
    '.21122222222112.',
    '.23112222221132.',
    '.23311222211332.',
    '.23331122113332.',
    '.23333111133332.',
    '.23333333333332.',
    '.23333333333332.',
    '.24444444444442.',
    '.22222222222222.',
    '................',
    '................',
    '................'
  ];

  S.lock = [
    '................',
    '.....444444.....',
    '....45....54....',
    '....4......4....',
    '....4......4....',
    '...gggggggggg...',
    '...gffffffffg...',
    '...gff5555ffg...',
    '...gff5555ffg...',
    '...gfff55fffg...',
    '...gfff55fffg...',
    '...gffffffffg...',
    '...hhhhhhhhhh...',
    '................',
    '................',
    '................'
  ];

  S.check = [
    '................',
    '................',
    '............ij..',
    '...........ijk..',
    '..........ijk...',
    '.ij......ijk....',
    '.ijj....ijk.....',
    '..ijj..ijk......',
    '...ijjijk.......',
    '....ijjk........',
    '.....jk.........',
    '................',
    '................',
    '................',
    '................',
    '................'
  ];

  S.heart = [
    '................',
    '................',
    '..bbbb....bbbb..',
    '.baabbb..bbbbcc.',
    '.ba1bbbbbbbbbcc.',
    '.babbbbbbbbbbcc.',
    '.bbbbbbbbbbbbcc.',
    '..bbbbbbbbbbcc..',
    '...bbbbbbbbcc...',
    '....bbbbbbcc....',
    '.....bbbbcc.....',
    '......bbcc......',
    '.......cc.......',
    '................',
    '................',
    '................'
  ];

  S.target = () => {
    const p = painter();
    p.ring(8, 8, 5.4, 7, 'g');
    p.ring(8, 8, 2.6, 4, 'f');
    p.disc(8, 8, 1.3, 'e');
    return p.g;
  };

  S.debris = [
    '................',
    '................',
    '.....4433.......',
    '...44333334.....',
    '..4433w33334....',
    '..43333333345...',
    '.4433333w3345...',
    '.43333333333455.',
    '.4w33333333w345.',
    '.4433333333345..',
    '..4444333334455.',
    '...4455444455...',
    '.....55555......',
    '................',
    '................',
    '................'
  ];

  S.pickaxe = [
    '................',
    '....bbbbbb......',
    '..bbaaaaaabb....',
    '.ba..cxxc..ab...',
    'ba....xx....ab..',
    'b.....xw.....b..',
    '.......xw.......',
    '........xw......',
    '.........xw.....',
    '..........xw....',
    '...........xw...',
    '............xw..',
    '.............x..',
    '................',
    '................',
    '................'
  ];

  S.tools = [
    '................',
    '.ggg............',
    '.gfg........aa..',
    '.gfg.......ab.a.',
    '..gxx.....ab....',
    '....xx...abb....',
    '.....xx.abb.....',
    '......xxbb......',
    '......abxx......',
    '.....abb.xx.....',
    '....abb...xx....',
    '...abb.....xx...',
    '..abb.......xw..',
    '..bb.........w..',
    '................',
    '................'
  ];

  S.scan = () => {
    const p = painter();
    p.ring(8, 8, 6, 7.2, 'u');
    p.ring(8, 8, 3, 3.8, 'u');
    p.poly([[8, 8], [8, 1], [14, 5]], (x, y) => (Math.hypot(x + 0.5 - 8, y + 0.5 - 8) < 7 ? 't' : null));
    p.set(11, 10, 's'); p.set(5, 5, 's');
    p.rect(7, 7, 2, 2, '1');
    return p.g;
  };

  S.clock = () => {
    const p = painter();
    p.disc(8, 8, 6.6, 'c');
    p.disc(8, 8, 5.2, 'a');
    p.rect(7, 4, 2, 5, '5'); p.rect(8, 7, 3, 2, '5');
    return p.g;
  };

  S.cryo = [
    '................',
    '.....444444.....',
    '....4aaaaaa4....',
    '...4abbbbbbb4...',
    '...4ab1bbbbb4...',
    '...4ab1b22bb4...',
    '...4abbb22bb4...',
    '...4abb2222b4...',
    '...4abb2222b4...',
    '...4abbb22bb4...',
    '...4abbb22bb4...',
    '...4abbbbbbb4...',
    '...4tttttttt4...',
    '...4444444444...',
    '................',
    '................'
  ];

  S.star = () => {
    const p = painter();
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 3 : 7.4;
      pts.push([8 + Math.cos(a) * r, 8.6 + Math.sin(a) * r]);
    }
    p.poly(pts, (x, y) => (y < 7 ? 'e' : x < 8 ? 'f' : 'g'));
    return p.g;
  };

  S.play = [
    '................', '................', '....bb..........', '....bbbb........', '....bbbbbb......',
    '....bbbbbbbb....', '....bbbbbbbbbc..', '....bbbbbbbbbc..', '....bbbbbbbbc...', '....bbbbbbcc....',
    '....bbbbcc......', '....bbcc........', '....cc..........', '................', '................', '................'
  ];

  S.cloud = [
    '................', '................', '................', '......2222......', '.....211112.....',
    '..222111111222..', '.21111111111112.', '.21111111111112.', '.23333333333332.', '..222222222222..',
    '.......b........', '......bab.......', '.......b........', '................', '................', '................'
  ];

  // --- rendu ---
  const cache = {};
  function grid(name) {
    const src = S[name];
    if (!src) return null;
    return typeof src === 'function' ? src().map(r => r.join('')) : src;
  }

  DS.spriteURL = function (name) {
    if (cache[name]) return cache[name];
    if (typeof document === 'undefined') return '';
    const rows = grid(name);
    if (!rows) return '';
    const c = document.createElement('canvas');
    c.width = 18; c.height = 18;
    const ctx = c.getContext('2d');
    const filled = (x, y) => y >= 0 && y < 16 && x >= 0 && x < 16 && rows[y][x] && rows[y][x] !== '.';
    for (let y = -1; y <= 16; y++) for (let x = -1; x <= 16; x++) {
      if (filled(x, y)) {
        ctx.fillStyle = PAL[rows[y][x]] || '#ff00ff';
        ctx.fillRect(x + 1, y + 1, 1, 1);
      } else if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) {
        ctx.fillStyle = OUTLINE;
        ctx.fillRect(x + 1, y + 1, 1, 1);
      }
    }
    cache[name] = c.toDataURL();
    return cache[name];
  };

  DS.icon = function (name, cls) {
    return '<img class="px ' + (cls || '') + '" src="' + DS.spriteURL(name) + '" alt="" aria-hidden="true" draggable="false">';
  };

  DS.SPRITE_NAMES = Object.keys(S);
  DS.PAL = PAL;
})(window.DS = window.DS || {});
