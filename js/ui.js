/* Dernier Signal — interface (construction du DOM et mises à jour ciblées). */
'use strict';
(function (DS) {
  const ui = DS.ui = { tab: 'ship', buyMode: 1, s: null, scene: null, newTabs: new Set(), pointer: null, lastSave: 0, cloud: 'local' };
  const $ = id => document.getElementById(id);
  const fmt = (n, d) => DS.fmt(n, d);
  const RES = DS.RES;
  const modById = id => DS.MODULES.find(m => m.id === id);

  // ------------------------------------------------------------------ fabrique d'éléments
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    if (props) for (const k in props) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
    return el;
  }
  function img(name, cls) {
    const e = document.createElement('img');
    e.className = 'px' + (cls ? ' ' + cls : '');
    e.src = DS.spriteURL(name);
    e.alt = '';
    e.setAttribute('aria-hidden', 'true');
    e.draggable = false;
    return e;
  }
  const I = name => DS.icon(name);

  // ------------------------------------------------------------------ liaisons
  class Binder {
    constructor() { this.fns = []; }
    add(fn) { this.fns.push(fn); fn(); }
    run() { for (const f of this.fns) f(); }
    clear() { this.fns.length = 0; }
  }
  function mk(b) {
    const B = {
      b,
      text: (el, fn) => b.add(() => { const v = String(fn()); if (el._t !== v) { el._t = v; el.textContent = v; } }),
      html: (el, fn) => b.add(() => { const v = fn(); if (el._h !== v) { el._h = v; el.innerHTML = v; } }),
      cls: (el, c, fn) => b.add(() => { const v = !!fn(), k = '_c_' + c; if (el[k] !== v) { el[k] = v; el.classList.toggle(c, v); } }),
      dis: (el, fn) => b.add(() => { const v = !!fn(); if (el.disabled !== v) el.disabled = v; }),
      hide: (el, fn) => b.add(() => { const v = !!fn(); if (el.hidden !== v) el.hidden = v; }),
      style: (el, p, fn) => b.add(() => { const v = String(fn()), k = '_s_' + p; if (el[k] !== v) { el[k] = v; el.style.setProperty(p, v); } }),
      attr: (el, a, fn) => b.add(() => { const v = String(fn()), k = '_a_' + a; if (el[k] !== v) { el[k] = v; el.setAttribute(a, v); } }),
      on: fn => b.add(fn),
      region(el, sig, build) {
        const rb = new Binder(), RB = mk(rb);
        b.add(() => {
          const g = String(sig());
          if (g !== el._sig) { el._sig = g; el.replaceChildren(); rb.clear(); build(el, RB); }
          rb.run();
        });
      },
      bar(fn, color, thin) {
        const i = h('i'), el = h('div', { class: 'bar' + (thin ? ' thin' : '') }, i);
        if (color) el.style.setProperty('--bc', color);
        B.style(i, 'width', () => Math.max(0, Math.min(100, fn() * 100)).toFixed(1) + '%');
        return el;
      }
    };
    return B;
  }
  const BIND = { nav: new Binder(), top: new Binder(), right: new Binder(), view: new Binder() };

  // ------------------------------------------------------------------ petits rendus
  const costHTML = (s, cost) => Object.keys(cost).map(r =>
    '<span class="cost' + (s.res[r] + 1e-9 < cost[r] ? ' miss' : '') + '">' + I(RES[r].icon) + fmt(cost[r]) + '</span>').join('');
  const rateTxt = v => (v > 0 ? '+' : '') + fmt(v) + '/s';
  const rateCls = v => (v > 1e-6 ? 'pos' : v < -1e-6 ? 'neg' : 'zero');
  function fxHTML(fx, risk) {
    const out = [];
    for (const k in fx) {
      const v = fx[k];
      if (RES[k]) out.push('<span class="pill ' + (v >= 0 ? 'green' : 'red') + '">' + (v >= 0 ? '+' : '−') + fmt(Math.abs(v)) + ' ' + RES[k].unit + '</span>');
      else if (k === 'hull') out.push('<span class="pill ' + (v >= 0 ? 'green' : 'red') + '">' + (v >= 0 ? '+' : '−') + Math.abs(v) + ' % coque</span>');
      else if (k === 'crew') out.push('<span class="pill green">+' + v + ' membre d’équipage</span>');
      else if (k === 'echoes') out.push('<span class="pill">+' + v + ' écho stellaire</span>');
      else if (k === 'specimen') out.push('<span class="pill green">+' + fmt(v) + ' XP Spécimen</span>');
    }
    if (risk) out.push('<span class="pill amber">' + Math.round(risk.p * 100) + ' % de risque : ' + fxPlain(risk.fx) + '</span>');
    if (!out.length) out.push('<span class="pill">Aucun effet</span>');
    return out.join('');
  }
  function fxPlain(fx) {
    return Object.keys(fx).map(k => k === 'hull' ? (fx[k] > 0 ? '+' : '−') + Math.abs(fx[k]) + ' % coque' : (RES[k] ? fmt(fx[k]) + ' ' + RES[k].unit : '')).join(', ');
  }
  function act(fn) { return ev => { fn(ev); ui.render(true); }; }
  const clockTime = t => new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  function perLevel(s, m) {
    const c = DS.c(s), E = c.E, L = s.mods[m.id] || 0;
    const out = [];
    if (m.prod) for (const r in m.prod) out.push('+' + fmt(m.prod[r] * DS.milestoneMul(L + 1) * (E.mod[m.id] || 1) * c.rm[r]) + ' ' + RES[r].unit + '/s');
    if (m.hull) out.push('+' + fmt(m.hull * DS.milestoneMul(L + 1) * (E.mod[m.id] || 1) * E.hullRegen, 3) + ' % coque/s');
    if (m.cap) for (const r in m.cap) out.push('+' + fmt(m.cap[r] * E.cap) + ' de capacité (' + RES[r].unit + ')');
    if (m.crewCap) out.push('+' + m.crewCap + ' capsules d’équipage');
    return out.join(' • ');
  }
  function totalOut(s, m) {
    const c = DS.c(s), o = c.out[m.id];
    if (m.hull && s.mods[m.id]) return '+' + fmt(c.regen, 3) + ' % coque/s';
    if (!o || !Object.keys(o).length) return '—';
    return Object.keys(o).map(r => '+' + fmt(o[r]) + ' ' + RES[r].unit + '/s').join(' • ');
  }
  function upkeep(m) {
    return m.use ? Object.keys(m.use).map(r => '−' + fmt(m.use[r]) + ' ' + RES[r].unit + '/s').join(' • ') : '';
  }

  // Modules conseillés sur l'écran principal
  function recommend(s) {
    const c = DS.c(s);
    const out = [];
    const add = id => { const m = modById(id); if (m && DS.modUnlocked(s, m) && !out.includes(id)) out.push(id); };
    if (c.net.oxygen < 0) add('condenser');
    if (c.net.food < 0) add('greenhouse');
    if (c.net.energy < 0 || c.ratio.energy < 1) add('solar');
    if (c.net.ice < 0 || c.ratio.ice < 1) add('collector');
    const rest = DS.MODULES.filter(m => DS.modUnlocked(s, m) && !out.includes(m.id) && m.id !== 'cryo');
    rest.sort((a, b) => {
      const za = (s.mods[a.id] || 0) === 0 ? 0 : 1, zb = (s.mods[b.id] || 0) === 0 ? 0 : 1;
      if (za !== zb && s.stats.time < 1200) return za - zb;
      const ca = DS.modCost(s, a, 1), cb = DS.modCost(s, b, 1);
      return (ca.metal || 0) + (ca.alloy || 0) * 30 - (cb.metal || 0) - (cb.alloy || 0) * 30;
    });
    for (const m of rest) { if (out.length >= 4) break; add(m.id); }
    return out.slice(0, 4);
  }

  // ------------------------------------------------------------------ navigation
  function tabDot(s, id) {
    const c = DS.c(s);
    switch (id) {
      case 'research': return DS.RESEARCH.some(r => !s.research[r.id] && DS.researchVisible(s, r) && DS.has(s, r.cost));
      case 'crew': return s.crew.total > DS.assigned(s);
      case 'exps': return s.exps.length < c.E.slots && DS.EXPEDITIONS.some(x => DS.expUnlocked(s, x) && !s.exps.some(e => e.id === x.id) && DS.has(s, x.cost));
      case 'nav': return DS.canJump(s) || DS.ARCHIVES.some(a => !(a.max && (s.archives[a.id] || 0) >= a.max) && s.echoes >= DS.archiveCost(s, a));
      case 'signal': return DS.fragGain(s) >= 1 || (s.research.antenna && DS.ANTENNA[s.signal.antenna] && DS.has(s, DS.ANTENNA[s.signal.antenna].cost));
      default: return false;
    }
  }
  function buildNav() {
    const s = ui.s;
    BIND.nav.clear();
    const B = mk(BIND.nav);
    const tabs = DS.tabs(s);
    for (const navEl of [$('nav'), $('mobile-nav')]) {
      navEl.replaceChildren();
      for (const t of tabs) {
        const dot = h('i', { class: 'dot', hidden: true }), nw = h('span', { class: 'new', hidden: true }, 'NOUVEAU');
        const b = h('button', { class: 'nav-btn', type: 'button', onclick: () => ui.go(t.id) }, img(t.icon), h('span', null, t.label), dot, nw);
        B.cls(b, 'active', () => ui.tab === t.id);
        B.attr(b, 'aria-current', () => (ui.tab === t.id ? 'page' : 'false'));
        B.hide(dot, () => ui.tab === t.id || ui.newTabs.has(t.id) || !tabDot(s, t.id));
        B.hide(nw, () => !ui.newTabs.has(t.id) || ui.tab === t.id);
        navEl.append(b);
      }
    }
    ui.navSig = tabs.map(t => t.id).join();
  }

  // ------------------------------------------------------------------ barre du haut
  function buildTop() {
    const s = ui.s;
    BIND.top.clear();
    const B = mk(BIND.top);
    const bar = $('res-bar');
    bar.replaceChildren();
    for (const r of DS.RES_ORDER) {
      const val = h('span', { class: 'res-val num' }), rate = h('span', { class: 'res-rate num' });
      const tile = h('div', { class: 'res frame' }, img(RES[r].icon), h('div', { class: 'res-txt' }, h('span', { class: 'res-name' }, RES[r].name), val, rate));
      if (RES[r].capped) {
        const i = h('i');
        const cap = h('div', { class: 'res-cap' }, i);
        cap.style.setProperty('--rc', RES[r].color);
        B.style(i, 'width', () => Math.min(100, s.res[r] / Math.max(1, DS.c(s).caps[r]) * 100).toFixed(1) + '%');
        tile.append(cap);
      }
      B.hide(tile, () => !s.seen[r]);
      B.text(val, () => DS.fmtInt(s.res[r]));
      B.text(rate, () => rateTxt(DS.c(s).net[r]));
      B.attr(rate, 'class', () => 'res-rate num ' + rateCls(DS.c(s).net[r]));
      B.cls(tile, 'low', () => (r === 'oxygen' || r === 'food') && DS.c(s).net[r] < 0 && s.res[r] < DS.c(s).caps[r] * 0.15);
      B.attr(tile, 'title', () => RES[r].name + ' : ' + fmt(s.res[r]) + (RES[r].capped ? ' / ' + fmt(DS.c(s).caps[r]) : '') +
        '\nProduction : +' + fmt(DS.c(s).prod[r]) + '/s\nConsommation : −' + fmt(DS.c(s).cons[r]) + '/s');
      bar.append(tile);
    }
    // messagerie
    const mail = $('mail-btn');
    if (!mail.querySelector('img')) mail.prepend(img('mail'));
    const badge = mail.querySelector('.badge');
    badge.textContent = '1';
    B.hide(badge, () => !s.event.pending);
    B.cls(mail, 'ping', () => !!s.event.pending);
    mail.onclick = () => ui.openEvent();
    const opt = $('opt-btn');
    if (!opt.querySelector('img')) opt.append(img('gear'));
    opt.onclick = () => ui.go('options');
    // carte du secteur
    const sc = $('sector-card');
    sc.replaceChildren();
    const name = h('h3'), sub = h('small'), pl = h('img', { alt: '' });
    sc.append(h('div', { class: 'sc-txt' }, name, sub, B.bar(() => (s.run.time % 60) / 60, '#46d8ff', true)), pl);
    B.text(name, () => DS.sector(s.sector).name);
    B.text(sub, () => 'Cycle ' + (s.jumps + 1) + ' · Jour ' + (Math.floor(s.run.time / 60) + 1));
    B.attr(pl, 'src', () => DS.planetURL(DS.sector(s.sector).planet, 54, 3 + s.sector * 5));
    sc.onclick = () => { if (s.flags.nav) ui.go('nav'); };
    // statistiques de la barre latérale
    const st = $('side-stats');
    st.replaceChildren();
    const row = (icon, label, fn, show) => {
      const b = h('b', { class: 'num' }), r = h('div', { class: 'row' }, img(icon), label, b);
      B.text(b, fn);
      if (show) B.hide(r, () => !show());
      st.append(r);
    };
    row('crew', 'Équipage', () => s.crew.total + ' / ' + DS.c(s).crewMax);
    row('echo', 'Échos', () => fmt(s.echoes), () => s.echoesEarned > 0 || s.jumps > 0);
    row('fragment', 'Fragments', () => fmt(s.signal.fragments), () => s.signal.earned > 0);
    row('clock', 'Survie', () => DS.fmtTime(s.stats.time));
  }

  // ------------------------------------------------------------------ colonne de droite
  function buildRight() {
    const s = ui.s;
    BIND.right.clear();
    const B = mk(BIND.right);
    const root = $('right');
    root.replaceChildren();

    // État du vaisseau
    const meters = h('div', { class: 'meters' });
    const meter = (icon, name, val, max, color, sub) => {
      const v = h('span', { class: 'm-val num' }), sb = h('span', { class: 'm-sub' });
      meters.append(h('div', { class: 'meter' }, img(icon), h('span', { class: 'm-name' }, name), B.bar(() => val() / max(), color), v, sb));
      B.text(v, () => Math.floor(val() / max() * 100) + ' %');
      B.text(sb, sub);
    };
    const c = () => DS.c(s);
    const emptyIn = r => { const n = c().net[r]; return n < -1e-6 ? ' • vide dans ' + DS.fmtTime(s.res[r] / -n) : ''; };
    meter('hull', 'Coque', () => s.hull, () => 100, '#ff9a2e', () => (c().hullNet >= 0 ? 'Réparation +' : 'Usure −') + fmt(Math.abs(c().hullNet), 3) + ' %/s' + (s.hull < 50 ? ' • rendement ' + Math.round(c().hullEff * 100) + ' %' : ''));
    meter('oxygen', 'Oxygène', () => s.res.oxygen, () => c().caps.oxygen, '#46d8ff', () => rateTxt(c().net.oxygen) + emptyIn('oxygen'));
    meter('food', 'Vivres', () => s.res.food, () => c().caps.food, '#32d874', () => rateTxt(c().net.food) + emptyIn('food'));
    meter('energy', 'Énergie', () => s.res.energy, () => c().caps.energy, '#ffd23a', () => rateTxt(c().net.energy) + (c().ratio.energy < 1 ? ' • modules à ' + Math.round(c().ratio.energy * 100) + ' %' : ''));
    const stLabel = h('b'), stCrew = h('span');
    const statusLine = h('div', { class: 'status-line' }, stLabel, stCrew);
    B.text(stLabel, () => ui.statusText(s)[0]);
    B.style(stLabel, 'color', () => ui.statusText(s)[1]);
    B.text(stCrew, () => s.crew.total + ' membre' + (s.crew.total > 1 ? 's' : '') + ' à bord');
    root.append(h('section', { class: 'frame' }, h('header', { class: 'panel-h' }, img('heart'), h('span', { class: 'grow' }, 'État du vaisseau')), h('div', { class: 'panel-b' }, meters, statusLine)));

    // Objectif principal
    const obj = h('div', { class: 'panel-b' });
    B.region(obj, () => s.obj, (el, RB) => {
      const o = DS.OBJECTIVES[s.obj];
      if (!o) {
        el.append(h('div', { class: 'objective' }, h('div', { class: 'obj-ico' }, img('star')), h('div', null, h('h3', null, 'Survivre, encore'), h('p', null, 'Tous les objectifs sont atteints. Le voyage continue, sans fin.'))));
        return;
      }
      const cnt = h('span', { class: 'num' });
      el.append(h('div', { class: 'objective' }, h('div', { class: 'obj-ico' }, img(o.icon)), h('div', null, h('h3', null, o.title), h('p', null, o.desc))),
        h('div', { class: 'obj-prog' }, RB.bar(() => { const [a, b] = o.goal(s); return a / b; }, '#ff9a2e'), cnt));
      RB.text(cnt, () => { const [a, b] = o.goal(s); return a + '/' + b; });
    });
    const objHead = h('small');
    B.text(objHead, () => Math.min(s.obj + 1, DS.OBJECTIVES.length) + ' / ' + DS.OBJECTIVES.length);
    root.append(h('section', { class: 'frame hot' }, h('header', { class: 'panel-h' }, img('target'), h('span', { class: 'grow' }, 'Objectif principal'), objHead), obj));

    // Journal
    const log = h('div', { class: 'log' });
    B.region(log, () => (s.log[0] ? s.log[0].t + ':' + s.log.length + s.log[0].text.length : ''), el => {
      for (const l of s.log.slice(0, 7)) el.append(logLine(l));
      if (!s.log.length) el.append(h('p', { class: 'stat' }, 'Le journal attend vos premières transmissions.'));
    });
    root.append(h('section', { class: 'frame' }, h('header', { class: 'panel-h' }, img('journal'), h('span', { class: 'grow' }, 'Journal de bord'), h('button', { class: 'link-btn', type: 'button', onclick: () => ui.go('journal') }, 'Tout voir')), h('div', { class: 'panel-b' }, log)));
  }
  function logLine(l) {
    return h('div', { class: 'log-line ' + l.tone }, img(l.icon || 'journal'), h('time', null, '[' + clockTime(l.t) + ']'), h('span', null, l.text));
  }
  ui.statusText = function (s) {
    const c = DS.c(s);
    if (s.distress.active) return ['DÉTRESSE VITALE', '#ff4d5e'];
    if (s.hull < 25) return ['COQUE CRITIQUE', '#ff4d5e'];
    if (c.net.oxygen < 0 && s.res.oxygen < c.caps.oxygen * 0.25) return ['ALERTE OXYGÈNE', '#ff9a2e'];
    if (c.net.food < 0 && s.res.food < c.caps.food * 0.25) return ['VIVRES EN BAISSE', '#ff9a2e'];
    if (c.ratio.energy < 1) return ['ÉNERGIE INSUFFISANTE', '#ffd23a'];
    if (s.anomaly.active) return ['ANOMALIE EN COURS', '#b67bff'];
    return ['SYSTÈMES NOMINAUX', '#32d874'];
  };

  // ------------------------------------------------------------------ vues
  const VIEWS = {};
  function viewHead(el, id, extra) {
    const t = DS.TABS.find(x => x.id === id);
    el.append(h('div', { class: 'view-head' }, h('div', null, h('h2', null, t.title), h('p', null, t.sub)), extra || null));
  }
  const panel = (icon, title, body, cls, extra) => h('section', { class: 'frame' + (cls ? ' ' + cls : '') },
    h('header', { class: 'panel-h' }, img(icon), h('span', { class: 'grow' }, title), extra || null), body);

  // ---------- Vaisseau
  const ACTIONS = [
    { id: 'scan', icon: 'scan', name: 'Scanner le secteur', key: '3',
      sub: s => (s.cd.scan > 0 ? 'Recharge : ' + Math.ceil(s.cd.scan) + ' s' : '+' + fmt(Math.max(2, DS.c(s).prod.data * 20)) + ' données • 5 énergie'),
      dis: s => s.cd.scan > 0 || s.res.energy < 5, cd: s => s.cd.scan / (10 * DS.c(s).E.scanCd), run: s => DS.scan(s) },
    { id: 'drill', icon: 'pickaxe', name: 'Forer la glace', key: '2',
      sub: s => '+' + fmt(DS.c(s).clickIce) + ' glace', dis: s => DS.c(s).E.noClick, run: s => DS.drill(s) },
    { id: 'salvage', icon: 'debris', name: 'Récupérer des débris', key: 'Espace', main: true,
      sub: s => '+' + fmt(DS.c(s).clickMetal) + ' métal', dis: s => DS.c(s).E.noClick, run: s => DS.salvage(s) },
    { id: 'repair', icon: 'tools', name: 'Réparer le vaisseau', key: '4',
      sub: s => (s.hull >= 99.9 ? 'Coque intacte' : '+15 % • ' + fmt(DS.repairCost(s).metal) + ' métal'),
      dis: s => s.hull >= 99.9 || !DS.has(s, DS.repairCost(s)), run: s => DS.repair(s) },
    { id: 'vital', icon: 'oxygen', name: 'Synthèse vitale', key: '5',
      sub: s => { const v = DS.vitalCost(s); return '+O₂ +vivres • ' + v.ice + ' glace, ' + v.energy + ' énergie'; },
      dis: s => s.cd.vital > 0 || !DS.has(s, DS.vitalCost(s)), run: s => DS.vital(s) }
  ];
  ui.doAction = function (id, at) {
    const a = ACTIONS.find(x => x.id === id);
    if (!a) return;
    ui.pointer = at || null;
    a.run(ui.s);
    ui.render(true);
  };

  VIEWS.ship = function (el, B) {
    const s = ui.s;
    if (!ui.scene) {
      const cv = h('canvas', { role: 'img', 'aria-label': 'Le vaisseau ARCHE-09 dans l’espace. Cliquez pour récupérer des débris.' });
      ui.scene = new DS.Scene(cv);
      cv.addEventListener('pointerdown', ev => {
        if (ev.button !== 0) return;
        const p = ui.scene.toLogical(ev);
        const r = cv.getBoundingClientRect();
        ui.pointer = { x: (ev.clientX - r.left) / r.width * 100, y: (ev.clientY - r.top) / r.height * 100, logical: p };
        ui.s && DS.salvage(ui.s);
        ui.render(true);
      });
    }
    ui.scene.setState(s);
    const wrap = h('section', { class: 'scene-wrap frame hot' }, ui.scene.cv);
    const status = h('span', { class: 'hud-chip' }), anom = h('span', { class: 'hud-chip bad' });
    wrap.append(h('div', { class: 'scene-hud' }, h('span', { class: 'hud-chip' }, 'ARCHE-09'), status, anom));
    B.text(status, () => ui.statusText(s)[0]);
    B.cls(status, 'bad', () => s.distress.active || s.hull < 25);
    B.cls(status, 'ok', () => ui.statusText(s)[0] === 'SYSTÈMES NOMINAUX');
    B.text(anom, () => (s.anomaly.active ? 'ANOMALIE : ' + DS.ANOMALIES.find(a => a.id === s.anomaly.active).name.toUpperCase() : ''));
    B.hide(anom, () => !s.anomaly.active);
    ui.floats = h('div', { class: 'floats' });
    wrap.append(ui.floats);
    el.append(wrap);

    const acts = h('div', { class: 'actions' });
    for (const a of ACTIONS) {
      const sub = h('small'), cd = h('i', { class: 'cd' });
      const btn = h('button', { class: 'act' + (a.main ? ' main' : ''), type: 'button', onclick: () => ui.doAction(a.id) },
        img(a.icon), h('span', { class: 'a-txt' }, h('b', null, a.name), sub), a.main ? h('span', { class: 'chev', 'aria-hidden': 'true' }, '›') : null,
        h('kbd', null, a.key), a.cd ? cd : null);
      B.text(sub, () => a.sub(s));
      B.dis(btn, () => a.dis(s));
      if (a.cd) B.style(cd, 'width', () => (Math.max(0, Math.min(1, a.cd(s))) * 100).toFixed(1) + '%');
      acts.append(btn);
    }
    el.append(acts);

    const tut = h('div');
    B.region(tut, () => s.tutorial, t => {
      if (!s.tutorial) return;
      t.append(h('div', { class: 'tutorial frame hot' }, img('antenna'), h('div', { class: 'grow' },
        h('h3', null, 'TRANSMISSION D’URGENCE'),
        h('p', null, 'Votre vaisseau, l’ARCHE-09, a perdu sa route après un saut raté. Récupérez des débris pour construire des modules. Surveillez l’oxygène et les vivres : votre équipage en dépend. Votre but : envoyer un dernier signal jusqu’à la Terre.')),
      h('button', { class: 'btn', type: 'button', onclick: act(() => { s.tutorial = false; }) }, 'Compris')));
    });
    el.append(tut);

    const grid = h('div', { class: 'grid quick' });
    B.region(grid, () => recommend(s).join(), (g, RB) => { for (const id of recommend(s)) g.append(quickCard(s, modById(id), RB)); });
    el.append(panel('wrench', 'Modules disponibles', grid, null, h('button', { class: 'link-btn', type: 'button', onclick: () => ui.go('modules') }, 'Tous les modules →')));
  };

  function quickCard(s, m, B) {
    const lvl = h('span', { class: 'lvl num' }), prod = h('span'), costs = h('div', { class: 'costs' });
    const btn = h('button', { class: 'btn green wide', type: 'button', onclick: act(() => DS.buyModule(s, m.id, 1)) }, 'Installer');
    B.text(lvl, () => 'Niveau ' + (s.mods[m.id] || 0));
    B.text(prod, () => perLevel(s, m));
    B.html(costs, () => costHTML(s, DS.modCost(s, m, 1)));
    B.dis(btn, () => !DS.has(s, DS.modCost(s, m, 1)));
    return h('article', { class: 'card qcard frame' },
      h('div', { class: 'c-head' }, h('img', { class: 'thumb', src: DS.roomURL(m.room), alt: '' }), h('div', { class: 'grow' }, h('h3', null, m.name), lvl)),
      h('p', { class: 'desc' }, m.desc),
      h('div', { class: 'stat' }, img(m.icon), prod),
      costs, btn);
  }

  // ---------- Modules
  VIEWS.modules = function (el, B) {
    const s = ui.s;
    const modes = h('div', { class: 'toolbar' }, h('span', { class: 'lbl' }, 'Quantité'));
    for (const m of [1, 10, 'max']) {
      const b = h('button', { class: 'btn small dark', type: 'button', onclick: act(() => { ui.buyMode = m; }) }, m === 'max' ? 'MAX' : '×' + m);
      B.cls(b, 'sel', () => ui.buyMode === m);
      modes.append(b);
    }
    viewHead(el, 'modules', modes);
    const autoTag = h('div', { class: 'tag good' }, 'Construction automatique active : décochez un module pour l’exclure.');
    B.hide(autoTag, () => !(DS.c(s).E.autoTier1 || DS.c(s).E.autoAll));
    el.append(autoTag);
    const grid = h('div', { class: 'grid' });
    const list = () => {
      const unl = DS.MODULES.filter(m => DS.modUnlocked(s, m));
      const locked = DS.MODULES.filter(m => !DS.modUnlocked(s, m)).slice(0, 2);
      return unl.concat(locked);
    };
    B.region(grid, () => list().map(m => m.id + (DS.modUnlocked(s, m) ? '+' : '-')).join() + (DS.c(s).E.autoAll ? 'A' : DS.c(s).E.autoTier1 ? 'a' : ''), (g, RB) => {
      for (const m of list()) g.append(moduleCard(s, m, RB));
    });
    el.append(grid);
  };
  function moduleCard(s, m, B) {
    if (!DS.modUnlocked(s, m)) {
      return h('article', { class: 'card frame locked' },
        h('div', { class: 'c-head' }, h('img', { class: 'thumb', src: DS.roomURL('empty'), alt: '' }), h('div', { class: 'grow' }, h('h3', null, m.name), h('p', { class: 'desc' }, m.desc))),
        h('div', { class: 'stat' }, img('lock'), 'Condition : ', h('b', null, m.lock || 'inconnue')));
    }
    const lvl = h('span', { class: 'lvl num' }), per = h('b'), tot = h('b'), costs = h('div', { class: 'costs' });
    const n = () => {
      if (ui.buyMode === 'max') return Math.max(1, DS.modMax(s, m));
      return ui.buyMode;
    };
    const label = h('span');
    const btn = h('button', { class: 'btn green', type: 'button', onclick: act(() => DS.buyModule(s, m.id, ui.buyMode)) }, label);
    B.text(lvl, () => 'Niv. ' + (s.mods[m.id] || 0));
    B.text(per, () => perLevel(s, m) || '—');
    B.text(tot, () => totalOut(s, m));
    B.html(costs, () => costHTML(s, DS.modCost(s, m, n())));
    B.text(label, () => 'Installer' + (n() > 1 ? ' ×' + n() : ''));
    B.dis(btn, () => DS.modMax(s, m) < 1);
    const ms = h('span'), msBar = B.bar(() => {
      const L = s.mods[m.id] || 0, next = DS.nextMilestone(L);
      if (!next) return 1;
      const prev = DS.MILESTONES.filter(t => t <= L).pop() || 0;
      return (L - prev) / (next - prev);
    }, '#ffd23a', true);
    B.text(ms, () => { const nx = DS.nextMilestone(s.mods[m.id] || 0); return nx ? 'Prochain palier : niv. ' + nx + ' (production ×2)' : 'Tous les paliers atteints'; });
    const card = h('article', { class: 'card frame' },
      h('div', { class: 'c-head' }, h('img', { class: 'thumb', src: DS.roomURL(m.room), alt: '' }),
        h('div', { class: 'grow' }, h('h3', null, m.name), h('p', { class: 'desc' }, m.desc)), lvl),
      h('div', { class: 'stat' }, img(m.icon), 'Par niveau : ', per),
      (m.prod || m.hull) ? h('div', { class: 'stat' }, img('star'), 'Total : ', tot) : null,
      m.use ? h('div', { class: 'stat' }, img('energy'), 'Entretien : ', h('b', { class: 'neg' }, upkeep(m) + ' par niveau')) : null,
      h('div', { class: 'milestone' }, h('div', { class: 'stat' }, ms), msBar),
      h('div', { class: 'foot' }, costs, btn));
    const E = DS.c(s).E;
    if ((E.autoAll || (E.autoTier1 && DS.TIER1.includes(m.id))) && m.id !== 'cryo') {
      const cb = h('input', { type: 'checkbox', id: 'auto-' + m.id });
      cb.checked = s.auto.mods[m.id] !== false;
      cb.onchange = () => { s.auto.mods[m.id] = cb.checked; };
      card.append(h('label', { class: 'auto-toggle', for: 'auto-' + m.id }, cb, 'Construction automatique'));
    }
    return card;
  }

  // ---------- Recherche
  VIEWS.research = function (el, B) {
    const s = ui.s;
    viewHead(el, 'research');
    const val = h('span', { class: 'num' }), rate = h('small');
    el.append(h('div', { class: 'banner frame hot' }, img('data'), h('div', { class: 'grow' }, h('h3', null, 'Données scientifiques'),
      h('p', null, 'Les laboratoires, le scanner et les expéditions produisent des données. Les technologies marquées « permanente » sont conservées lors des sauts.')),
    h('div', { class: 'big-num' }, val, rate)));
    B.text(val, () => DS.fmtInt(s.res.data));
    B.text(rate, () => rateTxt(DS.c(s).net.data));
    if (DS.c(s).E.autoResearch) {
      const cb = h('input', { type: 'checkbox', id: 'auto-research' });
      cb.checked = s.auto.research !== false;
      cb.onchange = () => { s.auto.research = cb.checked; };
      el.append(h('label', { class: 'auto-toggle', for: 'auto-research' }, cb, 'Recherche automatique (IA de recherche)'));
    }
    const avail = () => DS.RESEARCH.filter(r => !s.research[r.id] && DS.researchVisible(s, r))
      .sort((a, b) => (a.cost.data || 0) - (b.cost.data || 0));
    const grid = h('div', { class: 'grid' });
    B.region(grid, () => avail().map(r => r.id).join(), (g, RB) => {
      const list = avail();
      if (!list.length) g.append(h('p', { class: 'stat' }, 'Toutes les technologies disponibles dans ce secteur ont été recherchées.'));
      for (const r of list) {
        const costs = h('div', { class: 'costs' });
        const btn = h('button', { class: 'btn orange', type: 'button', onclick: act(() => DS.buyResearch(s, r.id)) }, img('flask'), 'Rechercher');
        RB.html(costs, () => costHTML(s, r.cost));
        RB.dis(btn, () => !DS.has(s, r.cost));
        g.append(h('article', { class: 'card frame' },
          h('div', { class: 'c-head' }, img(r.icon), h('div', { class: 'grow' }, h('h3', null, r.name), h('p', { class: 'desc' }, r.desc))),
          h('div', { class: 'chips' }, h('span', { class: 'pill' }, r.effect), r.perm ? h('span', { class: 'pill green' }, 'Permanente') : null),
          h('div', { class: 'foot' }, costs, btn)));
      }
    });
    el.append(grid);
    const next = h('p', { class: 'stat' });
    B.text(next, () => {
      const t = DS.RESEARCH.filter(r => !DS.researchVisible(s, r) && DS.TIER_SECTOR[r.tier] > s.sector).map(r => DS.TIER_SECTOR[r.tier]);
      return t.length ? 'De nouvelles technologies apparaîtront à partir du secteur ' + (Math.min(...t) + 1) + '.' : '';
    });
    el.append(next);
    const done = h('div');
    B.region(done, () => Object.keys(s.research).join(), d => {
      const owned = DS.RESEARCH.filter(r => s.research[r.id]);
      if (!owned.length) return;
      d.append(h('h3', { class: 'section-title' }, img('check'), 'Technologies acquises (' + owned.length + ')'),
        h('div', { class: 'chips' }, owned.map(r => h('span', { class: 'chip', title: r.desc }, r.name + ' — ' + r.effect))));
    });
    el.append(done);
  };

  // ---------- Équipage
  VIEWS.crew = function (el, B) {
    const s = ui.s;
    viewHead(el, 'crew');
    const c = () => DS.c(s);
    const total = h('span', { class: 'num' }), free = h('b'), o2 = h('b', { class: 'neg' }), food = h('b', { class: 'neg' });
    const costs = h('div', { class: 'costs' }), reason = h('p', { class: 'stat' });
    const wake = h('button', { class: 'btn green', type: 'button', onclick: act(() => DS.wake(s)) }, img('cryo'), 'Réveiller un dormeur');
    B.text(total, () => s.crew.total + ' / ' + c().crewMax);
    B.text(free, () => s.crew.total - DS.assigned(s));
    B.text(o2, () => '−' + fmt(c().crewO2) + ' O₂/s');
    B.text(food, () => '−' + fmt(c().crewFood) + ' vivres/s');
    B.html(costs, () => costHTML(s, DS.wakeCost(s)));
    B.dis(wake, () => s.crew.total >= c().crewMax || !DS.has(s, DS.wakeCost(s)));
    B.text(reason, () => {
      if (c().E.crewLock) return 'L’anomalie empêche tout réveil.';
      if (s.crew.total >= c().crewMax) return 'Toutes les capsules sont vides. Construisez des modules cryogéniques pour accueillir plus de dormeurs.';
      const cap = DS.wakeCost(s);
      if (cap.food > c().caps.food || cap.oxygen > c().caps.oxygen) return 'Vos réserves sont trop petites pour ce réveil : agrandissez-les avec des serres, des condenseurs ou les cellules à graphène.';
      return 'Chaque dormeur réveillé consomme de l’oxygène et des vivres, mais peut occuper un poste.';
    });
    const crewRow = h('div', { class: 'crew-row' });
    B.region(crewRow, () => s.crew.total + ':' + DS.assigned(s), r => {
      for (let i = 0; i < s.crew.total; i++) r.append(img('crew', i < DS.assigned(s) ? '' : 'idle'));
    });
    el.append(h('div', { class: 'banner frame hot' }, img('crew'), h('div', { class: 'grow' },
      h('h3', null, 'Équipage éveillé : ', total),
      h('div', { class: 'stat' }, 'Sans affectation : ', free, ' • Consommation : ', o2, ' ', food), crewRow, reason),
    h('div', { style: 'display:grid;gap:8px;justify-items:end' }, costs, wake)));

    const roles = h('div', { class: 'roles' });
    for (const ro of DS.ROLES) {
      const n = h('b', { class: 'num' }), bonus = h('span', { class: 'pill green' }), per = h('p', { class: 'desc' });
      const minus = h('button', { class: 'btn small dark', type: 'button', 'aria-label': 'Retirer un ' + ro.one.toLowerCase(), onclick: act(() => DS.assign(s, ro.id, -1)) }, '−');
      const plus = h('button', { class: 'btn small', type: 'button', 'aria-label': 'Affecter un ' + ro.one.toLowerCase(), onclick: act(() => DS.assign(s, ro.id, 1)) }, '+');
      B.text(n, () => s.crew.roles[ro.id] || 0);
      B.text(per, () => '+' + Math.round(c().E.roleBonus * c().E.roleMult * 100) + ' % de production (' + ro.text + ') par membre affecté.');
      B.text(bonus, () => 'Bonus actuel ×' + fmt(1 + c().E.roleBonus * c().E.roleMult * (s.crew.roles[ro.id] || 0)));
      B.dis(minus, () => !(s.crew.roles[ro.id] > 0));
      B.dis(plus, () => s.crew.total - DS.assigned(s) <= 0);
      roles.append(h('article', { class: 'card frame' },
        h('div', { class: 'c-head' }, img(ro.icon), h('div', { class: 'grow' }, h('h3', null, ro.name), per)),
        bonus, h('div', { class: 'foot' }, h('div', { class: 'stepper' }, minus, n, plus))));
    }
    el.append(h('h3', { class: 'section-title' }, img('tools'), 'Postes'), roles);
    el.append(h('p', { class: 'stat' }, img('anomaly'), 'Si l’oxygène ou les vivres viennent à manquer, la production chute de 65 % et un membre d’équipage meurt toutes les 45 secondes.'));
  };

  // ---------- Expéditions
  VIEWS.exps = function (el, B) {
    const s = ui.s;
    viewHead(el, 'exps');
    const slots = h('span', { class: 'num' });
    B.text(slots, () => s.exps.length + ' / ' + DS.c(s).E.slots);
    el.append(h('div', { class: 'banner frame hot' }, img('planet'), h('div', { class: 'grow' }, h('h3', null, 'Hangars à sondes'),
      h('p', null, 'Le butin dépend de votre production actuelle : plus le vaisseau tourne vite, plus les sondes rapportent. Chaque sonde peut se perdre.')),
    h('div', { class: 'big-num' }, slots, h('small', null, 'hangars occupés'))));
    const active = h('div', { class: 'exp-active' });
    B.region(active, () => s.exps.map(e => e.id).join(), (a, RB) => {
      for (const e of s.exps) {
        const x = DS.EXPEDITIONS.find(q => q.id === e.id);
        const t = h('time', { class: 'num' });
        RB.text(t, () => DS.fmtTime(e.remaining));
        a.append(h('div', { class: 'exp-run frame' }, img(x.icon), h('div', null, h('b', null, x.name),
          h('div', { class: 'chips', style: 'margin-top:4px' }, h('span', { html: Object.keys(e.reward).map(r => '<span class="pill green">+' + fmt(e.reward[r]) + ' ' + (r === 'specimen' ? 'XP Spécimen' : RES[r].unit) + '</span>').join(' ') })),
          RB.bar(() => 1 - e.remaining / e.total, '#46d8ff')), t));
      }
    });
    el.append(active);
    const grid = h('div', { class: 'grid' });
    B.region(grid, () => DS.EXPEDITIONS.map(x => DS.expUnlocked(s, x) ? 1 : 0).join(''), (g, RB) => {
      for (const x of DS.EXPEDITIONS) {
        if (!DS.expUnlocked(s, x)) {
          g.append(h('article', { class: 'card frame locked' }, h('div', { class: 'c-head' }, img(x.icon), h('div', { class: 'grow' }, h('h3', null, x.name), h('p', { class: 'desc' }, x.desc))),
            h('div', { class: 'stat' }, img('lock'), 'Condition : ', h('b', null, x.lock))));
          continue;
        }
        const time = h('b'), rewards = h('div', { class: 'chips' }), costs = h('div', { class: 'costs' });
        const btn = h('button', { class: 'btn', type: 'button', onclick: act(() => DS.startExp(s, x.id)) }, img('play'), 'Lancer l’expédition');
        RB.text(time, () => DS.fmtTime(DS.expTime(s, x)) + ' • risque ' + Math.round(x.risk * DS.c(s).E.expRisk * 100) + ' %');
        RB.html(rewards, () => { const rw = DS.expReward(s, x); return Object.keys(rw).map(r => '<span class="pill green">≈ +' + fmt(rw[r]) + ' ' + (r === 'specimen' ? 'XP Spécimen' : RES[r].unit) + '</span>').join(''); });
        RB.html(costs, () => costHTML(s, x.cost));
        RB.dis(btn, () => s.exps.some(e => e.id === x.id) || s.exps.length >= DS.c(s).E.slots || !DS.has(s, x.cost));
        g.append(h('article', { class: 'card frame' },
          h('div', { class: 'c-head' }, img(x.icon), h('div', { class: 'grow' }, h('h3', null, x.name), h('p', { class: 'desc' }, x.desc))),
          h('div', { class: 'stat' }, img('clock'), time), rewards, h('div', { class: 'foot' }, costs, btn)));
      }
    });
    el.append(h('h3', { class: 'section-title' }, img('radar'), 'Destinations'), grid);
  };

  // ---------- Navigation
  VIEWS.nav = function (el, B) {
    const s = ui.s;
    viewHead(el, 'nav');
    const sec = DS.sector(s.sector);
    const diff = Math.round(s.sector * 10), wear = Math.round(s.sector * 15);
    el.append(h('div', { class: 'hero frame hot' }, h('img', { class: 'planet-big', src: DS.planetURL(sec.planet, 66, 3 + s.sector * 5), alt: '' }),
      h('div', { class: 'grow' }, h('div', { class: 'over' }, 'Secteur ' + (s.sector + 1) + (s.signal.emissions ? ' • voyage ' + (s.signal.emissions + 1) : '')),
        h('h2', null, sec.name), h('p', null, sec.desc),
        h('div', { class: 'chips', style: 'margin-top:10px' }, h('span', { class: 'tag' }, sec.text),
          s.sector ? h('span', { class: 'tag warn' }, 'Consommation +' + diff + ' % • usure +' + wear + ' %') : null))));
    // carte
    const map = h('div', { class: 'map' });
    const last = Math.max(s.sector + 2, 5);
    for (let i = 0; i <= last; i++) {
      const sc = DS.sector(i);
      if (i) map.append(h('span', { class: 'link' }));
      map.append(h('div', { class: 'node ' + (i < s.sector ? 'past' : i === s.sector ? 'cur' : 'next') },
        h('img', { src: DS.planetURL(sc.planet, 44, 3 + i * 5), alt: '' }), h('span', null, i <= s.sector + 1 ? sc.name : '???')));
    }
    el.append(h('section', { class: 'frame' }, map));

    // saut
    const gain = h('dd', { class: 'num' }), runM = h('dd', { class: 'num' }), nextAt = h('dd', { class: 'num' }), mult = h('dd', { class: 'num' }), why = h('p', { class: 'stat' });
    const jumpBtn = h('button', { class: 'btn orange big wide', type: 'button', onclick: () => ui.confirmJump() }, img('radar'), 'Initier le saut');
    B.text(runM, () => fmt(s.run.metal));
    B.text(gain, () => '+' + fmt(DS.jumpGain(s)) + ' échos');
    B.text(nextAt, () => (s.research.navigation && !s.anomaly.active ? fmt(DS.nextEchoAt(s)) + ' métal' : '—'));
    B.text(mult, () => '×' + fmt(DS.jumpMult(s)));
    B.dis(jumpBtn, () => !DS.canJump(s));
    B.text(why, () => {
      if (s.anomaly.active) return 'Impossible de sauter depuis une anomalie : stabilisez-la ou abandonnez-la.';
      if (!s.research.navigation) return 'Recherchez la cartographie hyperspatiale pour calculer un couloir de saut.';
      if (!DS.canJump(s)) return 'Récupérez plus de métal pendant ce cycle pour gagner au moins un écho.';
      return 'Le saut réinitialise les ressources, les modules, l’équipage et les technologies non permanentes.';
    });
    const jump = h('section', { class: 'frame hot' }, h('header', { class: 'panel-h' }, img('radar'), h('span', { class: 'grow' }, 'Saut hyperspatial')),
      h('div', { class: 'panel-b', style: 'display:grid;gap:12px' },
        h('dl', { class: 'kv' }, h('dt', null, 'Métal récupéré ce cycle'), runM, h('dt', null, 'Gain du saut'), gain, h('dt', null, 'Prochain écho à'), nextAt, h('dt', null, 'Bonus de secteur et de moteur'), mult),
        why, jumpBtn, autoJumpBox(s, B)));

    const avail = h('span', { class: 'num' }), passive = h('b');
    B.text(avail, () => fmt(s.echoes));
    B.text(passive, () => '×' + fmt(DS.echoBonus(s, DS.c(s).E)));
    const echoes = h('section', { class: 'frame' }, h('header', { class: 'panel-h' }, img('echo'), h('span', { class: 'grow' }, 'Échos stellaires')),
      h('div', { class: 'panel-b', style: 'display:grid;gap:10px' },
        h('div', { class: 'big-num' }, avail, h('small', { style: 'text-align:left' }, 'échos disponibles')),
        h('p', { class: 'stat' }, 'Bonus passif sur le métal, les données et les alliages : ', passive),
        h('p', { class: 'stat' }, 'Le bonus dépend de tous les échos gagnés, même dépensés. Les archives ci-dessous sont conservées d’un saut à l’autre.')));
    el.append(h('div', { class: 'split' }, jump, echoes));

    const grid = h('div', { class: 'grid' });
    for (const a of DS.ARCHIVES) {
      const lvl = h('span', { class: 'lvl num' }), txt = h('p', { class: 'desc' }), cost = h('span', { class: 'cost' });
      const btn = h('button', { class: 'btn violet', type: 'button', onclick: act(() => DS.buyArchive(s, a.id)) }, 'Améliorer');
      const maxed = () => a.max && (s.archives[a.id] || 0) >= a.max;
      B.text(lvl, () => 'Niv. ' + (s.archives[a.id] || 0) + (a.max ? ' / ' + a.max : ''));
      B.text(txt, () => a.text(Math.max(1, s.archives[a.id] || 0)));
      B.html(cost, () => (maxed() ? 'Maximum' : I('echo') + fmt(DS.archiveCost(s, a))));
      B.cls(cost, 'miss', () => !maxed() && s.echoes < DS.archiveCost(s, a));
      B.dis(btn, () => maxed() || s.echoes < DS.archiveCost(s, a));
      grid.append(h('article', { class: 'card frame' }, h('div', { class: 'c-head' }, img(a.icon), h('div', { class: 'grow' }, h('h3', null, a.name), txt), lvl), h('div', { class: 'foot' }, cost, btn)));
    }
    el.append(h('h3', { class: 'section-title' }, img('echo'), 'Archives stellaires'), grid);
  };
  function autoJumpBox(s, B) {
    const box = h('div');
    B.region(box, () => DS.c(s).E.autoJump, b => {
      if (!DS.c(s).E.autoJump) return;
      const cb = h('input', { type: 'checkbox', id: 'auto-jump' });
      cb.checked = !!s.auto.jump;
      cb.onchange = () => { s.auto.jump = cb.checked; };
      const inp = h('input', { type: 'number', id: 'auto-jump-at', min: '1', value: String(s.auto.jumpAt), style: 'width:110px;background:#050b16;color:#fff;border:2px solid #1a2c48;border-radius:4px;padding:4px 6px;font:600 14px var(--font-px)' });
      inp.onchange = () => { const v = Math.max(1, Math.floor(Number(inp.value) || 1)); s.auto.jumpAt = v; inp.value = v; };
      b.append(h('div', { class: 'toolbar' }, h('label', { class: 'auto-toggle', for: 'auto-jump' }, cb, 'Pilote automatique : sauter dès'), inp, h('span', { class: 'stat' }, 'échos')));
    });
    return box;
  }

  // ---------- Spécimen
  VIEWS.specimen = function (el, B) {
    const s = ui.s;
    viewHead(el, 'specimen');
    const cv = h('canvas', { class: 'tank', width: '128', height: '128', role: 'img', 'aria-label': 'Le Spécimen dans sa cuve' });
    ui.specCanvas = cv;
    const stage = h('h3'), lvl = h('span', { class: 'lvl num' }), xp = h('span', { class: 'stat' }), bonus = h('b');
    B.text(stage, () => DS.specStage(s.specimen.level).name);
    B.text(lvl, () => 'Niv. ' + s.specimen.level);
    B.text(xp, () => { const p = DS.specLevel(s.specimen.xp); return 'Expérience : ' + fmt(p.into) + ' / ' + fmt(p.need); });
    B.text(bonus, () => '×' + fmt(Math.pow(1.04, s.specimen.level)));
    const next = h('p', { class: 'stat' });
    B.text(next, () => { const n = DS.SPEC_STAGES.find(st => st.lvl > s.specimen.level); return n ? 'Prochaine mue au niveau ' + n.lvl + ' : ' + n.name + '.' : 'Le Spécimen a atteint sa forme ultime.'; });
    el.append(h('section', { class: 'spec-wrap frame hot' }, cv, h('div', { class: 'grow' },
      h('div', { class: 'c-head', style: 'display:flex;gap:10px;align-items:center' }, stage, lvl),
      B.bar(() => { const p = DS.specLevel(s.specimen.xp); return p.into / p.need; }, '#78dc4f'), xp,
      h('p', { class: 'stat' }, 'Bonus sur le métal, les données et les alliages : ', bonus), next,
      h('p', { class: 'stat' }, 'Le Spécimen survit aux sauts, mais pas à l’émission du Signal.'))));
    const feed = h('div', { class: 'panel-b' });
    for (const f of DS.SPEC_FEED) {
      const avail = h('span', { class: 'stat' });
      B.text(avail, () => 'Disponible : ' + fmt(DS.feedAvail(s, f.res)) + ' • ' + fmt(f.w) + ' XP par unité' + (f.res === 'food' ? ' (la moitié des réserves est gardée pour l’équipage)' : ''));
      const btns = h('div', { class: 'btns' });
      for (const fr of [0.1, 0.5, 1]) {
        const b = h('button', { class: 'btn small green', type: 'button', onclick: act(() => DS.feed(s, f.res, fr)) }, fr === 1 ? 'Tout' : Math.round(fr * 100) + ' %');
        B.dis(b, () => DS.feedAvail(s, f.res) <= 0);
        btns.append(b);
      }
      feed.append(h('div', { class: 'feed-row' }, img(RES[f.res].icon), h('div', null, h('b', null, 'Nourrir avec : ' + RES[f.res].name.toLowerCase()), avail), btns));
    }
    const stages = h('div', { class: 'panel-b stage-list' });
    for (const st of DS.SPEC_STAGES) {
      const row = h('div', { class: 'stage' }, h('b', null, 'Niv. ' + st.lvl), h('span', null, h('b', null, st.name), st.perk ? ' — ' + st.perk : ''));
      B.cls(row, 'on', () => s.specimen.level >= st.lvl);
      stages.append(row);
    }
    el.append(h('div', { class: 'split' }, panel('food', 'Nourrir le Spécimen', feed), panel('specimen', 'Mues', stages)));
  };

  // ---------- Anomalies
  VIEWS.anomalies = function (el, B) {
    const s = ui.s;
    viewHead(el, 'anomalies');
    el.append(h('p', { class: 'stat' }, img('anomaly'), 'Entrer dans une anomalie réinitialise le cycle en cours, sans gain d’échos. Dans une anomalie, le bonus des échos, les protocoles ARK et le Spécimen sont muets. Atteignez l’objectif de métal pour la stabiliser : la récompense est permanente.'));
    const activeBox = h('div');
    B.region(activeBox, () => s.anomaly.active || '', (a, RB) => {
      const an = DS.ANOMALIES.find(x => x.id === s.anomaly.active);
      if (!an) return;
      const prog = h('span', { class: 'num' });
      RB.text(prog, () => fmt(s.run.metal) + ' / ' + fmt(an.goal) + ' métal');
      a.append(h('div', { class: 'banner frame hot' }, img(an.icon), h('div', { class: 'grow' }, h('h3', null, 'Anomalie en cours : ' + an.name), h('p', null, an.handicap), RB.bar(() => s.run.metal / an.goal, '#b67bff'), prog),
        h('button', { class: 'btn red', type: 'button', onclick: act(() => DS.abandonAnomaly(s)) }, 'Abandonner')));
    });
    el.append(activeBox);
    const grid = h('div', { class: 'grid' });
    for (const an of DS.ANOMALIES) {
      const state = h('span', { class: 'pill' });
      const btn = h('button', { class: 'btn violet', type: 'button', onclick: () => ui.confirmAnomaly(an) }, img('anomaly'), 'Entrer');
      B.text(state, () => (s.anomaly.done[an.id] ? 'Stabilisée' : s.anomaly.active === an.id ? 'En cours' : 'Instable'));
      B.attr(state, 'class', () => 'pill ' + (s.anomaly.done[an.id] ? 'green' : s.anomaly.active === an.id ? 'amber' : ''));
      B.dis(btn, () => !!s.anomaly.done[an.id] || !!s.anomaly.active);
      const card = h('article', { class: 'card frame' },
        h('div', { class: 'c-head' }, img(an.icon), h('div', { class: 'grow' }, h('h3', null, an.name), h('p', { class: 'desc' }, an.desc)), state),
        h('div', { class: 'stat' }, img('anomaly'), h('span', null, 'Handicap : ', h('b', { class: 'neg' }, an.handicap))),
        h('div', { class: 'stat' }, img('target'), h('span', null, 'Objectif : ', h('b', null, fmt(an.goal) + ' métal récupérés'))),
        h('div', { class: 'stat' }, img('star'), h('span', null, 'Récompense : ', h('b', { class: 'pos' }, an.reward))),
        h('div', { class: 'foot' }, h('span'), btn));
      B.cls(card, 'done', () => !!s.anomaly.done[an.id]);
      grid.append(card);
    }
    el.append(grid);
  };

  // ---------- Signal
  VIEWS.signal = function (el, B) {
    const s = ui.s;
    viewHead(el, 'signal');
    const won = h('div');
    B.region(won, () => s.signal.won, w => {
      if (!s.signal.won) return;
      w.append(h('div', { class: 'victory frame hot' }, h('h2', null, 'Le Dernier Signal est parti'), h('p', null, 'L’ARCHE-09 a accompli sa mission. Vous pouvez continuer à explorer, à sauter et à émettre : le voyage est désormais sans fin.')));
    });
    el.append(won);
    el.append(h('p', { class: 'stat' }, img('antenna'), 'Depuis la Porte du Silence, une antenne assez grande pourrait joindre la Terre. Chaque émission du Signal remet le voyage à zéro (secteurs, échos, archives et Spécimen), mais rapporte des fragments de signal aux effets permanents.'));
    // antenne
    const ant = h('div', { class: 'panel-b', style: 'display:grid;gap:10px' });
    B.region(ant, () => s.signal.antenna + ':' + !!s.research.antenna, (a, RB) => {
      if (!s.research.antenna) {
        a.append(h('p', { class: 'stat' }, img('lock'), 'Recherchez « Antenne de transmission » (disponible à partir du secteur 6) pour commencer la construction.'));
      }
      DS.ANTENNA.forEach((st, i) => {
        const costs = h('div', { class: 'costs' });
        const doneSt = i < s.signal.antenna;
        const row = h('div', { class: 'feed-row' }, img(doneSt ? 'check' : i === s.signal.antenna ? 'antenna' : 'lock'), h('div', null, h('b', null, 'Étape ' + (i + 1) + ' : ' + st.name), costs));
        if (doneSt) costs.append(h('span', { class: 'pill green' }, 'Terminée'));
        else RB.html(costs, () => costHTML(s, st.cost));
        if (i === s.signal.antenna && s.research.antenna) {
          const b = h('button', { class: 'btn orange', type: 'button', onclick: act(() => DS.buildAntenna(s)) }, 'Construire');
          RB.dis(b, () => !DS.has(s, st.cost));
          row.append(b);
        } else row.append(h('span'));
        a.append(row);
      });
    });
    const gain = h('dd', { class: 'num' }), earned = h('dd', { class: 'num' });
    B.text(gain, () => '+' + fmt(DS.fragGain(s)) + ' fragments');
    B.text(earned, () => fmt(s.echoesEarned));
    const emit = h('button', { class: 'btn orange big wide', type: 'button', onclick: () => ui.confirmEmit() }, img('fragment'), 'Émettre le Signal');
    B.dis(emit, () => DS.fragGain(s) < 1);
    const emitBox = h('div', { class: 'panel-b', style: 'display:grid;gap:12px' }, h('dl', { class: 'kv' }, h('dt', null, 'Échos gagnés pendant ce voyage'), earned, h('dt', null, 'Fragments à l’émission'), gain), emit);
    el.append(h('div', { class: 'split' }, panel('antenna', 'Antenne de transmission', ant, 'hot'), panel('fragment', 'Émission', emitBox)));
    const frag = h('span', { class: 'num' });
    B.text(frag, () => fmt(s.signal.fragments));
    el.append(h('h3', { class: 'section-title' }, img('fragment'), 'Améliorations du Signal — ', frag, ' fragments'));
    const grid = h('div', { class: 'grid' });
    for (const u of DS.SIGNAL_UPG) {
      const lvl = h('span', { class: 'lvl num' }), cost = h('span', { class: 'cost' });
      const btn = h('button', { class: 'btn ' + (u.final ? 'orange' : 'violet'), type: 'button', onclick: () => (u.final ? ui.confirmFinal(u) : act(() => DS.buySignal(s, u.id))()) }, u.final ? 'Transmettre' : 'Acquérir');
      const maxed = () => u.max && (s.signal.upg[u.id] || 0) >= u.max;
      B.text(lvl, () => (u.max === 1 ? (maxed() ? 'Acquis' : '—') : 'Niv. ' + (s.signal.upg[u.id] || 0)));
      B.html(cost, () => (maxed() ? 'Acquis' : I('fragment') + fmt(DS.signalCost(s, u))));
      B.cls(cost, 'miss', () => !maxed() && s.signal.fragments < DS.signalCost(s, u));
      B.dis(btn, () => maxed() || s.signal.fragments < DS.signalCost(s, u));
      grid.append(h('article', { class: 'card frame' + (u.final ? ' hot' : '') }, h('div', { class: 'c-head' }, img(u.icon), h('div', { class: 'grow' }, h('h3', null, u.name), h('p', { class: 'desc' }, u.text)), lvl), h('div', { class: 'foot' }, cost, btn)));
    }
    el.append(grid);
  };

  // ---------- Journal
  VIEWS.journal = function (el, B) {
    const s = ui.s;
    viewHead(el, 'journal');
    const log = h('div', { class: 'log full' });
    B.region(log, () => (s.log[0] ? s.log[0].t + ':' + s.log.length : ''), l => { for (const e of s.log) l.append(logLine(e)); });
    const kv = h('dl', { class: 'kv' });
    const stat = (label, fn) => { const d = h('dd', { class: 'num' }); B.text(d, fn); kv.append(h('dt', null, label), d); };
    stat('Temps de survie', () => DS.fmtTime(s.stats.time));
    stat('Métal récupéré (total)', () => fmt(s.stats.metal));
    stat('Alliages produits', () => fmt(s.stats.alloy));
    stat('Clics de récupération', () => fmt(s.stats.clicks));
    stat('Sauts hyperspatiaux', () => fmt(s.stats.jumps));
    stat('Secteur le plus lointain', () => s.stats.maxSector + 1);
    stat('Expéditions réussies', () => fmt(s.stats.exps));
    stat('Transmissions reçues', () => fmt(s.stats.events));
    stat('Brèches dans la coque', () => fmt(s.stats.breaches));
    stat('Membres d’équipage perdus', () => fmt(s.stats.crewLost));
    stat('Émissions du Signal', () => fmt(s.signal.emissions));
    el.append(h('div', { class: 'split' }, panel('journal', 'Transmissions', h('div', { class: 'panel-b' }, log)), panel('star', 'Statistiques', h('div', { class: 'panel-b' }, kv))));
  };

  // ---------- Options
  VIEWS.options = function (el, B) {
    const s = ui.s;
    viewHead(el, 'options');
    const saveInfo = h('p');
    B.text(saveInfo, () => (ui.lastSave ? 'Dernière sauvegarde il y a ' + DS.fmtTime((Date.now() - ui.lastSave) / 1000) + '. ' : '') + ui.cloudText());
    const exportBox = h('textarea', { class: 'code', id: 'export-code', readonly: true, 'aria-label': 'Code de sauvegarde', hidden: true });
    const importBox = h('textarea', { class: 'code', id: 'import-code', placeholder: 'Collez ici un code de sauvegarde', 'aria-label': 'Code de sauvegarde à importer' });
    const save = h('div', { class: 'panel-b' },
      h('div', { class: 'opt-row' }, h('div', null, h('h4', null, 'Sauvegarder'), saveInfo), h('button', { class: 'btn green', type: 'button', onclick: () => { DS.save(true); ui.render(true); } }, 'Sauvegarder')),
      h('div', { class: 'opt-row' }, h('div', null, h('h4', null, 'Exporter'), h('p', null, 'Un code texte pour transférer votre partie.')),
        h('button', { class: 'btn', type: 'button', onclick: () => {
          const code = DS.exportCode();
          exportBox.hidden = false; exportBox.value = code; exportBox.select();
          const done = () => DS.emit('toast', 'Code de sauvegarde copié.', 'good');
          try { navigator.clipboard.writeText(code).then(done, () => DS.emit('toast', 'Copiez le code sélectionné ci-dessous.', '')); } catch (e) { DS.emit('toast', 'Copiez le code sélectionné ci-dessous.', ''); }
        } }, 'Copier le code')),
      exportBox,
      h('div', { class: 'opt-row' }, h('div', null, h('h4', null, 'Importer'), h('p', null, 'Remplace la partie actuelle.')),
        h('button', { class: 'btn', type: 'button', onclick: () => ui.confirmImport(importBox.value) }, 'Importer')),
      importBox);
    const notation = h('div', { class: 'seg' });
    for (const [v, label] of [['std', '1,25 M'], ['sci', '1,25e6']]) {
      const b = h('button', { class: 'btn small dark', type: 'button', onclick: act(() => { s.settings.notation = v; DS.settings.notation = v; }) }, label);
      B.cls(b, 'sel', () => s.settings.notation === v);
      notation.append(b);
    }
    const toggle = (key, label, desc) => {
      const cb = h('input', { type: 'checkbox', id: 'opt-' + key });
      cb.checked = s.settings[key] !== false;
      cb.onchange = () => { s.settings[key] = cb.checked; };
      return h('div', { class: 'opt-row' }, h('div', null, h('h4', null, label), h('p', null, desc)), h('label', { class: 'auto-toggle', for: 'opt-' + key }, cb, 'Activé'));
    };
    const display = h('div', { class: 'panel-b' },
      h('div', { class: 'opt-row' }, h('div', null, h('h4', null, 'Notation des nombres'), h('p', null, 'Suffixes français (k, M, Md, Bn…) ou notation scientifique.')), notation),
      toggle('motion', 'Animations de la scène', 'Désactivez-les pour un affichage fixe.'),
      toggle('particles', 'Nombres flottants', 'Affiche les gains au-dessus du vaisseau.'));
    const keys = h('div', { class: 'panel-b keys' },
      h('kbd', null, 'Espace'), h('span', null, 'Récupérer des débris (ou cliquez sur le vaisseau)'),
      h('kbd', null, '2'), h('span', null, 'Forer la glace'),
      h('kbd', null, '3'), h('span', null, 'Scanner le secteur'),
      h('kbd', null, '4'), h('span', null, 'Réparer le vaisseau'),
      h('kbd', null, '5'), h('span', null, 'Synthèse vitale'),
      h('kbd', null, 'M'), h('span', null, 'Ouvrir la transmission en attente'),
      h('kbd', null, 'Échap'), h('span', null, 'Fermer une fenêtre'));
    const danger = h('div', { class: 'panel-b' },
      h('div', { class: 'opt-row' }, h('div', null, h('h4', null, 'Recommencer de zéro'), h('p', null, 'Efface toute la progression, archives et fragments compris.')),
        h('button', { class: 'btn red', type: 'button', onclick: () => ui.confirmReset() }, 'Effacer')),
      h('p', { class: 'stat', style: 'margin-top:8px' }, 'Dernier Signal v' + DS.VERSION + ' — jeu incrémental de survie spatiale. La partie est enregistrée dans ce navigateur, et sur votre compte quand c’est possible.'));
    el.append(h('div', { class: 'options' }, panel('cloud', 'Sauvegarde', save, 'hot'), panel('gear', 'Affichage', display), panel('journal', 'Raccourcis clavier', keys), panel('anomaly', 'Zone dangereuse', danger)));
  };

  // ------------------------------------------------------------------ fenêtres modales
  ui.modal = function (o) {
    const wrap = $('modal'), box = $('modal-box');
    box.replaceChildren();
    if (o.dismiss !== false) box.append(h('button', { class: 'm-close', type: 'button', 'aria-label': 'Fermer', onclick: () => ui.closeModal() }, '×'));
    if (o.tag) box.append(h('div', { class: 'm-tag' }, o.tag));
    box.append(h('h2', { id: 'modal-title' }, o.icon ? img(o.icon) : null, o.title));
    const body = h('div', { class: 'm-body' });
    if (typeof o.body === 'string') body.innerHTML = o.body; else if (o.body) body.append(o.body);
    box.append(body);
    const actions = h('div', { class: 'm-actions' });
    for (const a of o.actions || []) {
      const b = a.choice
        ? h('button', { class: 'choice', type: 'button', disabled: a.disabled }, h('b', null, a.label), a.fx ? h('span', { class: 'fx', html: a.fx }) : null, a.sub ? h('small', null, a.sub) : null)
        : h('button', { class: 'btn ' + (a.cls || '') + ' wide', type: 'button', disabled: a.disabled }, a.label);
      b.addEventListener('click', () => { ui.closeModal(); if (a.fn) a.fn(); ui.render(true); });
      actions.append(b);
    }
    box.append(actions);
    ui.modalState = { dismiss: o.dismiss !== false, onClose: o.onClose, prev: document.activeElement };
    wrap.hidden = false;
    const first = actions.querySelector('button:not(:disabled)') || box.querySelector('button');
    if (first) first.focus();
  };
  ui.closeModal = function () {
    const st = ui.modalState;
    $('modal').hidden = true;
    ui.modalState = null;
    if (st && st.onClose) st.onClose();
    if (st && st.prev && st.prev.focus && document.contains(st.prev)) st.prev.focus();
  };
  ui.confirm = function (o) {
    ui.modal({ tag: o.tag || 'CONFIRMATION', title: o.title, icon: o.icon, body: o.body, actions: [{ label: o.ok, cls: o.okCls || 'orange', fn: o.fn }, { label: 'Annuler', cls: 'dark' }] });
  };
  ui.openEvent = function () {
    const s = ui.s, ev = s.event.pending;
    if (!ev) { DS.emit('toast', 'Aucune transmission en attente.', ''); return; }
    const left = Math.max(0, ev.expires - s.stats.time);
    ui.modal({
      tag: ev.tag, title: ev.title, icon: ev.icon,
      body: h('div', null, h('p', null, ev.desc), h('p', { class: 'stat', style: 'margin-top:8px' }, img('clock'), 'Le signal se perdra dans ' + DS.fmtTime(left) + '.')),
      actions: ev.choices.map((ch, i) => ({ choice: true, label: ch.label, fx: fxHTML(ch.fx, ch.risk), disabled: !DS.canFx(s, ch.fx), sub: DS.canFx(s, ch.fx) ? '' : 'Ressources insuffisantes', fn: () => DS.resolveEvent(s, i) }))
        .concat([{ label: 'Ignorer la transmission', cls: 'dark', fn: () => DS.dismissEvent(s) }])
    });
  };
  ui.confirmJump = function () {
    const s = ui.s, g = DS.jumpGain(s);
    if (g < 1) return;
    ui.confirm({
      tag: 'PROTOCOLE DE SAUT', title: 'Sauter vers ' + DS.sector(s.sector + 1).name + ' ?', icon: 'radar',
      body: '<p>Vous gagnerez <b style="color:#fff">' + fmt(g) + ' échos stellaires</b>.</p><p>Les ressources, les modules, l’équipage réveillé et les technologies non permanentes de ce cycle seront perdus. Les échos, les archives, le Spécimen et les découvertes permanentes sont conservés.</p>',
      ok: 'Initier le saut', fn: () => { DS.jump(s); DS.save(false); }
    });
  };
  ui.confirmAnomaly = function (an) {
    const s = ui.s;
    ui.confirm({
      tag: 'ANOMALIE', title: 'Entrer dans « ' + an.name + ' » ?', icon: 'anomaly',
      body: '<p>' + an.desc + '</p><p><b style="color:#ff9aa6">' + an.handicap + '</b></p><p>Le cycle en cours sera réinitialisé sans gain d’échos. Objectif : ' + fmt(an.goal) + ' métal. Récompense : ' + an.reward + '</p>',
      ok: 'Entrer dans l’anomalie', okCls: 'violet', fn: () => DS.startAnomaly(s, an.id)
    });
  };
  ui.confirmEmit = function () {
    const s = ui.s, g = DS.fragGain(s);
    if (g < 1) return;
    ui.confirm({
      tag: 'TRANSMISSION', title: 'Émettre le Signal ?', icon: 'antenna',
      body: '<p>Vous gagnerez <b style="color:#ffd23a">' + g + ' fragment' + (g > 1 ? 's' : '') + ' de signal</b>.</p><p>Le voyage recommence depuis la Ceinture d’Hélios : secteurs, échos, archives, antenne, technologies et Spécimen sont réinitialisés. Les fragments, leurs améliorations et les anomalies stabilisées sont conservés.</p>',
      ok: 'Émettre', fn: () => { DS.emitSignal(s); DS.save(false); }
    });
  };
  ui.confirmFinal = function (u) {
    const s = ui.s;
    ui.confirm({
      tag: 'MESSAGE FINAL', title: 'Transmettre le Dernier Signal ?', icon: 'star',
      body: '<p>Toute la puissance de l’ARCHE-09 sera concentrée en un seul message vers la Terre.</p>',
      ok: 'Transmettre', fn: () => { DS.buySignal(s, u.id); DS.save(false); }
    });
  };
  ui.confirmReset = function () {
    ui.confirm({
      tag: 'ZONE DANGEREUSE', title: 'Effacer toute la partie ?', icon: 'anomaly',
      body: '<p>Toute la progression sera supprimée, y compris les échos, les archives et les fragments. Cette action est irréversible.</p>',
      ok: 'Tout effacer', okCls: 'red', fn: () => { DS.resetGame(); }
    });
  };
  ui.confirmImport = function (code) {
    let next;
    try { next = DS.importCode(code); } catch (e) { DS.emit('toast', 'Ce code de sauvegarde est invalide.', 'error'); return; }
    ui.confirm({
      tag: 'IMPORT', title: 'Remplacer la partie actuelle ?', icon: 'cloud',
      body: '<p>La sauvegarde importée (secteur ' + (next.sector + 1) + ', ' + DS.fmtTime(next.stats.time) + ' de survie) remplacera votre partie actuelle.</p>',
      ok: 'Importer', fn: () => { DS.replaceState(next, 'Sauvegarde importée.'); }
    });
  };
  ui.offlineReport = function (rep) {
    if (!rep || rep.seconds < 60) return;
    const lines = DS.RES_ORDER.filter(r => Math.abs(rep.gains[r]) >= 0.5).map(r => '<span class="pill ' + (rep.gains[r] >= 0 ? 'green' : 'red') + '">' + (rep.gains[r] >= 0 ? '+' : '−') + fmt(Math.abs(rep.gains[r])) + ' ' + RES[r].unit + '</span>');
    if (rep.echoes) lines.push('<span class="pill">+' + fmt(rep.echoes) + ' échos</span>');
    ui.modal({
      tag: 'RAPPORT DE VEILLE', title: 'Bon retour à bord', icon: 'cryo',
      body: '<p>Pendant votre absence (' + DS.fmtTime(rep.seconds) + '), l’équipage est resté en veille cryogénique et les modules ont continué de tourner.</p><div class="chips">' + (lines.join('') || '<span class="pill">Rien à signaler</span>') + '</div>',
      actions: [{ label: 'Reprendre le commandement', cls: 'green' }]
    });
  };

  // ------------------------------------------------------------------ cycle de rendu
  ui.go = function (tab) {
    if (!DS.tabs(ui.s).some(t => t.id === tab)) tab = 'ship';
    ui.tab = tab;
    ui.newTabs.delete(tab);
    ui.viewSig = null;
    ui.render(true);
    const main = $('main');
    if (main.getBoundingClientRect().top < 0) main.scrollIntoView({ block: 'start' });
  };
  ui.cloudText = () => ({ local: 'Sauvegarde locale dans ce navigateur.', sync: 'Synchronisation avec votre compte…', ok: 'Sauvegarde aussi enregistrée sur votre compte.', off: 'Sauvegarde du compte indisponible : sauvegarde locale uniquement.', readonly: 'Accès en lecture seule : sauvegarde locale uniquement.' }[ui.cloud] || '');

  ui.init = function (s) {
    ui.s = s;
    DS.settings.notation = s.settings.notation;
    if (ui.scene) ui.scene.setState(s);
    buildNav(); buildTop(); buildRight();
    ui.viewSig = null;
    ui.render(true);
  };
  let lastRender = 0;
  ui.render = function (force) {
    const s = ui.s;
    if (!s) return;
    const now = performance.now();
    if (!force && now - lastRender < 180) return;
    lastRender = now;
    if (!s._c) s._c = DS.calc(s);
    if (DS.tabs(s).map(t => t.id).join() !== ui.navSig) buildNav();
    if (!DS.tabs(s).some(t => t.id === ui.tab)) ui.tab = 'ship';
    BIND.nav.run(); BIND.top.run(); BIND.right.run();
    if (ui.viewSig !== ui.tab) {
      ui.viewSig = ui.tab;
      BIND.view.clear();
      const main = $('main');
      main.replaceChildren();
      ui.floats = null; ui.specCanvas = null;
      VIEWS[ui.tab](main, mk(BIND.view));
    }
    BIND.view.run();
  };

  // ------------------------------------------------------------------ retours visuels
  DS.on('toast', (msg, type) => {
    const box = $('toasts');
    if (!box) return;
    const t = h('div', { class: 'toast ' + (type || '') }, msg);
    box.append(t);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => t.remove(), 3800);
  });
  DS.on('float', (text, kind, bonus) => {
    if (ui.tab !== 'ship') return;
    const p = ui.pointer;
    if (ui.scene) ui.scene.burst(kind, p && p.logical);
    if (!ui.floats || (ui.s && ui.s.settings.particles === false)) return;
    const put = (txt, dy) => {
      if (!ui.floats) return;
      const f = h('span', { class: 'float ' + kind }, txt);
      f.style.left = (p ? p.x : 38 + Math.random() * 24) + '%';
      f.style.top = ((p ? p.y : 52 + Math.random() * 14) + dy) + '%';
      ui.floats.append(f);
      setTimeout(() => f.remove(), 1000);
    };
    put(text, 0);
    if (bonus) setTimeout(() => put(bonus, -8), 200);
    ui.pointer = null;
  });
  DS.on('unlock', tab => {
    ui.newTabs.add(tab);
    const t = DS.TABS.find(x => x.id === tab);
    if (t) DS.emit('toast', 'Nouvel onglet : ' + t.label, 'gold');
  });
  DS.on('objective', o => DS.emit('toast', 'Objectif atteint : ' + o.title, 'good'));
  DS.on('event', ev => DS.emit('toast', 'Transmission entrante : « ' + ev.title + ' ». Ouvrez la messagerie.', 'gold'));
  DS.on('jump', g => { if (ui.scene) ui.scene.burst('jump'); DS.emit('toast', 'Saut réussi : +' + fmt(g) + ' échos stellaires.', 'gold'); });
  DS.on('emission', g => {
    ui.modal({ tag: 'TRANSMISSION ÉMISE', title: 'Le Signal est parti', icon: 'antenna',
      body: '<p>Une impulsion d’une puissance inouïe traverse la galaxie. +' + g + ' fragment' + (g > 1 ? 's' : '') + ' de signal.</p><p>L’ARCHE-09 se réveille à nouveau dans la Ceinture d’Hélios. Dépensez vos fragments dans l’onglet Signal.</p>',
      actions: [{ label: 'Recommencer le voyage', cls: 'orange' }] });
  });
  DS.on('victory', () => {
    const s = ui.s;
    ui.modal({ tag: 'FIN DE LA MISSION', title: 'Le Dernier Signal', icon: 'star', dismiss: true,
      body: '<p>Le message quitte l’antenne et file vers un point bleu pâle, à des milliers d’années-lumière. L’équipage de l’ARCHE-09 ne saura peut-être jamais s’il a été reçu. Mais il est parti.</p>' +
        '<div class="chips"><span class="pill">' + DS.fmtTime(s.stats.time) + ' de survie</span><span class="pill">' + s.stats.jumps + ' sauts</span><span class="pill">' + s.signal.emissions + ' émissions</span><span class="pill">' + fmt(s.stats.metal) + ' métal récupéré</span></div>' +
        '<p>Merci d’avoir joué. Le voyage continue si vous le souhaitez.</p>',
      actions: [{ label: 'Continuer le voyage', cls: 'green' }] });
  });

  // ------------------------------------------------------------------ clavier
  document.addEventListener('keydown', ev => {
    if (ui.modalState) {
      if (ev.key === 'Escape' && ui.modalState.dismiss) { ev.preventDefault(); ui.closeModal(); }
      return;
    }
    const tag = (ev.target && ev.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const map = { ' ': 'salvage', '1': 'salvage', '2': 'drill', '3': 'scan', '4': 'repair', '5': 'vital' };
    if (map[ev.key]) {
      ev.preventDefault();
      if (ev.repeat) return;
      if (document.activeElement && document.activeElement.tagName === 'BUTTON') document.activeElement.blur();
      ui.doAction(map[ev.key]);
    } else if (ev.key === 'm' || ev.key === 'M') ui.openEvent();
  });
  document.getElementById('modal').addEventListener('click', ev => { if (ev.target.id === 'modal' && ui.modalState && ui.modalState.dismiss) ui.closeModal(); });
})(window.DS);
