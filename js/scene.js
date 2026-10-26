/* Dernier Signal — rendu pixel-art sur canvas : vaisseau, planètes, Spécimen. */
'use strict';
(function (DS) {
  // ------------------------------------------------------------------ outils
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
  const dither = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const rgb = c => 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')';
  const mixHex = (a, b, t) => rgb(mix(hex(a), hex(b), t));

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

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }
  function px(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }

  // ------------------------------------------------------------------ planètes
  const PLANETS = {
    terra:  { tones: ['#0d2a66', '#1d4fa8', '#2f7fd8', '#3fae55', '#2c7d3c', '#e8f4ff'], rim: '#7fc8ff' },
    ice:    { tones: ['#1c4a78', '#4a90c0', '#8fd0f0', '#d6f4ff', '#ffffff', '#ffffff'], rim: '#bff0ff' },
    violet: { tones: ['#1e0f40', '#4a2690', '#8a4fe0', '#c08bff', '#ffb3f0', '#ffffff'], rim: '#d6a6ff' },
    mars:   { tones: ['#3a120c', '#8a2a18', '#d0502a', '#ff8a5a', '#ffc08a', '#ffe0c0'], rim: '#ffb08a' },
    gas:    { tones: ['#4a2a12', '#b06a3a', '#d8a060', '#f0d8a0', '#fff0c8', '#ffffff'], rim: '#ffe0a0' },
    dark:   { tones: ['#0c0718', '#20143a', '#3a2560', '#5a3a8a', '#ff6fd8', '#ffd6f5'], rim: '#a070ff' }
  };
  DS.drawPlanet = function (ctx, cx, cy, r, type, seed, opts) {
    opts = opts || {};
    const P = PLANETS[type] || PLANETS.terra;
    const tones = P.tones.map(hex);
    const L = [-0.62, -0.5, 0.6];
    const rot = opts.rot || 0;
    const img = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const d = img.data, W = ctx.canvas.width, H = ctx.canvas.height;
    const rim = hex(P.rim);
    for (let y = Math.max(0, Math.floor(cy - r - 2)); y < Math.min(H, Math.ceil(cy + r + 2)); y++) {
      for (let x = Math.max(0, Math.floor(cx - r - 2)); x < Math.min(W, Math.ceil(cx + r + 2)); x++) {
        const nx = (x + 0.5 - cx) / r, ny = (y + 0.5 - cy) / r, d2 = nx * nx + ny * ny;
        const i = (y * W + x) * 4;
        if (d2 > 1) {
          if (d2 < 1.06 && !opts.noAtmo) {
            const a = (1.06 - d2) / 0.06 * 0.55 * Math.max(0, -nx * 0.6 - ny * 0.5 + 0.5);
            if (a > dither(x, y) * 0.9) { d[i] = rim[0]; d[i + 1] = rim[1]; d[i + 2] = rim[2]; d[i + 3] = 255; }
          }
          continue;
        }
        const nz = Math.sqrt(1 - d2);
        const lam = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
        // coordonnées sur la sphère (avec rotation)
        const ca = Math.cos(rot), sa = Math.sin(rot);
        const sx = nx * ca + nz * sa, sz = -nx * sa + nz * ca;
        let t;
        if (type === 'gas') {
          t = 0.5 + 0.5 * Math.sin(ny * 9 + fbm(sx * 2, ny * 2, sz * 2, seed) * 4);
        } else if (type === 'terra') {
          const n = fbm(sx * 1.8 + 3, ny * 1.8, sz * 1.8, seed);
          const cl = fbm(sx * 3, ny * 5, sz * 3, seed + 50);
          t = n > 0.53 ? (n > 0.6 ? 0.62 : 0.72) : n * 0.9;
          if (cl > 0.62) t = 1;
        } else if (type === 'dark') {
          const n = fbm(sx * 3, ny * 3, sz * 3, seed);
          t = Math.abs(n - 0.5) < 0.025 ? 0.8 : n * 0.75;
        } else {
          t = fbm(sx * 2.2, ny * 2.2, sz * 2.2, seed);
        }
        let idx;
        if (type === 'terra') {
          idx = t >= 1 ? 5 : t > 0.7 ? 4 : t > 0.6 ? 3 : t > 0.4 ? 2 : t > 0.3 ? 1 : 1;
          if (t >= 0.6 && t < 1) idx = t > 0.7 ? 4 : 3;
        } else if (type === 'dark') {
          idx = t >= 0.8 ? 4 : t > 0.45 ? 3 : t > 0.3 ? 2 : 1;
        } else {
          idx = Math.min(4, Math.max(1, Math.floor(t * 5.2)));
        }
        let c = tones[idx];
        // ombrage par paliers tramés
        const shade = lam + (dither(x, y) - 0.5) * 0.22;
        let k = shade > 0.55 ? 1 : shade > 0.3 ? 0.78 : shade > 0.12 ? 0.52 : 0.28;
        if (type === 'dark' && idx === 4) k = Math.max(k, 0.85);
        c = mix(tones[0], c, k);
        if (shade > 0.92 && idx < 5) c = mix(c, [255, 255, 255], 0.25);
        const edge = 1 - nz;
        if (edge > 0.82 && lam > 0.1) c = mix(c, rim, 0.45);
        d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    if (opts.ring) {
      ctx.save();
      for (let a = 0; a < Math.PI * 2; a += 0.01) {
        const rx = Math.cos(a) * r * 1.7, ry = Math.sin(a) * r * 0.35;
        const front = Math.sin(a) > 0;
        const x = Math.round(cx + rx * 0.94 - ry * 0.3), y = Math.round(cy + ry + rx * 0.18);
        if (!front && Math.hypot(x - cx, y - cy) < r) continue;
        ctx.fillStyle = (Math.floor(a * 30) % 3) ? 'rgba(255,230,190,.65)' : 'rgba(200,160,120,.5)';
        ctx.fillRect(x, y, 1, 1);
      }
      ctx.restore();
    }
  };

  DS.planetURL = (function () {
    const cache = {};
    return function (type, size, seed) {
      const key = type + size + ':' + seed;
      if (cache[key]) return cache[key];
      if (typeof document === 'undefined') return '';
      const c = canvas(size, size);
      DS.drawPlanet(c.getContext('2d'), size / 2, size / 2, size / 2 - 2, type, seed || 3, { ring: type === 'gas' });
      return (cache[key] = c.toDataURL());
    };
  })();

  // ------------------------------------------------------------------ salles du vaisseau
  const ROOMS = {
    solar:      { light: '#ffcf5a', dark: '#4a2e0c', kind: 'core' },
    drone:      { light: '#ff9c3a', dark: '#40200c', kind: 'drone' },
    ice:        { light: '#5fd0ff', dark: '#0c2c4a', kind: 'crystal' },
    oxygen:     { light: '#4aa8ff', dark: '#0c2250', kind: 'tank' },
    greenhouse: { light: '#7be05a', dark: '#113614', kind: 'plants' },
    battery:    { light: '#ffe14a', dark: '#36300c', kind: 'cells' },
    lab:        { light: '#6fe0ff', dark: '#0c2a42', kind: 'lab' },
    extractor:  { light: '#ff8a3a', dark: '#441a0a', kind: 'press' },
    foundry:    { light: '#ff6a2a', dark: '#44120a', kind: 'furnace' },
    cryo:       { light: '#7ff0ff', dark: '#0c3640', kind: 'pods' },
    nanites:    { light: '#c77dff', dark: '#260e44', kind: 'swarm' },
    array:      { light: '#5ab0ff', dark: '#0c1e44', kind: 'screens' },
    fusion:     { light: '#fff2b0', dark: '#40321a', kind: 'ring' },
    harvester:  { light: '#ffb03a', dark: '#42260a', kind: 'claw' },
    biodome:    { light: '#9cf06a', dark: '#143810', kind: 'tree' },
    quantum:    { light: '#d08bff', dark: '#2a0e4a', kind: 'cube' },
    plasma:     { light: '#ff6fd8', dark: '#440e38', kind: 'column' },
    empty:      { light: '#3a4356', dark: '#0a0d14', kind: 'empty' }
  };
  DS.ROOMS = ROOMS;

  // Dessine l'intérieur d'une salle (w×h) à l'origine (x, y).
  function drawRoom(ctx, x, y, w, h, roomId, seed) {
    const R = ROOMS[roomId] || ROOMS.empty;
    const lit = roomId !== 'empty';
    const top = lit ? mixHex(R.dark, R.light, 0.42) : '#141924';
    // fond en dégradé tramé
    const b1 = Math.round(h * 0.34), b2 = Math.round(h * 0.68), mid = mixHex(top, R.dark, 0.5);
    px(ctx, x, y, w, b1, top);
    px(ctx, x, y + b1, w, b2 - b1, mid);
    px(ctx, x, y + b2, w, h - b2, R.dark);
    for (let i = 0; i < w; i += 2) { px(ctx, x + i, y + b1, 1, 1, top); px(ctx, x + i + 1, y + b2, 1, 1, mid); }
    const r = rng(seed || 1);
    const fl = y + h - 3;
    // sol
    px(ctx, x, fl, w, 3, lit ? mixHex(R.dark, '#000000', 0.35) : '#0a0c12');
    px(ctx, x, fl, w, 1, lit ? mixHex(R.dark, R.light, 0.25) : '#1c2230');
    if (lit) {
      // plafonnier
      px(ctx, x + 3, y, w - 6, 1, R.light);
      ctx.globalAlpha = 0.35; px(ctx, x + 2, y + 1, w - 4, 1, R.light); ctx.globalAlpha = 1;
    }
    const cx = x + (w >> 1), L = R.light, D = mixHex(R.dark, '#000000', 0.2);
    switch (R.kind) {
      case 'core': {
        px(ctx, x + 1, y + 10, w - 2, 2, '#3a3f4c'); px(ctx, x + 1, y + 10, w - 2, 1, '#596274');
        for (let j = -6; j <= 6; j++) for (let i = -6; i <= 6; i++) {
          const dd = Math.hypot(i, j);
          if (dd <= 6) { ctx.fillStyle = dd < 2.5 ? '#ffffff' : dd < 4.2 ? '#fff1b0' : L; ctx.fillRect(cx + i, y + 11 + j, 1, 1); }
        }
        px(ctx, cx - 7, fl - 2, 15, 2, '#2a2f3a');
        break;
      }
      case 'drone': {
        for (let k = 0; k < 2; k++) {
          const dx = x + 5 + k * 13, dy = y + 5 + k * 3;
          px(ctx, dx, dy, 7, 3, '#4a5160'); px(ctx, dx, dy, 7, 1, '#7a8394');
          px(ctx, dx + 1, dy + 3, 1, 2, '#2a2f3a'); px(ctx, dx + 5, dy + 3, 1, 2, '#2a2f3a');
          px(ctx, dx + 3, dy + 1, 1, 1, L); px(ctx, dx - 1, dy - 1, 3, 1, '#9aa3b4'); px(ctx, dx + 5, dy - 1, 3, 1, '#9aa3b4');
        }
        for (let k = 0; k < 3; k++) { const bx = x + 3 + k * 8 + (r() * 2 | 0); px(ctx, bx, fl - 4, 5, 4, '#8a5a2b'); px(ctx, bx, fl - 4, 5, 1, '#c08040'); px(ctx, bx + 2, fl - 3, 1, 2, '#5c3a1f'); }
        break;
      }
      case 'crystal': {
        px(ctx, cx - 1, y + 1, 2, 8, '#596274'); px(ctx, cx - 3, y + 8, 6, 2, '#8a93a4'); px(ctx, cx - 1, y + 10, 2, 2, '#c0c8d8');
        for (let k = 0; k < 5; k++) {
          const bx = x + 2 + k * 5 + (r() * 2 | 0), hh = 3 + (r() * 6 | 0);
          px(ctx, bx, fl - hh, 2, hh, L); px(ctx, bx + 2, fl - hh + 1, 1, hh - 1, mixHex(L, '#000000', 0.3)); px(ctx, bx, fl - hh, 1, 1, '#ffffff');
        }
        break;
      }
      case 'tank': {
        for (let k = 0; k < 3; k++) {
          const bx = x + 4 + k * 8;
          px(ctx, bx, y + 5, 6, fl - y - 5, '#2a3446'); px(ctx, bx + 1, y + 6, 4, fl - y - 7, L);
          px(ctx, bx + 1, y + 6, 1, fl - y - 7, '#ffffff'); px(ctx, bx + 1, y + 6 + ((fl - y) >> 1), 4, 1, mixHex(L, '#000000', 0.35));
          px(ctx, bx + 2, y + 3, 2, 2, '#596274');
        }
        px(ctx, x + 2, y + 3, w - 4, 1, '#596274');
        break;
      }
      case 'plants': {
        ctx.globalAlpha = 0.5; px(ctx, x + 2, y + 1, w - 4, 1, '#ff8ad8'); ctx.globalAlpha = 1;
        for (let row = 0; row < 2; row++) {
          const by = row ? fl - 1 : y + 11;
          px(ctx, x + 2, by, w - 4, 1, '#6a4020');
          for (let k = 0; k < 6; k++) {
            const bx = x + 3 + k * 4 + (r() * 2 | 0), hh = 3 + (r() * 3 | 0);
            px(ctx, bx, by - hh, 3, hh, '#3ec04a'); px(ctx, bx, by - hh, 2, 1, '#a8f080'); px(ctx, bx + 1, by - hh + 1, 1, hh - 1, '#2f8a3a');
            if (r() < 0.5) px(ctx, bx + 2, by - hh + 1, 1, 1, r() < 0.5 ? '#ff4d5e' : '#ffd23a');
          }
        }
        break;
      }
      case 'cells': {
        for (let k = 0; k < 4; k++) {
          const bx = x + 3 + k * 7;
          px(ctx, bx, y + 6, 5, fl - y - 6, '#2a2f3a'); px(ctx, bx, y + 6, 5, 1, '#596274');
          const lvl = 3 + (r() * 6 | 0);
          px(ctx, bx + 1, fl - lvl - 1, 3, lvl, L);
          px(ctx, bx + 2, y + 4, 1, 2, '#8a93a4');
        }
        break;
      }
      case 'lab': {
        px(ctx, x + 2, fl - 6, w - 4, 2, '#596274'); px(ctx, x + 3, fl - 4, 1, 4, '#3a3f4c'); px(ctx, x + w - 4, fl - 4, 1, 4, '#3a3f4c');
        for (let k = 0; k < 2; k++) {
          const bx = x + 4 + k * 12;
          px(ctx, bx, y + 4, 9, 7, '#1a2233'); px(ctx, bx + 1, y + 5, 7, 5, L);
          px(ctx, bx + 2, y + 6, 4, 1, '#ffffff'); px(ctx, bx + 2, y + 8, 3, 1, mixHex(L, '#000000', 0.4));
          px(ctx, bx + 4, y + 11, 1, 2, '#3a3f4c');
        }
        px(ctx, x + w - 8, fl - 9, 3, 3, '#ff6fd8'); px(ctx, x + w - 7, fl - 11, 1, 2, '#d6f7ff');
        break;
      }
      case 'press': {
        px(ctx, cx - 6, y + 1, 12, 4, '#4a5160'); px(ctx, cx - 6, y + 1, 12, 1, '#7a8394');
        px(ctx, cx - 2, y + 5, 4, 7, '#9aa3b4'); px(ctx, cx - 2, y + 5, 1, 7, '#d0d8e8');
        px(ctx, cx - 4, y + 12, 8, 2, '#596274');
        px(ctx, cx - 7, fl - 3, 14, 3, '#5c3a1f'); px(ctx, cx - 5, fl - 4, 10, 1, L);
        px(ctx, cx + 4, fl - 6, 1, 1, '#ffe14a'); px(ctx, cx - 5, fl - 7, 1, 1, '#ffe14a');
        break;
      }
      case 'furnace': {
        px(ctx, x + 3, y + 4, 14, fl - y - 4, '#3a2f2f'); px(ctx, x + 3, y + 4, 14, 1, '#5a4a4a');
        px(ctx, x + 6, y + 9, 8, 6, '#ff3b1a'); px(ctx, x + 7, y + 10, 6, 4, '#ffb347'); px(ctx, x + 8, y + 11, 4, 2, '#fff1b0');
        px(ctx, x + 20, fl - 5, 7, 5, '#4a3a3a'); px(ctx, x + 21, fl - 6, 5, 1, '#ff8a3a');
        break;
      }
      case 'pods': {
        for (let k = 0; k < 3; k++) {
          const bx = x + 3 + k * 9;
          px(ctx, bx, y + 4, 7, fl - y - 4, '#2a3446'); px(ctx, bx + 1, y + 5, 5, fl - y - 6, L);
          px(ctx, bx + 1, y + 5, 1, fl - y - 6, '#ffffff');
          px(ctx, bx + 3, y + 8, 2, 2, '#f5c391'); px(ctx, bx + 2, y + 10, 4, 6, mixHex(L, '#000000', 0.45));
        }
        break;
      }
      case 'swarm': {
        for (let k = 0; k < 26; k++) {
          const bx = x + 2 + (r() * (w - 4) | 0), by = y + 3 + (r() * (h - 7) | 0);
          px(ctx, bx, by, 1, 1, r() < 0.3 ? '#ffffff' : L);
        }
        px(ctx, cx - 3, fl - 3, 6, 3, '#4a3a60');
        break;
      }
      case 'screens': {
        for (let j = 0; j < 2; j++) for (let k = 0; k < 3; k++) {
          const bx = x + 2 + k * 9, by = y + 3 + j * 7;
          px(ctx, bx, by, 8, 6, '#141c2c'); px(ctx, bx + 1, by + 1, 6, 4, (j + k) % 2 ? L : mixHex(L, '#7fffd0', 0.4));
          px(ctx, bx + 2, by + 2, (r() * 4 | 0) + 1, 1, '#ffffff');
        }
        px(ctx, x + 6, fl - 3, w - 12, 3, '#2a3446');
        break;
      }
      case 'ring': {
        for (let j = -8; j <= 8; j++) for (let i = -8; i <= 8; i++) {
          const dd = Math.hypot(i, j * 1.15);
          if (dd > 5.5 && dd < 8) { ctx.fillStyle = dd < 6.6 ? '#ffffff' : L; ctx.fillRect(cx + i, y + 10 + j, 1, 1); }
          else if (dd < 2.2) { ctx.fillStyle = '#ffffff'; ctx.fillRect(cx + i, y + 10 + j, 1, 1); }
        }
        break;
      }
      case 'claw': {
        px(ctx, cx - 1, y + 1, 2, 7, '#596274'); px(ctx, cx - 4, y + 8, 8, 2, '#8a93a4');
        px(ctx, cx - 5, y + 10, 2, 4, '#8a93a4'); px(ctx, cx + 3, y + 10, 2, 4, '#8a93a4');
        px(ctx, cx - 3, y + 11, 6, 5, '#6b7587'); px(ctx, cx - 2, y + 12, 3, 2, L);
        px(ctx, x + 2, fl - 3, 6, 3, '#5c3a1f'); px(ctx, x + w - 8, fl - 4, 6, 4, '#4a5160');
        break;
      }
      case 'tree': {
        for (let i = -12; i <= 12; i++) { const yy = Math.round(Math.sqrt(Math.max(0, 144 - i * i)) * 0.9); px(ctx, cx + i, fl - yy, 1, 1, '#bff0ff'); }
        px(ctx, cx - 1, fl - 9, 2, 9, '#8a5a2b');
        for (let k = 0; k < 40; k++) {
          const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * 6;
          px(ctx, cx + Math.cos(a) * rr * 1.3, fl - 12 + Math.sin(a) * rr, 1, 1, r() < 0.3 ? '#c8ff96' : r() < 0.5 ? '#3ec04a' : L);
        }
        break;
      }
      case 'cube': {
        const by = y + 6;
        px(ctx, cx - 4, by, 8, 8, '#8b43e3'); px(ctx, cx - 4, by, 8, 3, L); px(ctx, cx, by + 3, 4, 5, '#5a20a3');
        px(ctx, cx - 4, by, 1, 8, '#f3cbff');
        ctx.globalAlpha = 0.4; px(ctx, cx - 6, by - 2, 12, 12, L); ctx.globalAlpha = 1;
        px(ctx, cx - 5, fl - 2, 10, 2, '#4a3a60');
        break;
      }
      case 'column': {
        px(ctx, cx - 4, y + 1, 8, 3, '#596274'); px(ctx, cx - 4, fl - 3, 8, 3, '#596274');
        px(ctx, cx - 2, y + 4, 4, fl - y - 7, L); px(ctx, cx - 1, y + 4, 2, fl - y - 7, '#ffffff');
        ctx.globalAlpha = 0.35; px(ctx, cx - 4, y + 4, 8, fl - y - 7, L); ctx.globalAlpha = 1;
        break;
      }
      default: {
        ctx.globalAlpha = 0.25;
        for (let i = 0; i < w; i += 5) px(ctx, x + i, y + 1, 1, h - 4, '#2a3446');
        ctx.globalAlpha = 1;
        px(ctx, x + 3 + (r() * 10 | 0), fl - 2, 4, 2, '#2a2f3a');
        px(ctx, x + w - 4, y + 2, 1, 1, '#ff3b4a');
      }
    }
  }
  DS.drawRoom = drawRoom;

  DS.roomURL = (function () {
    const cache = {};
    return function (roomId) {
      if (cache[roomId]) return cache[roomId];
      if (typeof document === 'undefined') return '';
      const c = canvas(34, 26);
      const ctx = c.getContext('2d');
      px(ctx, 0, 0, 34, 26, '#1a1f2b');
      px(ctx, 0, 0, 34, 1, '#4b5568');
      drawRoom(ctx, 2, 2, 30, 22, roomId, 7);
      px(ctx, 0, 0, 1, 1, '#ff9a2e'); px(ctx, 33, 0, 1, 1, '#ff9a2e'); px(ctx, 0, 25, 1, 1, '#ff9a2e'); px(ctx, 33, 25, 1, 1, '#ff9a2e');
      return (cache[roomId] = c.toDataURL());
    };
  })();

  // ------------------------------------------------------------------ vaisseau
  const RW = 30, RH = 22, WALL = 3;
  function buildShip(rooms, solarPanels, hasDish) {
    const n = Math.max(6, rooms.length + (rooms.length % 2));
    const cols = n / 2;
    const bodyW = cols * (RW + WALL) + WALL, bodyH = 2 * (RH + WALL) + WALL;
    const bx = 30, by = 34;
    const W = bx + bodyW + 40, H = by + bodyH + 30;
    const c = canvas(W, H);
    const ctx = c.getContext('2d');
    const r = rng(rooms.length * 13 + 5);
    const HULL = '#2b3242', HULL_HI = '#4b5568', HULL_LO = '#1a1f2b', SEAM = '#222835';

    // moteurs
    px(ctx, 12, by + 4, bx - 10, bodyH - 8, '#262c38'); px(ctx, 12, by + 4, bx - 10, 1, HULL_HI);
    const engines = [];
    for (let k = 0; k < 3; k++) {
      const ey = by + 7 + k * 15;
      px(ctx, 4, ey, 14, 11, '#3a4152'); px(ctx, 4, ey, 14, 1, '#6b7587'); px(ctx, 4, ey + 10, 14, 1, '#14181f');
      px(ctx, 2, ey + 1, 3, 9, '#1a1f2b'); px(ctx, 2, ey + 3, 2, 5, '#7fd8ff');
      px(ctx, 10, ey + 3, 6, 1, '#ff9a2e');
      engines.push({ x: 2, y: ey + 5 });
    }
    // superstructure
    const deckX = bx + 6, deckW = bodyW - 14;
    px(ctx, deckX, by - 8, deckW, 8, '#323a4c'); px(ctx, deckX, by - 8, deckW, 1, '#5a6478');
    const lights = [];
    let tx = deckX + 6;
    while (tx < deckX + deckW - 14) {
      const tw = 8 + (r() * 10 | 0), th = 4 + (r() * 8 | 0);
      px(ctx, tx, by - 8 - th, tw, th, '#2e3646'); px(ctx, tx, by - 8 - th, tw, 1, '#566074');
      for (let k = 2; k < tw - 2; k += 3) if (r() < 0.6) px(ctx, tx + k, by - 6 - th + 2, 1, 1, r() < 0.5 ? '#ffcf5a' : '#7fd8ff');
      tx += tw + 4 + (r() * 8 | 0);
    }
    // antennes
    const spires = [deckX + 10, deckX + (deckW >> 1), deckX + deckW - 12];
    for (const sx of spires) {
      const sh = 14 + (r() * 12 | 0);
      px(ctx, sx, by - 8 - sh, 1, sh, '#8a93a4');
      px(ctx, sx - 1, by - 8 - (sh >> 1), 3, 1, '#596274');
      lights.push({ x: sx, y: by - 9 - sh, c: '#ff4d5e' });
    }
    // panneaux solaires
    const panelSlots = [deckX + 22, deckX + 46, deckX + deckW - 44, deckX + deckW - 22].slice(0, solarPanels);
    for (const sx of panelSlots) {
      px(ctx, sx + 6, by - 20, 1, 12, '#8a93a4');
      for (let j = 0; j < 7; j++) for (let i = 0; i < 13; i++) {
        const edge = i % 4 === 0 || j % 3 === 0;
        px(ctx, sx + i, by - 27 + j, 1, 1, edge ? '#9aa3b4' : (i + j) % 2 ? '#2f6fd8' : '#4a90f0');
      }
    }
    if (hasDish) {
      const dx = deckX + (deckW >> 1) + 10;
      for (let i = -6; i <= 6; i++) px(ctx, dx + i, by - 16 + Math.round(i * i / 9), 1, 1, '#c0c8d8');
      px(ctx, dx, by - 16, 1, 8, '#8a93a4');
    }
    // coque
    px(ctx, bx, by, bodyW, bodyH, HULL);
    px(ctx, bx, by, bodyW, 1, HULL_HI); px(ctx, bx, by + 1, bodyW, 1, '#3a4254');
    px(ctx, bx, by + bodyH - 1, bodyW, 1, HULL_LO);
    // quille et pointes
    px(ctx, bx + 6, by + bodyH, bodyW - 12, 6, '#262c38'); px(ctx, bx + 6, by + bodyH + 5, bodyW - 12, 1, HULL_LO);
    for (let k = bx + 14; k < bx + bodyW - 10; k += 22 + (r() * 10 | 0)) {
      const len = 6 + (r() * 10 | 0);
      for (let j = 0; j < len; j++) { const ww = Math.max(1, Math.round(3 * (1 - j / len))); px(ctx, k - (ww >> 1), by + bodyH + 6 + j, ww, 1, j < 2 ? '#3a4254' : '#2b3242'); }
      px(ctx, k - 3, by + bodyH + 6, 7, 2, '#3a4152');
      lights.push({ x: k, y: by + bodyH + 3, c: '#ff9a2e' });
    }
    // nez
    const nx = bx + bodyW;
    for (let j = 0; j < bodyH; j++) {
      const t = Math.abs(j - bodyH / 2) / (bodyH / 2);
      const len = Math.round(30 * (1 - t * t * 0.85));
      px(ctx, nx, by + j, len, 1, j < 3 ? HULL_HI : j > bodyH - 3 ? HULL_LO : HULL);
    }
    for (let j = 8; j < 20; j++) {
      const t = (j - 8) / 12;
      const len = Math.round(14 * Math.sin(t * Math.PI));
      if (len > 0) px(ctx, nx + 10, by + j, len, 1, t < 0.35 ? '#bff4ff' : t < 0.7 ? '#5fd0ff' : '#2f8fd8');
    }
    px(ctx, nx + 12, by + 11, 2, 1, '#ffffff');
    // salles
    const roomRects = [];
    for (let i = 0; i < n; i++) {
      const row = i < cols ? 0 : 1, col = i % cols;
      const rx = bx + WALL + col * (RW + WALL), ry = by + WALL + row * (RH + WALL);
      drawRoom(ctx, rx, ry, RW, RH, rooms[i] || 'empty', i * 31 + 7);
      roomRects.push({ x: rx, y: ry, w: RW, h: RH, id: rooms[i] || 'empty' });
    }
    // feux de position sur la coque
    for (let k = bx + 4; k < bx + bodyW - 4; k += 11) { px(ctx, k, by + bodyH - 2, 2, 1, '#ff9a2e'); }
    for (let k = 0; k <= cols; k++) px(ctx, bx + k * (RW + WALL) + 1, by + 1, 1, 1, '#7a8394');
    return { canvas: c, W, H, engines, lights, rooms: roomRects, bx, by, bodyW, bodyH };
  }

  // ------------------------------------------------------------------ scène principale
  class Scene {
    constructor(cv) {
      this.cv = cv;
      this.ctx = cv.getContext('2d');
      this.W = 320; this.H = 144;
      cv.width = this.W; cv.height = this.H;
      this.t = 0;
      this.parts = [];
      this.rings = [];
      this.ship = null; this.shipKey = '';
      this.bg = null; this.bgKey = '';
      this.walkers = [];
      const r = rng(99);
      this.ast = Array.from({ length: 12 }, (_, i) => this.newAst(r, i, true));
      this.state = null;
      this.reduced = false;
    }
    newAst(r, i, init) {
      const size = 2 + (r() * 7 | 0);
      return { x: init ? r() * this.W : this.W + 20, y: 6 + r() * (this.H - 12), size, v: 1.5 + r() * 4 + (12 - size) * 0.4, spr: this.astSprite(size, (r() * 1e6) | 0), depth: r() };
    }
    astSprite(size, seed) {
      const c = canvas(size * 2 + 2, size * 2 + 2), ctx = c.getContext('2d');
      const cx = size + 1, cy = size + 1;
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        const a = Math.atan2(dy, dx);
        const rr = size * (0.78 + 0.22 * noise3(Math.cos(a) * 2, Math.sin(a) * 2, 0, seed));
        const d = Math.hypot(dx, dy);
        if (d > rr) continue;
        const l = (-dx - dy) / (rr * 1.4) + 0.5 + (dither(x, y) - 0.5) * 0.3;
        const crater = noise3(x * 0.6, y * 0.6, 1, seed) > 0.72;
        ctx.fillStyle = crater ? '#2a2630' : l > 0.75 ? '#8a7f86' : l > 0.45 ? '#5e5560' : l > 0.2 ? '#40393f' : '#2a2530';
        ctx.fillRect(x, y, 1, 1);
      }
      return c;
    }
    buildBg(sector) {
      const W = this.W, H = this.H;
      const c = canvas(W, H), ctx = c.getContext('2d');
      const info = DS.sector(sector);
      const neb = { terra: ['#2a1f5a', '#123a6a'], ice: ['#0f3a5a', '#1a5a7a'], violet: ['#3a1a5a', '#5a1f6a'], mars: ['#4a1a1a', '#5a2a12'], gas: ['#4a3212', '#3a2a40'], dark: ['#1f0f3a', '#3a0f3a'] }[info.planet] || ['#2a1f5a', '#123a6a'];
      const n1 = hex(neb[0]), n2 = hex(neb[1]), base = hex('#050914');
      const img = ctx.createImageData(W, H);
      const seed = 11 + sector * 7;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const v = fbm(x / 70, y / 50, 0.5, seed);
        const w2 = fbm(x / 40 + 9, y / 30, 2.5, seed + 3);
        let col = mix(base, [10, 18, 40], y / H * 0.6);
        const a = Math.max(0, v - 0.45) * 2.6 + (dither(x, y) - 0.5) * 0.18;
        if (a > 0.25) col = mix(col, n1, Math.min(1, a > 0.55 ? 0.75 : 0.4));
        const b = Math.max(0, w2 - 0.55) * 3 + (dither(x + 1, y + 2) - 0.5) * 0.2;
        if (b > 0.3) col = mix(col, n2, b > 0.6 ? 0.6 : 0.3);
        const i = (y * W + x) * 4;
        img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      const r = rng(seed);
      this.stars = [];
      for (let k = 0; k < W * H / 160; k++) {
        const x = r() * W | 0, y = r() * H | 0, b = r();
        ctx.fillStyle = b > 0.9 ? '#ffffff' : b > 0.6 ? '#9fc8ff' : b > 0.3 ? '#5a6a9a' : '#3a4670';
        ctx.fillRect(x, y, 1, 1);
        if (b > 0.97) { ctx.fillStyle = 'rgba(200,225,255,.55)'; ctx.fillRect(x - 1, y, 1, 1); ctx.fillRect(x + 1, y, 1, 1); ctx.fillRect(x, y - 1, 1, 1); ctx.fillRect(x, y + 1, 1, 1); }
        if (b > 0.85) this.stars.push({ x, y, p: r() * 6 });
      }
      // grande planète en haut à droite
      const pr = Math.round(H * 0.5);
      DS.drawPlanet(ctx, W - pr * 0.62, pr * 0.2, pr, info.planet, 3 + sector * 5, { ring: false });
      // station lointaine
      const sx = W - 26, sy = Math.round(H * 0.6);
      px(ctx, sx, sy, 1, 26, '#2a3446'); px(ctx, sx - 6, sy + 8, 13, 3, '#2a3446'); px(ctx, sx - 3, sy + 4, 7, 2, '#33405a');
      px(ctx, sx - 9, sy + 14, 19, 2, '#232c3c'); px(ctx, sx, sy - 1, 1, 1, '#ff4d5e');
      this.bg = c;
      this.planet = info.planet;
    }
    setState(s) {
      this.state = s;
      const rooms = DS.MODULES.filter(m => (s.mods[m.id] || 0) > 0).map(m => m.room);
      const solar = Math.min(4, Math.ceil((s.mods.solar || 0) / 5));
      const dish = (s.mods.array || 0) > 0;
      const key = rooms.join(',') + '|' + solar + '|' + dish;
      if (key !== this.shipKey) {
        this.shipKey = key;
        this.ship = buildShip(rooms, solar, dish);
        const W = Math.max(320, this.ship.W + 90);
        if (W !== this.W) {
          this.W = W; this.H = Math.round(W * 0.45);
          this.cv.width = this.W; this.cv.height = this.H; this.bgKey = '';
          const r = rng(99);
          this.ast = Array.from({ length: 12 }, (_, i) => this.newAst(r, i, true));
        }
        this.walkers = [];
      }
      const bgKey = String(s.sector);
      if (bgKey !== this.bgKey) { this.bgKey = bgKey; this.buildBg(s.sector); }
      // marcheurs : un par membre d'équipage, répartis dans les salles éclairées
      const lit = this.ship.rooms.filter(r => r.id !== 'empty');
      const want = lit.length ? Math.min(s.crew.total, lit.length * 2) : 0;
      while (this.walkers.length < want) {
        const room = lit[this.walkers.length % lit.length];
        this.walkers.push({ room, x: 3 + Math.random() * (RW - 8), dir: Math.random() < 0.5 ? -1 : 1, pause: 0, suit: ['#ff9a2e', '#e8f0ff', '#5fd0ff', '#ffd23a'][this.walkers.length % 4] });
      }
      if (this.walkers.length > want) this.walkers.length = want;
    }
    origin() {
      return { x: Math.round((this.W - this.ship.W) / 2) + 6, y: Math.round((this.H - this.ship.H) / 2) + 6 };
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
        const n = 6;
        for (let k = 0; k < n; k++) {
          const sx = at ? at.x : (r() < 0.5 ? -4 : this.W + 4), sy = at ? at.y : 10 + r() * (this.H - 20);
          this.parts.push({ x: sx + (r() - 0.5) * 8, y: sy + (r() - 0.5) * 8, tx: c.x + (r() - 0.5) * 60, ty: c.y + (r() - 0.5) * 30, life: 0, dur: 0.5 + r() * 0.4, c: kind === 'ice' ? (r() < 0.5 ? '#7fdcff' : '#d6f7ff') : (r() < 0.5 ? '#a9b4c4' : '#737f93'), size: 1 + (r() * 2 | 0), home: true });
        }
      } else if (kind === 'data') {
        this.rings.push({ x: c.x, y: c.y, r: 4, life: 0 });
      } else if (kind === 'hull') {
        for (let k = 0; k < 14; k++) this.parts.push({ x: c.x + (r() - 0.5) * this.ship.bodyW, y: c.y + (r() - 0.5) * 40, vx: (r() - 0.5) * 40, vy: -r() * 40, life: 0, dur: 0.6, c: r() < 0.5 ? '#ffe14a' : '#ff9a2e', size: 1 });
      } else if (kind === 'oxygen') {
        for (let k = 0; k < 10; k++) this.parts.push({ x: c.x + (r() - 0.5) * 80, y: c.y + 10, vx: (r() - 0.5) * 10, vy: -10 - r() * 20, life: 0, dur: 1.2, c: r() < 0.5 ? '#bff0ff' : '#7fe35a', size: 1 });
      } else if (kind === 'jump') {
        this.jumpT = 1.2;
      }
    }
    toLogical(ev) {
      const rect = this.cv.getBoundingClientRect();
      return { x: (ev.clientX - rect.left) / rect.width * this.W, y: (ev.clientY - rect.top) / rect.height * this.H };
    }
    frame(dt) {
      const ctx = this.ctx, W = this.W, H = this.H, s = this.state;
      if (!s || !this.bg) return;
      ctx.imageSmoothingEnabled = false;
      this.t += dt;
      const t = this.t;
      const still = this.reduced;
      ctx.drawImage(this.bg, 0, 0);
      // étoiles scintillantes
      for (const st of this.stars) {
        const b = still ? 0.5 : 0.5 + 0.5 * Math.sin(t * 2 + st.p * 3);
        if (b > 0.75) { ctx.fillStyle = '#ffffff'; ctx.fillRect(st.x, st.y, 1, 1); }
      }
      // astéroïdes (arrière-plan)
      const drift = still ? 0 : dt;
      for (const a of this.ast) {
        a.x -= a.v * drift * (0.4 + a.depth * 0.8);
        if (a.x < -a.size * 2 - 4) Object.assign(a, this.newAst(Math.random, 0, false));
        if (a.depth < 0.6) ctx.drawImage(a.spr, Math.round(a.x), Math.round(a.y));
      }
      // vaisseau
      const sh = this.ship;
      const o = this.origin();
      const bob = still ? 0 : Math.round(Math.sin(t * 1.3) * 1);
      const oy = o.y + bob;
      // flammes des moteurs
      const power = s._c ? Math.min(1, s._c.ratio.energy) : 1;
      for (const e of sh.engines) {
        const len = (still ? 10 : 9 + Math.sin(t * 23 + e.y) * 2 + Math.random() * 2) * (0.5 + 0.5 * power);
        for (let i = 0; i < len; i++) {
          const k = i / len;
          const hgt = Math.max(1, Math.round(5 * (1 - k)));
          ctx.fillStyle = k < 0.2 ? '#ffffff' : k < 0.5 ? '#9fe8ff' : k < 0.8 ? '#3aa0ff' : 'rgba(40,110,255,.5)';
          ctx.fillRect(o.x + e.x - 1 - i, oy + e.y - (hgt >> 1), 1, hgt);
        }
      }
      ctx.drawImage(sh.canvas, o.x, oy);
      // équipage
      for (const w of this.walkers) {
        if (!still) {
          if (w.pause > 0) w.pause -= dt;
          else {
            w.x += w.dir * dt * 6;
            if (w.x < 2 || w.x > RW - 5) { w.dir *= -1; w.x = Math.max(2, Math.min(RW - 5, w.x)); }
            if (Math.random() < dt * 0.3) w.pause = 0.5 + Math.random() * 2;
          }
        }
        const x = o.x + w.room.x + Math.round(w.x), y = oy + w.room.y + RH - 3;
        const step = still || w.pause > 0 ? 0 : Math.floor(t * 6) % 2;
        px(ctx, x, y - 6, 2, 2, '#f5c391');
        px(ctx, x, y - 4, 2, 3, w.suit);
        px(ctx, x + (step ? 1 : 0), y - 1, 1, 1, '#1a1f2b');
        px(ctx, x + (step ? 0 : 1), y - 1, 1, 1, '#1a1f2b');
      }
      // feux clignotants
      for (const l of sh.lights) {
        if (still || Math.floor(t * 2 + l.x * 0.07) % 3 !== 0) { ctx.fillStyle = l.c; ctx.fillRect(o.x + l.x, oy + l.y, 1, 1); }
      }
      // avaries
      if (s.hull < 40 && !still) {
        if (Math.random() < dt * (40 - s.hull) * 0.3) {
          const rr = sh.rooms[Math.random() * sh.rooms.length | 0];
          this.parts.push({ x: o.x + rr.x + Math.random() * RW, y: oy + rr.y, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 20, life: 0, dur: 0.5, c: '#ffe14a', size: 1 });
        }
      }
      // astéroïdes (premier plan)
      for (const a of this.ast) if (a.depth >= 0.6) ctx.drawImage(a.spr, Math.round(a.x), Math.round(a.y));
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
      // anneau de scan
      this.rings = this.rings.filter(r => {
        r.life += dt; r.r += dt * 160;
        ctx.strokeStyle = 'rgba(95,243,230,' + Math.max(0, 0.8 - r.life) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
        return r.life < 0.8;
      });
      // alarme
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
  DS.drawSpecimen = function (ctx, W, H, level, t, still) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#060b16'; ctx.fillRect(0, 0, W, H);
    // cuve
    const tx = 18, ty = 10, tw = W - 36, th = H - 26;
    for (let y = ty; y < ty + th; y++) for (let x = tx; x < tx + tw; x++) {
      const k = (x - tx) / tw;
      const edge = k < 0.08 || k > 0.92;
      const lv = (y - ty) / th;
      let c = lv < 0.12 ? '#0d2a24' : '#0f3a2c';
      if (lv > 0.12 && (dither(x, y) + Math.sin(lv * 12 + (still ? 0 : t)) * 0.08) > 0.85) c = '#145040';
      if (edge) c = '#1d5a4a';
      ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1);
    }
    ctx.fillStyle = 'rgba(190,255,230,.18)'; ctx.fillRect(tx + 4, ty + 4, 2, th - 8);
    px(ctx, tx - 4, ty - 4, tw + 8, 5, '#3a4254'); px(ctx, tx - 4, ty - 4, tw + 8, 1, '#6b7587');
    px(ctx, tx - 4, ty + th, tw + 8, 8, '#3a4254'); px(ctx, tx - 4, ty + th, tw + 8, 1, '#6b7587');
    for (let k = 0; k < 4; k++) px(ctx, tx + 4 + k * ((tw - 8) / 3), ty + th + 3, 2, 2, k % 2 ? '#ff9a2e' : '#7fe35a');
    // créature
    const stage = DS.SPEC_STAGES.filter(st => level >= st.lvl).length - 1;
    const cx = W / 2, cy = ty + th * 0.52 + (still ? 0 : Math.sin(t * 1.4) * 2);
    const size = 7 + stage * 3.2 + Math.min(level, 80) * 0.08;
    const hue = [['#9cf06a', '#3ec04a', '#1d6a2a'], ['#c8ff96', '#6fd64a', '#2f7a3a'], ['#7fe8c0', '#2fb08a', '#145a4a'], ['#e0a0ff', '#9a4fe0', '#4a2690'], ['#7fd8ff', '#2f8fd8', '#1b3f8a'], ['#ff9adf', '#d04fb0', '#6a1a5a'], ['#fff6c0', '#ffd23a', '#d0570e']][stage];
    // tentacules
    const tent = stage === 0 ? 0 : 2 + stage;
    for (let k = 0; k < tent; k++) {
      const a0 = Math.PI * (0.15 + 0.7 * k / Math.max(1, tent - 1));
      for (let i = 0; i < size * 1.6; i++) {
        const wv = still ? 0 : Math.sin(t * 2.5 + i * 0.35 + k) * (i / size) * 2;
        const x = cx + Math.cos(a0) * (size * 0.6 + i * 0.7) * (k % 2 ? 1 : -1) * 0.6 + wv;
        const y = cy + size * 0.4 + i * 0.75;
        if (y > ty + th - 2) break;
        px(ctx, x, y, i < size * 0.6 ? 2 : 1, 1, i % 4 === 0 ? hue[0] : hue[1]);
      }
    }
    // corps
    const ry = stage === 0 ? size * 1.25 : stage === 3 ? size * 1.35 : size * 0.95;
    for (let y = -ry; y <= ry; y++) for (let x = -size; x <= size; x++) {
      const d = (x * x) / (size * size) + (y * y) / (ry * ry);
      if (d > 1) continue;
      const l = (-x - y) / (size * 1.6) + 0.45 + (dither(x | 0, y | 0) - 0.5) * 0.3;
      let c = l > 0.7 ? hue[0] : l > 0.3 ? hue[1] : hue[2];
      if (d > 0.82) c = hue[2];
      if (stage === 3 && Math.abs(x) < 1 && (y | 0) % 3 === 0) c = '#ffd23a';
      ctx.fillStyle = c; ctx.fillRect(Math.round(cx + x), Math.round(cy + y), 1, 1);
    }
    // yeux
    if (stage > 0 && stage !== 3) {
      const eyes = Math.min(5, stage === 1 ? 1 : stage);
      const blink = !still && Math.sin(t * 0.9) > 0.97;
      for (let k = 0; k < eyes; k++) {
        const ex = Math.round(cx + (k - (eyes - 1) / 2) * Math.max(4, size * 0.45)), ey = Math.round(cy - ry * 0.25 + (k % 2) * 2);
        if (blink) { px(ctx, ex - 2, ey, 4, 1, '#1a1f2b'); continue; }
        px(ctx, ex - 2, ey - 2, 4, 4, '#ffffff'); px(ctx, ex - 1, ey - 1, 2, 2, stage >= 5 ? '#e8303f' : '#1a1f2b');
      }
    } else if (stage === 0) {
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(Math.round(cx - size * 0.4), Math.round(cy - ry * 0.5), 2, 4);
    }
    if (stage === 6) {
      ctx.fillStyle = 'rgba(255,240,180,' + (still ? 0.2 : 0.15 + 0.1 * Math.sin(t * 3)).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(cx, cy, size * 1.8, 0, Math.PI * 2); ctx.fill();
    }
    // bulles
    for (let k = 0; k < 7; k++) {
      const by = ty + th - ((t * 14 + k * 23) % (th - 6)) - 4;
      const bx = tx + 8 + ((k * 37) % (tw - 16)) + (still ? 0 : Math.sin(t * 2 + k) * 1.5);
      px(ctx, bx, still ? ty + th - 10 - k * 9 : by, 1, 1, 'rgba(200,255,240,.7)');
    }
  };
})(window.DS = window.DS || {});
