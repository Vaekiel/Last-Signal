/* Dernier Signal — le vaisseau ARCHE-09 : construit pièce par pièce selon les modules,
   recherches et archives acquises, puis animé (drones, foreuse, fumées, anneau de saut…). */
'use strict';
(function (DS) {
  const RW = 44, RH = 30, WALL = 4, BAND = 10;
  DS.SHIP_ROOM = { w: RW, h: RH };
  function rng(seed) {
    let x = (seed * 2654435761) >>> 0 || 1;
    return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
  }
  const bay = (x, y) => DS.forgeBayer(x, y);
  const FONT = {
    A: ['010', '101', '111', '101', '101'], R: ['110', '101', '110', '101', '101'], C: ['011', '100', '100', '100', '011'],
    H: ['101', '101', '111', '101', '101'], E: ['111', '100', '110', '100', '111'], '-': ['000', '000', '111', '000', '000'],
    0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'], 2: ['110', '001', '010', '100', '111'],
    3: ['110', '001', '010', '001', '110'], 4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '110', '001', '110'],
    6: ['011', '100', '111', '101', '111'], 7: ['111', '001', '010', '010', '010'], 8: ['111', '101', '111', '101', '111'], 9: ['111', '101', '111', '001', '111']
  };
  function text(F, s, x, y, mat, tone) {
    for (const ch of String(s)) {
      const g = FONT[ch];
      if (g) for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (g[j][i] === '1') F.px(x + i, y + j, mat, tone);
      x += 4;
    }
  }

  // ------------------------------------------------------------------ salles
  const ROOMS = {
    solar:      { light: '#ffd36a', dark: '#2e1d08', kind: 'core',    glow: 'glowY' },
    drone:      { light: '#ffa44a', dark: '#2a1408', kind: 'drone',   glow: 'glowO' },
    ice:        { light: '#6fd8ff', dark: '#081c33', kind: 'crystal', glow: 'glowC' },
    oxygen:     { light: '#5ab4ff', dark: '#081838', kind: 'tank',    glow: 'glowC' },
    greenhouse: { light: '#86e862', dark: '#0b240e', kind: 'plants',  glow: 'glowP' },
    battery:    { light: '#ffe45a', dark: '#262008', kind: 'cells',   glow: 'glowY' },
    lab:        { light: '#7ae6ff', dark: '#081d2e', kind: 'lab',     glow: 'glowC' },
    extractor:  { light: '#ff9450', dark: '#2e1208', kind: 'press',   glow: 'glowO' },
    foundry:    { light: '#ff7438', dark: '#2e0c08', kind: 'furnace', glow: 'glowO' },
    cryo:       { light: '#8af4ff', dark: '#08262c', kind: 'pods',    glow: 'glowC' },
    nanites:    { light: '#cf8cff', dark: '#1a0930', kind: 'swarm',   glow: 'glowP' },
    array:      { light: '#64b8ff', dark: '#081430', kind: 'screens', glow: 'glowC' },
    fusion:     { light: '#fff2b8', dark: '#2c2412', kind: 'ring',    glow: 'glowY' },
    harvester:  { light: '#ffb848', dark: '#2c1a08', kind: 'claw',    glow: 'glowO' },
    biodome:    { light: '#a6f070', dark: '#0e260c', kind: 'tree',    glow: 'glowG' },
    quantum:    { light: '#d896ff', dark: '#1c0a34', kind: 'cube',    glow: 'glowP' },
    plasma:     { light: '#ff7ad8', dark: '#2e0a26', kind: 'column',  glow: 'glowP' },
    empty:      { light: '#2c3446', dark: '#06080d', kind: 'empty',   glow: 'glowR' }
  };
  DS.ROOMS = ROOMS;
  for (const id in ROOMS) DS.makeRamp('room-' + id, ROOMS[id].dark, ROOMS[id].light, 7, { amb: 0.4 });
  DS.makeRamp('solar', '#08142e', '#5aa8ff', 6, { amb: 0.3, shiny: 30 });
  DS.makeRamp('solarGold', '#2a1606', '#ffd36a', 6, { amb: 0.3, shiny: 30 });
  DS.makeRamp('organic', '#0a2410', '#b8ff7a', 7, { amb: 0.28, shiny: 34 });
  DS.makeRamp('hullB', '#0c1220', '#6a86a8', 8, { amb: 0.22, shiny: 16 });
  // Finitions propres à l'ARCHE-09 : acier bleuté, nervures, cuivre et verre.
  DS.makeRamp('shipRib', '#101827', '#8297b5', 8, { amb: 0.23, shiny: 19 });
  DS.makeRamp('shipShadow', '#060d19', '#34435c', 6, { amb: 0.25 });
  DS.makeRamp('shipCopper', '#38190c', '#ffb55b', 8, { amb: 0.24, shiny: 19 });
  DS.makeRamp('shipGlass', '#081d32', '#a7eaff', 8, { amb: 0.28, shiny: 36 });

  function drawRoom(F, x, y, w, h, id, seed) {
    const R = ROOMS[id] || ROOMS.empty;
    const r = rng(seed || 1);
    const mat = 'room-' + id;
    const z0 = ++F.zc;
    const lamp = id === 'empty' ? 0 : 1;
    const part = F.parts++;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const v = j / h, cone = Math.max(0, 1 - Math.abs(i - w / 2) / (w * 0.5)) * (1 - v);
      let t = 0.62 - 0.5 * v + 0.28 * cone * lamp + (bay(x + i, y + j) - 0.5) * 0.16;
      if (i % 11 === 10) t -= 0.12;
      if (j === Math.round(h * 0.42)) t -= 0.1;
      F.set(x + i, y + j, mat, 0, 0, 1, { z: z0, part, tone: Math.max(0, Math.min(1, t)), shift: 0 });
    }
    const fy = y + h - 4;
    F.rect(x, fy, w, 4, 'dark', { bevel: 1 });
    for (let i = 2; i < w; i += 4) F.px(x + i, fy + 2, 'dark', 0.1);
    if (lamp) F.rect(x + 7, y, w - 14, 2, R.kind === 'plants' ? 'glowP' : R.glow, { bevel: 0 });
    const cx = x + (w >> 1);
    const crystal = DS.crystal;
    switch (R.kind) {
      case 'core':
        F.cylH(x, y + 11, w, 4, 'steel');
        F.rect(cx - 13, y + 5, 4, 16, 'steel', { bevel: 1 }); F.rect(cx + 9, y + 5, 4, 16, 'steel', { bevel: 1 });
        F.ellipse(cx, y + 13, 8.5, 8.5, 'glowY');
        F.cylV(cx - 10, fy - 4, 20, 4, 'steel');
        break;
      case 'drone':
        F.iso(x + 8, fy - 10, 5, 5, 'wood'); F.iso(x + 18, fy - 10, 5, 5, 'wood'); F.iso(x + 13, fy - 18, 5, 5, 'wood');
        for (const [dx, dy, s] of [[30, 8, 1], [37, 17, 0.8]]) {
          F.line(x + dx - 7 * s, y + dy - 3, x + dx + 7 * s, y + dy - 3, 'steel');
          F.line(x + dx - 9 * s, y + dy - 4, x + dx - 5 * s, y + dy - 4, 'white', { tone: 0.8 });
          F.line(x + dx + 5 * s, y + dy - 4, x + dx + 9 * s, y + dy - 4, 'white', { tone: 0.8 });
          F.ellipse(x + dx, y + dy, 5 * s, 3 * s, 'steel');
          F.px(x + dx + 1, y + dy, 'glowO', 1);
        }
        break;
      case 'crystal':
        F.cylV(cx - 2, y + 2, 4, 9, 'steel');
        F.poly([[cx - 4, y + 11], [cx + 4, y + 11], [cx, y + 17]], 'steel', { bevel: 1 });
        crystal(F, x + 7, fy, 7, 13, -2); crystal(F, x + 15, fy, 5, 8, 1);
        crystal(F, x + 31, fy, 8, 15, 2); crystal(F, x + 38, fy, 5, 8, 1);
        break;
      case 'tank':
        F.cylH(x + 1, y + 3, w - 2, 3, 'steel');
        for (let k = 0; k < 3; k++) {
          const tx = x + 4 + k * 13;
          F.ellipse(tx + 5, y + 9, 5, 2.6, 'ice');
          F.cylV(tx, y + 9, 10, fy - y - 9, 'ice');
          F.cylV(tx, y + 15, 10, 2, 'white');
          F.px(tx + 5, y + 20, 'glowG', 1);
        }
        break;
      case 'plants':
        F.rect(x + 2, y + 15, w - 4, 2, 'wood', { bevel: 0 });
        for (let k = 0; k < 6; k++) {
          F.ellipse(x + 6 + k * 6.5, y + 11, 3.3, 3.6, 'leaf');
          F.ellipse(x + 6 + k * 6.5, fy - 4, 3.5, 4, 'leaf');
          if (r() < 0.6) F.px(x + 7 + k * 6.5, y + 10, r() < 0.5 ? 'red' : 'gold', 0.8);
          if (r() < 0.6) F.px(x + 5 + k * 6.5, fy - 5, r() < 0.5 ? 'red' : 'gold', 0.8);
        }
        break;
      case 'cells':
        for (let k = 0; k < 4; k++) {
          const bx = x + 4 + k * 9;
          F.cylV(bx, y + 5, 8, fy - y - 5, 'steel');
          F.rect(bx + 3, y + 8, 2, fy - y - 11, 'dark', { bevel: 0 });
          const lv = 5 + (r() * (fy - y - 15) | 0);
          F.rect(bx + 3, fy - 3 - lv, 2, lv, 'glowY', { bevel: 0 });
        }
        break;
      case 'lab':
        F.rect(x + 3, fy - 9, w - 6, 3, 'steel', { bevel: 1 });
        F.rect(x + 5, fy - 6, 2, 6, 'dark', { bevel: 0 }); F.rect(x + w - 7, fy - 6, 2, 6, 'dark', { bevel: 0 });
        for (const mx of [5, 23]) {
          F.rect(x + mx, y + 4, 15, 11, 'dark', { bevel: 1 });
          F.rect(x + mx + 1, y + 5, 13, 9, 'glowC', { bevel: 0 });
          for (let l = 0; l < 3; l++) F.line(x + mx + 3, y + 7 + l * 2, x + mx + 3 + 4 + (r() * 6 | 0), y + 7 + l * 2, 'glowC', { tone: 0.35 });
          F.rect(x + mx + 6, y + 15, 3, 3, 'dark', { bevel: 0 });
        }
        F.ellipse(x + w - 9, fy - 12, 2.2, 2.2, 'pink'); F.rect(x + w - 10, fy - 16, 2, 3, 'glass', { bevel: 0 });
        break;
      case 'press':
        F.rect(cx - 13, y + 2, 26, 5, 'steel', { bevel: 1 });
        F.cylV(cx - 13, y + 7, 3, fy - y - 7, 'steel'); F.cylV(cx + 10, y + 7, 3, fy - y - 7, 'steel');
        F.cylV(cx - 3, y + 7, 6, 9, 'steel');
        F.rect(cx - 6, y + 16, 12, 3, 'hull', { bevel: 1 });
        F.rect(cx - 8, fy - 6, 16, 6, 'hull', { bevel: 1 });
        F.rect(cx - 5, fy - 8, 10, 2, 'glowO', { bevel: 0 });
        F.px(cx + 7, fy - 10, 'glowY', 1); F.px(cx - 8, fy - 11, 'glowY', 1); F.px(cx + 9, fy - 13, 'glowO', 1);
        break;
      case 'furnace':
        F.cylV(x + 11, y, 6, 6, 'steel');
        F.rect(x + 4, y + 5, 21, fy - y - 5, 'brass', { bevel: 2 });
        F.rect(x + 8, y + 11, 13, 9, 'glowO', { bevel: 0 });
        F.ellipse(x + 14.5, y + 16, 4, 3, 'glowY');
        F.ellipse(x + 34, fy - 5, 6, 5, 'steel');
        F.ellipse(x + 34, fy - 9, 4.6, 1.6, 'glowO');
        break;
      case 'pods':
        for (let k = 0; k < 3; k++) {
          const px0 = x + 3 + k * 13.5, my = y + 3 + (fy - y - 3) / 2;
          F.shape(px0, y + 3, px0 + 11, fy, (a, b) => Math.hypot((a - px0 - 5.5) / 5.5, Math.max(0, Math.abs(b - my) - 7) / 5) <= 1, 'steel', { bevel: 1.5 });
          F.shape(px0 + 2, y + 5, px0 + 9, fy - 2, (a, b) => Math.hypot((a - px0 - 5.5) / 3.6, Math.max(0, Math.abs(b - my) - 7) / 3.6) <= 1, 'glass', { round: 2 });
          F.ellipse(px0 + 5.5, y + 10, 1.6, 1.6, 'skin');
          F.rect(Math.round(px0 + 4), y + 12, 3, 8, 'teal', { bevel: 0 });
        }
        break;
      case 'swarm':
        F.cylV(cx - 5, fy - 4, 10, 4, 'steel');
        F.ellipse(cx, y + 14, 6, 6, 'violet');
        for (let k = 0; k < 34; k++) F.px(x + 2 + r() * (w - 4), y + 3 + r() * (h - 9), r() < 0.25 ? 'white' : 'glowP', r() < 0.5 ? 1 : 0.7);
        break;
      case 'screens':
        for (let j = 0; j < 2; j++) for (let k = 0; k < 3; k++) {
          const sx = x + 2 + k * 14, sy = y + 3 + j * 9;
          F.rect(sx, sy, 13, 8, 'dark', { bevel: 1 });
          F.rect(sx + 1, sy + 1, 11, 6, (j + k) % 2 ? 'glowC' : 'glowT', { bevel: 0 });
          F.line(sx + 2, sy + 4, sx + 2 + (r() * 8 | 0), sy + 4 - (r() * 2 | 0), 'white', { tone: 0.9 });
        }
        F.rect(x + 4, fy - 4, w - 8, 4, 'steel', { bevel: 1 });
        break;
      case 'ring':
        F.rect(cx - 2, y + 22, 4, fy - y - 22, 'steel', { bevel: 0 });
        F.shape(cx - 12, y + 3, cx + 12, y + 25, (a, b) => { const d = Math.hypot(a - cx, (b - (y + 14)) * 1.05); return d >= 7 && d <= 11.5; }, 'steel', { round: 2 });
        F.ellipse(cx, y + 14, 6, 6, 'glowY');
        break;
      case 'claw':
        F.rect(x + 2, y + 2, w - 4, 3, 'steel', { bevel: 1 });
        F.cylV(cx - 1, y + 5, 3, 8, 'steel');
        F.poly([[cx - 6, y + 13], [cx + 6, y + 13], [cx + 4, y + 21], [cx + 2, y + 15], [cx - 2, y + 15], [cx - 4, y + 21]], 'steel', { bevel: 1 });
        F.shape(cx - 6, y + 14, cx + 6, y + 24, (a, b) => Math.hypot(a - cx, b - (y + 19)) <= 4.6 + Math.sin(a * 2) * 0.6, 'rock', { round: 3 });
        F.rect(x + 2, fy - 4, w - 4, 4, 'hull', { bevel: 1 });
        for (let i = 4; i < w - 4; i += 5) F.px(x + i, fy - 3, 'gold', 0.7);
        break;
      case 'tree':
        F.shape(x + 2, fy - 22, x + w - 2, fy, (a, b) => { const d = Math.hypot(a - cx, (b - fy) * 1.25); return d >= 18 && d <= 19.6 && b <= fy; }, 'glass', { round: 1 });
        F.rect(cx - 1, fy - 13, 3, 13, 'wood', { bevel: 1 });
        F.ellipse(cx - 6, fy - 13, 5, 4, 'leaf'); F.ellipse(cx + 6, fy - 13, 5, 4, 'leaf'); F.ellipse(cx, fy - 17, 8, 5.5, 'leaf');
        F.rect(x + 2, fy - 2, w - 4, 2, 'leaf', { bevel: 0 });
        break;
      case 'cube':
        F.rect(cx - 7, y + 2, 14, 3, 'steel', { bevel: 1 }); F.rect(cx - 7, fy - 3, 14, 3, 'steel', { bevel: 1 });
        F.line(cx, y + 5, cx, y + 7, 'glowP', { tone: 0.8 }); F.line(cx, fy - 6, cx, fy - 4, 'glowP', { tone: 0.8 });
        F.iso(cx, y + 7, 7, 7, 'violet');
        break;
      case 'column':
        F.cylV(cx - 6, y + 2, 12, 4, 'steel'); F.cylV(cx - 6, fy - 4, 12, 4, 'steel');
        F.rect(cx - 3, y + 6, 6, fy - y - 10, 'glowP', { bevel: 1 });
        F.line(cx, y + 6, cx, fy - 5, 'white', { tone: 1 });
        break;
      default:
        for (let k = 0; k < 4; k++) F.px(x + 4 + r() * (w - 8), fy - 1 - r() * 2, 'hull', 0.5);
        F.cylH(x, y + 6, 12, 3, 'hull'); F.line(x + 12, y + 7, x + 15, y + 10, 'hull');
        F.line(x + 26, y + h - 9, x + 33, y + h - 13, 'hull'); F.line(x + 33, y + h - 13, x + 36, y + h - 9, 'hull');
    }
    // Moulures des compartiments ; la surface habitable reste inchangée.
    F.rect(x, y + 1, 2, h - 5, 'shipShadow', { bevel: 0 });
    F.rect(x + w - 2, y + 1, 2, h - 5, 'shipRib', { bevel: 0, tone: 0.48 });
    F.line(x + 3, y + h - 5, x + w - 4, y + h - 5, 'shipRib', { tone: 0.42 });
    for (let i = 5; i < w - 4; i += 7) {
      F.px(x + i, y + h - 3, 'steel', 0.42);
      F.px(x + i + 1, y + h - 3, 'dark', 0.12);
    }
    if (lamp) {
      // Rampe lumineuse, boîtiers de sécurité et câble de ventilation.
      F.rect(x + 5, y + 2, 7, 2, 'shipRib', { bevel: 0, tone: 0.8 });
      F.px(x + 6, y + 2, R.glow, 0.94);
      F.px(x + 10, y + 2, 'white', 0.85);
      F.rect(x + w - 6, y + 3, 3, 5, 'shipShadow', { bevel: 0 });
      F.px(x + w - 5, y + 4, R.glow, 0.95);
      F.px(x + w - 5, y + 6, 'glowC', 0.5);
    }
  }
  DS.drawRoom = drawRoom;
  DS.roomURL = (function () {
    const cache = {};
    return function (roomId) {
      if (cache[roomId]) return cache[roomId];
      if (typeof document === 'undefined') return '';
      const F = new DS.Forge(RW + 4, RH + 4);
      F.rect(0, 0, RW + 4, RH + 4, 'hull', { bevel: 2 });
      drawRoom(F, 2, 2, RW, RH, roomId, 7);
      return (cache[roomId] = F.render().toDataURL());
    };
  })();

  // ------------------------------------------------------------------ description du vaisseau selon l'état
  DS.shipSpec = function (s) {
    const L = id => s.mods[id] || 0;
    const R = id => !!s.research[id];
    const rooms = DS.MODULES.filter(m => L(m.id) > 0).map(m => m.room);
    const stage = s.specimen.found ? DS.SPEC_STAGES.filter(st => s.specimen.level >= st.lvl).length - 1 : -1;
    return {
      rooms,
      solar: Math.min(4, Math.ceil(L('solar') / 5)), solarBig: L('solar') >= 25, gold: R('photo'),
      tanks: Math.min(4, Math.ceil(L('condenser') / 3)),
      greenhouse: Math.min(3, Math.ceil(L('greenhouse') / 4)),
      labs: Math.min(2, Math.ceil(L('lab') / 10)),
      dish: L('array') > 0,
      chimneys: Math.min(3, Math.ceil(L('foundry') / 5)),
      biodome: L('biodome') > 0,
      quantum: L('quantum') > 0,
      singularity: R('singularity'),
      signal: R('antenna') ? 1 + s.signal.antenna : 0,
      turrets: R('armor') ? 2 : 0,
      armor: R('armor'),
      hangars: R('hangar') ? 1 + (R('hangar2') ? 1 : 0) + (R('hangar3') ? 1 : 0) : 0,
      drills: Math.min(4, Math.ceil(L('collector') / 5)),
      cocoon: stage,
      arm: R('robotArm') ? (R('robotArm2') ? 2 : 1) : 0,
      fusion: L('fusion') > 0,
      ring: R('navigation'),
      batteries: Math.min(4, Math.ceil(L('battery') / 3)),
      bowDrill: L('extractor') > 0,
      mandibles: L('harvester') > 0,
      plasma: L('plasma') > 0,
      nanites: L('nanites') > 0,
      shield: s.archives.shield || 0,
      cargo: R('logistics'), boom: R('longrange'),
      drones: L('drone') ? Math.min(10, 1 + Math.floor(L('drone') / 6)) : 0,
      jumps: Math.min(12, s.jumps + s.signal.emissions * 6),
      emissions: s.signal.emissions
    };
  };
  DS.shipKey = spec => JSON.stringify(spec);

  // ------------------------------------------------------------------ pièces de coque
  function plates(F, x0, y0, w, h, r, o) {
    o = o || {};
    let x = x0;
    const z = o.z;
    while (x < x0 + w - 1) {
      const pw = Math.min(x0 + w - x, 12 + (r() * 24 | 0));
      const q = r(), mat = o.mat || (q < 0.18 ? 'steel' : q < 0.32 ? 'hullB' : 'hull');
      F.rect(x, y0, pw, h, mat, { bevel: 2, z });
      if (pw > 10 && h > 7 && r() < 0.55) F.rect(x + 3, y0 + 2, pw - 6, h - 4, mat, { bevel: 1, shift: -1, z: z != null ? z + 0.01 : undefined });
      const d = r();
      if (d < 0.22 && h > 6) for (let k = x + 4; k < x + pw - 3; k += 2) F.line(k, y0 + 3, k, y0 + h - 4, 'dark', { tone: 0.12 });
      else if (d < 0.42 && o.lights) for (let k = x + 3; k < x + pw - 2; k += 4) o.lights.push([k, y0 + (h >> 1)]);
      else if (d < 0.5 && o.stripes && pw > 10) for (let k = 0; k < pw - 4; k += 2) F.px(x + 2 + k, y0 + h - 3, (k >> 1) % 2 ? 'gold' : 'dark', (k >> 1) % 2 ? 0.75 : 0.1);
      else if (d < 0.65) { F.px(x + 2, y0 + 2, 'steel', 0.85); F.px(x + pw - 3, y0 + 2, 'steel', 0.85); F.px(x + 2, y0 + h - 3, 'steel', 0.6); F.px(x + pw - 3, y0 + h - 3, 'steel', 0.6); }
      else if (d < 0.75 && pw > 12 && h >= 9) text(F, String((r() * 90 + 10) | 0), x + 4, y0 + 2, 'white', 0.45);
      // Rivets jumelés, surlignage de lumière et joints bleu-noir.
      if (pw > 7 && h >= 5) {
        F.px(x + 3, y0 + 1, 'shipRib', 0.92);
        F.px(x + 4, y0 + 2, 'shipShadow', 0.12);
        F.px(x + pw - 4, y0 + h - 2, 'shipRib', 0.6);
        F.px(x + pw - 3, y0 + h - 2, 'dark', 0.08);
        if (pw > 18) {
          F.line(x + 7, y0 + 1, x + pw - 8, y0 + 1, 'shipRib', { tone: 0.45 });
          F.line(x + 6, y0 + h - 2, x + pw - 7, y0 + h - 2, 'shipShadow', { tone: 0.25 });
        }
      }
      x += pw;
    }
  }

  // Pièces dorsales : base posée sur le pont (y = base), dessinées vers le haut.
  const DORSAL = {
    tower(F, x, base, r, A) {
      F.rect(x, base - 30, 38, 31, 'steel', { bevel: 2 });
      F.poly([[x + 38, base - 30], [x + 48, base - 14], [x + 48, base + 1], [x + 38, base + 1]], 'steel', { normal: [0.5, -0.4, 0.75], bevel: 1 });
      F.rect(x + 3, base - 25, 42, 5, 'glowC', { bevel: 0 });
      for (let k = x + 6; k < x + 44; k += 5) F.line(k, base - 25, k, base - 21, 'dark', { tone: 0.25 });
      F.rect(x + 3, base - 14, 34, 3, 'hull', { bevel: 1 });
      for (let k = x + 5; k < x + 36; k += 4) A.windows.push([k, base - 13]);
      F.rect(x + 5, base - 38, 20, 9, 'hull', { bevel: 1 });
      F.rect(x + 7, base - 36, 16, 2, 'glowO', { bevel: 0 });
      F.ellipse(x + 30, base - 33, 6, 4.5, 'white');
      F.line(x + 30, base - 38, x + 30, base - 52, 'steel'); F.line(x + 27, base - 47, x + 33, base - 47, 'steel');
      A.blink.push({ x: x + 30, y: base - 53, c: '#ff4d5e' });
      F.line(x + 12, base - 38, x + 12, base - 58, 'steel'); F.line(x + 10, base - 52, x + 14, base - 52, 'steel'); F.line(x + 9, base - 56, x + 15, base - 56, 'steel');
      A.blink.push({ x: x + 12, y: base - 59, c: '#7fd8ff' });
      return 50;
    },
    spire(F, x, base, r, A) {
      const h = 20 + (r() * 18 | 0);
      F.rect(x, base - 9, 12, 10, 'hull', { bevel: 2 });
      F.poly([[x + 1, base - 8], [x + 6, base - 9 - h], [x + 11, base - 8]], 'hull', { bevel: 1.2 });
      F.line(x + 6, base - 9 - h + 4, x + 6, base - 10, 'hull', { shift: 1 });
      F.rect(x + 3, base - 16, 6, 2, 'steel', { bevel: 0 });
      A.windows.push([x + 5, base - 5]);
      A.blink.push({ x: x + 6, y: base - 10 - h, c: '#ff4d5e' });
      return 12;
    },
    hab(F, x, base, r, A) {
      const w = 16 + (r() * 16 | 0), h = 8 + (r() * 12 | 0);
      F.rect(x, base - h, w, h + 1, r() < 0.5 ? 'hull' : 'steel', { bevel: 2 });
      F.rect(x + 2, base - h, w - 4, 2, 'steel', { bevel: 0, shift: 1 });
      if (h > 10) for (let k = x + 3; k < x + w - 3; k += 3) A.windows.push([k, base - h + 5]);
      if (r() < 0.5) { F.cylH(x - 2, base - 4, w + 4, 3, 'steel'); }
      if (r() < 0.6) { const ax = x + 3 + (r() * (w - 6) | 0); F.line(ax, base - h, ax, base - h - 8 - (r() * 8 | 0), 'steel'); }
      return w;
    },
    radiator(F, x, base) {
      F.rect(x, base - 4, 22, 5, 'hull', { bevel: 1 });
      for (let k = 0; k < 7; k++) F.rect(x + 1 + k * 3, base - 16, 2, 12, 'steel', { bevel: 0, normal: [-0.3, -0.2, 0.9] });
      F.line(x, base - 16, x + 21, base - 16, 'steel');
      return 22;
    },
    solar(F, x, base, r, A, o) {
      const big = o.big, frame = o.gold ? 'brass' : 'steel';
      const mh = (o.i % 2 ? 22 : 11) + (big ? 5 : 0);
      F.rect(x + 8, base - 4, 13, 5, 'hull', { bevel: 1 });
      F.cylV(x + 13, base - mh, 3, mh - 3, 'steel');
      F.line(x + 9, base - mh + 5, x + 19, base - mh + 5, 'steel');
      const pw = big ? 34 : 26, ph = big ? 12 : 9, sk = 5;
      const px0 = x + 12 - pw / 2, py0 = base - mh - ph - 1;
      F.poly([[px0 + sk - 1, py0 - 1], [px0 + pw + sk + 1, py0 - 1], [px0 + pw + 1, py0 + ph + 1], [px0 - 1, py0 + ph + 1]], frame, { bevel: 1, normal: [-0.15, -0.6, 0.8] });
      const ncx = Math.floor(pw / 5), ncy = Math.max(2, Math.floor(ph / 4.5));
      for (let j = 0; j < ncy; j++) for (let i = 0; i < ncx; i++) {
        const sx = px0 + i * 5 + 1 + sk * (1 - (j + 0.5) / ncy), sy = py0 + 1 + j * (ph / ncy);
        F.rect(Math.round(sx), Math.round(sy), 4, Math.max(2, Math.round(ph / ncy) - 1), 'solar', { bevel: 0, normal: [-0.2, -0.7, 0.7], shift: (i + j * 2) % 5 === 0 ? 1 : 0 });
        F.px(Math.round(sx), Math.round(sy), (i + j) % 3 ? 'shipGlass' : 'white', 0.65);
      }
      F.line(px0 + sk, py0, px0 + pw + sk - 1, py0, frame, { tone: 0.87 });
      F.line(x + 13, base - mh, x + 13, base - 5, 'shipShadow', { tone: 0.2 });
      return big ? 34 : 28;
    },
    cargo(F, x, base, r) {
      const cols = ['orange', 'hullB', 'red', 'teal', 'gold'];
      for (let k = 0; k < 3; k++) F.rect(x + k * 10, base - 7, 10, 8, cols[(k + (r() * 5 | 0)) % 5], { bevel: 1 });
      F.rect(x + 4, base - 14, 10, 7, cols[(r() * 5) | 0], { bevel: 1 });
      F.rect(x + 15, base - 14, 10, 7, cols[(r() * 5) | 0], { bevel: 1 });
      for (let k = 0; k < 3; k++) F.line(x + 2 + k * 10, base - 6, x + 2 + k * 10, base - 1, 'dark', { tone: 0.2 });
      return 30;
    },
    tanks(F, x, base, r, A, o) {
      const n = o.n;
      F.rect(x, base - 4, 30, 5, 'hull', { bevel: 1 });
      for (let k = 0; k < n; k++) {
        const ty = base - 10 - k * 7;
        F.cylH(x + 2 + (k % 2) * 2, ty, 26, 7, 'ice', { cap: true });
        F.cylH(x + 9 + (k % 2) * 2, ty, 3, 7, 'white');
        F.cylH(x + 20 + (k % 2) * 2, ty, 3, 7, 'white');
      }
      F.rect(x + 1, base - 10 - (n - 1) * 7, 2, (n - 1) * 7 + 7, 'steel', { bevel: 0 });
      F.rect(x + 27, base - 10 - (n - 1) * 7, 2, (n - 1) * 7 + 7, 'steel', { bevel: 0 });
      return 30;
    },
    greenhouse(F, x, base, r, A) {
      F.rect(x, base - 3, 28, 4, 'hull', { bevel: 1 });
      F.shape(x + 1, base - 18, x + 27, base - 2, (a, b) => Math.hypot((a - x - 14) / 13, (b - (base - 3)) / 14) <= 1, 'glass', { round: 3 });
      for (let k = 0; k < 4; k++) F.ellipse(x + 6 + k * 5.5, base - 6, 2.8, 3, 'leaf');
      for (let k = 0; k < 3; k++) F.ellipse(x + 9 + k * 5, base - 10, 2.5, 2.5, 'leaf');
      for (let k = 0; k < 5; k++) F.px(x + 5 + k * 5, base - 6 - (k % 3) * 2, 'glowG', 0.7);
      for (const dx of [7, 14, 21]) F.line(x + dx, base - 3, x + dx + (dx - 14) * 0.15, base - 16, 'steel', { tone: 0.75 });
      A.glowG.push([x + 14, base - 8]);
      return 28;
    },
    labDome(F, x, base, r, A) {
      F.rect(x + 2, base - 6, 20, 7, 'hull', { bevel: 1 });
      F.shape(x + 2, base - 20, x + 22, base - 5, (a, b) => Math.hypot((a - x - 12) / 10, (b - (base - 6)) / 12) <= 1, 'white', { round: 4 });
      F.rect(x + 10, base - 17, 3, 10, 'dark', { bevel: 0 });
      F.line(x + 12, base - 16, x + 20, base - 24, 'steel', { w: 2 });
      A.radar.push({ x: x + 12, y: base - 22 });
      return 24;
    },
    dish(F, x, base, r, A) {
      F.rect(x + 8, base - 6, 16, 7, 'hull', { bevel: 1 });
      F.line(x + 12, base - 6, x + 16, base - 18, 'steel'); F.line(x + 20, base - 6, x + 16, base - 18, 'steel');
      F.shape(x - 2, base - 44, x + 34, base - 14, (a, b) => Math.hypot(a - x - 16, b - (base - 26)) <= 16 && Math.hypot(a - x - 21, b - (base - 36)) > 15.5, 'white', { round: 3 });
      F.line(x + 10, base - 22, x + 24, base - 38, 'steel');
      F.ellipse(x + 24.5, base - 38.5, 2, 2, 'glowO');
      A.blink.push({ x: x + 24, y: base - 41, c: '#ffbb4a' });
      return 34;
    },
    chimney(F, x, base, r, A, o) {
      const h = 18 + o.i * 4;
      F.rect(x, base - 5, 14, 6, 'hull', { bevel: 1 });
      F.cylV(x + 3, base - h, 8, h - 4, 'brass');
      F.cylV(x + 2, base - h - 2, 10, 3, 'steel');
      F.rect(x + 4, base - h - 1, 6, 1, 'glowO', { bevel: 0 });
      A.smoke.push({ x: x + 7, y: base - h - 3 });
      return 15;
    },
    biodome(F, x, base, r, A) {
      F.rect(x, base - 4, 56, 5, 'hull', { bevel: 2 });
      F.shape(x + 2, base - 32, x + 54, base - 3, (a, b) => Math.hypot((a - x - 28) / 26, (b - (base - 4)) / 28) <= 1, 'glass', { round: 4 });
      F.rect(x + 20, base - 18, 3, 14, 'wood', { bevel: 1 }); F.rect(x + 34, base - 14, 3, 10, 'wood', { bevel: 1 });
      F.ellipse(x + 21, base - 21, 9, 6, 'leaf'); F.ellipse(x + 35, base - 16, 7, 5, 'leaf'); F.ellipse(x + 14, base - 9, 5, 4, 'leaf'); F.ellipse(x + 44, base - 8, 5, 4, 'leaf');
      for (let k = 0; k < 6; k++) F.line(x + 4 + k * 10, base - 4, x + 28 + (k - 2.5) * 6, base - 30, 'steel', { tone: 0.7 });
      A.glowG.push([x + 28, base - 12]);
      return 56;
    },
    quantum(F, x, base, r, A) {
      F.rect(x, base - 5, 22, 6, 'hull', { bevel: 1 });
      F.cylV(x + 3, base - 12, 4, 8, 'steel'); F.cylV(x + 15, base - 12, 4, 8, 'steel');
      F.px(x + 5, base - 13, 'glowP', 1); F.px(x + 17, base - 13, 'glowP', 1);
      A.holo = { x: x + 11, y: base - 26 };
      return 22;
    },
    singularity(F, x, base, r, A) {
      F.rect(x, base - 5, 26, 6, 'hull', { bevel: 1 });
      F.shape(x, base - 30, x + 26, base - 4, (a, b) => { const d = Math.hypot(a - x - 13, b - (base - 17)); return d >= 10 && d <= 12.5; }, 'steel', { round: 1.5 });
      F.ellipse(x + 13, base - 17, 5, 5, 'navy');
      A.sing = { x: x + 13, y: base - 17 };
      return 26;
    },
    turret(F, x, base, r, A) {
      F.rect(x, base - 4, 14, 5, 'hull', { bevel: 1 });
      F.ellipse(x + 7, base - 5, 6, 5, 'steel');
      F.cylH(x + 9, base - 9, 12, 3, 'steel');
      A.blink.push({ x: x + 4, y: base - 7, c: '#ff9a2e' });
      return 22;
    },
    signal(F, x, base, r, A, o) {
      const st = o.stage, top = base - 66;
      F.rect(x, base - 6, 30, 7, 'steel', { bevel: 2 });
      for (let k = 0; k < 6; k++) {
        const y0 = base - 6 - k * 10, y1 = y0 - 10, w0 = 12 - k * 1.4, w1 = 12 - (k + 1) * 1.4;
        F.line(x + 15 - w0, y0, x + 15 - w1, y1, 'steel'); F.line(x + 15 + w0, y0, x + 15 + w1, y1, 'steel');
        F.line(x + 15 - w0, y0, x + 15 + w1, y1, 'hull'); F.line(x + 15 + w0, y0, x + 15 - w1, y1, 'hull');
      }
      if (st >= 2) {
        F.shape(x - 6, top - 22, x + 36, top + 2, (a, b) => Math.hypot(a - x - 15, b - (top - 2)) <= 20 && Math.hypot(a - x - 15, b - (top - 14)) > 18 && b <= top + 2, 'white', { round: 3 });
      }
      if (st >= 3) {
        F.line(x + 15, top - 4, x + 15, top - 22, 'steel', { w: 2 });
        F.ellipse(x + 15, top - 24, 4, 4, 'glowY');
        A.beacon = { x: x + 15, y: top - 24 };
      }
      A.blink.push({ x: x + 15, y: st >= 2 ? top - 4 : top, c: '#ff4d5e' });
      return 30;
    }
  };

  // Pièces ventrales : accrochées sous la quille (y = top), dessinées vers le bas.
  const VENTRAL = {
    spike(F, x, top, r, A) {
      const len = 12 + (r() * 16 | 0);
      F.rect(x - 4, top, 9, 3, 'hull', { bevel: 1 });
      F.poly([[x - 4, top + 2], [x + 5, top + 2], [x + 0.5, top + 2 + len]], 'hull', { bevel: 1 });
      F.line(x, top + 3, x, top + len - 2, 'hull', { shift: 1 });
      A.blink.push({ x, y: top + 1, c: '#ff9a2e' });
      return 10;
    },
    hangar(F, x, top, r, A) {
      F.rect(x, top - 1, 34, 13, 'hull', { bevel: 2 });
      F.rect(x + 3, top + 2, 28, 8, 'dark', { bevel: 1 });
      for (let k = 0; k < 7; k++) F.line(x + 4 + k * 4, top + 3, x + 6 + k * 4, top + 9, 'gold', { tone: k % 2 ? 0.7 : 0.25 });
      F.rect(x + 3, top + 10, 28, 2, 'steel', { bevel: 0 });
      A.windows.push([x + 2, top + 5]); A.windows.push([x + 31, top + 5]);
      A.hangars.push({ x: x + 17, y: top + 12 });
      return 34;
    },
    drill(F, x, top, r, A, o) {
      const len = 14 + o.i % 2 * 6;
      F.rect(x - 4, top, 10, 4, 'hull', { bevel: 1 });
      F.cylV(x - 1, top + 3, 4, len, 'steel');
      F.ellipse(x + 1, top + 3 + len * 0.5, 2.5, 2.5, 'steel');
      F.poly([[x - 3, top + 3 + len], [x + 5, top + 3 + len], [x + 1, top + 10 + len]], 'steel', { bevel: 1 });
      DS.crystal(F, x - 4, top + 14 + len, 5, 7, -1);
      DS.crystal(F, x + 5, top + 14 + len, 4, 5, 1);
      return 12;
    },
    pod(F, x, top, r) {
      F.rect(x + 3, top, 4, 3, 'hull', { bevel: 0 }); F.rect(x + 19, top, 4, 3, 'hull', { bevel: 0 });
      F.cylH(x, top + 2, 26, 9, 'steel', { cap: true });
      F.cylH(x + 6, top + 2, 2, 9, 'hull'); F.cylH(x + 18, top + 2, 2, 9, 'hull');
      F.px(x + 12, top + 5, 'glowO', 0.9);
      return 26;
    },
    arm(F, x, top, r, A) {
      F.rect(x - 5, top, 12, 5, 'hull', { bevel: 1 });
      F.ellipse(x + 1, top + 6, 3.5, 3.5, 'steel');
      A.arms.push({ x: x + 1, y: top + 6 });
      return 14;
    },
    cocoon(F, x, top, r, A, o) {
      const st = o.stage, s = 0.7 + st * 0.18;
      F.shape(x - 4, top - 2, x + 34, top + 4, (a, b) => Math.abs(b - top) < 1.5 + Math.sin(a * 0.7) * 0.8, 'organic', { round: 1.2 });
      F.ellipse(x + 15, top + 10 * s, 9 * s, 11 * s, 'organic');
      for (const [a, b] of [[-1, 0.3], [1, 0.5], [0.2, 1]]) F.line(x + 15 + a * 5 * s, top + 4, x + 15 + a * 7 * s, top + 10 * s + b * 8 * s, 'organic', { shift: -2 });
      for (let k = 0; k < 2 + st; k++) A.glowG.push([x + 10 + (k * 7) % 12, top + 5 + (k * 5) % (14 * s)]);
      A.cocoon = { x: x + 15, y: top + 10 * s, s };
      return 34;
    }
  };

  // Finition à résolution native 2× : chaque rivet et reflet tient un pixel
  // physique, au lieu d'être seulement doublé lors du rendu de la scène.
  function finitionHD(source, bx, by, bodyW, bodyH, salles, moteurs) {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = source.width * 2;
    c.height = source.height * 2;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(source, 0, 0, c.width, c.height);
    const p = (x, y, w, h, couleur) => {
      ctx.fillStyle = couleur;
      ctx.fillRect(Math.round(x * 2), Math.round(y * 2), w, h);
    };
    const bd = bx + 1, haut = by + 1;
    // Filets lumineux et doubles rivets sur les bordures métalliques.
    for (const bord of [haut + 2, haut + bodyH - 8]) {
      for (let x = bd + 8; x < bd + bodyW - 8; x += 9) {
        p(x, bord, 2, 1, '#afc7e3');
        p(x + 0.5, bord + 1, 1, 1, '#182238');
        if (x % 3 === 0) p(x + 3, bord + 2, 1, 1, '#e7a354');
      }
    }
    // Pattes et angles finement usinés autour de chaque module.
    for (const rm of salles) {
      const x = rm.x + 1, y = rm.y + 1;
      for (const dy of [0, rm.h - 2]) for (const dx of [0, rm.w - 2]) {
        p(x + dx, y + dy, 3, 1, '#c3d3e9');
        p(x + dx, y + dy + 0.5, 1, 3, '#40536d');
      }
      if (rm.id !== 'empty') {
        // Condensateurs et diode de contrôle, dans le cadre et non la salle.
        p(x + 5, y + 1, 7, 1, '#dceefa');
        p(x + rm.w - 6, y + 2, 2, 2, '#ff9a2e');
        p(x + rm.w - 8, y + rm.h - 2, 6, 1, '#62b8f0');
        // Détails propres à la fonction de chaque salle, à l'échelle HD.
        if (rm.id === 'lab' || rm.id === 'array' || rm.id === 'quantum') {
          for (let k = 0; k < 5; k++) {
            p(x + 7 + k * 6, y + 11 + (k % 3), 4, 1,
              k % 2 ? '#9fe8ff' : '#3089be');
          }
        } else if (rm.id === 'greenhouse' || rm.id === 'biodome') {
          for (let k = 0; k < 6; k++) {
            p(x + 5 + k * 6, y + 13 - (k % 3), 2, 2, '#b7ff80');
            p(x + 6 + k * 6, y + 15, 1, 2, '#477b35');
          }
        } else if (rm.id === 'oxygen' || rm.id === 'cryo' || rm.id === 'ice') {
          for (let k = 0; k < 3; k++) {
            p(x + 7 + k * 13, y + 7, 2, 5, '#d7fcff');
            p(x + 9 + k * 13, y + 8, 1, 5, '#449ac7');
          }
        } else if (rm.id === 'solar' || rm.id === 'fusion' || rm.id === 'foundry') {
          for (let k = 0; k < 7; k++) {
            p(x + 8 + k * 4, y + 20, 1, 3,
              k % 2 ? '#ff9a2e' : '#ffdb79');
          }
        }
      }
    }
    // Bagues chromées des trois moteurs : traces très fines au pixel physique.
    for (const e of moteurs) {
      for (let k = 0; k < 3; k++) {
        const yy = e.y + (k - 1) * Math.max(1, e.h / 4);
        p(e.x + 14, yy, 9, 1, k === 1 ? '#b5dcff' : '#456481');
      }
    }
    // Mécanismes et prises de maintenance sur le caisson de poupe.
    for (let k = 0; k < 8; k++) {
      p(bd - 21 + (k % 4) * 4, haut + 24 + Math.floor(k / 4) * 32,
        3, 2, k % 3 === 0 ? '#ffba61' : '#7296b8');
    }
    // Reflets sous-pixelliques sur la verrière, sans masquer la proue.
    const proue = bd + bodyW;
    for (let k = 0; k < 12; k++) {
      const x = proue + 10 + k * 3, y = haut + 14 + Math.floor(k / 5);
      p(x, y, 2, 1, k % 3 === 0 ? '#d6faff' : '#60b5e5');
    }
    return c;
  }

  // ------------------------------------------------------------------ assemblage
  DS.buildShip = function (spec) {
    const n = Math.max(8, spec.rooms.length + (spec.rooms.length % 2));
    const cols = n / 2;
    const bodyW = cols * (RW + WALL) + WALL, bodyH = BAND * 2 + 2 * (RH + WALL) + WALL;
    const STERN = 66 + (spec.fusion ? 10 : 0), BOW = 84 + (spec.bowDrill ? 22 : 0) + (spec.mandibles ? 10 : 0);
    const TOP = 82, BOT = 50 + (spec.cocoon >= 0 ? 12 : 0);
    const bx = STERN, by = TOP;
    const W = STERN + bodyW + BOW, H = TOP + bodyH + BOT;
    const F = new DS.Forge(W, H);
    const r = rng(cols * 7 + 3);
    const A = { windows: [], blink: [], smoke: [], glowG: [], radar: [], hangars: [], arms: [], holo: null, sing: null, beacon: null, cocoon: null, plasma: [], lights: [] };
    const engines = [], flick = [];
    const cy = by + bodyH / 2;

    // anneau de saut (moitié arrière)
    if (spec.ring) {
      F.shape(bx - 22, by - 14, bx - 6, by + bodyH + 14, (a, b) => { const u = (a - (bx - 14)) / 8, v = (b - cy) / (bodyH / 2 + 13); const d = u * u + v * v; return d <= 1 && d >= 0.55 && a < bx - 14; }, 'steel', { round: 2 });
    }

    // ---- épine dorsale à gradins : les équipements s'y posent à des hauteurs variées
    const spine = [];
    {
      let sx = bx + 6;
      const sEnd = bx + bodyW - 52, hs = [7, 12, 9, 14, 6, 11];
      let si = (cols * 3) % hs.length;
      while (sx < sEnd - 24) {
        const len = Math.min(sEnd - sx, 38 + (r() * 46 | 0));
        spine.push({ x0: sx, x1: sx + len, h: hs[si++ % hs.length] });
        sx += len - 2;
      }
      for (const sp of spine) {
        F.poly([[sp.x0, by + 2], [sp.x0 + 5, by - sp.h], [sp.x1 - 5, by - sp.h], [sp.x1, by + 2]], r() < 0.3 ? 'hullB' : 'hull', { bevel: 2 });
        F.rect(sp.x0 + 6, by - sp.h, sp.x1 - sp.x0 - 12, 2, 'steel', { bevel: 0 });
        if (sp.h >= 9) for (let k = sp.x0 + 8; k < sp.x1 - 8; k += 4) A.windows.push([k, by - sp.h + 5]);
        for (let k = sp.x0 + 12; k < sp.x1 - 8; k += 13 + (r() * 9 | 0)) F.line(k, by - sp.h + 2, k, by, 'hull', { shift: -1 });
      }
    }
    const baseAt = (x, w) => {
      const c = x + w / 2;
      const sp = spine.find(p => c >= p.x0 && c < p.x1);
      return sp ? by - sp.h : by;
    };
    const items = [];
    if (spec.signal) items.push(['signal', { stage: spec.signal }]);
    if (spec.biodome) items.push(['biodome']);
    if (spec.dish) items.push(['dish']);
    for (let i = 0; i < spec.labs; i++) items.push(['labDome']);
    for (let i = 0; i < spec.solar; i++) items.push(['solar', { big: spec.solarBig, gold: spec.gold, i }]);
    if (spec.tanks) items.push(['tanks', { n: spec.tanks }]);
    for (let i = 0; i < spec.greenhouse; i++) items.push(['greenhouse']);
    for (let i = 0; i < spec.chimneys; i++) items.push(['chimney', { i }]);
    if (spec.cargo) items.push(['cargo']);
    if (spec.quantum) items.push(['quantum']);
    if (spec.singularity) items.push(['singularity']);
    for (let i = 0; i < spec.turrets; i++) items.push(['turret']);
    const deckStart = bx + 8, deckEnd = bx + bodyW - 54;
    const widths = { signal: 30, biodome: 56, dish: 34, labDome: 24, solar: spec.solarBig ? 34 : 28, tanks: 30, greenhouse: 28, chimney: 15, cargo: 30, quantum: 22, singularity: 26, turret: 22 };
    let used = items.reduce((a, [k]) => a + widths[k] + 4, 0);
    while (used > deckEnd - deckStart && items.length) { const it = items.pop(); used -= widths[it[0]] + 4; }
    const fillers = ['hab', 'spire', 'radiator', 'hab', 'spire', 'hab'];
    let x = deckStart, fi = 0;
    // intercale des pièces de remplissage pour casser la silhouette
    const per = ((deckEnd - deckStart) - used) / (items.length + 1);
    let budget = per;
    const placeFillers = () => {
      while (budget > 14 && x + 34 < deckEnd) {
        const k = fillers[fi++ % fillers.length];
        const w0 = x;
        const w = DORSAL[k](F, x, baseAt(x, 16), r, A, {});
        x += w + 2;
        budget -= (x - w0);
      }
      x += Math.max(0, budget); budget = 0;
    };
    placeFillers();
    for (const [k, o] of items) {
      const xx = Math.round(x);
      const w = DORSAL[k](F, xx, baseAt(xx, widths[k]), r, A, o || {});
      x += w + 4;
      budget += per;
      placeFillers();
    }
    DORSAL.tower(F, bx + bodyW - 50, by, r, A);
    F.rect(bx + 2, by - 3, bodyW - 6, 5, 'hull', { bevel: 2 });

    // ---- poupe : bloc moteur, nacelles, batteries
    plates(F, bx - 32, by + 8, 36, 10, r, { lights: A.lights });
    F.rect(bx - 32, by + 18, 36, bodyH - 36, 'hull', { bevel: 2 });
    for (let k = by + 22; k < by + bodyH - 20; k += 4) F.line(bx - 29, k, bx - 2, k, 'hull', { shift: -1 });
    plates(F, bx - 32, by + bodyH - 18, 36, 10, r, { stripes: true });
    const nac = spec.fusion ? [[0, 14], [1, 24], [2, 14]] : [[0, 14], [1, 14], [2, 14]];
    const ys = spec.fusion ? [by + 14, by + bodyH / 2 - 12, by + bodyH - 28] : [by + 15, by + bodyH / 2 - 7, by + bodyH - 29];
    nac.forEach(([i, eh], k) => {
      const ey = Math.round(ys[k]), x0 = 12, len = bx - 40;
      F.cylH(x0, ey, len, eh, 'steel');
      F.cylH(x0 + 5, ey + 3, len - 9, 3, 'shipRib', { tone: 0.64 });
      F.cylH(x0 + 8, ey + eh - 5, len - 13, 2, 'shipShadow', { tone: 0.22 });
      for (const rx of [x0 + 4, x0 + 12, x0 + len - 6]) {
        F.cylH(rx, ey - 1, 3, eh + 2, 'hull');
        F.px(rx + 1, ey, 'shipRib', 0.78);
      }
      F.cylH(x0 + len, ey + 2, 8, eh - 4, 'hull');
      F.poly([[2, ey - 3], [14, ey + 1], [14, ey + eh - 1], [2, ey + eh + 3]], 'hull', { bevel: 1.5 });
      F.ellipse(3.5, ey + eh / 2, 2.2, eh / 2 - 1, i === 1 && spec.fusion ? 'glowY' : 'glowC');
      F.rect(x0 + 6, ey + 3, 3, 2, 'glowO', { bevel: 0 });
      F.rect(x0 + 17, ey + 2, 6, 2, 'shipCopper', { bevel: 0, tone: 0.74 });
      F.px(x0 + 19, ey + 2, 'glowC', 0.85);
      F.line(x0 + 18, ey + eh - 3, x0 + len - 3, ey + eh - 3, 'shipShadow', { tone: 0.16 });
      engines.push({ x: 2, y: ey + eh / 2, h: eh + 2, hot: i === 1 && spec.fusion });
    });
    for (let k = 0; k < spec.batteries; k++) {
      const yb = k % 2 ? by + bodyH - 8 : by + 2, xb = bx - 30 + (k >> 1) * 16;
      F.rect(xb, yb, 14, 7, 'hull', { bevel: 1 });
      F.rect(xb + 2, yb + 2, 10, 3, 'dark', { bevel: 0 });
      for (let i = 0; i < 3; i++) F.px(xb + 3 + i * 3, yb + 3, 'glowY', 0.9);
    }

    // ---- coque centrale
    plates(F, bx, by, bodyW, BAND, r, { lights: A.lights });
    plates(F, bx, by + bodyH - BAND, bodyW, BAND, r, { stripes: true, lights: A.lights });
    const roomsY = by + BAND;
    F.rect(bx, roomsY, bodyW, bodyH - 2 * BAND, 'hull', { bevel: 1 });
    const roomRects = [];
    for (let i = 0; i < n; i++) {
      const row = i < cols ? 0 : 1, col = i % cols;
      const rx = bx + WALL + col * (RW + WALL), ry = roomsY + WALL + row * (RH + WALL);
      drawRoom(F, rx, ry, RW, RH, spec.rooms[i] || 'empty', i * 31 + 7);
      roomRects.push({ x: rx + 1, y: ry + 1, w: RW, h: RH, id: spec.rooms[i] || 'empty' });
      if (!spec.rooms[i]) flick.push({ x: rx + RW - 5 + 1, y: ry + 3 + 1 });
    }
    for (let k = 0; k <= cols; k++) {
      const wx = bx + k * (RW + WALL);
      F.rect(wx, roomsY, WALL, bodyH - 2 * BAND, 'hull', { bevel: 1 });
      F.px(wx + 1, roomsY + 3, 'steel', 0.85); F.px(wx + 2, roomsY + bodyH - 2 * BAND - 4, 'steel', 0.85);
      F.px(wx + 1, roomsY + WALL + RH + 1, 'steel', 0.7);
    }
    F.rect(bx + 2, roomsY + WALL + RH, bodyW - 4, WALL, 'hull', { bevel: 1 });
    // Deux rails en acier séparent clairement les salles et portent des rivets.
    for (let k = bx + 8; k < bx + bodyW - 5; k += 11) {
      F.px(k, roomsY + WALL + RH + 1, 'shipRib', 0.88);
      F.px(k + 1, roomsY + WALL + RH + 2, 'shipShadow', 0.12);
    }
    F.line(bx + 3, roomsY + WALL + RH + 1,
      bx + bodyW - 4, roomsY + WALL + RH + 1, 'shipRib', { tone: 0.57 });
    if (spec.armor) {
      for (let k = bx + 2; k < bx + bodyW - 20; k += 34) {
        F.rect(k, by - 2, 30, 6, 'steel', { bevel: 2 });
        F.line(k + 1, by + 3, k + 28, by + 3, 'orange', { tone: 0.65 });
        F.rect(k + 4, by + bodyH - 4, 30, 6, 'steel', { bevel: 2 });
        F.line(k + 5, by + bodyH - 4, k + 32, by + bodyH - 4, 'orange', { tone: 0.65 });
      }
    }
    if (spec.plasma) {
      F.line(bx + 4, by + BAND - 2, bx + bodyW - 4, by + BAND - 2, 'glowP', { tone: 0.55 });
      F.line(bx + 4, by + bodyH - BAND + 1, bx + bodyW - 4, by + bodyH - BAND + 1, 'glowP', { tone: 0.55 });
      A.plasma.push({ x0: bx + 4, x1: bx + bodyW - 4, y: by + BAND - 2 }, { x0: bx + 4, x1: bx + bodyW - 4, y: by + bodyH - BAND + 1 });
    }
    F.cylH(bx + 4, by + 1, bodyW - 8, 3, 'steel');
    F.line(bx + 8, by + 1, bx + bodyW - 11, by + 1, 'shipRib', { tone: 0.82 });
    for (let k = bx + 14; k < bx + bodyW - 8; k += 22) {
      F.cylH(k, by, 3, 5, 'hull');
      F.px(k + 1, by, 'shipCopper', 0.77);
    }
    for (let k = bx + 30; k < bx + bodyW - 20; k += 26) { F.ellipse(k, by + bodyH - BAND / 2, 2, 2, 'steel'); F.ellipse(k, by + bodyH - BAND / 2, 1.2, 1.2, 'glowC'); }
    // aileron et épaulement de poupe
    F.poly([[bx - 30, by + 9], [bx - 22, by - 20], [bx - 12, by - 20], [bx - 2, by + 9]], 'hullB', { bevel: 2 });
    for (let k = 0; k < 4; k++) F.line(bx - 24 + k * 3, by - 16 + k * 2, bx - 22 + k * 3, by - 16 + k * 2, 'gold', { tone: 0.75 });
    A.blink.push({ x: bx - 17, y: by - 21, c: '#ff4d5e' });
    F.poly([[bx - 6, by + 10], [bx + 4, by - 6], [bx + 26, by - 6], [bx + 30, by + 2], [bx + 30, by + 10]], 'steel', { bevel: 2, normal: [-0.35, -0.6, 0.7] });
    for (let k = bx + 6; k < bx + 26; k += 4) A.windows.push([k, by - 2]);
    // nacelle latérale basse
    F.poly([[bx - 26, by + bodyH - 3], [bx + 34, by + bodyH - 1], [bx + 40, by + bodyH + 9], [bx - 18, by + bodyH + 9]], 'hull', { bevel: 2 });
    for (let k = bx - 14; k < bx + 34; k += 6) A.windows.push([k, by + bodyH + 4]);
    text(F, 'ARCHE-09', bx + 50, by + bodyH - BAND + 3, 'white', 0.82);

    // ---- quille
    const keelY = by + bodyH;
    plates(F, bx + 8, keelY - 1, bodyW - 16, 8, r, {});
    if (bodyW > 120) plates(F, bx + 46, keelY + 5, bodyW - 92, 5, r, { mat: 'hullB' });
    const under = [];
    for (let i = 0; i < spec.hangars; i++) under.push(['hangar']);
    for (let i = 0; i < spec.drills; i++) under.push(['drill', { i }]);
    if (spec.cocoon >= 0) under.push(['cocoon', { stage: spec.cocoon }]);
    for (let i = 0; i < spec.arm; i++) under.push(['arm']);
    const uw = { hangar: 34, drill: 12, cocoon: 34, arm: 14, pod: 26, spike: 10 };
    let ux = bx + 14;
    const uEnd = bx + bodyW - 14;
    const uUsed = under.reduce((a, [k]) => a + uw[k] + 6, 0);
    let ubudget = Math.max(0, (uEnd - ux - uUsed) / (under.length + 1));
    const fillUnder = () => {
      while (ubudget >= 12) {
        const k = ubudget > 34 && r() < 0.5 ? 'pod' : 'spike';
        const w = VENTRAL[k](F, ux + (k === 'spike' ? 4 : 0), keelY + 6, r, A, {});
        const gap = k === 'spike' ? 14 + (r() * 16 | 0) : 8;
        ux += w + gap; ubudget -= w + gap;
      }
      ux += Math.max(0, ubudget); ubudget = 0;
    };
    fillUnder();
    for (const [k, o] of under) {
      if (ux > uEnd - uw[k]) break;
      const w = VENTRAL[k](F, Math.round(ux + (k === 'drill' || k === 'arm' ? 4 : 0)), keelY + 6, r, A, o || {});
      ux += w + 6;
      ubudget += Math.max(0, (uEnd - bx - 14 - uUsed) / (under.length + 1));
      fillUnder();
    }

    // ---- proue
    const nx0 = bx + bodyW, NL = 80;
    const top = u => 0.02 + 0.5 * Math.pow(u, 1.7), bot = u => 0.98 - 0.4 * Math.pow(u, 1.5);
    F.shape(nx0 - 3, by - 2, nx0 + NL, by + bodyH, (a, b) => {
      const u = (a - nx0) / (NL - 2), v = (b - by) / bodyH;
      if (u < 0) return v >= 0 && v <= 1;
      return u <= 1 && v >= top(u) && v <= bot(u);
    }, 'hull', { round: 10 });
    F.shape(nx0, by, nx0 + NL - 10, by + bodyH * 0.5, (a, b) => {
      const u = (a - nx0) / (NL - 2), v = (b - by) / bodyH;
      return u >= 0.02 && u <= 0.9 && v >= top(u) + 0.02 && v <= top(u) + 0.12 + 0.1 * (1 - u);
    }, 'steel', { bevel: 1.5, normal: [0.15, -0.6, 0.78] });
    F.shape(nx0 + 4, by + bodyH * 0.62, nx0 + NL - 6, by + bodyH, (a, b) => {
      const u = (a - nx0) / (NL - 2), v = (b - by) / bodyH;
      return u >= 0.04 && u <= 0.85 && v <= bot(u) - 0.02 && v >= bot(u) - 0.1;
    }, 'steel', { bevel: 1.5, normal: [0.1, 0.55, 0.82] });
    F.shape(nx0 + 4, by + 6, nx0 + 50, by + 32, (a, b) => {
      const u = (a - (nx0 + 26)) / 24, v = (b - (by + 32)) / 26;
      return u * u + v * v <= 1 && b < by + 29 && (b - by) / bodyH >= top(Math.max(0, (a - nx0) / (NL - 2))) + 0.13;
    }, 'glass', { round: 5 });
    for (const k of [16, 26, 36]) F.line(nx0 + k, by + 12 + (k - 16) * 0.25, nx0 + k - 2, by + 28, 'steel', { tone: 0.55 });
    F.line(nx0 + 12, by + 22, nx0 + 22, by + 15, 'white', { tone: 0.95 });
    // Cockpit polygonal : montants, verrière stratifiée et consoles éclairées.
    F.line(nx0 + 10, by + 17, nx0 + 42, by + 15, 'shipGlass', { tone: 0.89 });
    F.line(nx0 + 11, by + 20, nx0 + 37, by + 20, 'glowC', { tone: 0.72 });
    F.line(nx0 + 44, by + 12, nx0 + 38, by + 31, 'shipRib', { tone: 0.78 });
    F.line(nx0 + 29, by + 12, nx0 + 27, by + 31, 'shipRib', { tone: 0.62 });
    F.rect(nx0 + 12, by + 27, 22, 2, 'shipShadow', { bevel: 0 });
    for (let k = 0; k < 5; k++) F.px(nx0 + 13 + k * 4, by + 27, k % 2 ? 'glowC' : 'glowO', 0.88);
    for (let k = 0; k < 4; k++) F.line(nx0 + 8 + k * 14, by + bodyH * 0.45 + k * 2, nx0 + 12 + k * 14, by + bodyH * 0.8 - k * 3, 'hull', { shift: -1 });
    for (let k = 0; k < 6; k++) F.px(nx0 + 10 + k * 9, by + bodyH * 0.55 + k * 0.6, 'steel', 0.85);
    // marques des sauts
    for (let k = 0; k < spec.jumps; k++) F.rect(nx0 + 8 + k * 4, Math.round(by + bodyH * 0.42), 2, 5, spec.emissions && k < spec.emissions * 6 ? 'gold' : 'white', { bevel: 0, tone: 0.75 });
    // Nervures et facettes de proue, lisibles même sur fond très lumineux.
    F.line(nx0 + 8, by + bodyH * 0.74, nx0 + 55, by + bodyH * 0.68, 'shipShadow', { tone: 0.18 });
    F.line(nx0 + 7, by + bodyH * 0.7, nx0 + 51, by + bodyH * 0.65, 'shipRib', { tone: 0.53 });
    for (let k = 0; k < 7; k++) {
      const xx = nx0 + 10 + k * 8, yy = Math.round(by + bodyH * (0.78 - k * 0.011));
      F.px(xx, yy, 'shipRib', 0.66); F.px(xx + 1, yy + 1, 'shipShadow', 0.12);
    }
    F.ellipse(nx0 + NL - 12, by + bodyH * 0.56, 2.6, 2.6, 'glowC');
    A.blink.push({ x: nx0 + NL - 12, y: Math.round(by + bodyH * 0.56), c: '#bff4ff', steady: true });
    A.blink.push({ x: nx0 + 30, y: by + 6, c: '#ff4d5e' }, { x: nx0 + 30, y: by + bodyH - 6, c: '#5aff8a' });
    if (spec.boom) {
      F.line(nx0 + 20, by + 4, nx0 + NL + 26, by - 8, 'steel');
      F.line(nx0 + 20, by + 6, nx0 + NL + 26, by - 6, 'hull');
      for (let k = 0; k < 4; k++) F.px(nx0 + 34 + k * 16, by + 1 - k * 3, 'steel', 0.95);
      A.blink.push({ x: nx0 + NL + 27, y: by - 8, c: '#7fd8ff' });
    }
    let bowDrill = null;
    if (spec.bowDrill) {
      const dy = Math.round(by + bodyH * 0.7), dx = nx0 + 44;
      F.rect(dx - 6, dy - 7, 18, 14, 'steel', { bevel: 2 });
      F.cylH(dx + 10, dy - 6, 6, 12, 'hull');
      F.poly([[dx + 16, dy - 7], [dx + 16, dy + 7], [dx + 44, dy]], 'steel', { bevel: 1.5 });
      bowDrill = { x: dx + 16, y: dy, len: 28, h: 14 };
    }
    if (spec.mandibles) {
      const tools = DS.spriteTools;
      const ty = by + bodyH * 0.56, tipX = nx0 + NL + 8 + (spec.bowDrill ? 10 : 0);
      F.shape(nx0 + 30, by + 4, tipX + 4, ty, tools.stroke([[nx0 + 34, by + 18], [nx0 + 60, by + 16], [tipX - 6, ty - 14], [tipX, ty - 4]], 4, 1.4), 'steel', { round: 2.5 });
      F.shape(nx0 + 30, ty, tipX + 4, by + bodyH, tools.stroke([[nx0 + 34, by + bodyH - 14], [nx0 + 60, by + bodyH - 12], [tipX - 6, ty + 14], [tipX, ty + 6]], 4, 1.4), 'steel', { round: 2.5 });
      F.px(tipX, ty - 4, 'glowO', 1); F.px(tipX, ty + 6, 'glowO', 1);
    }
    // anneau de saut (moitié avant)
    if (spec.ring) {
      F.shape(bx - 22, by - 14, bx - 6, by + bodyH + 14, (a, b) => { const u = (a - (bx - 14)) / 8, v = (b - cy) / (bodyH / 2 + 13); const d = u * u + v * v; return d <= 1 && d >= 0.55 && a >= bx - 14; }, 'steel', { round: 2 });
    }

    // fenêtres allumées
    for (const [wx, wy] of A.windows) F.px(wx, wy, r() < 0.7 ? 'glowO' : 'glowC', r() < 0.25 ? 0.45 : 0.9);
    for (const [lx, ly] of A.lights) F.px(lx, ly, 'glowO', 0.9);

    const cv = F.render();
    const cvHD = finitionHD(cv, bx, by, bodyW, bodyH, roomRects, engines);
    const P = 1, sh = (o) => o && Object.assign({}, o, { x: o.x + P, y: o.y + P });
    const blink = A.blink.map((l, i) => Object.assign({}, l, { x: l.x + P, y: l.y + P, p: (i * 1.7) % 6.28 }));
    for (let i = 0; i < A.lights.length; i += 3) blink.push({ x: A.lights[i][0] + P, y: A.lights[i][1] + P, c: '#ff9a2e', p: i * 0.3 });
    return {
      canvas: cv, canvasHD: cvHD, W: W + 2, H: H + 2, bx: bx + P, by: by + P, bodyW, bodyH,
      engines: engines.map(e => Object.assign({}, e, { x: e.x + P, y: e.y + P })),
      lights: blink, rooms: roomRects.map(rm => Object.assign({}, rm, { y: rm.y })), flick,
      fx: {
        smoke: A.smoke.map(sh), glow: A.glowG.map(([x, y]) => ({ x: x + P, y: y + P })), radar: A.radar.map(sh), hangars: A.hangars.map(sh),
        arms: A.arms.map(sh), holo: sh(A.holo), sing: sh(A.sing), beacon: sh(A.beacon), cocoon: sh(A.cocoon),
        plasma: A.plasma.map(p => ({ x0: p.x0 + P, x1: p.x1 + P, y: p.y + P })), drill: sh(bowDrill),
        ring: spec.ring ? { x: bx - 14 + P, y: cy + P, rx: 8, ry: bodyH / 2 + 13 } : null,
        drones: spec.drones, shield: spec.shield, nanites: spec.nanites
      }
    };
  };

  // ------------------------------------------------------------------ animations par-dessus le vaisseau
  const holoCube = (() => { let c = null; return () => c || (c = (() => { const F = new DS.Forge(16, 16); F.iso(8, 1, 7, 7, 'violet'); return F.render(); })()); })();
  const droneSpr = (() => {
    let c = null;
    return () => c || (c = (() => {
      const F = new DS.Forge(12, 7);
      F.line(0, 1, 11, 1, 'steel'); F.ellipse(6, 4, 4, 2.6, 'steel'); F.px(7, 4, 'glowO', 1);
      return F.render();
    })());
  })();
  DS.drawShipFX = function (ctx, sh, ox, oy, t, s, still, front) {
    const fx = sh.fx;
    const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
    if (!front) {
      // bouclier de phase
      if (fx.shield) {
        const cx = ox + sh.W / 2, cy = oy + sh.by + sh.bodyH / 2 - 8, rx = sh.W / 2 + 2, ry = sh.bodyH / 2 + 44;
        const a = (still ? 0.1 : 0.06 + 0.05 * Math.sin(t * 1.6)) * Math.min(1, 0.5 + fx.shield * 0.15);
        ctx.fillStyle = 'rgba(120,220,255,' + a.toFixed(3) + ')';
        for (let k = 0; k < 360; k += 2) {
          const ang = k * Math.PI / 180, x = cx + Math.cos(ang) * rx, y = cy + Math.sin(ang) * ry;
          if ((k / 2 + Math.floor(t * 4)) % 9 < 2) ctx.fillRect(Math.round(x), Math.round(y), 2, 1);
        }
      }
      return;
    }
    // foreuse de proue
    if (fx.drill) {
      const d = fx.drill, ph = still ? 0 : Math.floor(t * 18) % 4;
      for (let i = 0; i < d.len - 2; i++) {
        const hh = Math.max(1, Math.round(d.h * (1 - i / d.len)));
        if ((i + ph) % 4 === 0) px(ox + d.x + i, oy + d.y - (hh >> 1), 1, hh, 'rgba(10,14,24,.55)');
      }
      if (!still && Math.random() < 0.3) { ctx.fillStyle = '#ffd23a'; ctx.fillRect(Math.round(ox + d.x + d.len + Math.random() * 3), Math.round(oy + d.y + (Math.random() - 0.5) * 6), 1, 1); }
    }
    // fumées des cheminées
    for (const sm of fx.smoke) {
      px(ox + sm.x - 2, oy + sm.y + 1, 4, 1, still || Math.sin(t * 9 + sm.x) > 0 ? '#ffbb4a' : '#ff8a1f');
      if (still) continue;
      for (let k = 0; k < 5; k++) {
        const life = (t * 0.8 + k / 5 + sm.x * 0.01) % 1;
        const x = ox + sm.x + life * -10 + Math.sin(life * 6 + k) * 2, y = oy + sm.y - life * 18;
        ctx.globalAlpha = (1 - life) * 0.45;
        px(x, y, 2 + Math.round(life * 2), 2, life < 0.15 ? '#ff9a2e' : '#8a8fa0');
      }
      ctx.globalAlpha = 1;
    }
    // lueurs végétales et organiques
    for (const g of fx.glow) if (still || Math.sin(t * 2 + g.x) > -0.3) { ctx.globalAlpha = 0.6; px(ox + g.x, oy + g.y, 1, 1, '#c4ff9a'); ctx.globalAlpha = 1; }
    // radars des observatoires
    for (const rd of fx.radar) { const a = still ? 0 : t * 2; px(ox + rd.x + Math.cos(a) * 4, oy + rd.y + Math.sin(a) * 1.2, 1, 1, '#7fd8ff'); }
    // hologramme quantique
    if (fx.holo) {
      const c = holoCube(), y = oy + fx.holo.y + (still ? 0 : Math.sin(t * 2) * 2);
      ctx.globalAlpha = still ? 0.8 : 0.65 + 0.2 * Math.sin(t * 5);
      ctx.drawImage(c, Math.round(ox + fx.holo.x - c.width / 2), Math.round(y - c.height / 2));
      ctx.globalAlpha = 0.3; px(ox + fx.holo.x - 1, y + 8, 2, 12, '#c993ff'); ctx.globalAlpha = 1;
    }
    // micro-singularité
    if (fx.sing) {
      for (let k = 0; k < 10; k++) {
        const a = (still ? 0 : t * 3) + k * 0.63, rr = 3 + (k % 3) * 2;
        px(ox + fx.sing.x + Math.cos(a) * rr, oy + fx.sing.y + Math.sin(a) * rr * 0.7, 1, 1, k % 2 ? '#c993ff' : '#ffffff');
      }
      px(ox + fx.sing.x - 1, oy + fx.sing.y - 1, 2, 2, '#000000');
    }
    // balise du Signal
    if (fx.beacon) {
      const a = still ? 0.5 : 0.3 + 0.3 * Math.sin(t * 3);
      ctx.globalAlpha = a; ctx.fillStyle = '#ffd23a';
      ctx.fillRect(Math.round(ox + fx.beacon.x - 6), Math.round(oy + fx.beacon.y), 13, 1);
      ctx.fillRect(Math.round(ox + fx.beacon.x), Math.round(oy + fx.beacon.y - 6), 1, 13);
      ctx.globalAlpha = 1;
    }
    // conduits de plasma
    for (const pl of fx.plasma) {
      const pos = still ? 0.5 : (t * 0.6) % 1;
      const x = pl.x0 + (pl.x1 - pl.x0) * pos;
      px(ox + x, oy + pl.y, 6, 1, '#ffd6f5'); px(ox + x + 2, oy + pl.y, 2, 1, '#ffffff');
    }
    // anneau de saut
    if (fx.ring) {
      const k = still ? 0 : Math.floor(t * 8);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        if (Math.cos(a) < -0.1) continue;
        const on = (i + k) % 5 === 0;
        px(ox + fx.ring.x + Math.cos(a) * fx.ring.rx * 0.85, oy + fx.ring.y + Math.sin(a) * fx.ring.ry * 0.85, 1, 2, on ? '#ffffff' : '#46d8ff');
      }
    }
    // nanites
    if (fx.nanites && !still) {
      for (let k = 0; k < 6; k++) {
        const x = sh.bx + ((t * 30 + k * 57) % sh.bodyW), y = sh.by + (k % 2 ? 2 : sh.bodyH - 3);
        px(ox + x, oy + y, 1, 1, k % 3 ? '#c993ff' : '#ffffff');
      }
    }
    // bras robotisés
    for (const arm of fx.arms) {
      const a1 = (still ? 0.6 : 0.6 + Math.sin(t * 1.3 + arm.x) * 0.35), a2 = a1 + 0.9 + (still ? 0 : Math.sin(t * 2.1 + arm.x) * 0.4);
      const x1 = ox + arm.x + Math.cos(a1) * 12, y1 = oy + arm.y + Math.sin(a1) * 12;
      const x2 = x1 + Math.cos(a2) * 10, y2 = y1 + Math.sin(a2) * 10;
      ctx.strokeStyle = '#9aa9c0'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ox + arm.x, oy + arm.y); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      px(x1 - 1, y1 - 1, 3, 3, '#4f5e78'); px(x2 - 1, y2 - 1, 3, 2, '#ff9a2e');
    }
    // cocon du Spécimen
    if (fx.cocoon) {
      const p = still ? 0.6 : 0.4 + 0.4 * Math.sin(t * 1.8);
      ctx.globalAlpha = p * 0.5; ctx.fillStyle = '#b8ff7a';
      ctx.fillRect(Math.round(ox + fx.cocoon.x - 2), Math.round(oy + fx.cocoon.y - 2), 4, 4);
      ctx.globalAlpha = 1;
    }
    // drones en orbite
    if (fx.drones) {
      const spr = droneSpr();
      const cx = ox + sh.bx + sh.bodyW / 2, cy = oy + sh.by + sh.bodyH / 2;
      for (let k = 0; k < fx.drones; k++) {
        const a = (still ? 0 : t * (0.35 + (k % 3) * 0.07)) + k * (Math.PI * 2 / fx.drones);
        const rx = sh.W * 0.42 + (k % 3) * 8, ry = sh.H * 0.42 + (k % 2) * 6;
        const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
        if (Math.sin(a) < -0.15 && Math.abs(Math.cos(a)) < 0.7) continue;
        ctx.drawImage(spr, Math.round(x - 6), Math.round(y - 3));
      }
    }
  };
})(window.DS = window.DS || {});
