/* Last Signal — moteur de pixel-art ombré.
   Les formes sont posées avec un relief (biseau, arrondi, sphère, cylindre, facette),
   puis ombrées sur des dégradés de couleurs limités, avec tramage, ombre de contact,
   lumière de bord et contour sélectif. */
'use strict';
(function (DS) {
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
  const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

  // Dégradés : du plus sombre au plus clair, avec des ombres qui glissent vers le bleu/violet.
  const MATS = {
    steel:  { r: ['#141a26', '#232c3d', '#364258', '#4f5e78', '#71819c', '#9aa9c0', '#c8d3e2', '#eef3fa'], amb: 0.2, shiny: 22 },
    hull:   { r: ['#0f131c', '#191f2b', '#252d3c', '#333d50', '#455167', '#5a6780', '#74829b', '#97a4ba'], amb: 0.22, shiny: 16 },
    dark:   { r: ['#090c13', '#10141e', '#181e2b', '#222a3a', '#2e384c', '#3c4860'], amb: 0.25 },
    gold:   { r: ['#4a1a06', '#7e2f08', '#b8500c', '#e57a14', '#ffa526', '#ffcc4a', '#ffec8a', '#fffbe2'], amb: 0.24, shiny: 18 },
    ice:    { r: ['#0c214f', '#163f86', '#1f68c0', '#2f95e6', '#56c0f7', '#94e2ff', '#d4f6ff', '#ffffff'], amb: 0.28, shiny: 30 },
    leaf:   { r: ['#0b2a12', '#14481c', '#1f6e28', '#2f9634', '#4fbd3c', '#86e05a', '#c4f78a', '#efffd0'], amb: 0.25, shiny: 14 },
    violet: { r: ['#1d0736', '#360c66', '#55169e', '#7a2fd6', '#a35cf5', '#c993ff', '#ead2ff', '#ffffff'], amb: 0.25, shiny: 26 },
    red:    { r: ['#33050c', '#640c19', '#9a1427', '#d0243a', '#f2505f', '#ff8d96', '#ffc9cd'], amb: 0.25, shiny: 20 },
    wood:   { r: ['#22110a', '#3d2112', '#5e351b', '#834c26', '#a96a35', '#cf904f', '#ebb978'], amb: 0.25 },
    white:  { r: ['#2c3342', '#4a5366', '#7a8599', '#a9b4c4', '#d3dbe6', '#eef3f9', '#ffffff'], amb: 0.3, shiny: 24 },
    skin:   { r: ['#4a2a1a', '#7a4a30', '#b07450', '#dda07a', '#f5c8a0', '#ffe4c8'], amb: 0.32 },
    orange: { r: ['#3a1406', '#6e2408', '#a8400c', '#e26414', '#ff8f2a', '#ffb860', '#ffe0a8'], amb: 0.25, shiny: 12 },
    teal:   { r: ['#062a2a', '#0b4a48', '#11706a', '#17998e', '#2dc4b2', '#6fe8d6', '#c4fff4'], amb: 0.25, shiny: 24 },
    rock:   { r: ['#16121a', '#251f2a', '#372e3c', '#4a404f', '#605466', '#7b6d80', '#9a8c9c', '#bcb0bc'], amb: 0.2 },
    pink:   { r: ['#3a0a2c', '#6a1450', '#a01f78', '#d334a2', '#f56ac4', '#ffa8de', '#ffe0f3'], amb: 0.3, shiny: 30 },
    glass:  { r: ['#081a30', '#0f2c4c', '#16426e', '#225e92', '#3384b8', '#56aede', '#9ad8f6', '#e2f8ff'], amb: 0.3, shiny: 40 },
    paper:  { r: ['#3a2c1c', '#6a5232', '#9c7f52', '#c8aa76', '#e6cf9c', '#f8ecc8', '#fffaea'], amb: 0.32 },
    navy:   { r: ['#04070f', '#080e1c', '#0d162a', '#13203a', '#1b2d4e', '#253d66'], amb: 0.3 },
    brass:  { r: ['#2a1806', '#4e300c', '#7a4e16', '#a8722a', '#cf9a40', '#ecc670', '#fff0b8'], amb: 0.24, shiny: 26 },
    glowC:  { r: ['#0e3a6e', '#1868b8', '#2fa2f0', '#6fd6ff', '#c4f2ff', '#ffffff'], emit: true },
    glowO:  { r: ['#6e2408', '#c4500e', '#ff8a1f', '#ffbb4a', '#ffe9a0', '#ffffff'], emit: true },
    glowG:  { r: ['#14481c', '#2f9634', '#6fe05a', '#c4ff9a', '#ffffff'], emit: true },
    glowP:  { r: ['#40107a', '#7a2fd6', '#c993ff', '#f0dcff', '#ffffff'], emit: true },
    glowR:  { r: ['#640c19', '#d0243a', '#ff6070', '#ffc0c6', '#ffffff'], emit: true },
    glowY:  { r: ['#7e2f08', '#e57a14', '#ffd23a', '#fff3a0', '#ffffff'], emit: true },
    glowT:  { r: ['#0b4a48', '#17998e', '#2ff0d8', '#b8fff4', '#ffffff'], emit: true }
  };
  const LIST = [];
  const MID = {};
  function addMat(name, m) {
    if (MID[name] != null) { LIST[MID[name]] = Object.assign({ name, rgb: m.r.map(hex), amb: 0.25, shiny: 0, dith: 0.5 }, m); return; }
    MID[name] = LIST.length;
    LIST.push(Object.assign({ name, rgb: m.r.map(hex), amb: 0.25, shiny: 0, dith: 0.5 }, m));
  }
  for (const k in MATS) addMat(k, MATS[k]);
  // dégradé construit à partir d'une couleur (salles éclairées, nuages…)
  DS.makeRamp = function (name, dark, light, steps, opts) {
    const a = hex(dark), b = hex(light), r = [];
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const c = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
      r.push('#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join(''));
    }
    addMat(name, Object.assign({ r }, opts || {}));
    return name;
  };
  DS.ramp = name => LIST[MID[name]].r;

  const LIGHT = norm([-0.55, -0.72, 0.62]);
  const HALF = norm([LIGHT[0], LIGHT[1], LIGHT[2] + 1]);

  class Forge {
    constructor(w, h) {
      this.w = w; this.h = h;
      const n = w * h;
      this.mat = new Int16Array(n).fill(-1);
      this.nrm = new Float32Array(n * 3);
      this.z = new Float32Array(n).fill(-1e9);
      this.part = new Int32Array(n).fill(-1);
      this.tone = new Float32Array(n).fill(NaN);
      this.shift = new Int8Array(n);
      this.parts = 0;
      this.zc = 0;
    }
    _o(o) {
      o = o || {};
      return { z: o.z != null ? o.z : ++this.zc, part: o.part != null ? o.part : this.parts++, tone: o.tone, shift: o.shift || 0, lit: o.lit };
    }
    set(x, y, mat, nx, ny, nz, P) {
      x = Math.floor(x); y = Math.floor(y);
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
      const i = y * this.w + x;
      if (P.z < this.z[i]) return;
      this.mat[i] = MID[mat];
      this.nrm[i * 3] = nx; this.nrm[i * 3 + 1] = ny; this.nrm[i * 3 + 2] = nz;
      this.z[i] = P.z; this.part[i] = P.part;
      this.tone[i] = P.tone == null ? NaN : P.tone;
      this.shift[i] = P.shift;
    }
    // Forme quelconque : relief tiré d'un champ de distance au bord.
    shape(x0, y0, x1, y1, inside, mat, o) {
      o = o || {};
      const P = this._o(o);
      x0 = Math.floor(x0); y0 = Math.floor(y0); x1 = Math.ceil(x1); y1 = Math.ceil(y1);
      const W = x1 - x0 + 3, H = y1 - y0 + 3;
      const m = new Uint8Array(W * H), d = new Float32Array(W * H);
      for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) {
        if (inside(x0 + i - 1 + 0.5, y0 + j - 1 + 0.5)) m[j * W + i] = 1;
      }
      for (let k = 0; k < W * H; k++) d[k] = m[k] ? 1e6 : 0;
      const D = 1.4142;
      for (let j = 1; j < H; j++) for (let i = 1; i < W - 1; i++) {
        const k = j * W + i;
        if (!m[k]) continue;
        d[k] = Math.min(d[k], d[k - 1] + 1, d[k - W] + 1, d[k - W - 1] + D, d[k - W + 1] + D);
      }
      for (let j = H - 2; j >= 0; j--) for (let i = W - 2; i > 0; i--) {
        const k = j * W + i;
        if (!m[k]) continue;
        d[k] = Math.min(d[k], d[k + 1] + 1, d[k + W] + 1, d[k + W + 1] + D, d[k + W - 1] + D);
      }
      const b = o.bevel != null ? o.bevel : o.round != null ? o.round : 1.5;
      const round = o.round != null;
      const hgt = k => {
        if (!m[k]) return 0;
        const t = Math.min(d[k], b) / b;
        return round ? Math.sqrt(1 - (1 - t) * (1 - t)) : t;
      };
      const f = o.normal ? norm(o.normal) : [0, 0, 1];
      const s = o.strength != null ? o.strength : (round ? 1.6 : 1.1);
      for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) {
        const k = j * W + i;
        if (!m[k]) continue;
        const gx = (hgt(k + 1) - hgt(k - 1)) * s, gy = (hgt(k + W) - hgt(k - W)) * s;
        const n = o.flat ? f : norm([f[0] - gx, f[1] - gy, f[2]]);
        this.set(x0 + i - 1, y0 + j - 1, mat, n[0], n[1], n[2], P);
      }
      return P.part;
    }
    poly(pts, mat, o) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      return this.shape(x0, y0, x1, y1, (px, py) => {
        let c = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) c = !c;
        }
        return c;
      }, mat, o);
    }
    // Rectangle biseauté (normales analytiques, rapide pour les grandes surfaces).
    rect(x, y, w, h, mat, o) {
      o = o || {};
      const P = this._o(o);
      const b = o.bevel != null ? o.bevel : 1;
      const f = o.normal ? norm(o.normal) : [0, 0, 1];
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        let nx = 0, ny = 0;
        if (b > 0) {
          if (i < b) nx -= 0.8; else if (i >= w - b) nx += 0.8;
          if (j < b) ny -= 0.8; else if (j >= h - b) ny += 0.8;
        }
        const n = norm([f[0] + nx, f[1] + ny, f[2]]);
        this.set(x + i, y + j, mat, n[0], n[1], n[2], P);
      }
      return P.part;
    }
    // Cylindre vertical (axe vertical : ombre de gauche à droite).
    cylV(x, y, w, h, mat, o) {
      o = o || {};
      const P = this._o(o);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const u = ((i + 0.5) / w) * 2 - 1;
        let ny = 0;
        if (o.cap && j < 1) ny = -0.7;
        if (o.cap && j >= h - 1) ny = 0.7;
        const n = norm([u * 0.95, ny, Math.sqrt(Math.max(0.05, 1 - u * u))]);
        this.set(x + i, y + j, mat, n[0], n[1], n[2], P);
      }
      return P.part;
    }
    cylH(x, y, w, h, mat, o) {
      o = o || {};
      const P = this._o(o);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const v = ((j + 0.5) / h) * 2 - 1;
        let nx = 0;
        if (o.cap && i < 1) nx = -0.7;
        if (o.cap && i >= w - 1) nx = 0.7;
        const n = norm([nx, v * 0.95, Math.sqrt(Math.max(0.05, 1 - v * v))]);
        this.set(x + i, y + j, mat, n[0], n[1], n[2], P);
      }
      return P.part;
    }
    // Ellipse / sphère.
    ellipse(cx, cy, rx, ry, mat, o) {
      o = o || {};
      const P = this._o(o);
      const flat = o.flatness != null ? o.flatness : 1;
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d2 = dx * dx + dy * dy;
        if (d2 > 1) continue;
        const nz = Math.sqrt(1 - d2);
        const n = norm([dx * flat, dy * flat, nz + (1 - flat)]);
        this.set(x, y, mat, n[0], n[1], n[2], P);
      }
      return P.part;
    }
    // Trait (ton fixe ou ombré à plat).
    line(x0, y0, x1, y1, mat, o) {
      o = o || {};
      const P = this._o(o);
      const w = o.w || 1;
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1;
      for (let k = 0; k <= n; k++) {
        const x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n;
        for (let a = 0; a < w; a++) for (let b = 0; b < w; b++) this.set(Math.floor(x) + a - (w >> 1), Math.floor(y) + b - (w >> 1), mat, 0, 0, 1, P);
      }
      return P.part;
    }
    px(x, y, mat, tone, z) {
      this.set(x, y, mat, 0, 0, 1, { z: z != null ? z : ++this.zc, part: this.parts++, tone, shift: 0 });
    }
    // Cube isométrique : dessus, face gauche, face droite.
    iso(cx, ty, s, hgt, mat, o) {
      o = o || {};
      const z = o.z != null ? o.z : ++this.zc;
      const part = this.parts++;
      const top = [[cx, ty], [cx + s, ty + s / 2], [cx, ty + s], [cx - s, ty + s / 2]];
      const left = [[cx - s, ty + s / 2], [cx, ty + s], [cx, ty + s + hgt], [cx - s, ty + s / 2 + hgt]];
      const right = [[cx, ty + s], [cx + s, ty + s / 2], [cx + s, ty + s / 2 + hgt], [cx, ty + s + hgt]];
      const b = o.bevel != null ? o.bevel : 1;
      this.poly(left, o.side || mat, { z, part, normal: [-0.62, 0.12, 0.78], bevel: b, strength: 0.6 });
      this.poly(right, o.side || mat, { z, part, normal: [0.66, 0.12, 0.74], bevel: b, strength: 0.6 });
      this.poly(top, o.top || mat, { z: z + 0.01, part, normal: [0, -0.9, 0.45], bevel: b, strength: 0.6 });
      return part;
    }

    // ---------------------------------------------------------------- rendu
    render(opts) {
      opts = opts || {};
      const w = this.w, h = this.h, n = w * h;
      const pad = opts.outline === false ? 0 : 1;
      const W = w + pad * 2, H = h + pad * 2;
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const ctx = c.getContext('2d');
      const img = ctx.createImageData(W, H);
      const D = img.data;
      const ti = new Int16Array(n).fill(-1);
      for (let i = 0; i < n; i++) {
        const mi = this.mat[i];
        if (mi < 0) continue;
        const M = LIST[mi], k = M.rgb.length;
        const x = i % w, y = (i / w) | 0;
        let t;
        const tone = this.tone[i];
        if (!isNaN(tone)) {
          t = tone;
          ti[i] = Math.max(0, Math.min(k - 1, Math.round(t * (k - 1))));
          continue;
        }
        const nx = this.nrm[i * 3], ny = this.nrm[i * 3 + 1], nz = this.nrm[i * 3 + 2];
        if (M.emit) t = 0.2 + 0.8 * Math.pow(Math.max(0, nz), 1.4);
        else {
          const dif = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
          t = M.amb + (1 - M.amb) * dif;
          if (M.shiny) t += Math.pow(Math.max(0, nx * HALF[0] + ny * HALF[1] + nz * HALF[2]), M.shiny) * 0.55;
        }
        t = Math.max(0, Math.min(1, t));
        ti[i] = Math.max(0, Math.min(k - 1, Math.floor(t * (k - 1) + 0.5 + (bayer(x, y) - 0.5) * M.dith)));
      }
      // ombre de contact, lumière de bord, décalages manuels
      const out = new Int16Array(ti);
      if (opts.ao !== false || opts.rim !== false) {
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const i = y * w + x;
          if (ti[i] < 0) continue;
          const M = LIST[this.mat[i]];
          let v = ti[i];
          if (opts.ao !== false && !M.emit) {
            let occ = 0;
            const z = this.z[i], p = this.part[i];
            if (y > 0 && this.part[i - w] !== p && this.mat[i - w] >= 0 && this.z[i - w] > z) occ++;
            if (x > 0 && this.part[i - 1] !== p && this.mat[i - 1] >= 0 && this.z[i - 1] > z) occ++;
            if (x < w - 1 && this.part[i + 1] !== p && this.mat[i + 1] >= 0 && this.z[i + 1] > z) occ++;
            if (y < h - 1 && this.part[i + w] !== p && this.mat[i + w] >= 0 && this.z[i + w] > z) occ++;
            if (occ) v -= occ > 1 ? 2 : 1;
          }
          if (opts.rim !== false && !M.emit && isNaN(this.tone[i])) {
            const up = y === 0 || this.mat[i - w] < 0, left = x === 0 || this.mat[i - 1] < 0;
            if (up || left) v += 1;
          }
          v += this.shift[i];
          out[i] = Math.max(0, Math.min(M.rgb.length - 1, v));
        }
      }
      const outline = opts.outlineColor ? hex(opts.outlineColor) : null;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const sx = x - pad, sy = y - pad, o = (y * W + x) * 4;
        const inside = sx >= 0 && sy >= 0 && sx < w && sy < h;
        const i = sy * w + sx;
        if (inside && this.mat[i] >= 0) {
          const col = LIST[this.mat[i]].rgb[out[i]];
          D[o] = col[0]; D[o + 1] = col[1]; D[o + 2] = col[2]; D[o + 3] = 255;
        } else if (pad) {
          let nb = -1;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const qx = sx + dx, qy = sy + dy;
            if (qx >= 0 && qy >= 0 && qx < w && qy < h && this.mat[qy * w + qx] >= 0) { nb = qy * w + qx; break; }
          }
          if (nb >= 0) {
            const base = LIST[this.mat[nb]].rgb[0];
            const col = outline || [base[0] * 0.45 + 2, base[1] * 0.45 + 4, base[2] * 0.45 + 9];
            D[o] = col[0]; D[o + 1] = col[1]; D[o + 2] = col[2]; D[o + 3] = 255;
          }
        }
      }
      ctx.putImageData(img, 0, 0);
      return c;
    }
  }
  DS.Forge = Forge;
  DS.forgeBayer = bayer;
})(window.DS = window.DS || {});
