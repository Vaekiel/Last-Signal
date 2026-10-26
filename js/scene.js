/* Dernier Signal — rendu pixel-art sur canvas : fond en parallaxe, vaisseau modulaire, planètes, Spécimen. */
'use strict';
(function (DS) {
  // ------------------------------------------------------------------ outils
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
  const dither = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  function rng(seed) {
    let x = (seed * 2654435761) >>> 0 || 1;
    return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
  }
  function hash3(x, y, z, seed) {
    let h = (x * 374761393 + y * 668265263 + z * 2147483647 + seed * 974634541) | 0;
    h = (h ^ (h >>> 13)) * 1274126177 | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function noise3(x, y, z, seed) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    let r = 0;
    for (let dz = 0; dz < 2; dz++) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const wt = (dx ? u : 1 - u) * (dy ? v : 1 - v) * (dz ? w : 1 - w);
      r += wt * hash3(xi + dx, yi + dy, zi + dz, seed);
    }
    return r;
  }
  const fbm = (x, y, z, seed) => noise3(x, y, z, seed) * 0.55 + noise3(x * 2.1, y * 2.1, z * 2.1, seed + 7) * 0.3 + noise3(x * 4.3, y * 4.3, z * 4.3, seed + 13) * 0.15;
  function fbm4(x, y, z, seed) {
    let a = 0, amp = 0.5, f = 1, tot = 0;
    for (let o = 0; o < 4; o++) { a += noise3(x * f, y * f, z * f, seed + o * 17) * amp; tot += amp; amp *= 0.5; f *= 2.03; }
    return a / tot;
  }
  // bruit raccordé horizontalement (période W) : échantillonné sur un cylindre
  function seam(x, y, W, scale, seed, oct4) {
    const a = x / W * Math.PI * 2, R = W / (2 * Math.PI * scale);
    return (oct4 ? fbm4 : fbm)(Math.cos(a) * R + 50, y / scale, Math.sin(a) * R + 50, seed);
  }
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function px(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }

  // ------------------------------------------------------------------ planètes
  const PLANETS = {
    terra:  { tones: ['#0a1f4e', '#163f86', '#2366c0', '#3a8fe0', '#3fae55', '#2c7d3c', '#eaf6ff'], rim: '#8fd0ff' },
    ice:    { tones: ['#123a66', '#2a6aa0', '#4a90c0', '#8fd0f0', '#c4ecff', '#e8f8ff', '#ffffff'], rim: '#c4f0ff' },
    violet: { tones: ['#170a34', '#311a70', '#4a2690', '#7a44d0', '#b07cf0', '#ffb3f0', '#ffffff'], rim: '#d6a6ff' },
    mars:   { tones: ['#2a0c08', '#5e1a10', '#9a3218', '#d0502a', '#ff8a5a', '#ffc08a', '#ffe0c0'], rim: '#ffb08a' },
    gas:    { tones: ['#3a200e', '#704020', '#b06a3a', '#d8a060', '#f0d8a0', '#fff0c8', '#ffffff'], rim: '#ffe0a0' },
    dark:   { tones: ['#08040f', '#160c2a', '#2a1a4a', '#46306e', '#ff6fd8', '#ffb8ec', '#ffd6f5'], rim: '#a070ff' }
  };
  DS.drawPlanet = function (ctx, cx, cy, r, type, seed, opts) {
    opts = opts || {};
    const P = PLANETS[type] || PLANETS.terra;
    const tones = P.tones.map(hex);
    const L = [-0.66, -0.42, 0.62];
    const W = ctx.canvas.width, H = ctx.canvas.height;
    const img = ctx.getImageData(0, 0, W, H);
    const d = img.data;
    const rim = hex(P.rim);
    const shadow = hex('#05030c');
    for (let y = Math.max(0, Math.floor(cy - r - 3)); y < Math.min(H, Math.ceil(cy + r + 3)); y++) {
      for (let x = Math.max(0, Math.floor(cx - r - 3)); x < Math.min(W, Math.ceil(cx + r + 3)); x++) {
        const nx = (x + 0.5 - cx) / r, ny = (y + 0.5 - cy) / r, d2 = nx * nx + ny * ny;
        const i = (y * W + x) * 4;
        if (d2 > 1) {
          if (d2 < 1.08 && !opts.noAtmo) {
            const a = (1.08 - d2) / 0.08 * Math.max(0, -nx * 0.7 - ny * 0.45 + 0.35);
            if (a > dither(x, y) * 0.95) { const c = mix(rim, [255, 255, 255], a > 0.8 ? 0.3 : 0); d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; }
          }
          continue;
        }
        const nz = Math.sqrt(1 - d2);
        const lam = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
        const sx = nx, sz = nz;
        let t;
        if (type === 'gas') t = 0.5 + 0.5 * Math.sin(ny * 11 + fbm(sx * 2, ny * 2.5, sz * 2, seed) * 5);
        else if (type === 'terra') {
          const n = fbm4(sx * 1.6 + 3, ny * 1.6, sz * 1.6, seed);
          const cl = fbm(sx * 3, ny * 6, sz * 3, seed + 50);
          t = cl > 0.63 ? 1 : n > 0.56 ? (n > 0.63 ? 0.66 : 0.6) : n * 0.95;
        } else if (type === 'dark') {
          const n = fbm4(sx * 3, ny * 3, sz * 3, seed);
          t = Math.abs(n - 0.5) < 0.022 ? 0.9 : n * 0.72;
        } else t = fbm4(sx * 2.2, ny * 2.2, sz * 2.2, seed);
        let idx;
        if (type === 'terra') idx = t >= 1 ? 6 : t > 0.65 ? 5 : t > 0.58 ? 4 : t > 0.45 ? 3 : t > 0.33 ? 2 : 1;
        else if (type === 'dark') idx = t >= 0.9 ? 4 : t > 0.45 ? 3 : t > 0.3 ? 2 : 1;
        else idx = Math.min(5, Math.max(1, Math.floor(t * 6.4)));
        let c = tones[idx];
        const shade = lam + (dither(x, y) - 0.5) * 0.2;
        let k = shade > 0.62 ? 1 : shade > 0.42 ? 0.82 : shade > 0.24 ? 0.6 : shade > 0.1 ? 0.38 : 0.16;
        if (type === 'dark' && idx === 4) k = Math.max(k, 0.9);
        c = mix(shadow, c, k);
        if (shade > 0.93 && idx < 6) c = mix(c, [255, 255, 255], 0.22);
        if (1 - nz < 0.2 && lam > 0.18) c = mix(c, rim, 0.5 * (1 - (1 - nz) / 0.2) * 0 + 0.0);
        if (nz < 0.3 && lam > 0.12) c = mix(c, rim, 0.45);
        d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    if (opts.ring) {
      for (let a = 0; a < Math.PI * 2; a += 0.004) {
        for (let rr = 1.45; rr < 1.95; rr += 0.06) {
          const rx = Math.cos(a) * r * rr, ry = Math.sin(a) * r * rr * 0.22;
          const x = Math.round(cx + rx * 0.96 - ry * 0.25), y = Math.round(cy + ry + rx * 0.2);
          if (Math.sin(a) < 0 && Math.hypot(x - cx, y - cy) < r) continue;
          const band = Math.floor(rr * 12) % 3;
          ctx.fillStyle = band === 0 ? 'rgba(255,232,190,.8)' : band === 1 ? 'rgba(210,170,120,.6)' : 'rgba(150,110,80,.35)';
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  };
  DS.planetURL = (function () {
    const cache = {};
    return function (type, size, seed) {
      const key = type + size + ':' + seed;
      if (cache[key]) return cache[key];
      if (typeof document === 'undefined') return '';
      const c = canvas(size, size);
      const ring = type === 'gas';
      DS.drawPlanet(c.getContext('2d'), size / 2, size / 2, ring ? size / 3.6 : size / 2 - 3, type, seed || 3, { ring });
      return (cache[key] = c.toDataURL());
    };
  })();

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
  DS.makeRamp('rockDark', '#040307', '#4a4052', 6, { amb: 0.12 });
  const RW = 44, RH = 30, WALL = 4;
  const bay = DS.forgeBayer;

  function drawRoom(F, x, y, w, h, id, seed) {
    const R = ROOMS[id] || ROOMS.empty;
    const r = rng(seed || 1);
    const mat = 'room-' + id;
    const z0 = F.zc + 1;
    F.zc += 1;
    const lamp = id === 'empty' ? 0 : 1;
    const back = { z: z0, part: F.parts++ };
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const v = j / h, cone = Math.max(0, 1 - Math.abs(i - w / 2) / (w * 0.5)) * (1 - v);
      let t = 0.62 - 0.5 * v + 0.28 * cone * lamp + (bay(x + i, y + j) - 0.5) * 0.16;
      if (i % 11 === 10) t -= 0.12;
      if (j === Math.round(h * 0.42)) t -= 0.1;
      F.set(x + i, y + j, mat, 0, 0, 1, { z: z0, part: back.part, tone: Math.max(0, Math.min(1, t)), shift: 0 });
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
          const px0 = x + 3 + k * 13.5;
          F.shape(px0, y + 3, px0 + 11, fy, (a, b) => Math.hypot((a - px0 - 5.5) / 5.5, Math.max(0, Math.abs(b - (y + 3 + (fy - y - 3) / 2)) - 7) / 5) <= 1, 'steel', { bevel: 1.5 });
          F.shape(px0 + 2, y + 5, px0 + 9, fy - 2, (a, b) => Math.hypot((a - px0 - 5.5) / 3.6, Math.max(0, Math.abs(b - (y + 3 + (fy - y - 3) / 2)) - 7) / 3.6) <= 1, 'glass', { round: 2 });
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
    }
  }
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

  // ------------------------------------------------------------------ vaisseau
  const FONT = { A: ['010', '101', '111', '101', '101'], R: ['110', '101', '110', '101', '101'], C: ['011', '100', '100', '100', '011'], H: ['101', '101', '111', '101', '101'], E: ['111', '100', '110', '100', '111'], '-': ['000', '000', '111', '000', '000'], '0': ['111', '101', '101', '101', '111'], '9': ['111', '101', '111', '001', '111'] };
  function text(F, s, x, y, mat, tone) {
    for (const ch of s) {
      const g = FONT[ch];
      if (g) for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (g[j][i] === '1') F.px(x + i, y + j, mat, tone);
      x += 4;
    }
  }

  function buildShip(rooms, opt) {
    const n = Math.max(6, rooms.length + (rooms.length % 2));
    const cols = n / 2;
    const bodyW = cols * (RW + WALL) + WALL, bodyH = 2 * (RH + WALL) + WALL;
    const bx = 58, by = 60, NOSE = 72;
    const W = bx + bodyW + NOSE, H = by + bodyH + 46;
    const F = new DS.Forge(W, H);
    const r = rng(cols * 7 + 3);
    const lights = [], engines = [], flick = [];

    // superstructure (derrière la coque)
    const deckY = by - 9;
    let x = bx + 8;
    const panelSlots = [];
    while (x < bx + bodyW - 46) {
      const bw = 14 + (r() * 22 | 0), bh = 8 + (r() * 15 | 0);
      F.rect(x, deckY - bh, bw, bh + 2, r() < 0.5 ? 'hull' : 'steel', { bevel: 2 });
      F.rect(x + 2, deckY - bh, bw - 4, 2, 'steel', { bevel: 0, shift: 1 });
      if (bh > 11) for (let wx = x + 3; wx < x + bw - 3; wx += 3) F.px(wx, deckY - bh + 5, r() < 0.6 ? 'glowO' : 'glowC', r() < 0.3 ? 0.4 : 0.85);
      for (let vx = x + 3; vx < x + bw - 3; vx += 2) if (bh > 14) F.px(vx, deckY - 4, 'dark', 0.1);
      if (r() < 0.55) {
        const sx = x + 4 + (r() * (bw - 8) | 0), sh = 12 + (r() * 16 | 0);
        F.poly([[sx - 3, deckY - bh + 1], [sx, deckY - bh - sh], [sx + 3, deckY - bh + 1]], 'hull', { bevel: 1 });
        lights.push({ x: sx, y: deckY - bh - sh - 1, c: '#ff4d5e', p: r() * 6 });
      } else if (r() < 0.5) {
        const sx = x + 3 + (r() * (bw - 6) | 0), sh = 14 + (r() * 14 | 0);
        F.line(sx, deckY - bh, sx, deckY - bh - sh, 'steel');
        F.line(sx - 2, deckY - bh - sh + 4, sx + 2, deckY - bh - sh + 4, 'steel');
        lights.push({ x: sx, y: deckY - bh - sh - 1, c: '#ff4d5e', p: r() * 6 });
      }
      panelSlots.push({ x: x + bw / 2, top: deckY - bh });
      x += bw + 3 + (r() * 9 | 0);
    }
    // tour de commandement vers l'avant
    const tx = bx + bodyW - 44;
    F.rect(tx, deckY - 27, 34, 29, 'steel', { bevel: 2 });
    F.poly([[tx + 34, deckY - 27], [tx + 44, deckY - 12], [tx + 44, deckY + 2], [tx + 34, deckY + 2]], 'steel', { normal: [0.5, -0.4, 0.75], bevel: 1 });
    F.rect(tx + 4, deckY - 22, 34, 4, 'glowC', { bevel: 0 });
    for (let k = tx + 6; k < tx + 36; k += 5) F.px(k, deckY - 22, 'dark', 0.2);
    F.rect(tx + 6, deckY - 33, 12, 7, 'hull', { bevel: 1 });
    F.line(tx + 12, deckY - 33, tx + 12, deckY - 48, 'steel');
    F.line(tx + 9, deckY - 43, tx + 15, deckY - 43, 'steel');
    lights.push({ x: tx + 12, y: deckY - 49, c: '#ff4d5e', p: 1 });
    F.line(tx + 24, deckY - 27, tx + 24, deckY - 40, 'steel');
    lights.push({ x: tx + 24, y: deckY - 41, c: '#7fd8ff', p: 3 });
    // panneaux solaires
    const nPanels = Math.min(opt.solar, panelSlots.length, 4);
    for (let k = 0; k < nPanels; k++) {
      const s = panelSlots[Math.floor((k + 0.5) * panelSlots.length / Math.max(1, nPanels))];
      const mx = Math.round(s.x), top = s.top - 14;
      F.cylV(mx - 1, top, 3, s.top - top, 'steel');
      const pw = 26, ph = 10, px0 = mx - pw / 2, py0 = top - ph;
      F.rect(px0 - 1, py0 - 1, pw + 2, ph + 2, 'steel', { bevel: 1 });
      for (let j = 0; j < 2; j++) for (let i = 0; i < 5; i++) F.rect(px0 + i * 5 + 1, py0 + j * 5 + 1, 4, 4, 'solar', { bevel: 1, normal: [-0.25, -0.5, 0.85] });
    }
    if (opt.dish) {
      const dx = bx + Math.round(bodyW * 0.38);
      F.cylV(dx - 1, deckY - 12, 3, 12, 'steel');
      F.shape(dx - 12, deckY - 30, dx + 10, deckY - 10, (a, b) => Math.hypot(a - dx, b - (deckY - 16)) <= 10 && Math.hypot(a - dx - 3, b - (deckY - 22)) > 10, 'white', { round: 2 });
      F.line(dx - 3, deckY - 15, dx + 5, deckY - 25, 'steel');
      lights.push({ x: dx + 5, y: deckY - 26, c: '#ffbb4a', p: 2 });
    }
    // pont
    F.rect(bx + 4, deckY, bodyW - 2, 10, 'hull', { bevel: 2 });
    for (let k = bx + 10; k < bx + bodyW - 6; k += 12) F.px(k, deckY + 5, 'steel', 0.6);

    // moteurs
    F.rect(bx - 28, by + 6, 32, bodyH - 12, 'hull', { bevel: 2 });
    for (let k = 0; k < 8; k++) F.line(bx - 26 + k * 3, by + bodyH - 10, bx - 22 + k * 3, by + bodyH - 14, k % 2 ? 'gold' : 'dark', { tone: k % 2 ? 0.7 : 0.15 });
    for (let k = 0; k < 3; k++) {
      const ey = by + 9 + k * 19, eh = 14;
      F.cylH(14, ey, bx - 40, eh, 'steel');
      for (const rx of [18, 26, bx - 32]) F.cylH(rx, ey - 1, 3, eh + 2, 'hull');
      F.poly([[3, ey - 2], [15, ey + 1], [15, ey + eh - 1], [3, ey + eh + 2]], 'hull', { bevel: 1.5 });
      F.ellipse(4.5, ey + eh / 2, 2.2, eh / 2 - 1, 'glowC');
      F.rect(22, ey + 4, 3, 2, 'glowO', { bevel: 0 });
      engines.push({ x: 3, y: ey + eh / 2, h: eh + 2 });
    }

    // coque
    F.rect(bx, by, bodyW, bodyH, 'hull', { bevel: 3 });
    F.rect(bx, by, bodyW, 4, 'steel', { bevel: 1 });
    F.rect(bx, by + bodyH - 5, bodyW, 5, 'steel', { bevel: 1 });
    const roomRects = [];
    for (let i = 0; i < n; i++) {
      const row = i < cols ? 0 : 1, col = i % cols;
      const rx = bx + WALL + col * (RW + WALL), ry = by + WALL + row * (RH + WALL);
      drawRoom(F, rx, ry, RW, RH, rooms[i] || 'empty', i * 31 + 7);
      roomRects.push({ x: rx + 1, y: ry + 1, w: RW, h: RH, id: rooms[i] || 'empty' });
      if (!rooms[i]) flick.push({ x: rx + RW - 5 + 1, y: ry + 3 + 1 });
    }
    for (let k = 0; k <= cols; k++) {
      const wx = bx + k * (RW + WALL);
      F.rect(wx, by + 3, WALL, bodyH - 7, 'hull', { bevel: 1 });
      F.px(wx + 1, by + 6, 'steel', 0.8); F.px(wx + 2, by + bodyH - 9, 'steel', 0.8);
    }
    F.rect(bx + 2, by + WALL + RH, bodyW - 4, WALL, 'hull', { bevel: 1 });
    for (let k = bx + 6; k < bx + bodyW - 4; k += 9) { lights.push({ x: k, y: by + bodyH - 3, c: '#ff9a2e', p: k * 0.07 }); }

    // quille, soutes et pointes
    F.rect(bx + 6, by + bodyH, bodyW - 12, 9, 'hull', { bevel: 2 });
    text(F, 'ARCHE-09', bx + 10, by + bodyH + 2, 'white', 0.8);
    F.rect(bx + 20, by + bodyH + 8, bodyW - 40, 6, 'hull', { bevel: 1 });
    for (let k = bx + 22; k < bx + bodyW - 16; k += 28 + (r() * 12 | 0)) {
      const len = 12 + (r() * 14 | 0);
      F.poly([[k - 4, by + bodyH + 9], [k + 4, by + bodyH + 9], [k, by + bodyH + 9 + len]], 'hull', { bevel: 1 });
      lights.push({ x: k, y: by + bodyH + 11, c: '#ff9a2e', p: r() * 6 });
    }
    if (cols >= 4) {
      F.cylH(bx + Math.round(bodyW * 0.3), by + bodyH + 9, 26, 8, 'steel', { cap: true });
      F.cylH(bx + Math.round(bodyW * 0.62), by + bodyH + 9, 22, 8, 'steel', { cap: true });
    }

    // proue arrondie et cockpit
    const nx0 = bx + bodyW;
    F.shape(nx0 - 3, by - 2, nx0 + NOSE - 2, by + bodyH, (a, b) => {
      const u = (a - nx0) / (NOSE - 4), v = (b - by) / bodyH;
      if (u < 0) return v >= 0 && v <= 1;
      const top = 0.02 + 0.5 * Math.pow(u, 1.7), bot = 0.98 - 0.4 * Math.pow(u, 1.5);
      return u <= 1 && v >= top && v <= bot;
    }, 'hull', { round: 9 });
    F.shape(nx0 + 2, by + 2, nx0 + 44, by + 30, (a, b) => {
      const u = (a - (nx0 + 22)) / 22, v = (b - (by + 30)) / 26;
      return u * u + v * v <= 1 && b < by + 26 && (b - by) >= 0.5 * Math.pow(Math.max(0, (a - nx0) / (NOSE - 4)), 1.7) * bodyH + 3;
    }, 'glass', { round: 5 });
    F.line(nx0 + 12, by + 14, nx0 + 22, by + 8, 'white', { tone: 0.95 });
    F.line(nx0 + 14, by + 18, nx0 + 18, by + 15, 'white', { tone: 0.8 });
    for (let k = 0; k < 4; k++) F.line(nx0 + 6 + k * 12, by + bodyH * 0.6 + k * 2, nx0 + 10 + k * 12, by + bodyH - 6 - k * 3, 'hull', { shift: -1 });
    F.ellipse(nx0 + NOSE - 12, by + bodyH * 0.56, 2.4, 2.4, 'glowC');
    lights.push({ x: nx0 + NOSE - 12, y: Math.round(by + bodyH * 0.56), c: '#bff4ff', p: 0, steady: true });

    const cv = F.render();
    const P = 1;
    return {
      canvas: cv, W: W + 2, H: H + 2, bx: bx + P, by: by + P, bodyW, bodyH,
      engines: engines.map(e => ({ x: e.x + P, y: e.y + P, h: e.h })),
      lights: lights.map(l => Object.assign({}, l, { x: l.x + P, y: l.y + P })),
      rooms: roomRects, flick
    };
  }

  // ------------------------------------------------------------------ astéroïdes
  function asteroid(size, seed, mat) {
    const F = new DS.Forge(size, size);
    const r = rng(seed);
    const k1 = r() * 6, k2 = r() * 6, c = size / 2;
    F.shape(0, 0, size - 1, size - 1, (x, y) => {
      const dx = x - c, dy = y - c, a = Math.atan2(dy, dx);
      const R = c * (0.78 + 0.12 * Math.sin(a * 3 + k1) + 0.08 * Math.cos(a * 5 + k2));
      return Math.hypot(dx, dy * 1.08) <= R - 0.5;
    }, mat, { round: Math.max(2, size / 3) });
    const nc = Math.max(1, Math.round(size / 9));
    for (let i = 0; i < nc; i++) {
      const a = r() * 6.28, d = r() * c * 0.45, rr = 1 + r() * size / 9;
      F.ellipse(c + Math.cos(a) * d, c + Math.sin(a) * d, rr, rr * 0.85, mat, { flatness: -0.8 });
    }
    return F.render();
  }

  // ------------------------------------------------------------------ fond en parallaxe
  const NEBULA = {
    terra:  { far: ['#0d0a24', '#191242', '#261a62', '#3a2488', '#5634a8', '#7a50c8'], near: ['#1a1450', '#2c2280', '#4a36b0', '#7a5ad8', '#b08cf0', '#e2c8ff'], sky: ['#04050f', '#0a0c22'] },
    ice:    { far: ['#05121e', '#0a2236', '#10364e', '#164e68', '#1f6a84', '#2e8aa0'], near: ['#0c3048', '#14506a', '#1d7290', '#3098b0', '#5ec8d0', '#b0f0e8'], sky: ['#020812', '#06182a'] },
    violet: { far: ['#12051a', '#220a30', '#360f48', '#4e1660', '#6c207a', '#8e3094'], near: ['#3a0c46', '#5e1468', '#86208a', '#b4389e', '#e060b0', '#ffaad0'], sky: ['#06020c', '#14061e'] },
    mars:   { far: ['#140606', '#260b0a', '#3a120e', '#541c12', '#722a16', '#94401c'], near: ['#4a160e', '#702412', '#a03a16', '#d05c1e', '#f08a34', '#ffc070'], sky: ['#080304', '#1a0808'] },
    gas:    { far: ['#0a0d16', '#141a26', '#1e2434', '#2c2c3c', '#40382e', '#5c4a30'], near: ['#2a2a3a', '#46403a', '#6e5a3a', '#9a7840', '#c8a050', '#f0d090'], sky: ['#04050a', '#0e121c'] },
    dark:   { far: ['#06030c', '#0e0618', '#170a26', '#220e36', '#301248', '#44185c'], near: ['#200a36', '#36104e', '#521866', '#7a2276', '#b03c8a', '#e06aa8'], sky: ['#020106', '#08040f'] }
  };

  function cloudLayer(W, H, pal, seed, opts) {
    const c = canvas(W, H), ctx = c.getContext('2d');
    const img = ctx.createImageData(W, H), D = img.data;
    const cols = pal.map(hex);
    // densité calculée un pixel sur deux puis interpolée (4× plus rapide, bords nets)
    const GW = W / 2, GH = Math.ceil(H / 2) + 1, grid = new Float32Array(GW * GH);
    for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
      const x = gx * 2, y = gy * 2;
      const ys = y * (opts.stretch || 1);
      const wx = seam(x, ys, W, opts.scale * 1.7, seed + 3) * opts.warp;
      const v = seam(x + wx, ys + wx * 0.5, W, opts.scale, seed, true);
      const band = 1 - Math.pow(Math.abs((y / H - opts.center) / opts.spread), 2);
      grid[gy * GW + gx] = v * 0.8 + band * 0.32 - 0.2;
    }
    const dens = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const gx = x / 2, gy = y / 2, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
      const x1 = (x0 + 1) % GW, y1 = Math.min(GH - 1, y0 + 1);
      const a = grid[y0 * GW + x0], b = grid[y0 * GW + x1], c = grid[y1 * GW + x0], d = grid[y1 * GW + x1];
      dens[y * W + x] = (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
    }
    const th = opts.threshold, levels = cols.length;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const d = dens[i];
      if (d <= th) continue;
      const xl = (x - 3 + W) % W, yl = Math.max(0, y - 3);
      const lit = dens[i] - dens[yl * W + xl];
      let t = (d - th) / (1 - th) * levels * 1.15 + (lit > 0.01 ? 1.4 : lit < -0.015 ? -0.8 : 0) + (dither(x, y) - 0.5) * 0.9;
      let l = Math.floor(t);
      if (l < 0) { if (dither(x + 1, y) > 0.5) continue; l = 0; }
      l = Math.min(levels - 1, l);
      const col = cols[l];
      const o = i * 4;
      D[o] = col[0]; D[o + 1] = col[1]; D[o + 2] = col[2];
      D[o + 3] = opts.alpha != null ? Math.round(255 * Math.min(1, opts.alpha + l * 0.12)) : 255;
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  function buildBackground(sector) {
    const info = DS.sector(sector);
    const neb = NEBULA[info.planet] || NEBULA.terra;
    const W = 720, H = 320, seed = 11 + sector * 7;
    // ciel profond
    const deep = canvas(W, H), dctx = deep.getContext('2d');
    const img = dctx.createImageData(W, H), D = img.data;
    const s0 = hex(neb.sky[0]), s1 = hex(neb.sky[1]);
    const r = rng(seed);
    const sky = new Float32Array((W / 4) * (H / 4 + 1));
    for (let gy = 0; gy <= H / 4; gy++) for (let gx = 0; gx < W / 4; gx++) sky[gy * (W / 4) + gx] = seam(gx * 4, gy * 4, W, 140, seed + 9);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = sky[Math.min(H / 4, Math.round(y / 4)) * (W / 4) + (Math.round(x / 4) % (W / 4))];
      const t = Math.min(1, Math.max(0, (v - 0.35) * 1.6 + (dither(x, y) - 0.5) * 0.25));
      const c = mix(s0, s1, t > 0.66 ? 1 : t > 0.33 ? 0.5 : 0);
      const o = (y * W + x) * 4;
      D[o] = c[0]; D[o + 1] = c[1]; D[o + 2] = c[2]; D[o + 3] = 255;
    }
    for (let k = 0; k < W * H / 70; k++) {
      const x = r() * W | 0, y = r() * H | 0, b = r();
      const c = b > 0.8 ? [150, 170, 220] : b > 0.5 ? [90, 105, 150] : [60, 70, 110];
      const o = (y * W + x) * 4;
      D[o] = c[0]; D[o + 1] = c[1]; D[o + 2] = c[2];
    }
    dctx.putImageData(img, 0, 0);
    const far = cloudLayer(W, H, neb.far, seed + 1, { scale: 115, warp: 90, threshold: 0.44, center: 0.42, spread: 0.62, stretch: 1.25 });
    const near = cloudLayer(W, H, neb.near, seed + 2, { scale: 80, warp: 70, threshold: 0.54, center: 0.72, spread: 0.34, alpha: 0.6, stretch: 2.2 });
    // étoiles vives (dessinées à chaque image pour scintiller)
    const stars = [];
    for (let k = 0; k < 90; k++) stars.push({ x: r() * W, y: r() * H, s: r() < 0.12 ? 2 : r() < 0.4 ? 1 : 0, p: r() * 6.28, c: r() < 0.15 ? '#ffe6a8' : r() < 0.3 ? '#ffc4f0' : '#dff0ff', v: 0.5 + r() * 0.5 });
    // planète et lune
    const pr = 92;
    const planet = canvas(pr * 4, pr * 3);
    DS.drawPlanet(planet.getContext('2d'), pr * 2, pr * 1.5, pr, info.planet, 3 + sector * 5, { ring: info.planet === 'gas' });
    const moon = canvas(28, 28);
    DS.drawPlanet(moon.getContext('2d'), 14, 14, 11, ['ice', 'mars', 'violet', 'terra'][sector % 4] === info.planet ? 'ice' : ['ice', 'mars', 'violet', 'terra'][sector % 4], seed + 4, {});
    return { W, H, deep, far, near, stars, planet, pr, moon };
  }

  // ------------------------------------------------------------------ scène principale
  class Scene {
    constructor(cv) {
      this.cv = cv;
      this.ctx = cv.getContext('2d');
      this.W = 420; this.H = 186;
      cv.width = this.W; cv.height = this.H;
      this.t = 0;
      this.parts = [];
      this.rings = [];
      this.ship = null; this.shipKey = '';
      this.bg = null; this.bgKey = '';
      this.walkers = [];
      this.reduced = false;
      this.state = null;
      const r = rng(5);
      this.rockSprites = { mid: [], front: [] };
      this.mids = [];
      this.fronts = [];
      this.dust = Array.from({ length: 26 }, () => ({ x: r() * 720, y: r() * 320, v: 70 + r() * 90, l: 2 + (r() * 6 | 0) }));
    }
    sprites() {
      if (this.rockSprites.mid.length) return;
      for (let k = 0; k < 6; k++) this.rockSprites.mid.push(asteroid(7 + k * 3, 100 + k, 'rock'));
      for (let k = 0; k < 3; k++) this.rockSprites.front.push(asteroid(26 + k * 10, 200 + k, 'rockDark'));
      const r = rng(77);
      this.mids = Array.from({ length: 9 }, () => this.spawn(r, 'mid', true));
      this.fronts = Array.from({ length: 2 }, () => this.spawn(r, 'front', true));
    }
    spawn(r, layer, init) {
      const list = this.rockSprites[layer];
      const spr = list[(r() * list.length) | 0];
      const front = layer === 'front';
      return {
        spr, layer,
        x: init ? r() * (this.W + 200) : this.W + 10 + r() * (front ? 600 : 120),
        y: front ? (r() < 0.5 ? -spr.height * 0.3 + r() * 20 : this.H - spr.height * 0.7 - r() * 18) : 4 + r() * (this.H - 8 - spr.height),
        v: front ? 55 + r() * 30 : 14 + r() * 22
      };
    }
    setState(s) {
      this.state = s;
      this.sprites();
      const rooms = DS.MODULES.filter(m => (s.mods[m.id] || 0) > 0).map(m => m.room);
      const solar = Math.min(4, Math.ceil((s.mods.solar || 0) / 5));
      const dish = (s.mods.array || 0) > 0;
      const key = rooms.join(',') + '|' + solar + '|' + dish;
      if (key !== this.shipKey) {
        this.shipKey = key;
        this.ship = buildShip(rooms, { solar, dish });
        const W = Math.max(420, Math.min(760, this.ship.W + 150));
        if (W !== this.W) {
          this.W = W; this.H = Math.round(W * 0.44);
          this.cv.width = this.W; this.cv.height = this.H;
        }
        this.walkers = [];
      }
      if (String(s.sector) !== this.bgKey) { this.bgKey = String(s.sector); this.bg = buildBackground(s.sector); }
      const lit = this.ship.rooms.filter(rm => rm.id !== 'empty');
      const want = lit.length ? Math.min(s.crew.total, lit.length * 2) : 0;
      while (this.walkers.length < want) {
        const room = lit[this.walkers.length % lit.length];
        this.walkers.push({ room, x: 4 + Math.random() * (RW - 10), dir: Math.random() < 0.5 ? -1 : 1, pause: 0, suit: ['#ff9a2e', '#e8f0ff', '#5fd0ff', '#ffd23a', '#7fe35a'][this.walkers.length % 5] });
      }
      if (this.walkers.length > want) this.walkers.length = want;
    }
    origin() {
      return { x: Math.round((this.W - this.ship.W) / 2) + 10, y: Math.round((this.H - this.ship.H) / 2) + 8 };
    }
    shipCenter() {
      const o = this.origin();
      return { x: o.x + this.ship.bx + this.ship.bodyW / 2, y: o.y + this.ship.by + this.ship.bodyH / 2 };
    }
    burst(kind, at) {
      if (!this.ship) return;
      const c = this.shipCenter();
      const r = Math.random;
      if (kind === 'metal' || kind === 'ice') {
        for (let k = 0; k < 8; k++) {
          const sx = at ? at.x : (r() < 0.5 ? -4 : this.W + 4), sy = at ? at.y : 10 + r() * (this.H - 20);
          this.parts.push({ x: sx + (r() - 0.5) * 10, y: sy + (r() - 0.5) * 10, tx: c.x + (r() - 0.5) * this.ship.bodyW * 0.8, ty: c.y + (r() - 0.5) * 40, life: 0, dur: 0.45 + r() * 0.4, c: kind === 'ice' ? (r() < 0.5 ? '#7fdcff' : '#d6f7ff') : (r() < 0.5 ? '#c8d3e2' : '#71819c'), size: 1 + (r() * 2 | 0), home: true });
        }
      } else if (kind === 'data') {
        this.rings.push({ x: c.x, y: c.y, r: 4, life: 0 });
      } else if (kind === 'hull') {
        for (let k = 0; k < 18; k++) this.parts.push({ x: c.x + (r() - 0.5) * this.ship.bodyW, y: c.y + (r() - 0.5) * 50, vx: (r() - 0.5) * 50, vy: -r() * 50, life: 0, dur: 0.7, c: r() < 0.5 ? '#ffe14a' : '#ff9a2e', size: 1 });
      } else if (kind === 'oxygen') {
        for (let k = 0; k < 14; k++) this.parts.push({ x: c.x + (r() - 0.5) * 100, y: c.y + 14, vx: (r() - 0.5) * 12, vy: -12 - r() * 24, life: 0, dur: 1.2, c: r() < 0.5 ? '#bff0ff' : '#7fe35a', size: 1 });
      } else if (kind === 'jump') this.jumpT = 1.2;
    }
    toLogical(ev) {
      const rect = this.cv.getBoundingClientRect();
      return { x: (ev.clientX - rect.left) / rect.width * this.W, y: (ev.clientY - rect.top) / rect.height * this.H };
    }
    tile(img, speed, yOff) {
      const bg = this.bg, ctx = this.ctx;
      const off = ((this.t * speed) % bg.W + bg.W) % bg.W;
      const y = Math.round(yOff != null ? yOff : (this.H - bg.H) / 2);
      const x0 = -Math.round(off);
      ctx.drawImage(img, x0, y);
      if (x0 + bg.W < this.W) ctx.drawImage(img, x0 + bg.W, y);
    }
    frame(dt) {
      const ctx = this.ctx, W = this.W, H = this.H, s = this.state;
      if (!s || !this.bg || !this.ship) return;
      ctx.imageSmoothingEnabled = false;
      const still = this.reduced;
      if (!still) this.t += dt;
      const t = this.t;
      const bg = this.bg;
      const vy = Math.round((H - bg.H) / 2);
      // plans éloignés
      this.tile(bg.deep, 2, vy);
      this.tile(bg.far, 6, vy);
      const pl = bg.planet;
      ctx.drawImage(pl, Math.round(W - bg.pr * 2.55), Math.round(-bg.pr * 0.95));
      const mx = ((W + 60) - ((t * 3) % (W + 120)));
      ctx.drawImage(bg.moon, Math.round(mx), Math.round(H * 0.16));
      for (const st of bg.stars) {
        const x = ((st.x - t * (8 + st.v * 6)) % bg.W + bg.W) % bg.W, y = st.y + vy;
        if (x > W + 2 || y < -2 || y > H + 2) continue;
        const tw = still ? 0.7 : 0.5 + 0.5 * Math.sin(t * (1.5 + st.v * 2) + st.p);
        const X = Math.round(x), Y = Math.round(y);
        if (st.s === 2) {
          ctx.fillStyle = st.c; ctx.fillRect(X, Y, 1, 1);
          if (tw > 0.35) { ctx.globalAlpha = tw * 0.8; ctx.fillRect(X - 2, Y, 2, 1); ctx.fillRect(X + 1, Y, 2, 1); ctx.fillRect(X, Y - 2, 1, 2); ctx.fillRect(X, Y + 1, 1, 2); ctx.globalAlpha = 1; }
          if (tw > 0.8) { ctx.fillStyle = '#ffffff'; ctx.fillRect(X, Y, 1, 1); }
        } else if (st.s === 1) {
          ctx.globalAlpha = 0.4 + tw * 0.6; ctx.fillStyle = st.c; ctx.fillRect(X, Y, 1, 1);
          if (tw > 0.7) { ctx.globalAlpha = 0.35; ctx.fillRect(X - 1, Y, 3, 1); ctx.fillRect(X, Y - 1, 1, 3); }
          ctx.globalAlpha = 1;
        } else { ctx.globalAlpha = 0.3 + tw * 0.5; ctx.fillStyle = st.c; ctx.fillRect(X, Y, 1, 1); ctx.globalAlpha = 1; }
      }
      this.tile(bg.near, 15, vy);
      // astéroïdes de second plan
      const move = still ? 0 : dt;
      for (let i = 0; i < this.mids.length; i++) {
        const a = this.mids[i];
        a.x -= a.v * move;
        if (a.x < -a.spr.width - 4) this.mids[i] = this.spawn(Math.random, 'mid', false);
        else ctx.drawImage(a.spr, Math.round(a.x), Math.round(a.y));
      }
      // vaisseau
      const sh = this.ship, o = this.origin();
      const bob = still ? 0 : Math.round(Math.sin(t * 1.2) * 1.4);
      const oy = o.y + bob;
      const power = s._c ? Math.min(1, s._c.ratio.energy) : 1;
      for (const e of sh.engines) {
        const len = (still ? 26 : 24 + Math.sin(t * 21 + e.y) * 3 + Math.random() * 4) * (0.45 + 0.55 * power);
        for (let i = 0; i < len; i++) {
          const k = i / len;
          const hh = Math.max(1, Math.round(e.h * (1 - k) * 0.85 + 1));
          const y0 = oy + e.y - (hh >> 1);
          ctx.globalAlpha = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
          ctx.fillStyle = k < 0.12 ? '#ffffff' : k < 0.3 ? '#c4f2ff' : k < 0.55 ? '#5fc8ff' : '#2a6ee8';
          ctx.fillRect(o.x + e.x - 1 - i, y0, 1, hh);
          if (k < 0.4 && hh > 4) { ctx.fillStyle = '#ffffff'; ctx.fillRect(o.x + e.x - 1 - i, y0 + (hh >> 1) - 1, 1, 2); }
        }
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = '#5fc8ff';
        ctx.fillRect(o.x + e.x - 6, oy + e.y - e.h, 6, e.h * 2);
        ctx.globalAlpha = 1;
      }
      ctx.drawImage(sh.canvas, o.x, oy);
      // équipage
      for (const w of this.walkers) {
        if (!still) {
          if (w.pause > 0) w.pause -= dt;
          else {
            w.x += w.dir * dt * 7;
            if (w.x < 2 || w.x > RW - 6) { w.dir *= -1; w.x = Math.max(2, Math.min(RW - 6, w.x)); }
            if (Math.random() < dt * 0.3) w.pause = 0.5 + Math.random() * 2;
          }
        }
        const X = o.x + w.room.x + Math.round(w.x), Y = oy + w.room.y + RH - 4;
        const step = still || w.pause > 0 ? 0 : Math.floor(t * 7) % 2;
        px(ctx, X, Y - 9, 3, 3, '#eef3fa'); px(ctx, X + 1 + (w.dir > 0 ? 1 : -1) * 0, Y - 8, 2, 1, '#2fa2f0');
        px(ctx, X, Y - 6, 3, 4, w.suit); px(ctx, X, Y - 6, 1, 4, 'rgba(255,255,255,.35)');
        px(ctx, X + (step ? 0 : 0), Y - 2, 1, 2, '#1a1f2b'); px(ctx, X + 2, Y - 2 + (step ? -1 : 0), 1, 2 - (step ? -1 : 0), '#1a1f2b');
      }
      // feux
      for (const l of sh.lights) {
        const on = l.steady || still || Math.sin(t * 2.2 + l.p) > -0.2;
        if (!on) continue;
        ctx.fillStyle = l.c; ctx.fillRect(o.x + l.x, oy + l.y, 1, 1);
        if (Math.sin(t * 2.2 + l.p) > 0.7 || l.steady) { ctx.globalAlpha = 0.35; ctx.fillRect(o.x + l.x - 1, oy + l.y, 3, 1); ctx.fillRect(o.x + l.x, oy + l.y - 1, 1, 3); ctx.globalAlpha = 1; }
      }
      for (const f of sh.flick) if (still || Math.sin(t * 9 + f.x) > 0.3) px(ctx, o.x + f.x, oy + f.y, 1, 1, '#ff3b4a');
      // avaries
      if (s.hull < 40 && !still && Math.random() < dt * (40 - s.hull) * 0.35) {
        const rr = sh.rooms[Math.random() * sh.rooms.length | 0];
        this.parts.push({ x: o.x + rr.x + Math.random() * RW, y: oy + rr.y, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 20, life: 0, dur: 0.5, c: '#ffe14a', size: 1 });
      }
      // premier plan
      for (let i = 0; i < this.fronts.length; i++) {
        const a = this.fronts[i];
        a.x -= a.v * move;
        if (a.x < -a.spr.width - 10) this.fronts[i] = this.spawn(Math.random, 'front', false);
        else ctx.drawImage(a.spr, Math.round(a.x), Math.round(a.y));
      }
      if (!still) {
        ctx.fillStyle = '#9fc8ff';
        for (const d of this.dust) {
          d.x -= d.v * dt;
          if (d.x < -10) { d.x = W + Math.random() * 60; d.y = Math.random() * H; }
          ctx.globalAlpha = 0.35; ctx.fillRect(Math.round(d.x), Math.round(d.y), d.l, 1); ctx.globalAlpha = 1;
        }
      }
      // particules
      const keep = [];
      for (const p of this.parts) {
        p.life += dt;
        const k = Math.min(1, p.life / p.dur);
        let x, y;
        if (p.home) { const e = k * k; x = p.x + (p.tx - p.x) * e; y = p.y + (p.ty - p.y) * e; }
        else { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt; x = p.x; y = p.y; }
        ctx.fillStyle = p.c;
        ctx.fillRect(Math.round(x), Math.round(y), p.size, p.size);
        if (k < 1) keep.push(p);
      }
      this.parts = keep.slice(-300);
      this.rings = this.rings.filter(rg => {
        rg.life += dt; rg.r += dt * 200;
        ctx.strokeStyle = 'rgba(95,243,230,' + Math.max(0, 0.8 - rg.life) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(rg.x, rg.y, rg.r, 0, Math.PI * 2); ctx.stroke();
        return rg.life < 0.8;
      });
      if (s.distress.active || s.hull < 20) {
        const a = still ? 0.12 : 0.08 + 0.08 * Math.sin(t * 5);
        ctx.fillStyle = 'rgba(255,40,60,' + a.toFixed(3) + ')';
        ctx.fillRect(0, 0, W, H);
      }
      if (this.jumpT > 0) {
        this.jumpT -= dt;
        ctx.fillStyle = 'rgba(200,240,255,' + Math.max(0, this.jumpT / 1.2).toFixed(3) + ')';
        ctx.fillRect(0, 0, W, H);
      }
    }
  }
  DS.Scene = Scene;

  // ------------------------------------------------------------------ Spécimen
  DS.makeRamp('specA', '#0b2a12', '#c8ff96', 7, { amb: 0.25, shiny: 30 });
  const SPEC_MAT = ['leaf', 'leaf', 'teal', 'violet', 'ice', 'pink', 'gold'];
  const specCache = {};
  function creature(stage, phase) {
    const S = 96, F = new DS.Forge(S, S), c = S / 2;
    const mat = SPEC_MAT[stage];
    const tools = DS.spriteTools;
    const wave = (k, i) => Math.sin(phase + i * 0.35 + k) * (i / 12);
    if (stage === 0) {
      F.ellipse(c, c + 4, 15, 19, mat);
      for (const [a, b, e, d] of [[c - 6, c - 8, c - 9, c + 6], [c + 4, c - 10, c + 7, c + 4], [c - 1, c + 2, c + 3, c + 16]]) F.line(a, b, e, d, mat, { shift: -2 });
      F.ellipse(c - 6, c - 6, 3, 4, 'white', { flatness: 0.2 });
    } else if (stage === 1) {
      for (let i = 7; i >= 0; i--) {
        const a = phase * 0.6 + i * 0.55;
        F.ellipse(c + Math.cos(a) * (18 - i * 1.5), c + 6 + Math.sin(a) * 10 - i, 8 - i * 0.6, 7 - i * 0.5, mat);
      }
      F.ellipse(c + Math.cos(phase * 0.6) * 18 + 2, c + 4 + Math.sin(phase * 0.6) * 10, 2, 2, 'white');
    } else if (stage === 2) {
      for (let k = 0; k < 6; k++) {
        const side = k < 3 ? -1 : 1, i = k % 3;
        const bx = c + side * 8, by = c + 6;
        F.shape(0, 0, S - 1, S - 1, tools.stroke([[bx, by], [bx + side * (14 + i * 3), by + 4 + i * 4 + Math.sin(phase + k) * 2], [bx + side * (18 + i * 4), by + 18 + i * 3]], 2.4, 1), mat, { round: 2 });
      }
      F.ellipse(c, c + 2, 14, 11, mat);
      F.ellipse(c - 5, c - 1, 3.2, 3.2, 'white'); F.ellipse(c + 5, c - 1, 3.2, 3.2, 'white');
      F.ellipse(c - 4.5, c - 0.5, 1.4, 1.8, 'navy'); F.ellipse(c + 5.5, c - 0.5, 1.4, 1.8, 'navy');
    } else if (stage === 3) {
      F.shape(0, 0, S - 1, S - 1, tools.stroke([[c, 6], [c, 16]], 1.2, 1.2), 'white', { round: 1 });
      F.ellipse(c, c + 4, 13, 24, mat);
      for (let j = -16; j <= 20; j += 6) F.line(c - 11 + Math.abs(j) * 0.2, c + 4 + j, c + 11 - Math.abs(j) * 0.2, c + 6 + j, 'glowY', { tone: 0.6 + 0.3 * Math.sin(phase + j) });
    } else if (stage === 4) {
      const pts = [];
      for (let i = 0; i <= 20; i++) pts.push([12 + i * 3.6, c + Math.sin(phase + i * 0.45) * 9]);
      F.shape(0, 0, S - 1, S - 1, tools.stroke(pts, 3, 9), mat, { round: 6 });
      for (let i = 4; i < 18; i += 4) F.poly([[12 + i * 3.6, c + Math.sin(phase + i * 0.45) * 9 - 6], [16 + i * 3.6, c + Math.sin(phase + i * 0.45) * 9 - 14], [19 + i * 3.6, c + Math.sin(phase + i * 0.45) * 9 - 5]], 'glass', { bevel: 1 });
      const hx = 12 + 20 * 3.6, hy = c + Math.sin(phase + 9) * 9;
      F.ellipse(hx - 4, hy - 2, 2.2, 2.2, 'glowY');
    } else if (stage === 5) {
      for (let k = 0; k < 8; k++) {
        const a = Math.PI * (0.1 + 0.8 * k / 7), bx = c + Math.cos(a) * 12, by = c + 10;
        const pts = [];
        for (let i = 0; i < 12; i++) pts.push([bx + Math.cos(a) * i * 2.2 + wave(k, i) * 5, by + i * 2.6]);
        F.shape(0, 0, S - 1, S - 1, tools.stroke(pts, 3, 1), mat, { round: 2 });
      }
      F.ellipse(c, c, 20, 17, mat);
      for (const [ex, ey, er] of [[0, -4, 4.5], [-10, 2, 3], [10, 2, 3], [-5, 9, 2.4], [6, 9, 2.4]]) {
        F.ellipse(c + ex, c + ey, er, er, 'white'); F.ellipse(c + ex + 0.5, c + ey + 0.5, er * 0.45, er * 0.6, 'red');
      }
    } else {
      for (let k = 0; k < 12; k++) {
        const a = k / 12 * Math.PI * 2 + phase * 0.2, l = 16 + (k % 2) * 10 + Math.sin(phase + k) * 3;
        F.line(c + Math.cos(a) * 12, c + Math.sin(a) * 12, c + Math.cos(a) * (12 + l), c + Math.sin(a) * (12 + l), 'glowY', { tone: 0.5 + (k % 2) * 0.3, w: k % 2 ? 1 : 2 });
      }
      F.ellipse(c, c, 14, 14, 'glowY');
      F.ellipse(c, c, 6, 6, 'white');
    }
    return F.render();
  }
  function specFrames(stage) {
    if (specCache[stage]) return specCache[stage];
    const n = 8;
    return (specCache[stage] = Array.from({ length: n }, (_, i) => creature(stage, i / n * Math.PI * 2)));
  }
  DS.drawSpecimen = function (ctx, W, H, level, t, still) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#060b16'; ctx.fillRect(0, 0, W, H);
    const tx = 10, ty = 12, tw = W - 20, th = H - 30;
    for (let y = ty; y < ty + th; y++) for (let x = tx; x < tx + tw; x++) {
      const k = (x - tx) / tw;
      const lv = (y - ty) / th;
      const u = k * 2 - 1, lit = Math.sqrt(Math.max(0, 1 - u * u)) * (0.6 - u * 0.4);
      let c = lv < 0.08 ? '#0b241f' : lit + (dither(x, y) - 0.5) * 0.18 > 0.55 ? '#1a6650' : lit > 0.3 ? '#145040' : lit > 0.12 ? '#0f3a2e' : '#0a2a22';
      if (k < 0.05 || k > 0.95) c = '#2a7a64';
      ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1);
    }
    const stage = DS.SPEC_STAGES.filter(st => level >= st.lvl).length - 1;
    const frames = specFrames(stage);
    const fi = still ? 0 : Math.floor(t * 6) % frames.length;
    const img = frames[fi];
    const bob = still ? 0 : Math.round(Math.sin(t * 1.4) * 2);
    const sc = Math.min(1, (tw - 8) / img.width);
    ctx.drawImage(img, Math.round(W / 2 - img.width * sc / 2), Math.round(ty + th / 2 - img.height * sc / 2 + bob), Math.round(img.width * sc), Math.round(img.height * sc));
    ctx.fillStyle = 'rgba(200,255,235,.16)'; ctx.fillRect(tx + 5, ty + 4, 3, th - 8); ctx.fillRect(tx + 10, ty + 4, 1, th - 8);
    // couvercle et socle
    const F = DS._tankCaps || (DS._tankCaps = (() => {
      const f = new DS.Forge(W, H);
      f.rect(tx - 5, ty - 6, tw + 10, 7, 'steel', { bevel: 2 });
      f.rect(tx - 5, ty + th, tw + 10, 10, 'steel', { bevel: 2 });
      f.rect(tx + 8, ty + th + 3, tw - 16, 3, 'hull', { bevel: 1 });
      return f.render({ outline: false });
    })());
    ctx.drawImage(F, 0, 0);
    for (let k = 0; k < 4; k++) px(ctx, tx + 10 + k * ((tw - 20) / 3), ty + th + 4, 2, 2, (still || Math.sin(t * 3 + k) > 0) ? (k % 2 ? '#ff9a2e' : '#7fe35a') : '#2a3446');
    for (let k = 0; k < 9; k++) {
      const by = ty + th - ((t * 16 + k * 23) % (th - 6)) - 4;
      const bx = tx + 8 + ((k * 37) % (tw - 16)) + (still ? 0 : Math.sin(t * 2 + k) * 1.5);
      px(ctx, bx, still ? ty + th - 10 - k * 9 : by, k % 3 ? 1 : 2, k % 3 ? 1 : 2, 'rgba(200,255,240,.7)');
    }
  };
})(window.DS = window.DS || {});
