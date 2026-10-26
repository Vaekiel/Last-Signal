/* Dernier Signal — icônes pixel-art 32×32, construites en volumes puis ombrées par DS.Forge. */
'use strict';
(function (DS) {
  const segDist = (x, y, ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
    const t = l ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l)) : 0;
    return Math.hypot(x - ax - dx * t, y - ay - dy * t);
  };
  // Trait épais le long d'une ligne brisée, rayon interpolé de r0 à r1.
  function stroke(pts, r0, r1) {
    const s = [];
    let total = 0;
    const lens = [];
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); lens.push(l); total += l; }
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i], n = Math.max(2, Math.ceil(lens[i - 1] * 2));
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        const g = (acc + lens[i - 1] * t) / (total || 1);
        s.push([ax + (bx - ax) * t, ay + (by - ay) * t, r0 + (r1 - r0) * g]);
      }
      acc += lens[i - 1];
    }
    return (x, y) => s.some(([px, py, r]) => (x - px) * (x - px) + (y - py) * (y - py) <= r * r);
  }
  const ring = (cx, cy, r0, r1) => (x, y) => { const d = Math.hypot(x - cx, y - cy); return d >= r0 && d <= r1; };
  const ALL = [0, 0, 31, 31];
  DS.spriteTools = { segDist, stroke, ring };

  function crystal(F, x, yb, w, h, t, mat) {
    const z = ++F.zc, part = F.parts++;
    const bl = [x - w / 2, yb], br = [x + w / 2, yb], sl = [x - w / 2 + t * 0.6, yb - h * 0.62], sr = [x + w / 2 + t * 0.6, yb - h * 0.62];
    const ap = [x + t, yb - h], mb = [x + t * 0.3, yb];
    F.poly([bl, sl, ap, mb], mat || 'ice', { z, part, normal: [-0.75, -0.2, 0.62], bevel: 1, strength: 0.5 });
    F.poly([mb, ap, sr, br], mat || 'ice', { z, part, normal: [0.6, -0.05, 0.8], bevel: 1, strength: 0.5 });
  }
  DS.crystal = crystal;

  const S = {};

  S.metal = F => {
    F.iso(10, 13, 8, 7, 'steel');
    F.iso(22, 13, 8, 7, 'steel');
    F.iso(16, 4, 8, 7, 'steel');
    F.line(14, 10, 18, 8, 'white', { tone: 1 });
  };

  S.ice = F => {
    crystal(F, 7.5, 29, 8, 16, -4);
    crystal(F, 24.5, 29, 8, 19, 4);
    crystal(F, 16, 30, 11, 28, 0);
    crystal(F, 11, 31, 5, 9, -1);
    crystal(F, 21.5, 31, 5, 8, 2);
    F.px(13, 9, 'white', 1); F.px(13, 10, 'white', 1); F.px(27, 13, 'white', 1);
  };

  S.energy = F => {
    F.poly([[20, 1], [7, 18], [15, 18], [10, 31], [26, 12], [17, 12], [24, 1]], 'gold', { bevel: 2.4 });
    F.line(19, 4, 12, 15, 'white', { tone: 0.95 });
  };

  S.oxygen = F => {
    const tank = (x, y, w, h) => {
      F.ellipse(x + w / 2, y + 1, w / 2, 3.5, 'ice');
      F.cylV(x, y, w, h, 'ice');
      F.cylV(x, y + Math.round(h * 0.32), w, 3, 'white');
      F.cylV(x + w / 2 - 1.5, y - 6, 3, 4, 'steel');
      F.rect(Math.round(x + w / 2 - 3.5), y - 7, 7, 2, 'steel');
      F.rect(x, y + h - 1, w, 2, 'dark', { bevel: 0 });
    };
    tank(3, 11, 11, 18);
    tank(16, 13, 12, 17);
  };

  S.food = F => {
    const ax = 5, ay = 27, bx = 28, by = 4;
    const mx = (ax + bx) / 2, my = (ay + by) / 2, len = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / len, uy = (by - ay) / len;
    F.shape(...ALL, (x, y) => {
      const u = (x - mx) * ux + (y - my) * uy, v = -(x - mx) * uy + (y - my) * ux;
      const t = 2 * u / len;
      return Math.abs(t) < 1 && Math.abs(v) < 8 * (1 - t * t) * (t > 0 ? 1 : 0.95);
    }, 'leaf', { round: 5 });
    F.line(6, 26, 26, 6, 'leaf', { shift: -2 });
    for (const [a, b, c, d] of [[11, 21, 9, 15], [15, 17, 13, 11], [19, 13, 18, 8], [12, 20, 18, 22], [16, 16, 22, 18], [20, 12, 25, 13]]) F.line(a, b, c, d, 'leaf', { shift: -1 });
    F.line(2, 30, 6, 26, 'wood', { w: 2 });
  };

  S.data = F => {
    for (let k = 0; k < 4; k++) {
      const p = 9 + k * 4;
      F.rect(p, 2, 2, 5, 'brass'); F.rect(p, 25, 2, 5, 'brass');
      F.rect(2, p, 5, 2, 'brass'); F.rect(25, p, 5, 2, 'brass');
    }
    F.rect(6, 6, 20, 20, 'dark', { bevel: 2 });
    F.rect(10, 10, 12, 12, 'violet', { bevel: 2 });
    F.ellipse(16, 16, 3.6, 3.6, 'glowP');
    F.line(8, 8, 8, 8, 'steel', { tone: 0.9 });
    F.line(12, 12, 14, 12, 'violet', { shift: 2 });
  };

  S.alloy = F => {
    F.iso(16, 3, 13, 13, 'violet');
    F.line(16, 16, 16, 29, 'glowP', { tone: 0.75 });
    F.line(4, 10, 15, 15, 'glowP', { tone: 0.9 });
    F.line(17, 15, 28, 10, 'glowP', { tone: 0.6 });
    F.line(9, 18, 9, 23, 'violet', { shift: 2 });
    F.line(22, 19, 25, 17, 'violet', { shift: 1 });
  };

  S.echo = F => {
    F.shape(...ALL, (x, y) => Math.sqrt(Math.abs(x - 16)) + Math.sqrt(Math.abs(y - 16)) <= 3.9, 'glowC', { round: 4 });
    F.shape(22, 2, 30, 10, (x, y) => Math.sqrt(Math.abs(x - 26)) + Math.sqrt(Math.abs(y - 6)) <= 1.9, 'glowC', { round: 2 });
    F.shape(2, 21, 10, 29, (x, y) => Math.sqrt(Math.abs(x - 6)) + Math.sqrt(Math.abs(y - 25)) <= 1.6, 'glowC', { round: 2 });
  };

  S.fragment = F => {
    const top = [16, 1], l = [4, 12], r = [28, 12], b = [16, 31], cl = [11, 12], cr = [21, 12];
    const z = ++F.zc, part = F.parts++;
    const f = (pts, n) => F.poly(pts, 'gold', { z, part, normal: n, bevel: 0.6, strength: 0.4 });
    f([top, l, cl], [-0.7, -0.6, 0.4]);
    f([top, cl, cr], [0, -0.75, 0.66]);
    f([top, cr, r], [0.65, -0.45, 0.6]);
    f([l, cl, b], [-0.55, 0.35, 0.75]);
    f([cl, cr, b], [0.05, 0.4, 0.9]);
    f([cr, r, b], [0.6, 0.5, 0.6]);
    F.px(12, 7, 'white', 1); F.px(13, 6, 'white', 1);
  };

  const shieldShape = inset => (x, y) => {
    if (y < 2 + inset || x < 4 + inset || x > 28 - inset) return false;
    if (y <= 14) return true;
    const t = (y - 14) / (16.5 - inset * 1.15);
    return t <= 1 && Math.abs(x - 16) <= (12 - inset) * (1 - Math.pow(t, 1.9));
  };
  S.hull = F => {
    F.shape(...ALL, shieldShape(0), 'steel', { bevel: 2 });
    F.shape(...ALL, shieldShape(3), 'ice', { round: 5 });
    F.poly([[16, 8], [21, 13], [18.5, 13], [18.5, 22], [13.5, 22], [13.5, 13], [11, 13]], 'white', { bevel: 1 });
  };

  S.crew = F => {
    F.ellipse(16, 32, 14, 10, 'orange');
    F.rect(12, 25, 8, 6, 'white', { bevel: 1 });
    F.px(14, 27, 'glowG', 1); F.px(17, 27, 'glowR', 1); F.px(14, 29, 'glowC', 1);
    F.ellipse(16, 13, 11, 11, 'white');
    F.ellipse(16.5, 14, 7.5, 5.8, 'glass', { flatness: 0.85 });
    F.line(12, 11, 14, 10, 'white', { tone: 1 });
    F.px(13, 13, 'white', 0.85);
    F.line(25, 5, 27, 1, 'steel');
    F.px(27, 1, 'glowR', 1);
  };

  S.specimen = F => {
    F.shape(...ALL, stroke([[9, 20], [7, 26], [9, 30]], 2.4, 1.1), 'leaf', { round: 2 });
    F.shape(...ALL, stroke([[16, 22], [16, 28], [14, 31]], 2.4, 1.1), 'leaf', { round: 2 });
    F.shape(...ALL, stroke([[23, 20], [26, 25], [24, 30]], 2.4, 1.1), 'leaf', { round: 2 });
    F.ellipse(16, 14, 12.5, 11, 'leaf');
    F.ellipse(9, 9, 2, 1.6, 'leaf', { shift: -1 });
    F.ellipse(24, 19, 1.8, 1.4, 'leaf', { shift: -1 });
    F.ellipse(16, 13, 6.2, 6.2, 'white');
    F.ellipse(17, 14, 2.8, 3.8, 'navy');
    F.px(15, 11, 'white', 1); F.px(16, 11, 'white', 1);
  };

  S.ship = F => {
    F.cylH(3, 11, 7, 5, 'steel'); F.cylH(3, 18, 7, 5, 'steel');
    F.ellipse(2.5, 13.5, 2.5, 1.8, 'glowC'); F.ellipse(2.5, 20.5, 2.5, 1.8, 'glowC');
    F.poly([[8, 9], [22, 9], [31, 16], [22, 25], [8, 25]], 'hull', { bevel: 2 });
    F.rect(11, 5, 9, 5, 'steel', { bevel: 1 });
    F.rect(14, 2, 3, 4, 'steel', { bevel: 1 });
    F.poly([[21, 11], [27, 15], [21, 16]], 'glass', { bevel: 1 });
    for (let k = 0; k < 4; k++) F.px(10 + k * 3, 20, 'glowO', 1);
    F.line(8, 23, 22, 23, 'orange', { tone: 0.6 });
  };

  S.wrench = F => {
    F.shape(...ALL, (x, y) => {
      const handle = segDist(x, y, 5, 27, 19, 13) <= 2.9;
      const head = Math.hypot(x - 22, y - 10) <= 7;
      const slot = segDist(x, y, 23.5, 8.5, 31, 1) < 2.6;
      const hole = Math.hypot(x - 6.5, y - 25.5) < 1.5;
      return (handle || head) && !slot && !hole;
    }, 'steel', { round: 2.6 });
  };

  S.flask = F => {
    F.poly([[12, 4], [20, 4], [20, 11], [29, 27], [27, 30], [5, 30], [3, 27], [12, 11]], 'glass', { bevel: 2 });
    F.poly([[9.5, 17], [22.5, 17], [27.5, 27], [25.5, 28.5], [6.5, 28.5], [4.5, 27]], 'pink', { round: 3 });
    F.rect(10, 2, 12, 3, 'white', { bevel: 1 });
    F.ellipse(14, 22, 1.5, 1.5, 'white'); F.ellipse(19.5, 25, 1.1, 1.1, 'white'); F.px(17, 20, 'white', 0.9);
    F.line(8, 25, 12, 15, 'white', { tone: 0.9 });
  };

  S.planet = F => {
    const ang = -0.35, ca = Math.cos(ang), sa = Math.sin(ang);
    const band = (front) => (x, y) => {
      const dx = x - 16, dy = y - 16;
      const u = dx * ca - dy * sa, v = dx * sa + dy * ca;
      const o = (u * u) / (15.5 * 15.5) + (v * v) / (4.6 * 4.6), i = (u * u) / (11.5 * 11.5) + (v * v) / (3 * 3);
      return o <= 1 && i > 1 && (front ? v >= 0 : v < 0);
    };
    F.shape(...ALL, band(false), 'brass', { round: 1.5 });
    F.ellipse(16, 16, 10.5, 10.5, 'violet');
    F.shape(...ALL, (x, y) => Math.hypot(x - 16, y - 16) <= 10.3 && Math.abs((y - 16) - (x - 16) * 0.35 + 3) < 1.4, 'violet', { shift: 1, flat: true, normal: [-0.3, -0.3, 0.9] });
    F.shape(...ALL, (x, y) => Math.hypot(x - 16, y - 16) <= 10.3 && Math.abs((y - 16) - (x - 16) * 0.35 - 3) < 1.1, 'violet', { shift: -1, flat: true, normal: [0.2, 0.2, 0.9] });
    F.shape(...ALL, band(true), 'brass', { round: 1.5 });
  };

  S.radar = F => {
    F.shape(...ALL, ring(16, 16, 8.5, 12.5), 'steel', { round: 2 });
    F.rect(14, 1, 4, 9, 'ice', { bevel: 1 }); F.rect(14, 23, 4, 9, 'ice', { bevel: 1 });
    F.rect(1, 14, 9, 4, 'ice', { bevel: 1 }); F.rect(23, 14, 9, 4, 'ice', { bevel: 1 });
    F.ellipse(16, 16, 3.8, 3.8, 'glowC');
  };

  S.map = F => {
    const z = ++F.zc, part = F.parts++;
    F.poly([[2, 6], [11, 3], [11, 27], [2, 30]], 'paper', { z, part, normal: [-0.45, 0, 0.9], bevel: 1, strength: 0.4 });
    F.poly([[11, 3], [21, 6], [21, 30], [11, 27]], 'paper', { z, part, normal: [0.5, 0, 0.86], bevel: 1, strength: 0.4 });
    F.poly([[21, 6], [30, 3], [30, 27], [21, 30]], 'paper', { z, part, normal: [-0.45, 0, 0.9], bevel: 1, strength: 0.4 });
    F.ellipse(7, 14, 3, 4, 'leaf', { flatness: 0.3 });
    F.ellipse(25, 22, 3, 2.5, 'leaf', { flatness: 0.3 });
    const pts = [[6, 25], [9, 22], [12, 21], [15, 19], [17, 16], [20, 14], [23, 12]];
    pts.forEach(([x, y], i) => { if (i % 2 === 0) F.px(x, y, 'red', 0.55); });
    F.line(23, 7, 27, 11, 'red', { tone: 0.7, w: 2 }); F.line(27, 7, 23, 11, 'red', { tone: 0.7, w: 2 });
  };

  S.anomaly = F => {
    F.poly([[16, 2], [31, 29], [1, 29]], 'gold', { bevel: 2.6 });
    F.rect(14, 10, 4, 11, 'navy', { bevel: 0 });
    F.rect(14, 23, 4, 4, 'navy', { bevel: 0 });
  };

  S.antenna = F => {
    F.cylV(12, 25, 8, 5, 'steel');
    F.rect(8, 29, 16, 3, 'dark', { bevel: 1 });
    F.cylV(14, 16, 4, 10, 'steel');
    F.shape(...ALL, (x, y) => Math.hypot(x - 13, y - 13) <= 10.5 && Math.hypot(x - 18, y - 8) > 10 && y < 25, 'white', { round: 2.6 });
    F.line(12, 16, 21, 7, 'steel');
    F.ellipse(21.5, 6.5, 2.2, 2.2, 'glowO');
    for (let a = -1.4; a <= 0.1; a += 0.12) {
      F.px(22 + Math.cos(a) * 5.5, 6 + Math.sin(a) * 5.5, 'glowC', 0.8);
      F.px(22 + Math.cos(a) * 8.5, 6 + Math.sin(a) * 8.5, 'glowC', 0.6);
    }
  };

  S.journal = F => {
    F.rect(5, 4, 22, 27, 'wood', { bevel: 2 });
    F.rect(8, 7, 16, 21, 'white', { bevel: 1 });
    for (const [y, w] of [[12, 12], [15, 10], [18, 12], [21, 8], [24, 11]]) F.line(10, y, 10 + w, y, 'steel', { tone: 0.35 });
    F.rect(11, 2, 10, 5, 'steel', { bevel: 1 });
    F.rect(14, 1, 4, 2, 'steel', { bevel: 1 });
  };

  S.gear = F => {
    F.shape(...ALL, (x, y) => {
      const dx = x - 16, dy = y - 16, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      return (d <= 10.5 || (Math.cos(a * 8) > 0.3 && d <= 14.5)) && d > 4.6;
    }, 'steel', { bevel: 2.2 });
    F.shape(...ALL, ring(16, 16, 6.5, 8), 'steel', { shift: -1, flat: true, normal: [0.3, 0.3, 0.9] });
  };

  S.mail = F => {
    F.rect(2, 7, 28, 19, 'white', { bevel: 1 });
    F.line(3, 8, 16, 18, 'white', { shift: -2 }); F.line(29, 8, 16, 18, 'white', { shift: -2 });
    F.line(3, 25, 12, 17, 'white', { shift: -1 }); F.line(29, 25, 20, 17, 'white', { shift: -1 });
    F.ellipse(16, 18, 3.4, 3.4, 'red');
  };

  S.lock = F => {
    F.shape(...ALL, (x, y) => {
      const d = Math.hypot(x - 16, y - 12);
      return (y <= 13.5 && d <= 9 && d >= 5.4) || (y > 13 && y < 16 && ((x >= 7 && x <= 10.6) || (x >= 21.4 && x <= 25)));
    }, 'steel', { round: 1.8 });
    F.rect(5, 14, 22, 16, 'gold', { bevel: 2 });
    F.ellipse(16, 20.5, 2.3, 2.3, 'navy');
    F.rect(15, 21, 3, 5, 'navy', { bevel: 0 });
  };

  S.check = F => {
    F.shape(...ALL, (x, y) => segDist(x, y, 5, 17, 12, 25) <= 3.3 || segDist(x, y, 12, 25, 27, 7) <= 3.3, 'leaf', { round: 3 });
  };

  S.heart = F => {
    F.shape(...ALL, (x, y) => Math.hypot(x - 10, y - 11) <= 7.6 || Math.hypot(x - 22, y - 11) <= 7.6 || (y >= 11 && y <= 29 && Math.abs(x - 16) <= (29 - y) * 0.76), 'ice', { round: 5 });
    F.ellipse(9, 9, 2.2, 1.6, 'white', { flatness: 0.2 });
  };

  S.target = F => {
    F.shape(...ALL, ring(16, 16, 11, 14.8), 'orange', { round: 1.8 });
    F.shape(...ALL, ring(16, 16, 8, 11), 'white', { round: 1.5 });
    F.shape(...ALL, ring(16, 16, 4.6, 8), 'orange', { round: 1.5 });
    F.ellipse(16, 16, 3.4, 3.4, 'glowO');
  };

  S.debris = F => {
    const R = a => 12.5 * (0.84 + 0.16 * Math.sin(a * 3 + 1) * Math.cos(a * 2 - 0.5));
    F.shape(...ALL, (x, y) => { const dx = x - 16, dy = y - 17; return Math.hypot(dx, dy * 1.12) <= R(Math.atan2(dy, dx)); }, 'rock', { round: 7 });
    F.ellipse(11, 13, 3.2, 2.6, 'rock', { flatness: -0.8 });
    F.ellipse(19, 23, 2.4, 2, 'rock', { flatness: -0.8 });
    F.ellipse(22, 12, 1.6, 1.4, 'rock', { flatness: -0.8 });
    F.iso(24, 18, 4, 4, 'steel');
  };

  S.pickaxe = F => {
    F.shape(...ALL, stroke([[6, 29], [21, 10]], 1.9, 1.9), 'wood', { round: 1.9 });
    F.shape(...ALL, stroke([[8, 5], [14, 4], [20, 6], [25, 10], [28, 16]], 1.1, 1.3), 'steel', { round: 1.5 });
    F.shape(...ALL, stroke([[13, 4.6], [18, 5.4], [23, 8.3]], 2.6, 2.6), 'steel', { round: 2 });
    F.cylV(19, 7, 4, 5, 'dark');
  };

  S.tools = F => {
    F.shape(...ALL, stroke([[4, 4], [11, 11]], 3, 3), 'orange', { round: 2.6 });
    F.shape(...ALL, stroke([[11, 11], [27, 27]], 1.3, 1.1), 'steel', { round: 1.3 });
    F.shape(...ALL, (x, y) => {
      const handle = segDist(x, y, 6, 26, 18, 14) <= 2.3;
      const head = Math.hypot(x - 22, y - 10) <= 5.5;
      const slot = segDist(x, y, 23, 9, 29, 3) < 2.1;
      return (handle || head) && !slot;
    }, 'white', { round: 2 });
  };

  S.scan = F => {
    F.shape(...ALL, ring(16, 16, 12.6, 15), 'steel', { round: 1.5 });
    F.ellipse(16, 16, 12.8, 12.8, 'navy', { flatness: 0.4 });
    for (let a = 0; a < Math.PI * 2; a += 0.09) { F.px(16 + Math.cos(a) * 8, 16 + Math.sin(a) * 8, 'teal', 0.45); F.px(16 + Math.cos(a) * 4, 16 + Math.sin(a) * 4, 'teal', 0.4); }
    F.shape(...ALL, (x, y) => { const dx = x - 16, dy = y - 16, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx); return d < 12 && a > -1.6 && a < -0.55; }, 'glowT', { round: 3 });
    F.px(21, 20, 'glowT', 1); F.px(10, 21, 'glowT', 0.8); F.px(16, 16, 'white', 1);
  };

  S.clock = F => {
    F.shape(...ALL, ring(16, 16, 11.4, 14.8), 'steel', { round: 1.6 });
    F.ellipse(16, 16, 11.6, 11.6, 'white', { flatness: 0.35 });
    F.line(16, 16, 16, 8, 'navy', { w: 2 }); F.line(16, 16, 21, 19, 'navy', { w: 2 });
    for (const [x, y] of [[16, 6], [26, 16], [16, 26], [6, 16]]) F.px(x, y, 'navy', 0.6);
    F.px(16, 16, 'red', 0.6);
  };

  S.cryo = F => {
    const caps = inset => (x, y) => {
      const r = 8 - inset;
      if (x < 6 + inset || x > 26 - inset || y < 2 + inset || y > 30 - inset) return false;
      if (y < 2 + inset + r) return Math.hypot(x - 16, y - (2 + inset + r)) <= 10 - inset;
      return true;
    };
    F.shape(...ALL, caps(0), 'steel', { bevel: 2 });
    F.shape(...ALL, caps(3), 'glass', { round: 3 });
    F.ellipse(16, 11, 2.8, 2.8, 'skin');
    F.shape(...ALL, (x, y) => y > 14 && y < 26 && Math.abs(x - 16) < 4.2 - (y > 22 ? (y - 22) * 0.5 : 0), 'teal', { round: 2 });
    F.rect(9, 27, 14, 2, 'glowC', { bevel: 0 });
    F.line(10, 9, 12, 6, 'white', { tone: 0.95 });
  };

  S.star = F => {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 6.3 : 15.2;
      pts.push([16 + Math.cos(a) * r, 17 + Math.sin(a) * r]);
    }
    F.poly(pts, 'gold', { bevel: 2.6 });
  };

  S.play = F => { F.poly([[7, 3], [28, 16], [7, 29]], 'ice', { bevel: 2.6 }); };

  S.cloud = F => {
    F.shape(...ALL, (x, y) => Math.hypot(x - 10, y - 16) <= 6.5 || Math.hypot(x - 17, y - 11) <= 8 || Math.hypot(x - 24, y - 15.5) <= 6.5 || (x > 6 && x < 28 && y > 15 && y < 22.5), 'white', { round: 4 });
    F.poly([[12, 24], [14, 28.5], [12, 31], [10, 28.5]], 'ice', { round: 1.5 });
    F.poly([[21, 25], [23, 29], [21, 31], [19, 29]], 'ice', { round: 1.5 });
  };

  // ------------------------------------------------------------------ rendu et cache
  // Les dessins procéduraux restent le repli tant que l'atlas PNG n'est pas chargé.
  const cache = {};
  const atlasNames = 'alloy anomaly antenna check clock cloud crew cryo data debris echo energy flask food fragment gear heart hull ice journal lock mail map metal oxygen pickaxe planet play radar scan ship specimen star target tools wrench'.split(' ');
  const atlasCoords = {};
  atlasNames.forEach((name, i) => { atlasCoords[name] = [i % 6, Math.floor(i / 6)]; });
  let atlasReady = false;
  let atlas = null;

  function spriteRender(name) {
    if (atlasReady && atlasCoords[name]) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 34;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      const [col, row] = atlasCoords[name];
      ctx.drawImage(atlas, col * 32, row * 32, 32, 32, 1, 1, 32, 32);
      return canvas;
    }
    const F = new DS.Forge(32, 32);
    S[name](F);
    return F.render();
  }

  DS.spriteURL = function (name) {
    if (cache[name]) return cache[name];
    if (typeof document === 'undefined' || !S[name]) return '';
    return (cache[name] = spriteRender(name).toDataURL());
  };
  DS.spriteCanvas = function (name) {
    return spriteRender(name);
  };
  DS.icon = function (name, cls) {
    return '<img class="px ' + (cls || '') + '" src="' + DS.spriteURL(name) + '" alt="" aria-hidden="true" draggable="false">';
  };
  DS.SPRITE_NAMES = Object.keys(S);

  if (typeof Image !== 'undefined') {
    atlas = new Image();
    atlas.onload = function () {
      if (atlas.naturalWidth !== 192 || atlas.naturalHeight !== 192) return;
      atlasReady = true;
      const previous = { ...cache };
      Object.keys(cache).forEach(name => { delete cache[name]; });
      // Actualiser les icônes déjà affichées, sans toucher à js/ui.js.
      if (typeof document !== 'undefined') {
        const images = document.querySelectorAll('img.px');
        images.forEach(img => {
          for (const name of Object.keys(previous)) {
            if (img.getAttribute('src') === previous[name]) {
              img.src = DS.spriteURL(name);
              break;
            }
          }
        });
      }
    };
    // Échec de chargement : les sprites procéduraux restent visibles.
    atlas.onerror = function () {};
    atlas.src = 'assets/icons.png';
  }
})(window.DS = window.DS || {});
