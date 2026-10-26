/* Dernier Signal — rendu pixel-art sur canvas : fonds de secteur en parallaxe, planètes, scène, Spécimen.
   Le vaisseau lui-même est construit dans ship.js. */
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
    dark:   { tones: ['#08040f', '#160c2a', '#2a1a4a', '#46306e', '#c44aa8', '#ff9ad8', '#ffd6f5'], rim: '#a070ff' }
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
          t = Math.abs(n - 0.5) < 0.013 ? 0.9 : n * 0.72;
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

  // ------------------------------------------------------------------ astéroïdes
  DS.makeRamp('rockDark', '#040307', '#4a4052', 6, { amb: 0.12 });
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

  // ------------------------------------------------------------------ fonds de secteur
  // Six secteurs retravaillés : panoramas lumineux, objets détaillés et couches raccordées.
  const FAR = { scale: 115, warp: 90, threshold: 0.44, center: 0.42, spread: 0.62, stretch: 1.25 };
  const NEAR = { scale: 80, warp: 70, threshold: 0.54, center: 0.72, spread: 0.34, alpha: 0.6, stretch: 2.2 };
  const THEMES = {
    terra:  { far: ['#200808', '#44140e', '#792411', '#af3b12', '#df6719', '#ff9e35'], near: ['#42110d', '#752013', '#ad3716', '#e3671e', '#ffaa47', '#ffe29a'], sky: ['#0b060c', '#28101a'], objects: ['rocks'], special: 'sun',
               farO: { scale: 118, warp: 85, threshold: 0.48, center: 0.46, spread: 0.65, stretch: 1.35 }, nearO: { threshold: 0.59, center: 0.8, spread: 0.38, alpha: 0.58, stretch: 2.4 } },
    ice:    { far: ['#03101c', '#06263e', '#0a4668', '#13779d', '#24a6c9', '#7fefff'], near: ['#07314b', '#0c5b79', '#138cae', '#31bcd8', '#91edff', '#e1ffff'], sky: ['#020811', '#08263e'], objects: ['shards', 'shards', 'rocks'], special: 'glints',
              farO: { scale: 120, warp: 80, threshold: 0.42, center: 0.36, spread: 0.7, stretch: 1.7 }, nearO: { scale: 70, warp: 60, threshold: 0.52, center: 0.7, spread: 0.4, alpha: 0.62, stretch: 2.8 } },
    violet: { far: ['#13051e', '#280b39', '#45105c', '#7c1985', '#b52ba5', '#ed6fd6'], near: ['#26083b', '#4e0d63', '#802092', '#bf3ca9', '#e96cce', '#ffb6eb'], sky: ['#05020d', '#1b0626'], objects: ['satellites', 'rocks', 'satellites'],
              farO: { scale: 105, warp: 100, threshold: 0.43, center: 0.5, spread: 0.65, stretch: 1.1 } },
    mars:   { far: ['#220909', '#3e110d', '#66200e', '#963310', '#c94e14', '#f78b25'], near: ['#431409', '#752312', '#ac3816', '#d9621c', '#ff993a', '#ffda84'], sky: ['#090407', '#290d0a'], objects: ['wrecks', 'rocks', 'rocks'],
              farO: { scale: 110, warp: 90, threshold: 0.47, center: 0.45, spread: 0.6, stretch: 1.3 } },
    gas:    { far: ['#031722', '#073341', '#095361', '#0e7780', '#23a6a7', '#82e6ce'], near: ['#41250c', '#70400f', '#a9671a', '#e49c32', '#f7c45c', '#fff1ac'], sky: ['#030a12', '#0c2634'], objects: ['rocks'], special: 'lightning',
              farO: { scale: 125, warp: 110, threshold: 0.4, center: 0.4, spread: 0.7, stretch: 1.4 }, nearO: { scale: 75, warp: 70, threshold: 0.53, center: 0.74, spread: 0.36, alpha: 0.6, stretch: 2.6 } },
    dark:   { far: ['#070415', '#0f0a26', '#20153d', '#3b2062', '#654093', '#9e6de2'], near: ['#120d30', '#241443', '#40205e', '#623184', '#9252ae', '#bf8be9'], sky: ['#020207', '#08071a'], objects: ['monoliths', 'rocks'], special: 'gate' }
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

  // ------------------------------------------------------------------ objets de décor
  function shardSprite(size, seed) {
    const F = new DS.Forge(size, size), r = rng(seed);
    const n = 2 + (r() * 3 | 0);
    for (let k = 0; k < n; k++) {
      const w = size * (0.18 + r() * 0.16), h = size * (0.45 + r() * 0.45);
      DS.crystal(F, size * (0.3 + r() * 0.4), size - 1 - r() * size * 0.15, w, h, (r() - 0.5) * size * 0.3);
    }
    return F.render();
  }
  function satelliteSprite(seed) {
    const F = new DS.Forge(40, 22), r = rng(seed);
    F.rect(0, 8, 13, 7, 'steel', { bevel: 1 });
    for (let i = 0; i < 3; i++) F.rect(1 + i * 4, 9, 3, 5, 'solar', { bevel: 0, normal: [-0.2, -0.4, 0.9] });
    F.rect(27, 8, 13, 7, 'steel', { bevel: 1 });
    for (let i = 0; i < 3; i++) F.rect(28 + i * 4, 9, 3, 5, 'solar', { bevel: 0, normal: [-0.2, -0.4, 0.9] });
    F.line(13, 11, 15, 11, 'steel'); F.line(25, 11, 27, 11, 'steel');
    F.rect(15, 5, 10, 13, r() < 0.5 ? 'gold' : 'white', { bevel: 2 });
    F.shape(14, 0, 26, 8, (a, b) => Math.hypot(a - 20, b - 6) <= 5.5 && Math.hypot(a - 20, b - 1) > 5, 'white', { round: 1.5 });
    F.line(20, 18, 20, 21, 'steel');
    F.px(17, 8, 'glowC', 0.9);
    return { c: F.render(), light: { x: 21, y: 22 } };
  }
  function wreckSprite(w, h, seed) {
    const F = new DS.Forge(w, h), r = rng(seed);
    const pts = [[0, 3], [w * 0.7, 0], [w * 0.78, 3], [w * 0.74, h * 0.4], [w - 1, h * 0.55], [w * 0.8, h * 0.72], [w * 0.86, h - 1], [w * 0.3, h - 2], [0, h * 0.7]];
    F.poly(pts, 'hull', { bevel: 2 });
    for (let k = 4; k < w * 0.7; k += 9 + (r() * 6 | 0)) F.line(k, 2, k + 1, h - 3, 'hull', { shift: -1 });
    for (let k = 3; k < w * 0.65; k += 4) if (r() < 0.45) F.px(k, h * 0.42, r() < 0.7 ? 'glowO' : 'dark', 0.85);
    F.rect(Math.round(w * 0.1), Math.round(h * 0.62), Math.round(w * 0.3), 3, 'gold', { bevel: 0, tone: 0.45 });
    for (let k = 0; k < 4; k++) F.line(w * 0.74, h * (0.45 + k * 0.08), w * 0.74 + 4 + r() * 6, h * (0.42 + k * 0.1), 'steel');
    return F.render();
  }
  function monolithSprite(h, seed) {
    const F = new DS.Forge(14, h), r = rng(seed);
    F.poly([[2, 3], [7, 0], [12, 3], [11, h - 1], [3, h - 1]], 'navy', { bevel: 2 });
    for (let y = 6; y < h - 4; y += 3) if (r() < 0.6) F.px(5 + (r() * 4 | 0), y, 'glowP', 0.6 + r() * 0.3);
    return F.render();
  }
  function gateSprite(seed) {
    const S = 150, F = new DS.Forge(S, S), c = S / 2, r = rng(seed);
    F.shape(0, 0, S - 1, S - 1, (a, b) => { const d = Math.hypot(a - c, b - c); return d >= 60 && d <= 70; }, 'navy', { round: 4 });
    for (let k = 0; k < 16; k++) {
      const a0 = k / 16 * Math.PI * 2;
      F.line(c + Math.cos(a0) * 58, c + Math.sin(a0) * 58, c + Math.cos(a0) * 72, c + Math.sin(a0) * 72, 'dark', { tone: 0.05, w: 2 });
      const ax = c + Math.cos(a0 + 0.2) * 65, ay = c + Math.sin(a0 + 0.2) * 65;
      F.px(ax, ay, 'glowP', 0.55 + r() * 0.35);
    }
    for (const a0 of [0.2, 1.8, 3.4, 5.0]) {
      F.shape(c + Math.cos(a0) * 70 - 9, c + Math.sin(a0) * 70 - 9, c + Math.cos(a0) * 70 + 9, c + Math.sin(a0) * 70 + 9,
        (a, b) => Math.hypot(a - (c + Math.cos(a0) * 70), b - (c + Math.sin(a0) * 70)) <= 7, 'dark', { round: 3 });
    }
    return F.render();
  }


  // ------------------------------------------------------------------ détails HD, préparés une seule fois par secteur
  // Tous les dessins restent en pixels entiers et utilisent une palette discrète.
  function traitPixel(ctx, x0, y0, x1, y1, col) {
    x0 = Math.round(x0); y0 = Math.round(y0);
    x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    ctx.fillStyle = col;
    for (;;) {
      ctx.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e = 2 * err;
      if (e > -dy) { err -= dy; x0 += sx; }
      if (e < dx) { err += dx; y0 += sy; }
    }
  }

  function soleilSprite(seed) {
    const size = 196, mid = size / 2, image = canvas(size, size);
    const ctx = image.getContext('2d');
    const frame = ctx.createImageData(size, size), d = frame.data;
    const rings = ['#6e190e', '#a42c0e', '#db4810', '#ff7620', '#ffad37', '#ffcf66', '#ffefa8', '#fffbdc'].map(hex);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const dx = x - mid, dy = y - mid, rr = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx);
      const flare = Math.sin(a * 11 + 1.7) * 3.8 + Math.cos(a * 19 - 0.5) * 2.5;
      const grain = hash3(x >> 2, y >> 2, 0, seed);
      const surface = 55 + flare * 0.65 + (grain - 0.5) * 5;
      const corona = 83 + flare * 1.7 + (grain - 0.5) * 13;
      if (rr > corona || (rr > surface && dither(x, y) > (corona - rr) / Math.max(1, corona - surface) * 0.72)) continue;
      let idx;
      if (rr < surface) {
        const q = rr / surface + (grain - 0.5) * 0.2 + (dither(x, y) - 0.5) * 0.12;
        idx = q < 0.30 ? 7 : q < 0.57 ? 6 : q < 0.78 ? 5 : 4;
      } else idx = rr < 64 ? 4 : rr < 70 ? 3 : rr < 77 ? 2 : 1;
      const o = (y * size + x) * 4, c = rings[idx];
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
    }
    ctx.putImageData(frame, 0, 0);
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2 + seed;
      const r1 = 62 + (k % 4) * 3, r2 = r1 + 15 + (k * 7 % 18);
      traitPixel(ctx, mid + Math.cos(a) * r1, mid + Math.sin(a) * r1,
        mid + Math.cos(a + 0.08) * r2, mid + Math.sin(a + 0.08) * r2, k % 3 ? '#ff8624' : '#ffe27e');
    }
    return image;
  }

  // Poser une forme sur une couche de 720 px sans casser le raccord.
  function poserRaccord(ctx, sprite, x, y, W, width, height) {
    x = Math.round(x); y = Math.round(y);
    const w = width || sprite.width, h = height || sprite.height;
    ctx.drawImage(sprite, x, y, w, h);
    if (x + w > W) ctx.drawImage(sprite, x - W, y, w, h);
    if (x < 0) ctx.drawImage(sprite, x + W, y, w, h);
  }

  function structureAbandonnee(ctx, x, y, h, seed) {
    const r = rng(seed), w = 22 + (seed % 3) * 6;
    const top = Math.round(y - h), left = Math.round(x);
    ctx.fillStyle = '#0c0921'; ctx.fillRect(left + 4, top, w - 8, h);
    ctx.fillStyle = '#1e1434';
    ctx.fillRect(left, top + 10, 5, h - 16);
    ctx.fillRect(left + w - 5, top + 4, 5, h - 10);
    ctx.fillRect(left - 6, top + 20, w + 12, 4);
    ctx.fillRect(left - 9, top + h * 0.65 | 0, w + 18, 3);
    ctx.fillStyle = '#5c356e';
    ctx.fillRect(left + 5, top + 4, 2, h - 8);
    ctx.fillRect(left + w - 8, top + 12, 1, h - 16);
    traitPixel(ctx, left + w / 2, top - 15, left + w / 2, top + 8, '#664c88');
    for (let k = 0; k < 13; k++) {
      const xx = left + 7 + (r() * (w - 13) | 0), yy = top + 8 + (r() * (h - 16) | 0);
      ctx.fillStyle = r() < 0.5 ? '#ce52ae' : '#57306f';
      ctx.fillRect(xx, yy, 1, 2);
    }
  }

  function eclairStatique(ctx, x, y, seed, col) {
    const r = rng(seed), points = [[x, y]];
    for (let i = 0; i < 8; i++) {
      const last = points[points.length - 1];
      points.push([last[0] + (r() - 0.5) * 26, last[1] + 8 + r() * 9]);
    }
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      traitPixel(ctx, a[0] + 2, a[1], b[0] + 2, b[1], '#0a5165');
      traitPixel(ctx, a[0], a[1], b[0], b[1], col);
      if (i === 4) traitPixel(ctx, b[0], b[1], b[0] + 21, b[1] + 13, col);
    }
  }

  function enrichirSecteur(far, near, type, seed) {
    const W = far.width, H = far.height;
    const f = far.getContext('2d'), n = near.getContext('2d');
    f.imageSmoothingEnabled = false; n.imageSmoothingEnabled = false;
    const r = rng(seed + 800);
    if (type === 'terra') {
      poserRaccord(f, soleilSprite(seed), 25, 5, W);
      // Ceinture d'astéroïdes embrasée et filaments solaires.
      for (let k = 0; k < 55; k++) {
        const x = 60 + r() * 540, y = 105 + (r() - 0.5) * 90, s = 1 + (r() * 4 | 0);
        f.fillStyle = r() < 0.3 ? '#ffb047' : r() < 0.6 ? '#76321e' : '#3d1920';
        f.fillRect(x | 0, y | 0, s * 2, s);
      }
      for (let k = 0; k < 10; k++) {
        const x = (260 + k * 43) % W, y = 60 + k * 13;
        traitPixel(f, x, y, x + 26, y - 5, k % 2 ? '#d65c20' : '#803019');
      }
    } else if (type === 'ice') {
      // Falaises cristallines, calées sur le plan proche pour un vrai relief.
      for (let k = 0; k < 9; k++) {
        const size = 24 + (k * 7 % 27);
        const spr = shardSprite(size, seed + 13 + k);
        const height = Math.round(size * (1.7 + (k % 3) * 0.32));
        const width = Math.round(size * 1.55);
        const x = 30 + k * 81 + (r() * 16 | 0);
        const y = H - height + 19 + (k % 3) * 11;
        poserRaccord(n, spr, x, y, W, width, height);
      }
      for (let k = 0; k < 26; k++) {
        const x = r() * W | 0, y = 48 + r() * 232 | 0;
        n.fillStyle = k % 3 ? '#7cecff' : '#e8ffff';
        n.fillRect(x, y, 1 + (k % 6 === 0 ? 2 : 0), 1);
      }
    } else if (type === 'violet') {
      for (let k = 0; k < 7; k++) {
        const x = 25 + k * 105, h = 52 + (k * 23 % 76);
        structureAbandonnee(n, x, H + 28, h, seed + k);
      }
      for (let k = 0; k < 4; k++) {
        const spr = satelliteSprite(seed + 34 + k).c;
        poserRaccord(f, spr, 90 + k * 158, 44 + (k % 3) * 56, W, 68, 40);
      }
    } else if (type === 'mars') {
      for (let k = 0; k < 4; k++) {
        const w = 76 + (k % 2) * 30, h = 31 + (k % 2) * 10;
        const spr = wreckSprite(w, h, seed + 25 + k);
        poserRaccord(f, spr, 30 + k * 177, 80 + (k % 3) * 54, W, w + 24, h + 14);
      }
      for (let k = 0; k < 34; k++) {
        const x = r() * W | 0, y = 42 + r() * (H - 78) | 0;
        n.fillStyle = k % 3 ? '#6d2013' : '#ffad3c';
        n.fillRect(x, y, 3 + (k % 3), 1);
      }
    } else if (type === 'gas') {
      for (let k = 0; k < 6; k++) {
        const x = 55 + k * 128;
        eclairStatique(f, x, 26 + (k % 2) * 25, seed + k, k % 2 ? '#a8fff2' : '#ffce5c');
      }
      for (let k = 0; k < 35; k++) {
        const x = r() * W | 0, y = 100 + r() * 180 | 0;
        n.fillStyle = k % 3 ? '#db9027' : '#4bddd7';
        n.fillRect(x, y, 2 + k % 3, 1);
      }
    } else if (type === 'dark') {
      for (let k = 0; k < 8; k++) {
        const h = 40 + (k * 17 % 56), spr = monolithSprite(h, seed + k);
        poserRaccord(n, spr, 16 + k * 96, H - h + 12, W, 22, h + 7);
      }
      for (let k = 0; k < 18; k++) {
        const x = r() * W | 0, y = 48 + r() * 230 | 0;
        n.fillStyle = k % 2 ? '#b37aff' : '#7648a8';
        n.fillRect(x, y, 1, 2);
      }
    }
  }

  function buildBackground(sector) {
    const info = DS.sector(sector);
    const theme = THEMES[info.planet] || THEMES.terra;
    const W = 720, H = 320, seed = 11 + sector * 7;
    // ciel profond
    const deep = canvas(W, H), dctx = deep.getContext('2d');
    const img = dctx.createImageData(W, H), D = img.data;
    const s0 = hex(theme.sky[0]), s1 = hex(theme.sky[1]);
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
    const far = cloudLayer(W, H, theme.far, seed + 1, Object.assign({}, FAR, theme.farO));
    const near = cloudLayer(W, H, theme.near, seed + 2, Object.assign({}, NEAR, theme.nearO));
    enrichirSecteur(far, near, info.planet, seed);
    // étoiles vives (dessinées à chaque image pour scintiller)
    const stars = [];
    for (let k = 0; k < 115; k++) stars.push({ x: r() * W, y: r() * H, s: r() < 0.11 ? 2 : r() < 0.4 ? 1 : 0, p: r() * 6.28,
      c: info.planet === 'terra' || info.planet === 'mars' ? (r() < 0.6 ? '#ffe1a0' : '#a2cfff') : (r() < 0.15 ? '#ffe6a8' : r() < 0.3 ? '#ffc4f0' : '#dff0ff'), v: 0.5 + r() * 0.5 });
    // planète et lune
    const pr = 92;
    const planet = canvas(pr * 4, pr * 3);
    DS.drawPlanet(planet.getContext('2d'), pr * 2, pr * 1.5, pr, info.planet, 3 + sector * 5, { ring: info.planet === 'gas' });
    const moon = canvas(28, 28);
    DS.drawPlanet(moon.getContext('2d'), 14, 14, 11, ['ice', 'mars', 'violet', 'terra'][sector % 4] === info.planet ? 'ice' : ['ice', 'mars', 'violet', 'terra'][sector % 4], seed + 4, {});
    // objets du secteur
    const objects = [];
    for (const kind of theme.objects) {
      if (kind === 'shards') for (let k = 0; k < 4; k++) objects.push({ c: shardSprite(14 + k * 7, seed + k), glint: true });
      if (kind === 'satellites') for (let k = 0; k < 2; k++) { const s = satelliteSprite(seed + k); objects.push({ c: s.c, light: s.light, slow: true }); }
      if (kind === 'wrecks') { objects.push({ c: wreckSprite(64, 26, seed), slow: true }); objects.push({ c: wreckSprite(46, 20, seed + 1), slow: true }); }
      if (kind === 'monoliths') for (let k = 0; k < 3; k++) objects.push({ c: monolithSprite(24 + k * 8, seed + k), slow: true });
    }
    const gate = theme.special === 'gate' ? gateSprite(seed) : null;
    return { W, H, deep, far, near, stars, planet, pr, moon, objects, gate,
      type: info.planet, special: theme.special || null, kinds: theme.objects };
  }
  // ------------------------------------------------------------------ scène principale
  const RW = DS.SHIP_ROOM.w, RH = DS.SHIP_ROOM.h;
  class Scene {
    constructor(cv) {
      this.cv = cv;
      this.ctx = cv.getContext('2d');
      this.W = 440; this.H = 200;
      cv.width = this.W; cv.height = this.H;
      this.t = 0;
      this.parts = [];
      this.rings = [];
      this.probes = [];
      this.ship = null; this.shipKey = '';
      this.bg = null; this.bgKey = '';
      this.walkers = [];
      this.reduced = false;
      this.state = null;
      this.rockSprites = { mid: [], front: [] };
      this.mids = [];
      this.fronts = [];
      this.flash = 0; this.nextFlash = 3; this.bolt = null;
      this.lastExps = 0;
      const r = rng(5);
      this.dust = Array.from({ length: 26 }, () => ({ x: r() * 760, y: r() * 320, v: 70 + r() * 90, l: 2 + (r() * 6 | 0) }));
    }
    sprites() {
      if (this.rockSprites.mid.length) return;
      for (let k = 0; k < 6; k++) this.rockSprites.mid.push(asteroid(7 + k * 3, 100 + k, 'rock'));
      for (let k = 0; k < 3; k++) this.rockSprites.front.push(asteroid(26 + k * 10, 200 + k, 'rockDark'));
    }
    resetObjects() {
      const r = rng(77);
      this.mids = Array.from({ length: 9 }, () => this.spawn(r, 'mid', true));
      this.fronts = Array.from({ length: 2 }, () => this.spawn(r, 'front', true));
    }
    spawn(r, layer, init) {
      const front = layer === 'front';
      let spr, extra = {};
      const objs = this.bg && this.bg.objects;
      if (!front && objs && objs.length && r() < (this.bg.kinds[0] === 'rocks' ? 0 : 0.55)) {
        const o = objs[(r() * objs.length) | 0];
        spr = o.c; extra = { light: o.light, glint: o.glint, slow: o.slow };
      } else {
        const list = this.rockSprites[layer];
        spr = list[(r() * list.length) | 0];
      }
      return Object.assign({
        spr, layer,
        x: init ? r() * (this.W + 200) : this.W + 10 + r() * (front ? 600 : 140),
        y: front ? (r() < 0.5 ? -spr.height * 0.3 + r() * 20 : this.H - spr.height * 0.7 - r() * 18) : 4 + r() * (this.H - 8 - spr.height),
        v: front ? 55 + r() * 30 : (extra.slow ? 8 + r() * 8 : 14 + r() * 22),
        p: r() * 6.28
      }, extra);
    }
    setState(s) {
      this.state = s;
      this.sprites();
      const spec = DS.shipSpec(s);
      const fx = { drones: spec.drones, shield: spec.shield };
      delete spec.drones; delete spec.shield;
      const key = DS.shipKey(spec);
      const now = Date.now();
      if (key !== this.shipKey && (!this.ship || now - (this.builtAt || 0) > 1000)) {
        this.shipKey = key;
        this.builtAt = now;
        this.ship = DS.buildShip(spec);
        const W = Math.max(440, Math.min(840, this.ship.W + 150));
        const H = Math.max(Math.round(W * 0.44), this.ship.H + 44);
        if (W !== this.W || H !== this.H) {
          this.W = W; this.H = H;
          this.cv.width = W; this.cv.height = H;
          this.resetObjects();
        }
        this.walkers = [];
      }
      Object.assign(this.ship.fx, fx);
      if (String(s.sector) !== this.bgKey) { this.bgKey = String(s.sector); this.bg = buildBackground(s.sector); this.resetObjects(); }
      const lit = this.ship.rooms.filter(rm => rm.id !== 'empty');
      const want = lit.length ? Math.min(s.crew.total, lit.length * 2) : 0;
      while (this.walkers.length < want) {
        const room = lit[this.walkers.length % lit.length];
        this.walkers.push({ room, x: 4 + Math.random() * (RW - 10), dir: Math.random() < 0.5 ? -1 : 1, pause: 0, suit: ['#ff9a2e', '#e8f0ff', '#5fd0ff', '#ffd23a', '#7fe35a'][this.walkers.length % 5] });
      }
      if (this.walkers.length > want) this.walkers.length = want;
      // sondes qui décollent des hangars
      if (s.exps.length > this.lastExps && this.ship.fx.hangars.length) {
        const h = this.ship.fx.hangars[(s.exps.length - 1) % this.ship.fx.hangars.length];
        this.probes.push({ x: h.x, y: h.y, life: 0 });
      }
      this.lastExps = s.exps.length;
    }
    origin() {
      return { x: Math.round((this.W - this.ship.W) / 2) + 8, y: Math.max(2, Math.round((this.H - 26 - this.ship.H) / 2) + 2) };
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
      const x0 = -Math.round(off);
      // Répéter aussi une troisième fois si un grand vaisseau élargit la scène.
      for (let x = x0; x < this.W; x += bg.W) ctx.drawImage(img, x, yOff);
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
      if (bg.gate) {
        const gx0 = Math.round(W * 0.68 - 75 - (still ? 0 : Math.sin(t * 0.15) * 2));
        const gy0 = Math.round(H * 0.5 - 75);
        const gx = gx0 + 75, gy = gy0 + 75;
        // Vide central puis anneau antique lumineux, sans dessiner hors pixels.
        ctx.fillStyle = '#050313';
        for (let y = -58; y <= 58; y++) {
          const dx = Math.floor(Math.sqrt(58 * 58 - y * y));
          ctx.fillRect(gx - dx, gy + y, dx * 2 + 1, 1);
        }
        ctx.drawImage(bg.gate, gx0, gy0);
        const pulse = still ? 0.4 : 0.45 + 0.35 * Math.sin(t * 0.8);
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#ad83ff';
        for (let k = 0; k < 22; k++) {
          const a = k * Math.PI / 11 + (still ? 0 : t * 0.04);
          ctx.fillRect(Math.round(gx + Math.cos(a) * 59), Math.round(gy + Math.sin(a) * 59), 2, 2);
        }
        ctx.globalAlpha = 1;
      }
      if (bg.special === 'lightning' && !still) {
        this.nextFlash -= dt;
        if (this.nextFlash <= 0) {
          this.nextFlash = 2.5 + Math.random() * 5;
          this.flash = 0.22;
          const x0 = 40 + Math.random() * (W * 0.55), y0 = 6 + Math.random() * 30;
          const pts = [[x0, y0]];
          for (let k = 0; k < 9; k++) { const [px0, py0] = pts[pts.length - 1]; pts.push([px0 + (Math.random() - 0.5) * 14, py0 + 5 + Math.random() * 7]); }
          this.bolt = pts;
        }
      }
      if (this.flash > 0) {
        this.flash -= dt;
        ctx.fillStyle = 'rgba(255,240,200,' + (0.1 * this.flash / 0.22).toFixed(3) + ')';
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = this.flash > 0.11 ? '#ffffff' : '#9fe8ff'; ctx.lineWidth = 1;
        ctx.beginPath(); this.bolt.forEach(([x, y], i) => (i ? ctx.lineTo(Math.round(x) + 0.5, Math.round(y) + 0.5) : ctx.moveTo(Math.round(x) + 0.5, Math.round(y) + 0.5))); ctx.stroke();
      }
      const pl = bg.planet;
      ctx.drawImage(pl, bg.type === 'dark' ? -Math.round(bg.pr * 2.9) : Math.round(W - bg.pr * 2.55),
        bg.type === 'dark' ? -Math.round(bg.pr * 1.4) : Math.round(-bg.pr * 0.95));
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
      // objets de second plan
      const move = still ? 0 : dt;
      for (let i = 0; i < this.mids.length; i++) {
        const a = this.mids[i];
        a.x -= a.v * move;
        if (a.x < -a.spr.width - 4) { this.mids[i] = this.spawn(Math.random, 'mid', false); continue; }
        const X = Math.round(a.x), Y = Math.round(a.y);
        ctx.drawImage(a.spr, X, Y);
        if (a.light && (still || Math.sin(t * 3 + a.p) > 0.4)) { ctx.fillStyle = '#ff4d5e'; ctx.fillRect(X + a.light.x, Y + a.light.y - 1, 1, 1); }
        if (a.glint && !still && Math.sin(t * 2.3 + a.p) > 0.93) { ctx.fillStyle = '#ffffff'; const gx = X + (a.spr.width >> 1), gy = Y + (a.spr.height >> 2); ctx.fillRect(gx - 1, gy, 3, 1); ctx.fillRect(gx, gy - 1, 1, 3); }
      }
      // vaisseau
      const sh = this.ship, o = this.origin();
      const bob = still ? 0 : Math.round(Math.sin(t * 1.2) * 1.4);
      const oy = o.y + bob;
      DS.drawShipFX(ctx, sh, o.x, oy, t, s, still, false);
      const power = s._c ? Math.min(1, s._c.ratio.energy) : 1;
      for (const e of sh.engines) {
        const len = (still ? 26 : 24 + Math.sin(t * 21 + e.y) * 3 + Math.random() * 4) * (0.45 + 0.55 * power) * (e.hot ? 1.35 : 1);
        for (let i = 0; i < len; i++) {
          const k = i / len;
          const hh = Math.max(1, Math.round(e.h * (1 - k) * 0.85 + 1));
          const y0 = oy + e.y - (hh >> 1);
          ctx.globalAlpha = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
          ctx.fillStyle = e.hot ? (k < 0.15 ? '#ffffff' : k < 0.35 ? '#fff3a0' : k < 0.6 ? '#ffd23a' : '#ff8a1f') : (k < 0.12 ? '#ffffff' : k < 0.3 ? '#c4f2ff' : k < 0.55 ? '#5fc8ff' : '#2a6ee8');
          ctx.fillRect(o.x + e.x - 1 - i, y0, 1, hh);
          if (k < 0.4 && hh > 4) { ctx.fillStyle = '#ffffff'; ctx.fillRect(o.x + e.x - 1 - i, y0 + (hh >> 1) - 1, 1, 2); }
        }
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = e.hot ? '#ffd23a' : '#5fc8ff';
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
        px(ctx, X, Y - 9, 3, 3, '#eef3fa'); px(ctx, X + 1, Y - 8, 2, 1, '#2fa2f0');
        px(ctx, X, Y - 6, 3, 4, w.suit); px(ctx, X, Y - 6, 1, 4, 'rgba(255,255,255,.35)');
        px(ctx, X, Y - 2, 1, 2, '#1a1f2b'); px(ctx, X + 2, Y - 2 + (step ? -1 : 0), 1, 2 + (step ? 1 : 0), '#1a1f2b');
      }
      // feux
      for (const l of sh.lights) {
        const on = l.steady || still || Math.sin(t * 2.2 + l.p) > -0.2;
        if (!on) continue;
        ctx.fillStyle = l.c; ctx.fillRect(o.x + l.x, oy + l.y, 1, 1);
        if (Math.sin(t * 2.2 + l.p) > 0.7 || l.steady) { ctx.globalAlpha = 0.35; ctx.fillRect(o.x + l.x - 1, oy + l.y, 3, 1); ctx.fillRect(o.x + l.x, oy + l.y - 1, 1, 3); ctx.globalAlpha = 1; }
      }
      for (const f of sh.flick) if (still || Math.sin(t * 9 + f.x) > 0.3) px(ctx, o.x + f.x, oy + f.y, 1, 1, '#ff3b4a');
      DS.drawShipFX(ctx, sh, o.x, oy, t, s, still, true);
      // sondes d'expédition
      this.probes = this.probes.filter(p => {
        p.life += dt;
        const k = p.life;
        const x = o.x + p.x + k * k * 60 + k * 10, y = oy + p.y + k * 18 - k * k * 6;
        px(ctx, x - 2, y, 4, 2, '#c8d3e2'); px(ctx, x - 4, y, 2, 2, '#46d8ff');
        return x < W + 10 && k < 6;
      });
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
