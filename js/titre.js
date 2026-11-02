/* Last Signal — écran-titre : décor système solaire pixel-art animé + menu.
   Ne lit ni ne modifie l'état de la partie ; se branche sur main.js via
   DS.titleScreen.show({ hasSave, onContinue, onNew, onImport, reduced }). */
'use strict';
(function (DS) {
  if (!DS || typeof document === 'undefined') return;

  // ------------------------------------------------------------------ styles
  const CSS = `
  #ls-titre{ position:fixed; inset:0; z-index:9000; overflow:hidden; background:var(--void,#050914);
    font-family:var(--font-ui,'Chakra Petch',system-ui,sans-serif); color:var(--ink,#e8f1ff); }
  #ls-titre[hidden]{ display:none !important; }
  #ls-titre .sky{ position:absolute; inset:0; width:100%; height:100%; image-rendering:pixelated; z-index:0; }
  #ls-titre .shade{ position:absolute; inset:0; z-index:1; pointer-events:none;
    background:linear-gradient(180deg, rgba(5,9,20,.72) 0%, rgba(5,9,20,.10) 24%, rgba(5,9,20,0) 50%, rgba(5,9,20,.4) 78%, rgba(5,9,20,.92) 100%); }
  #ls-titre .vin{ position:absolute; inset:0; z-index:1; pointer-events:none;
    background:radial-gradient(135% 105% at 50% 42%, transparent 52%, rgba(3,5,12,.6) 100%); }
  #ls-titre .stage{ position:relative; z-index:2; min-height:100%; display:flex; flex-direction:column;
    padding:max(18px,env(safe-area-inset-top,0px)) max(18px,env(safe-area-inset-right,0px)) max(18px,env(safe-area-inset-bottom,0px)) max(18px,env(safe-area-inset-left,0px)); box-sizing:border-box; }
  #ls-titre .hero{ flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:14px; }
  #ls-titre .eyebrow{ display:inline-flex; align-items:center; gap:10px; font:600 13px var(--font-px,'Tektur',sans-serif);
    letter-spacing:.26em; text-transform:uppercase; color:var(--cyan,#46d8ff); }
  #ls-titre .blip{ width:8px; height:8px; border-radius:50%; background:var(--cyan,#46d8ff); box-shadow:0 0 8px var(--cyan,#46d8ff); animation:ls-blip 1.8s ease-in-out infinite; }
  #ls-titre .logo{ font:700 clamp(46px,13vw,108px)/0.9 var(--font-px,'Tektur',sans-serif); letter-spacing:.04em; text-wrap:balance;
    background:linear-gradient(180deg,#fff 0%,#bfe8ff 45%,#4aa8ff 100%); -webkit-background-clip:text; background-clip:text; color:transparent;
    filter:drop-shadow(0 2px 0 #0a1a3a) drop-shadow(0 0 16px rgba(70,180,255,.4)); margin:0; }
  #ls-titre .mark{ width:min(300px,72%); height:2px; position:relative; background:linear-gradient(90deg,transparent,var(--cyan,#46d8ff),transparent); }
  #ls-titre .mark i{ position:absolute; left:50%; top:-5px; width:11px; height:11px; margin-left:-6px; transform:rotate(45deg); border:2px solid var(--cyan,#46d8ff); background:var(--void,#050914); }
  #ls-titre .tagline{ font:500 clamp(14px,2.4vw,18px) var(--font-ui,sans-serif); color:var(--ink-2,#a3b6d2); letter-spacing:.04em; max-width:46ch; margin:6px 0 0; }
  #ls-titre .menu{ display:flex; gap:12px; flex-wrap:wrap; justify-content:center; align-items:stretch; }
  #ls-titre .menu .btn{ flex:1 1 200px; max-width:260px; justify-content:flex-start; }
  #ls-titre .menu .btn .sub{ font:500 12px var(--font-ui,sans-serif); opacity:.85; letter-spacing:.02em; text-shadow:none; margin-left:auto; }
  #ls-titre .foot{ display:flex; gap:12px; align-items:center; justify-content:center; flex-wrap:wrap;
    font:500 13px var(--font-ui,sans-serif); color:var(--ink-3,#6c81a2); letter-spacing:.05em; margin-top:14px; }
  #ls-titre .foot a{ color:var(--cyan,#46d8ff); text-decoration:none; border-bottom:1px dotted var(--cyan-2,#1f8fd0); cursor:pointer; }
  #ls-titre .sep{ color:#2a3b5c; }
  #ls-titre .sheet{ position:absolute; inset:0; z-index:3; display:none; place-items:center; background:rgba(3,6,14,.74); padding:18px; }
  #ls-titre .sheet.on{ display:grid; }
  #ls-titre .card{ width:min(540px,96vw); max-height:88vh; overflow:auto; }
  #ls-titre .card .panel-b{ padding:16px; }
  #ls-titre .card label{ display:block; font:600 12px var(--font-px,'Tektur',sans-serif); text-transform:uppercase; letter-spacing:.1em; color:var(--cyan,#46d8ff); margin:14px 0 6px; }
  #ls-titre .card textarea{ width:100%; min-height:78px; resize:vertical; font:500 13px/1.45 var(--font-ui,sans-serif); color:var(--ink,#e8f1ff);
    background:#070e1c; border:2px solid var(--edge,#1f355a); border-radius:4px; padding:10px; word-break:break-all; box-sizing:border-box; }
  #ls-titre .card .row{ display:flex; gap:10px; flex-wrap:wrap; margin-top:10px; }
  #ls-titre .card .lead{ font:500 14px/1.5 var(--font-ui,sans-serif); color:var(--ink-2,#a3b6d2); margin:0 0 14px; }
  #ls-titre .card .msg{ font:500 13px var(--font-ui,sans-serif); margin-top:10px; min-height:20px; }
  #ls-titre .card .msg.ok{ color:var(--green,#32d874); } #ls-titre .card .msg.bad{ color:var(--red,#ff4d5e); }
  #ls-titre .x{ margin-left:auto; background:none; border:none; color:var(--ink-3,#6c81a2); font:600 14px var(--font-px,'Tektur',sans-serif); cursor:pointer; }
  #ls-titre .x:hover{ color:var(--red,#ff4d5e); }
  @keyframes ls-blip{ 0%,100%{ opacity:1 } 50%{ opacity:.25 } }
  @media (prefers-reduced-motion: reduce){ #ls-titre .blip{ animation:none } }
  #ls-titre.still .blip{ animation:none }
  @media (max-width:560px){ #ls-titre .menu .btn{ flex:1 1 100%; max-width:none } }
  `;

  function injectCSS() {
    if (document.getElementById('ls-titre-css')) return;
    const st = document.createElement('style'); st.id = 'ls-titre-css'; st.textContent = CSS;
    document.head.appendChild(st);
  }

  // ------------------------------------------------------------------ DOM
  let root = null, btnContinue = null, contInfo = null, sheet = null, expBox = null, impBox = null, sheetMsg = null;
  function el(tag, attrs, html) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) { if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]); }
    if (html != null) e.innerHTML = html;
    return e;
  }
  function build() {
    if (root) return;
    injectCSS();
    root = el('div', { id: 'ls-titre' });
    root.innerHTML =
      '<canvas class="sky" aria-hidden="true"></canvas>' +
      '<div class="shade"></div><div class="vin"></div>' +
      '<div class="stage">' +
        '<div class="hero">' +
          '<span class="eyebrow"><span class="blip"></span> Signal de détresse actif</span>' +
          '<h1 class="logo">LAST SIGNAL</h1>' +
          '<div class="mark" aria-hidden="true"><i></i></div>' +
          '<p class="tagline">Dérive. Répare. Maintiens l’équipage en vie. Transmets le dernier signal vers la Terre.</p>' +
        '</div>' +
        '<nav class="menu" aria-label="Menu principal">' +
          '<button class="btn sel big" data-act="continue"><span>Continuer</span><span class="sub"></span></button>' +
          '<button class="btn orange big" data-act="new"><span>Nouvelle partie</span></button>' +
          '<button class="btn big" data-act="code"><span>Sauvegarde par code</span></button>' +
        '</nav>' +
        '<div class="foot"><span>Last Signal</span><span class="sep">◆</span>' +
          '<a data-act="motion">Mouvement réduit</a></div>' +
      '</div>' +
      '<div class="sheet"><div class="card frame hot"><div class="panel-h"><span class="grow">Sauvegarde par code</span>' +
        '<button class="x" data-act="close">✕</button></div><div class="panel-b">' +
        '<p class="lead">Ta progression tient dans un code que tu copies et conserves, puis que tu colles sur n’importe quel appareil.</p>' +
        '<label>Ton code de sauvegarde</label><textarea class="exp" readonly spellcheck="false"></textarea>' +
        '<div class="row"><button class="btn green" data-act="copy">Copier le code</button></div>' +
        '<label>Reprendre depuis un code</label><textarea class="imp" spellcheck="false" placeholder="Colle ici un code de sauvegarde…"></textarea>' +
        '<div class="row"><button class="btn" data-act="load">Charger le code</button></div>' +
        '<div class="msg" role="status"></div>' +
      '</div></div></div>';
    document.body.appendChild(root);
    btnContinue = root.querySelector('[data-act="continue"]');
    contInfo = btnContinue.querySelector('.sub');
    sheet = root.querySelector('.sheet');
    expBox = root.querySelector('.exp');
    impBox = root.querySelector('.imp');
    sheetMsg = root.querySelector('.msg');
    setupScene(root.querySelector('.sky'));
  }

  // ------------------------------------------------------------------ logique / câblage
  let cbs = {};
  function openSheet() {
    if (cbs.exportCode) { try { expBox.value = cbs.exportCode(); } catch (e) { expBox.value = ''; } }
    sheetMsg.textContent = ''; sheetMsg.className = 'msg'; sheet.classList.add('on');
  }
  function closeSheet() { sheet.classList.remove('on'); }
  function onClick(ev) {
    const t = ev.target.closest('[data-act]'); if (!t) return;
    const act = t.getAttribute('data-act');
    if (act === 'continue') { if (!btnContinue.disabled && cbs.onContinue) cbs.onContinue(); }
    else if (act === 'new') {
      if (cbs.hasSave) confirmNew(); else if (cbs.onNew) cbs.onNew();
    }
    else if (act === 'code') openSheet();
    else if (act === 'close') closeSheet();
    else if (act === 'motion') toggleStill();
    else if (act === 'copy') doCopy();
    else if (act === 'load') doLoad();
  }
  function confirmNew() {
    sheetMsg.textContent = ''; sheetMsg.className = 'msg';
    // confirmation inline dans la feuille
    expBox.closest('.card').querySelector('.panel-h .grow').textContent = 'Nouvelle partie';
    sheet.classList.add('on');
    const lead = sheet.querySelector('.lead');
    lead.innerHTML = 'Une sauvegarde existe déjà. Démarrer une nouvelle partie <b>efface la progression actuelle</b> de cet appareil. Pense à exporter ton code avant, si tu veux la garder.';
    // réaffecte les boutons temporairement
    const row = sheet.querySelectorAll('.row');
    row[1].innerHTML = '<button class="btn red" data-act="confirm-new">Tout effacer et commencer</button><button class="btn dark" data-act="close">Annuler</button>';
    sheet.querySelector('[data-act="confirm-new"]').addEventListener('click', () => { closeSheet(); if (cbs.onNew) cbs.onNew(); });
  }
  function doCopy() {
    expBox.focus(); expBox.select();
    const done = () => { sheetMsg.className = 'msg ok'; sheetMsg.textContent = 'Code copié.'; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(expBox.value).then(done, () => { sheetMsg.className = 'msg ok'; sheetMsg.textContent = 'Code sélectionné — Ctrl/Cmd+C pour copier.'; });
    else { try { document.execCommand('copy'); done(); } catch (e) { sheetMsg.className = 'msg bad'; sheetMsg.textContent = 'Copie impossible — sélectionnez puis Ctrl/Cmd+C.'; } }
  }
  function doLoad() {
    const code = (impBox.value || '').trim();
    if (!code) { sheetMsg.className = 'msg bad'; sheetMsg.textContent = 'Colle d’abord un code.'; return; }
    const ok = cbs.onImport ? cbs.onImport(code) : false;
    if (!ok) { sheetMsg.className = 'msg bad'; sheetMsg.textContent = 'Ce code de sauvegarde est invalide.'; }
  }
  let still = false;
  function toggleStill() { still = !still; root.classList.toggle('still', still); if (still) stopScene(); else startScene(); }

  // ------------------------------------------------------------------ API publique
  DS.titleScreen = {
    show: function (opts) {
      build();
      cbs = opts || {};
      still = !!cbs.reduced;
      root.classList.toggle('still', still);
      btnContinue.disabled = !cbs.hasSave;
      contInfo.textContent = cbs.hasSave ? (cbs.resume || 'reprendre la partie') : '';
      // restaure l'état de la feuille (au cas où confirmNew l'ait modifiée)
      sheet.querySelector('.panel-h .grow').textContent = 'Sauvegarde par code';
      sheet.querySelector('.lead').innerHTML = 'Ta progression tient dans un code que tu copies et conserves, puis que tu colles sur n’importe quel appareil.';
      sheet.querySelectorAll('.row')[1].innerHTML = '<button class="btn" data-act="load">Charger le code</button>';
      closeSheet();
      root.hidden = false;
      root.removeEventListener('click', onClick); root.addEventListener('click', onClick);
      if (!still) startScene(); else renderOnce();
    },
    hide: function () { if (!root) return; stopScene(); root.hidden = true; }
  };

  // ================================================================== décor : système solaire pixel-art
  let cvs, ctx, buf, bx, bufImg, D, D32, BW = 1, BH = 1, dpr = 1, cx = 0, cy = 0, sunR = 12, base = null, raf = 0, stars = [], belt = [], comet = null, cometTimer = 4, t = 0, last = 0, built = false;
  const ART = 2, TW = 128, TH = 64, BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

  function h3(x, y, z) { let n = (x * 374761393 + y * 668265263 + z * 1274126177) | 0; n = (n ^ (n >> 13)) * 1274126177 | 0; return ((n ^ (n >> 16)) >>> 0) / 4294967295; }
  function sm(a) { return a * a * (3 - 2 * a); }
  function vn(x, y, z) { const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi, u = sm(xf), v = sm(yf), w = sm(zf);
    function L(a, b, f) { return a + (b - a) * f; }
    const c000 = h3(xi, yi, zi), c100 = h3(xi + 1, yi, zi), c010 = h3(xi, yi + 1, zi), c110 = h3(xi + 1, yi + 1, zi), c001 = h3(xi, yi, zi + 1), c101 = h3(xi + 1, yi, zi + 1), c011 = h3(xi, yi + 1, zi + 1), c111 = h3(xi + 1, yi + 1, zi + 1);
    return L(L(L(c000, c100, u), L(c010, c110, u), v), L(L(c001, c101, u), L(c011, c111, u), v), w); }
  function pfbm(u01, lat, seed, oct) { const a = u01 * 6.2832; let s = 0, amp = .5, fr = 1.5; oct = oct || 4;
    for (let o = 0; o < oct; o++) { s += amp * vn(Math.cos(a) * fr * 2 + seed * 13, Math.sin(a) * fr * 2, lat * fr * 2.2 + seed * 7); fr *= 2; amp *= .5; } return s; }
  function cl(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

  function genTex(type, seed) {
    const T = new Uint8Array(TW * TH * 3);
    for (let v = 0; v < TH; v++) { const lat = v / TH - 0.5, alat = Math.abs(lat);
      for (let u = 0; u < TW; u++) { const o = (v * TW + u) * 3; let r, g, b; const n = pfbm(u / TW, lat, seed, 4);
        if (type === 'terra') {
          if (n < 0.47) { const d = n / 0.47; r = 14 + d * 22; g = 40 + d * 70; b = 90 + d * 95; }
          else { const d = (n - 0.47) / 0.53; r = 40 + d * 120; g = 110 + d * 90; b = 50 + d * 40; if (d > 0.7) { r = 120 + d * 80; g = 120 + d * 70; b = 90 + d * 60; } }
          if (alat > 0.40) { const ic = (alat - 0.40) / 0.10; r = cl(r + ic * 180); g = cl(g + ic * 190); b = cl(b + ic * 200); }
          const c = pfbm(u / TW + 3.3, lat, seed + 5, 3); if (c > 0.60) { const k = (c - 0.6) / 0.4; r = cl(r * (1 - k) + 235 * k); g = cl(g * (1 - k) + 240 * k); b = cl(b * (1 - k) + 245 * k); }
        } else if (type === 'ice') { const ba = 0.55 + n * 0.45; r = 150 * ba + 40; g = 200 * ba + 30; b = 235 * ba + 20;
          const cr = pfbm(u / TW + 1.1, lat * 3, seed + 2, 3); if (cr > 0.66) { r *= 0.6; g *= 0.68; b *= 0.8; } if (alat > 0.42) { r = cl(r + 60); g = cl(g + 45); b = cl(b + 30); }
        } else if (type === 'mars') { const e = n; r = 120 + e * 120; g = 55 + e * 70; b = 30 + e * 35;
          const cr = pfbm(u / TW + 2.2, lat * 2, seed + 4, 4); if (cr > 0.70) { r *= 0.7; g *= 0.62; b *= 0.6; } if (alat > 0.44) { r = cl(r + 90); g = cl(g + 90); b = cl(b + 95); }
        } else if (type === 'violet') { const e = 0.4 + n * 0.6; r = 120 * e + 60; g = 60 * e + 30; b = 150 * e + 70;
          const m = pfbm(u / TW + 4.4, lat * 2, seed + 3, 3); if (m > 0.62) { r = cl(r + 40); b = cl(b + 50); }
        } else if (type === 'gas') { const band = Math.sin(lat * 20 + pfbm(u / TW, lat, seed, 2) * 3), t2 = band * 0.5 + 0.5;
          r = 150 + t2 * 105; g = 110 + t2 * 95; b = 50 + t2 * 60; if (band < -0.4) { r = 120 + t2 * 40; g = 80 + t2 * 30; b = 40; }
          const dx = Math.min(Math.abs(u / TW - 0.32), 1 - Math.abs(u / TW - 0.32)), dy = lat - 0.08; if (dx * dx * 3.2 + dy * dy * 9 < 0.010) { r = 210; g = 95; b = 60; }
        } else if (type === 'icegiant') { const band = Math.sin(lat * 16 + pfbm(u / TW, lat, seed, 2) * 2.2), t2 = band * 0.5 + 0.5; r = 120 + t2 * 90; g = 190 + t2 * 45; b = 215 + t2 * 40;
        } else { const e = n; r = 30 + e * 48; g = 40 + e * 54; b = 58 + e * 70; const m = pfbm(u / TW + 6, lat * 2, seed + 1, 3); if (m > 0.7) { r += 20; g += 24; b += 30; } }
        T[o] = cl(r); T[o + 1] = cl(g); T[o + 2] = cl(b);
      } }
    return T;
  }

  const PLANETS = [
    { type: 'terra', orbitF: 0.155, rF: 0.050, orbSp: 0.22, spin: 0.16, ph: 0.3, atm: [90, 150, 210], moons: [{ mr: 1.9, sp: 1.1, r: 0.2 }] },
    { type: 'ice', orbitF: 0.225, rF: 0.040, orbSp: 0.175, spin: 0.20, ph: 2.1, atm: [120, 200, 235] },
    { type: 'mars', orbitF: 0.300, rF: 0.046, orbSp: 0.135, spin: 0.13, ph: 4.0, atm: [180, 110, 70], moons: [{ mr: 1.8, sp: 1.5, r: 0.14 }] },
    { type: 'violet', orbitF: 0.385, rF: 0.044, orbSp: 0.105, spin: 0.11, ph: 1.1, atm: [150, 100, 200] },
    { type: 'gas', orbitF: 0.520, rF: 0.095, orbSp: 0.072, spin: 0.09, ph: 3.2, ring: [1.18, 1.66, [214, 182, 124]], moons: [{ mr: 2.0, sp: 1.7, r: 0.12 }, { mr: 2.7, sp: 1.0, r: 0.15 }] },
    { type: 'icegiant', orbitF: 0.645, rF: 0.066, orbSp: 0.052, spin: 0.08, ph: 5.3, ring: [1.16, 1.52, [165, 208, 228]], atm: [120, 200, 220] },
    { type: 'dark', orbitF: 0.750, rF: 0.050, orbSp: 0.034, spin: 0.05, ph: 2.6, atm: [70, 90, 120] }
  ];
  let texReady = false;
  function ensureTex() { if (texReady) return; for (const p of PLANETS) p.tex = genTex(p.type, (p.type.length * 7) % 17 + 1); texReady = true; }

  function buildGeom(p) {
    const r = p.rr, R = r + 0.6, gx = [], gy = [], anx = [], any = [], anz = [], au = [], av = [], ar = [], ab = [];
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const d2 = x * x + y * y; if (d2 > R * R) continue;
      const d = Math.sqrt(d2), nz = Math.sqrt(Math.max(0, r * r - d2)) / r, nx = x / r, ny = y / r;
      let uB = Math.atan2(nx, nz === 0 ? 0.0001 : nz) / 6.2832; uB -= Math.floor(uB);
      const vI = Math.max(0, Math.min(TH - 1, ((Math.asin(Math.max(-1, Math.min(1, ny))) / Math.PI) + 0.5) * TH | 0));
      const edge = d > r - 1.4 ? Math.min(1, (d - (r - 1.4)) / 1.4) : 0;
      gx.push(x); gy.push(y); anx.push(nx); any.push(ny); anz.push(nz); au.push(uB); av.push(vI); ar.push(edge); ab.push((((y % 4) + 4) % 4) * 4 + (((x % 4) + 4) % 4));
    }
    p.gn = gx.length; p.gx = Int16Array.from(gx); p.gy = Int16Array.from(gy);
    p.nx = Float32Array.from(anx); p.ny = Float32Array.from(any); p.nz = Float32Array.from(anz);
    p.gu = Float32Array.from(au); p.gv = Uint16Array.from(av); p.gr = Float32Array.from(ar); p.gb = Uint8Array.from(ab);
  }

  function px(x, y, r, g, b) { if (x < 0 || y < 0 || x >= BW || y >= BH) return; r = r > 255 ? 255 : r < 0 ? 0 : r | 0; g = g > 255 ? 255 : g < 0 ? 0 : g | 0; b = b > 255 ? 255 : b < 0 ? 0 : b | 0; D32[y * BW + x] = (0xff000000 | (b << 16) | (g << 8) | r) >>> 0; }
  function pxA(x, y, r, g, b, a) { if (x < 0 || y < 0 || x >= BW || y >= BH) return; const o = (y * BW + x) * 4; D[o] = D[o] * (1 - a) + r * a; D[o + 1] = D[o + 1] * (1 - a) + g * a; D[o + 2] = D[o + 2] * (1 - a) + b * a; }

  function drawPlanet(p, qx, qy) {
    qx = qx | 0; qy = qy | 0;
    const tex = p.tex, n = p.gn, GX = p.gx, GY = p.gy, NX = p.nx, NY = p.ny, NZ = p.nz, GU = p.gu, GV = p.gv, GR = p.gr, GB = p.gb;
    let lx = cx - qx, ly = cy - qy; const ln = Math.hypot(lx, ly) || 1; lx = lx / ln * 0.86; ly = ly / ln * 0.86; const lz = 0.5;
    const rot = p.spin * t, atm = p.atm, a0 = atm ? atm[0] * 0.5 : 0, a1 = atm ? atm[1] * 0.5 : 0, a2 = atm ? atm[2] * 0.5 : 0;
    for (let i = 0; i < n; i++) {
      let diff = NX[i] * lx + NY[i] * ly + NZ[i] * lz; if (diff < 0) diff = 0;
      let lm = 0.10 + 1.02 * diff + (BAYER[GB[i]] * 0.0625 - 0.5) * 0.12;
      lm = ((lm * 6 + 0.5) | 0) / 6; if (lm < 0) lm = 0; else if (lm > 1.25) lm = 1.25;
      let u = GU[i] + rot; u -= Math.floor(u); const ti = (GV[i] * TW + ((u * TW) | 0)) * 3;
      let R = tex[ti] * lm, G = tex[ti + 1] * lm, B = tex[ti + 2] * lm;
      const rm = GR[i]; if (rm > 0 && atm) { const gg = rm * (0.25 + 0.75 * diff); R += a0 * gg; G += a1 * gg; B += a2 * gg; }
      const X = qx + GX[i], Y = qy + GY[i];
      if (X >= 0 && Y >= 0 && X < BW && Y < BH) { const r8 = R > 255 ? 255 : R | 0, g8 = G > 255 ? 255 : G | 0, b8 = B > 255 ? 255 : B | 0; D32[Y * BW + X] = (0xff000000 | (b8 << 16) | (g8 << 8) | r8) >>> 0; }
    }
  }
  function drawRing(qx, qy, r, ring, side) {
    const i0 = ring[0], i1 = ring[1], col = ring[2], flat = 0.30;
    for (let a = 0; a < 6.2832; a += 0.02) { const sa = Math.sin(a), behind = sa < 0; if (side === 'back' ? !behind : behind) continue; const ca = Math.cos(a);
      for (let rr = i0; rr <= i1; rr += 0.07) { const band = Math.sin((rr - i0) / (i1 - i0) * 9.2); if (band < -0.1) continue;
        const x = qx + ca * r * rr, y = qy + sa * r * rr * flat, al = (behind ? 0.4 : 0.72) * (0.6 + 0.4 * band), f = 0.7 + 0.3 * band;
        pxA(x | 0, y | 0, col[0] * f, col[1] * f, col[2] * f, al); } }
  }
  function drawMoon(qx, qy, r, m) { const a = t * m.sp + (m.ph || 0), mx = qx + Math.cos(a) * r * m.mr, my = qy + Math.sin(a) * r * m.mr * 0.5, mr = Math.max(1, r * m.r);
    let lx = cx - mx, ly = cy - my; const ln = Math.hypot(lx, ly) || 1; lx /= ln; ly /= ln;
    for (let y = -mr; y <= mr; y++) for (let x = -mr; x <= mr; x++) { const d2 = x * x + y * y; if (d2 > mr * mr) continue;
      const nz = Math.sqrt(Math.max(0, mr * mr - d2)) / mr, diff = Math.max(0, (x / mr) * lx + (y / mr) * ly + nz * 0.5), l = 0.18 + diff;
      px(mx + x | 0, my + y | 0, 150 * l, 156 * l, 170 * l); } }
  function drawSun() {
    const r = sunR, pulse = 0.5 + 0.5 * Math.sin(t * 1.4);
    for (let k = 5; k >= 1; k--) { const rr = r + k * 3.1, al = (0.06 + 0.03 * pulse) * (k / 5); for (let a = 0; a < 6.2832; a += 0.05) { const n = 0.6 + 0.4 * Math.sin(a * 6 + t * 2 + k); pxA(cx + Math.cos(a) * rr | 0, cy + Math.sin(a) * rr | 0, 255, 154, 46, al * n); } }
    for (let fl = 0; fl < 3; fl++) { const a = t * 0.5 + fl * 2.1, len = r * (1.2 + 0.5 * Math.sin(t * 2 + fl)); for (let s = r; s < len; s += 0.6) { const k = (s - r) / (len - r); pxA(cx + Math.cos(a) * s | 0, cy + Math.sin(a) * s | 0, 255, 200, 90, (1 - k) * 0.5); } }
    for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) { const d2 = x * x + y * y; if (d2 > (r + 0.5) * (r + 0.5)) continue;
      const d = Math.sqrt(d2), v = d / r, shim = 0.95 + 0.05 * Math.sin(d * 0.8 - t * 3), lite = 1 + 0.06 * (-(x + y) / r), f = shim * lite;
      const c = v < 0.4 ? [255, 246, 214] : v < 0.72 ? [255, 212, 70] : v < 0.9 ? [255, 176, 62] : [255, 150, 44];
      px(cx + x, cy + y, c[0] * f, c[1] * f, c[2] * f); } }
  function baseBlend(x, y, r, g, b, a) { if (x < 0 || y < 0 || x >= BW || y >= BH) return; const o = (y * BW + x) * 4; base[o] = base[o] * (1 - a) + r * a; base[o + 1] = base[o + 1] * (1 - a) + g * a; base[o + 2] = base[o + 2] * (1 - a) + b * a; }
  function hash(i) { let h = (i * 2654435761) >>> 0; h ^= h >> 15; return (h >>> 0) / 4294967295; }

  function buildBase() {
    base = new Uint8ClampedArray(BW * BH * 4);
    for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) { const o = (y * BW + x) * 4; let r = 5, g = 9, b = 20;
      const hx = 1 - Math.min(1, Math.hypot(x - BW * 0.75, y + BH * 0.1) / (BW * 0.7)); r += hx * 14; g += hx * 22; b += hx * 40;
      const band = Math.max(0, 1 - Math.abs(y - BH * 0.6) / (BH * 0.5)), nb = Math.max(0, pfbm(x / BW, y / BH * 1.5, 9, 4) * band - 0.25);
      r += nb * 22; g += nb * 48; b += nb * 70; base[o] = r; base[o + 1] = g; base[o + 2] = b; base[o + 3] = 255; }
    for (const p of PLANETS) for (let a = 0; a < 6.2832; a += 0.01) baseBlend(cx + Math.cos(a) * p.orbit | 0, cy + Math.sin(a) * p.orbit * 0.96 | 0, 90, 120, 170, 0.13);
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    D.set(base);
    for (const s of stars) { const tw = 0.4 + 0.6 * Math.sin(t * s.tg + s.tw); if (s.s > 1) { pxA(s.x, s.y, 220, 235, 255, tw); pxA(s.x + 1, s.y, 150, 175, 210, tw * 0.7); pxA(s.x, s.y + 1, 150, 175, 210, tw * 0.7); } else pxA(s.x, s.y, 160, 185, 220, tw * 0.9); }
    cometTimer -= dt; if (!comet && cometTimer <= 0) comet = { x: BW * 1.05, y: BH * (0.1 + Math.random() * 0.3), vx: -(BW * 0.16), vy: BH * 0.07 };
    if (comet) { comet.x += comet.vx * dt; comet.y += comet.vy * dt; for (let s = 0; s < 22; s++) { const a = 1 - s / 22; pxA((comet.x + s * 3) | 0, (comet.y - s * 1.3) | 0, 180, 225, 255, a * 0.5); } px(comet.x | 0, comet.y | 0, 255, 255, 255); if (comet.x < -30) { comet = null; cometTimer = 10 + Math.random() * 12; } }
    for (const z of belt) { const a = z.a + t * 0.03; pxA(cx + Math.cos(a) * z.r | 0, cy + Math.sin(a) * z.r * 0.96 | 0, 150, 140, 130, 0.8); }
    drawSun();
    for (const p of PLANETS) { const a = p.ph + t * p.orbSp, qx = cx + Math.cos(a) * p.orbit, qy = cy + Math.sin(a) * p.orbit * 0.96;
      if (p.ring) drawRing(qx, qy, p.rr, p.ring, 'back'); drawPlanet(p, qx, qy);
      if (p.ring) drawRing(qx, qy, p.rr, p.ring, 'front'); if (p.moons) for (const m of p.moons) drawMoon(qx, qy, p.rr, m); }
    bx.putImageData(bufImg, 0, 0); ctx.imageSmoothingEnabled = false; ctx.drawImage(buf, 0, 0, BW, BH, 0, 0, cvs.width, cvs.height);
    if (running) raf = requestAnimationFrame(frame);
  }
  let running = false;
  function renderOnce() { if (!cvs) return; cancelAnimationFrame(raf); running = false; frame(performance.now()); }
  function startScene() { if (!cvs) return; cancelAnimationFrame(raf); running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  function stopScene() { running = false; cancelAnimationFrame(raf); }

  function resize() {
    if (!cvs) return;
    dpr = Math.max(1, Math.min(2, Math.round(window.devicePixelRatio || 1)));
    BW = Math.ceil(window.innerWidth / ART); BH = Math.ceil(window.innerHeight / ART);
    buf.width = BW; buf.height = BH; bufImg = bx.createImageData(BW, BH); D = bufImg.data; D32 = new Uint32Array(D.buffer);
    cvs.width = BW * ART * dpr; cvs.height = BH * ART * dpr; cvs.style.width = (BW * ART) + 'px'; cvs.style.height = (BH * ART) + 'px';
    cx = Math.round(BW * 0.72); cy = Math.round(BH * 0.30); sunR = Math.max(12, Math.round(BH * 0.075));
    for (const p of PLANETS) { p.orbit = Math.round(BH * p.orbitF); p.rr = Math.max(5, Math.round(BH * p.rF)); buildGeom(p); }
    stars = []; const nS = Math.round(BW * BH / 1500); for (let i = 0; i < nS; i++) stars.push({ x: hash(i * 3) * BW | 0, y: hash(i * 3 + 1) * BH | 0, s: hash(i * 3 + 2) > .92 ? 2 : 1, tw: hash(i * 7) * 6.28, tg: 0.5 + hash(i * 5) * 2 });
    belt = []; const br = BH * 0.455; for (let i = 0; i < 160; i++) belt.push({ a: hash(i * 11) * 6.283, r: br + (hash(i * 13) - 0.5) * BH * 0.04 });
    buildBase();
    if (!running) renderOnce();
  }

  function setupScene(canvas) {
    if (built) return; built = true;
    cvs = canvas; ctx = cvs.getContext('2d'); ctx.imageSmoothingEnabled = false;
    buf = document.createElement('canvas'); bx = buf.getContext('2d'); bx.imageSmoothingEnabled = false;
    ensureTex(); resize();
    window.addEventListener('resize', () => { if (root && !root.hidden) resize(); });
  }
})(window.DS);
