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

  // Secours autonome : file:// interdit souvent d'exporter un canvas alimenté par un fichier PNG.
  // L'atlas intégré évite ce blocage, sans téléchargement ni dépendance extérieure.
  const atlasSecours = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAMAAABlApw1AAABgFBMVEWg4vWjIBkcZJ5h4fleICQnnuWes9laq+zZ5uUSWTNZmJFfoiUiIyH721kq1vbTVQ1Xapvwmy8fS3BVH0OTna+dUh0aM4bVLQhZV2H60iP56qAPVt4JFlAjhZ9pSjKZ0yzpo0uo0KmKXlyboTIAMd00gilScMKamWDBfFt8wi3Cv8gAAAABAgoPJVAGFS/2+PknOWoJGkkzRHVTZpVyhrFEWImUpssNKGowSIsBCiVleamHlrkRNG6rt9NOaKrO1+kF1/oBKI46UoxacquHmsXwNwLo6e8BN64pM1jzRwEHITkEtvQBVq0FxvYDR5EENo4BG2z1ZwL5hgQHpfHuKQkBRc42WKb6mAYDl/D3VgL3dgT5pQYHhvEaMVsCdcsDR60FVs8BZ+wBdvElLFO0xuUDZrMK5PrX4/C4w9jRJQwOEhn7tQtMVHR3lM0DZ8tticbFydcBl9YEhs4AWOopJjFTeMRldJj7xA8AK6VDTHTO09sAO8ku1/nLGhBQ1/d7kbhmNLTQAAAAgHRSTlP/////////////////////////////////////////////////////////AP///////////////////////////////////////////////////////////////////////////////////////////////////////////////yWGcNAAADSQSURBVHja7X0FextJ1q7IMBlz7MSBmZ3d/ehen65qJjFLliVZllFmZojtwAT/+j1VLWiBk8E7+z3PVmISdJ+3Dp86VfLM/C8fnj/hmt5P3s6HoNf4lwVwen7+9u0n9yNvopnj4ygfgwcn4ZNwfzism/CvCoAx4Xz9tPXXWSZKDw5O+nU+UqnU5WUqKsgR+CsBjHTKSAcXKuve5lM44VS12kbUFC3xNfSQsz8AwIOX2ePf49keb6EpcInQJ5z+05U6gjc0fBDOyO3yL1+apihqrTdBJkO/RDQ46P91GDw9aDlI/eO8Uum4TLnKfxhZRr5hdLyHaLDsQrDOpn+hUr9etD+sAGwJrlE+Jv2iGDEa77kPD16rVNM0iCQjl/A7AABk+nUl8s8Vo+Mq2TKCmN8oSPNSPL67Ny/hYxvNd+kJKrgQeM/PEcaa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';

  function actualiserAtlas() {
    const previous = { ...cache };
    Object.keys(cache).forEach(name => { delete cache[name]; });
    // Actualiser les images déjà affichées sans modifier l'interface.
    if (typeof document === 'undefined') return;
    document.querySelectorAll('img.px').forEach(img => {
      for (const name of Object.keys(previous)) {
        if (img.getAttribute('src') === previous[name]) {
          img.src = DS.spriteURL(name);
          break;
        }
      }
    });
  }

  if (typeof Image !== 'undefined' && typeof document !== 'undefined') {
    const cheminScript = document.currentScript && document.currentScript.src;
    const cheminAtlas = cheminScript
      ? new URL('../assets/icons.png', cheminScript).href
      : 'assets/icons.png';

    function chargerAtlas(src, secours) {
      const image = new Image();
      image.onload = function () {
        if (image.naturalWidth !== 192 || image.naturalHeight !== 192) {
          if (secours) chargerAtlas(atlasSecours, false);
          return;
        }
        // Vérifier que le canvas reste exportable avant de remplacer les icônes.
        try {
          const test = document.createElement('canvas');
          test.width = test.height = 1;
          test.getContext('2d').drawImage(image, 0, 0);
          test.toDataURL();
        } catch (e) {
          if (secours) chargerAtlas(atlasSecours, false);
          return;
        }
        atlas = image;
        atlasReady = true;
        actualiserAtlas();
      };
      // Si le PNG n'est pas accessible, le secours est autonome et hors ligne.
      image.onerror = function () {
        if (secours) chargerAtlas(atlasSecours, false);
      };
      image.src = src;
    }

    // En ouverture directe de index.html, utiliser une image d'origine sûre.
    if (window.location.protocol === 'file:') chargerAtlas(atlasSecours, false);
    else chargerAtlas(cheminAtlas, true);
  }
})(window.DS = window.DS || {});
