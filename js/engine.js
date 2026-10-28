/* Last Signal — moteur de jeu (aucune dépendance au DOM). */
'use strict';
(function (DS) {
  const RO = DS.RES_ORDER;
  const byId = (list, id) => list.find(x => x.id === id);

  // ------------------------------------------------------------------ évènements internes
  const listeners = {};
  DS.on = (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); };
  DS.emit = (ev, ...args) => { (listeners[ev] || []).forEach(fn => fn(...args)); };

  // ------------------------------------------------------------------ formats
  DS.settings = { notation: 'std' };
  const SUFFIX = ['', ' k', ' M', ' Md', ' Bn', ' Bd', ' Tn', ' Td', ' Qn', ' Qd'];
  const loc = (n, d) => n.toLocaleString('fr-FR', { maximumFractionDigits: d, minimumFractionDigits: 0 });
  DS.fmt = function (n, dec) {
    if (n === Infinity) return '∞';
    if (typeof n !== 'number' || !isFinite(n)) return '0';
    const neg = n < 0;
    n = Math.abs(n);
    let out;
    if (n < 1000) {
      const d = dec != null ? dec : n >= 100 ? 0 : n >= 10 ? 1 : 2;
      out = loc(n, d);
    } else if (DS.settings.notation === 'sci' || n >= 1e30) {
      const e = Math.floor(Math.log10(n));
      const m = n / Math.pow(10, e);
      out = m.toFixed(2).replace('.', ',') + 'e' + e;
    } else {
      const i = Math.floor(Math.log10(n) / 3);
      const m = n / Math.pow(1000, i);
      out = loc(m, m < 10 ? 2 : m < 100 ? 1 : 0) + SUFFIX[i];
    }
    return (neg ? '−' : '') + out;
  };
  DS.fmtInt = n => DS.fmt(n < 1000 ? Math.floor(n) : n, 0);
  DS.fmtTime = function (sec) {
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    if (h) return h + ' h ' + String(m).padStart(2, '0') + ' min';
    if (m) return m + ' min ' + String(s).padStart(2, '0') + ' s';
    return s + ' s';
  };
  DS.fmtPct = x => Math.round(x * 100) + ' %';

  // ------------------------------------------------------------------ état
  DS.newState = function () {
    const s = {
      v: 2, created: Date.now(), savedAt: Date.now(),
      res: {}, hull: 100, mods: {}, research: {},
      crew: { total: DS.BASE_CREW, roles: { engineer: 0, technician: 0, botanist: 0, scientist: 0 } },
      flags: {}, seen: { metal: true, ice: true, energy: true, oxygen: true, food: true },
      run: { metal: 0, time: 0 },
      sector: 0, jumps: 0, echoes: 0, echoesEarned: 0, archives: {},
      specimen: { found: false, xp: 0, level: 0 },
      anomaly: { active: null, done: {} },
      signal: { fragments: 0, earned: 0, emissions: 0, upg: {}, antenna: 0, won: false },
      exps: [],
      auto: { mods: {}, research: true, jump: false, jumpAt: 10 },
      cd: { scan: 0, vital: 0 },
      distress: { active: false, timer: 0 },
      event: { pending: null, next: 100, hazard: 260, last: null },
      obj: 0,
      stats: { metal: 0, alloy: 0, clicks: 0, time: 0, exps: 0, crewLost: 0, events: 0, jumps: 0, maxSector: 0, breaches: 0, fed: 0 },
      log: [],
      settings: { notation: 'std', particles: true, motion: true },
      tutorial: true
    };
    startRun(s);
    return s;
  };

  function startRun(s) {
    const E0 = DS.effects(s);
    const keep = {};
    for (const r of DS.RESEARCH) {
      if (s.research[r.id] && (r.perm || E0.keepAllTech || (E0.keepTech && r.tier === 1))) keep[r.id] = true;
    }
    s.research = keep;
    s.mods = {};
    const E = DS.effects(s);
    s.res = Object.assign({}, DS.START);
    if (E.startRes) {
      s.res.metal += 100 * Math.pow(3, E.startRes);
      s.res.ice += 40 * Math.pow(3, E.startRes);
    }
    const max = DS.crewMax(s, E);
    s.crew = { total: Math.min(max, DS.BASE_CREW + E.startCrew), roles: { engineer: 0, technician: 0, botanist: 0, scientist: 0 } };
    s.hull = 100;
    s.exps = [];
    s.run = { metal: 0, time: 0 };
    s.distress = { active: false, timer: 0 };
    s.cd = { scan: 0, vital: 0 };
    s.event.pending = null;
    s._c = null;
  }
  DS.startRun = startRun;

  DS.milestoneMul = L => { let m = 1; for (const t of DS.MILESTONES) { if (L >= t) m *= 2; else break; } return m; };
  DS.nextMilestone = L => DS.MILESTONES.find(t => t > L) || null;

  // ------------------------------------------------------------------ effets cumulés
  DS.effects = function (s) {
    const E = {
      mod: {}, res: {}, eco: 1, life: 1,
      click: 1, clickPct: 0, autoClick: 0,
      o2Use: 1, foodUse: 1, useMult: 1,
      hullDecay: 1, hullHit: 1, hullRegen: 1, repair: 1,
      cost: 1, growthAdd: 0,
      slots: 1, expReward: 1, expSpeed: 1, expRisk: 1,
      roleBonus: 0.2, roleMult: 1, cap: 1,
      echoGain: 1, echoPower: 1, fragGain: 1, specimenGain: 1,
      scanCd: 1, crewMax: 0, startCrew: 0, startRes: 0, crewLock: 0,
      keepTech: false, keepAllTech: false, keepSpecimen: false,
      autoTier1: false, autoAll: false, autoResearch: false, autoJump: false, autoRepair: false,
      noClick: false
    };
    for (const r of DS.RESEARCH) if (s.research[r.id]) r.fx(E, s);
    for (const a of DS.ARCHIVES) { const l = s.archives[a.id] || 0; if (l) a.fx(E, l, s); }
    for (const u of DS.SIGNAL_UPG) { const l = s.signal.upg[u.id] || 0; if (l) u.fx(E, l, s); }
    for (const an of DS.ANOMALIES) if (s.anomaly.done[an.id]) an.rewardFx(E, s);
    const active = s.anomaly.active && byId(DS.ANOMALIES, s.anomaly.active);
    if (active) active.apply(E, s);
    // Spécimen
    if (s.specimen.found) {
      const L = s.specimen.level;
      if (!active) E.eco *= Math.pow(1.04, L);
      if (L >= 3) E.foodUse *= 0.75;
      if (L >= 8) E.expReward *= 1.5;
      if (L >= 15) E.hullDecay *= 0.5;
      if (L >= 25) E.echoGain *= 1.5;
      if (L >= 40) { E.mod.drone = (E.mod.drone || 1) * 10; E.mod.harvester = (E.mod.harvester || 1) * 10; }
      if (L >= 60) E.fragGain *= 2;
    }
    // Bonus passif des échos (suspendu dans une anomalie)
    if (!active) E.eco *= DS.echoBonus(s, E);
    return E;
  };

  DS.echoBonus = (s, E) => Math.pow(1 + s.echoesEarned, 0.6) * (E ? E.echoPower : 1);

  DS.caps = function (s, E) {
    const c = Object.assign({}, DS.BASE_CAP);
    for (const m of DS.MODULES) {
      const L = s.mods[m.id] || 0;
      if (m.cap && L) for (const r in m.cap) c[r] += m.cap[r] * L;
    }
    for (const r in c) c[r] *= E.cap;
    return c;
  };

  // ------------------------------------------------------------------ calcul des flux
  DS.calc = function (s, offline) {
    const E = DS.effects(s);
    const sec = DS.sector(s.sector);
    const role = {};
    for (const r of RO) role[r] = 1;
    for (const ro of DS.ROLES) {
      const n = s.crew.roles[ro.id] || 0;
      for (const r of ro.res) role[r] *= 1 + E.roleBonus * E.roleMult * n;
    }
    const hullEff = s.hull >= 50 ? 1 : 0.5 + s.hull / 100;
    const distress = s.distress.active ? 0.35 : 1;
    const base = {}, rm = {};
    for (const r of RO) {
      base[r] = (E.res[r] || 1) * role[r] * (sec.res[r] || 1) * (DS.RES[r].eco ? E.eco : E.life);
      rm[r] = base[r] * hullEff * distress;
    }
    const mods = DS.MODULES.filter(m => (s.mods[m.id] || 0) > 0);
    const ratio = { energy: 1, ice: 1, metal: 1 };
    let out = {}, use = {};
    for (let it = 0; it < 3; it++) {
      const supply = {}, demand = {};
      out = {}; use = {};
      for (const m of mods) {
        const L = s.mods[m.id];
        const used = m.use ? Object.keys(m.use) : [];
        const f = used.reduce((a, r) => Math.min(a, ratio[r]), 1);
        const pm = L * DS.milestoneMul(L) * (E.mod[m.id] || 1);
        const o = {}, u = {};
        if (m.prod) for (const r in m.prod) { o[r] = m.prod[r] * pm * rm[r] * f; supply[r] = (supply[r] || 0) + o[r]; }
        for (const r of used) {
          const fo = used.reduce((a, x) => (x === r ? a : Math.min(a, ratio[x])), 1);
          demand[r] = (demand[r] || 0) + m.use[r] * L * E.useMult * fo;
          u[r] = m.use[r] * L * E.useMult * f;
        }
        out[m.id] = o; use[m.id] = u;
      }
      for (const r in ratio) {
        const d = demand[r] || 0, sp = supply[r] || 0;
        ratio[r] = (s.res[r] > 1e-6 || d <= sp) ? 1 : Math.max(0, sp / d);
      }
    }
    const prod = {}, cons = {};
    for (const r of RO) { prod[r] = 0; cons[r] = 0; }
    for (const id in out) for (const r in out[id]) prod[r] += out[id][r];
    for (const id in use) for (const r in use[id]) cons[r] += use[id][r];

    const crewF = (offline ? 0.2 : 1) * (1 + 0.1 * s.sector) * (sec.crew || 1);
    const crewO2 = s.crew.total * DS.CREW_USE.oxygen * E.o2Use * crewF;
    const crewFood = s.crew.total * DS.CREW_USE.food * E.foodUse * crewF;
    cons.oxygen += crewO2;
    cons.food += crewFood;

    const clickMetal = E.noClick ? 0 : 2 * E.click * base.metal + prod.metal * E.clickPct;
    const clickIce = E.noClick ? 0 : 1 * E.click * base.ice + prod.ice * E.clickPct;
    const autoClick = E.noClick ? 0 : E.autoClick;
    prod.metal += clickMetal * autoClick;

    const net = {};
    for (const r of RO) net[r] = prod[r] - cons[r];

    const nan = DS.MODULES.find(m => m.id === 'nanites');
    const nL = s.mods.nanites || 0;
    const regen = nL ? nan.hull * nL * DS.milestoneMul(nL) * (E.mod.nanites || 1) * E.hullRegen * ratio.energy : 0;
    const decay = DS.HULL_DECAY * (1 + 0.15 * s.sector) * (sec.hull || 1) * E.hullDecay;

    return {
      E, sec, rm, base, ratio, out, use, prod, cons, net, crewO2, crewFood,
      regen, decay, hullNet: regen - decay, hullEff, caps: DS.caps(s, E),
      clickMetal, clickIce, autoClick, crewMax: DS.crewMax(s, E)
    };
  };
  DS.c = s => s._c || (s._c = DS.calc(s));

  // ------------------------------------------------------------------ gains / dépenses
  DS.gain = function (s, r, n) {
    if (!(n > 0)) return 0;
    const before = s.res[r];
    let v = before + n;
    if (DS.RES[r].capped) v = Math.min(v, Math.max(before, DS.c(s).caps[r]));
    s.res[r] = v;
    const got = v - before;
    if (r === 'metal') { s.run.metal += got; s.stats.metal += got; }
    if (r === 'alloy') s.stats.alloy += got;
    if (got > 0) s.seen[r] = true;
    return got;
  };
  DS.has = (s, cost) => Object.keys(cost).every(r => s.res[r] + 1e-9 >= cost[r]);
  DS.spend = function (s, cost) {
    if (!DS.has(s, cost)) return false;
    for (const r in cost) s.res[r] = Math.max(0, s.res[r] - cost[r]);
    return true;
  };

  // ------------------------------------------------------------------ boucle
  DS.tick = function (s, dt, offline) {
    const c = DS.calc(s, offline);
    s._c = c;
    for (const r of RO) {
      let v = s.res[r] + c.net[r] * dt;
      if (v < 0) v = 0;
      if (DS.RES[r].capped) v = Math.min(v, c.caps[r]);
      else if (v > 1e300) v = 1e300;
      s.res[r] = v;
      if (v > 0) s.seen[r] = true;
    }
    s.run.metal += c.prod.metal * dt;
    s.stats.metal += c.prod.metal * dt;
    s.stats.alloy += c.prod.alloy * dt;

    // coque
    s.hull = Math.min(100, s.hull + c.hullNet * dt);
    if (offline) s.hull = Math.max(10, s.hull);
    if (s.hull <= 0) breach(s);

    // détresse vitale
    const lack = (s.res.oxygen <= 1e-3 && c.net.oxygen < 0) || (s.res.food <= 1e-3 && c.net.food < 0);
    if (lack) {
      if (!s.distress.active) {
        s.distress.active = true;
        DS.log(s, s.res.oxygen <= 1e-3 ? 'Réserves d’oxygène épuisées : l’équipage suffoque.' : 'Plus de vivres à bord : l’équipage s’affaiblit.', 'bad', 'anomaly');
        DS.emit('toast', 'Détresse vitale ! Production réduite.', 'error');
      }
      s.distress.timer += dt;
      if (!offline && s.distress.timer >= 45) { s.distress.timer = 0; loseCrew(s); }
    } else if (s.distress.active) {
      s.distress.active = false;
      s.distress.timer = 0;
      DS.log(s, 'Systèmes vitaux rétablis.', 'good', 'heart');
    }

    // expéditions
    for (const x of s.exps.slice()) {
      x.remaining -= dt;
      if (x.remaining <= 0) finishExp(s, x);
    }

    s.cd.scan = Math.max(0, s.cd.scan - dt);
    s.cd.vital = Math.max(0, s.cd.vital - dt);

    // automatisations
    s._auto = (s._auto || 0) + dt;
    if (s._auto >= 0.5) { s._auto = 0; automate(s, c); }

    // transmissions et aléas
    if (!offline) {
      const ev = s.event;
      if (ev.pending && s.stats.time > ev.pending.expires) {
        DS.log(s, 'Transmission perdue : « ' + ev.pending.title + ' ».', '', 'mail');
        ev.pending = null;
      }
      ev.next -= dt * (c.sec.events || 1);
      if (ev.next <= 0) {
        ev.next = 110 + Math.random() * 110;
        if (!ev.pending) DS.spawnEvent(s);
      }
      if (s.stats.time > 240) {
        ev.hazard -= dt * (1 + 0.1 * s.sector);
        if (ev.hazard <= 0) { ev.hazard = 180 + Math.random() * 240; hazard(s); }
      }
    }

    // anomalie
    if (s.anomaly.active) {
      const an = byId(DS.ANOMALIES, s.anomaly.active);
      if (an && s.run.metal >= an.goal) {
        s.anomaly.done[an.id] = true;
        s.anomaly.active = null;
        DS.log(s, 'Anomalie stabilisée : ' + an.name + '. ' + an.reward, 'good', 'anomaly');
        DS.emit('toast', 'Anomalie stabilisée : ' + an.name + ' !', 'good');
      }
    }

    checkObjectives(s);
    s.run.time += dt;
    s.stats.time += dt;
  };

  function breach(s) {
    s.hull = 30;
    for (const r of ['metal', 'ice', 'energy']) s.res[r] *= 0.75;
    s.stats.breaches++;
    DS.log(s, 'BRÈCHE DANS LA COQUE : les compartiments de secours ont tenu, mais une partie de la soute est perdue.', 'bad', 'hull');
    DS.emit('toast', 'Brèche dans la coque ! 25 % du métal, de la glace et de l’énergie perdus.', 'error');
    DS.emit('breach');
  }

  function loseCrew(s) {
    if (s.crew.total <= 1) return;
    s.crew.total--;
    const free = s.crew.total + 1 - DS.assigned(s);
    if (free <= 0) {
      const role = DS.ROLES.map(r => r.id).sort((a, b) => s.crew.roles[b] - s.crew.roles[a])[0];
      s.crew.roles[role] = Math.max(0, s.crew.roles[role] - 1);
    }
    s.stats.crewLost++;
    DS.log(s, 'Un membre d’équipage n’a pas survécu. Il reste ' + s.crew.total + ' survivant' + (s.crew.total > 1 ? 's' : '') + '.', 'bad', 'crew');
    DS.emit('toast', 'Perte d’un membre d’équipage.', 'error');
  }

  // ------------------------------------------------------------------ journal
  DS.log = function (s, text, tone, icon) {
    s.log.unshift({ t: Date.now(), text, tone: tone || '', icon: icon || 'journal' });
    if (s.log.length > 120) s.log.length = 120;
    DS.emit('log', s.log[0]);
  };

  // ------------------------------------------------------------------ actions manuelles
  DS.salvage = function (s) {
    const c = DS.c(s);
    if (c.E.noClick) { DS.emit('toast', 'Les sas sont bloqués par l’anomalie.', 'error'); return 0; }
    const got = DS.gain(s, 'metal', c.clickMetal);
    s.stats.clicks++;
    let bonus = null;
    if (Math.random() < 0.03) {
      const d = DS.gain(s, 'data', Math.max(1, c.prod.data * 5));
      s.seen.data = true;
      bonus = '+' + DS.fmt(d) + ' données';
    }
    DS.emit('float', '+' + DS.fmt(got) + ' métal', 'metal', bonus);
    return got;
  };

  DS.drill = function (s) {
    const c = DS.c(s);
    if (c.E.noClick) { DS.emit('toast', 'Les sas sont bloqués par l’anomalie.', 'error'); return 0; }
    const got = DS.gain(s, 'ice', c.clickIce);
    s.stats.clicks++;
    DS.emit('float', '+' + DS.fmt(got) + ' glace', 'ice');
    return got;
  };

  DS.scanCost = s => ({ energy: 5 });
  DS.scan = function (s) {
    if (s.cd.scan > 0) return false;
    const c = DS.c(s);
    if (!DS.spend(s, DS.scanCost(s))) { DS.emit('toast', 'Il faut 5 énergie pour lancer un scan.', 'error'); return false; }
    const first = !s.flags.scanned;
    s.flags.scanned = true;
    s.seen.data = true;
    const d = DS.gain(s, 'data', Math.max(2, c.prod.data * 20) * (first ? 2 : 1));
    s.cd.scan = 10 * c.E.scanCd;
    let msg = '+' + DS.fmt(d) + ' données';
    if (Math.random() < 0.3) {
      const m = DS.gain(s, 'metal', Math.max(8, c.prod.metal * 15));
      msg += ' • +' + DS.fmt(m) + ' métal';
    }
    DS.emit('float', msg, 'data');
    if (first) {
      DS.log(s, 'Premier scan du secteur : des données exploitables. Le centre de recherche est en ligne.', 'good', 'scan');
      DS.emit('unlock', 'research');
    } else if (!s.event.pending && s.stats.time > 60 && Math.random() < 0.08) {
      DS.spawnEvent(s);
    }
    return true;
  };

  DS.repairCost = function (s) {
    const c = DS.c(s);
    return { metal: Math.ceil(Math.max(15, c.prod.metal * 12) / c.E.repair) };
  };
  DS.repair = function (s) {
    if (s.hull >= 99.9) { DS.emit('toast', 'La coque est déjà intacte.', ''); return false; }
    if (!DS.spend(s, DS.repairCost(s))) { DS.emit('toast', 'Pas assez de métal pour réparer.', 'error'); return false; }
    const before = s.hull;
    s.hull = Math.min(100, s.hull + 15);
    DS.emit('float', '+' + Math.round(s.hull - before) + ' % coque', 'hull');
    return true;
  };

  DS.vitalCost = s => ({ ice: Math.ceil(6 * (1 + 0.5 * s.sector)), energy: Math.ceil(6 * (1 + 0.5 * s.sector)) });
  DS.vital = function (s) {
    if (s.cd.vital > 0) return false;
    const c = DS.c(s);
    if (!DS.spend(s, DS.vitalCost(s))) { DS.emit('toast', 'Il faut de la glace et de l’énergie pour la synthèse vitale.', 'error'); return false; }
    const o = DS.gain(s, 'oxygen', Math.max(20, c.caps.oxygen * 0.12));
    const f = DS.gain(s, 'food', Math.max(8, c.caps.food * 0.08));
    s.cd.vital = 2;
    DS.emit('float', '+' + DS.fmt(o) + ' O₂ • +' + DS.fmt(f) + ' vivres', 'oxygen');
    return true;
  };

  // ------------------------------------------------------------------ modules
  DS.modUnlocked = (s, m) => !m.unlock || m.unlock(s);
  DS.modCost = function (s, m, n, E) {
    E = E || DS.c(s).E;
    const L = s.mods[m.id] || 0, g = m.growth + E.growthAdd;
    const k = n === 1 ? 1 : (Math.pow(g, n) - 1) / (g - 1);
    const out = {};
    for (const r in m.cost) out[r] = Math.ceil(m.cost[r] * E.cost * Math.pow(g, L) * k);
    return out;
  };
  DS.modMax = function (s, m, E) {
    E = E || DS.c(s).E;
    const L = s.mods[m.id] || 0, g = m.growth + E.growthAdd;
    let n = Infinity;
    for (const r in m.cost) {
      const first = m.cost[r] * E.cost * Math.pow(g, L);
      n = Math.min(n, Math.floor(Math.log(1 + s.res[r] * (g - 1) / first) / Math.log(g)));
    }
    n = Math.max(0, Math.min(n, 1000));
    while (n > 0 && !DS.has(s, DS.modCost(s, m, n, E))) n--;
    return n;
  };
  DS.buyModule = function (s, id, mode, quiet) {
    const m = byId(DS.MODULES, id);
    if (!m || !DS.modUnlocked(s, m)) return 0;
    const E = DS.c(s).E;
    const max = DS.modMax(s, m, E);
    const n = Math.min(max, mode === 'max' ? max : (mode || 1));
    if (n < 1) { if (!quiet) DS.emit('toast', 'Ressources insuffisantes pour ' + m.name.toLowerCase() + '.', 'error'); return 0; }
    DS.spend(s, DS.modCost(s, m, n, E));
    const before = s.mods[id] || 0;
    s.mods[id] = before + n;
    s._c = null;
    if (!quiet) {
      DS.emit('built', id, n);
      const ms = DS.MILESTONES.find(t => before < t && s.mods[id] >= t);
      if (ms) DS.log(s, m.name + ' niveau ' + ms + ' : production doublée.', 'good', 'star');
      else if (before === 0) DS.log(s, m.name + ' installé.', 'good', m.icon);
    }
    return n;
  };

  // ------------------------------------------------------------------ recherche
  DS.researchVisible = (s, r) => s.sector >= DS.TIER_SECTOR[r.tier] && (!r.req || s.research[r.req]);
  DS.buyResearch = function (s, id, quiet) {
    const r = byId(DS.RESEARCH, id);
    if (!r || s.research[id] || !DS.researchVisible(s, r)) return false;
    if (!DS.spend(s, r.cost)) { if (!quiet) DS.emit('toast', 'Ressources insuffisantes pour cette recherche.', 'error'); return false; }
    s.research[id] = true;
    s._c = null;
    applyResearchFlags(s);
    DS.log(s, 'Recherche terminée : ' + r.name + '.', 'good', 'flask');
    if (!quiet) DS.emit('toast', 'Technologie acquise : ' + r.name, 'good');
    return true;
  };
  function applyResearchFlags(s) {
    const unlock = (flag, tab, text) => {
      if (!s.flags[flag]) { s.flags[flag] = true; DS.emit('unlock', tab); DS.log(s, text, 'good', 'star'); }
    };
    if (s.research.cryogenics) unlock('crew', 'crew', 'Nouvel onglet : Équipage.');
    if (s.research.hangar) unlock('exps', 'exps', 'Nouvel onglet : Expéditions.');
    if (s.research.navigation) unlock('nav', 'nav', 'Nouvel onglet : Navigation.');
    if (s.research.metallurgy) s.seen.alloy = true;
  }

  // ------------------------------------------------------------------ équipage
  DS.crewMax = (s, E) => (E.crewLock ? E.crewLock : DS.BASE_CREW_MAX + 2 * (s.mods.cryo || 0) + E.crewMax);
  DS.assigned = s => DS.ROLES.reduce((a, r) => a + (s.crew.roles[r.id] || 0), 0);
  DS.wakeCost = function (s) {
    const k = Math.max(0, s.crew.total - DS.BASE_CREW);
    const f = Math.pow(1.45, k);
    return { food: Math.ceil(20 * f), oxygen: Math.ceil(20 * f), metal: Math.ceil(50 * Math.pow(3, k)) };
  };
  DS.wake = function (s) {
    const c = DS.c(s);
    if (s.crew.total >= c.crewMax) { DS.emit('toast', 'Aucune capsule occupée : construisez des modules cryogéniques.', 'error'); return false; }
    if (!DS.spend(s, DS.wakeCost(s))) { DS.emit('toast', 'Ressources insuffisantes pour réveiller un dormeur.', 'error'); return false; }
    s.crew.total++;
    s._c = null;
    DS.log(s, 'Un dormeur a été réveillé. L’équipage compte ' + s.crew.total + ' membres.', 'good', 'crew');
    return true;
  };
  DS.assign = function (s, role, delta) {
    const cur = s.crew.roles[role] || 0;
    const free = s.crew.total - DS.assigned(s);
    if (delta > 0 && free <= 0) return false;
    if (delta < 0 && cur <= 0) return false;
    s.crew.roles[role] = cur + (delta > 0 ? 1 : -1);
    s._c = null;
    return true;
  };

  // ------------------------------------------------------------------ expéditions
  DS.expUnlocked = (s, x) => !x.unlock || x.unlock(s);
  DS.specNeed = L => DS.SPEC_XP.base * Math.pow(DS.SPEC_XP.growth, L);
  DS.expReward = function (s, x) {
    const c = DS.c(s);
    const out = {};
    for (const r in x.reward) {
      const [secs, min] = x.reward[r];
      if (r === 'specimen') { out.specimen = Math.max(min, DS.specNeed(s.specimen.level) * 0.6) * c.E.expReward; continue; }
      out[r] = Math.max(min * (1 + 0.5 * s.sector), c.prod[r] * secs) * c.E.expReward;
    }
    return out;
  };
  DS.expTime = (s, x) => x.time * DS.c(s).E.expSpeed;
  DS.startExp = function (s, id) {
    const x = byId(DS.EXPEDITIONS, id);
    const c = DS.c(s);
    if (!x || !DS.expUnlocked(s, x) || s.exps.some(e => e.id === id)) return false;
    if (s.exps.length >= c.E.slots) { DS.emit('toast', 'Tous les hangars sont occupés.', 'error'); return false; }
    if (!DS.spend(s, x.cost)) { DS.emit('toast', 'Ressources insuffisantes pour cette expédition.', 'error'); return false; }
    const t = DS.expTime(s, x);
    s.exps.push({ id, total: t, remaining: t, reward: DS.expReward(s, x), risk: x.risk * c.E.expRisk });
    DS.log(s, 'Sonde envoyée : ' + x.name + '.', '', 'planet');
    return true;
  };
  function finishExp(s, e) {
    s.exps = s.exps.filter(x => x !== e);
    const x = byId(DS.EXPEDITIONS, e.id);
    if (!x) return;
    if (Math.random() < e.risk) {
      DS.log(s, 'La sonde « ' + x.name + ' » ne répond plus. Expédition perdue.', 'bad', 'planet');
      DS.emit('toast', 'Expédition perdue : ' + x.name, 'error');
      return;
    }
    const parts = [];
    for (const r in e.reward) {
      if (r === 'specimen') { DS.feedXp(s, e.reward[r]); parts.push('+' + DS.fmt(e.reward[r]) + ' XP Spécimen'); continue; }
      const got = DS.gain(s, r, e.reward[r]);
      parts.push('+' + DS.fmt(got) + ' ' + DS.RES[r].unit);
    }
    s.stats.exps++;
    DS.log(s, 'Expédition terminée : ' + x.name + ' — ' + parts.join(', ') + '.', 'good', 'planet');
    DS.emit('toast', 'Expédition réussie : ' + parts.join(' • '), 'good');
  }

  // ------------------------------------------------------------------ saut hyperspatial
  DS.jumpMult = s => (1 + 0.25 * s.sector) * DS.c(s).E.echoGain;
  DS.jumpGain = function (s) {
    if (!s.research.navigation || s.anomaly.active) return 0;
    return Math.floor(Math.pow(s.run.metal / DS.JUMP_DIVISOR, DS.JUMP_EXP) * DS.jumpMult(s));
  };
  DS.nextEchoAt = function (s) {
    const g = Math.floor(Math.pow(s.run.metal / DS.JUMP_DIVISOR, DS.JUMP_EXP) * DS.jumpMult(s));
    return DS.JUMP_DIVISOR * Math.pow((g + 1) / DS.jumpMult(s), 1 / DS.JUMP_EXP);
  };
  DS.canJump = s => DS.jumpGain(s) >= 1;
  DS.jump = function (s) {
    const g = DS.jumpGain(s);
    if (g < 1) return false;
    const from = DS.sector(s.sector).name;
    s.echoes += g;
    s.echoesEarned += g;
    s.jumps++;
    s.stats.jumps++;
    s.sector++;
    s.stats.maxSector = Math.max(s.stats.maxSector, s.sector);
    startRun(s);
    DS.log(s, 'SAUT RÉUSSI depuis ' + from + ' — arrivée dans ' + DS.sector(s.sector).name + '. +' + DS.fmt(g) + ' échos stellaires.', 'good', 'radar');
    if (!s.specimen.found) {
      s.specimen.found = true;
      DS.log(s, 'Pendant le saut, un cocon translucide s’est accroché à la coque. Quelque chose bouge à l’intérieur.', 'alert', 'specimen');
      DS.emit('unlock', 'specimen');
    }
    if (s.sector === 2) DS.emit('unlock', 'anomalies');
    if (s.sector === 5) DS.emit('unlock', 'signal');
    DS.emit('jump', g);
    return true;
  };

  DS.archiveCost = (s, a) => Math.ceil(a.base * Math.pow(a.growth, s.archives[a.id] || 0));
  DS.buyArchive = function (s, id) {
    const a = byId(DS.ARCHIVES, id);
    if (!a) return false;
    const l = s.archives[id] || 0;
    if (a.max && l >= a.max) return false;
    const cost = DS.archiveCost(s, a);
    if (s.echoes < cost) { DS.emit('toast', 'Échos stellaires insuffisants.', 'error'); return false; }
    s.echoes -= cost;
    s.archives[id] = l + 1;
    s._c = null;
    DS.log(s, 'Archive activée : ' + a.name + ' (niveau ' + (l + 1) + ').', 'good', 'echo');
    return true;
  };

  // ------------------------------------------------------------------ Spécimen
  DS.specLevel = function (xp) {
    let L = 0, acc = 0;
    while (L < 1000 && acc + DS.specNeed(L) <= xp) { acc += DS.specNeed(L); L++; }
    return { level: L, into: xp - acc, need: DS.specNeed(L) };
  };
  DS.specStage = L => DS.SPEC_STAGES.filter(st => L >= st.lvl).pop();
  DS.feedXp = function (s, xp) {
    const before = s.specimen.level;
    s.specimen.xp += xp;
    s.specimen.level = DS.specLevel(s.specimen.xp).level;
    if (s.specimen.level > before) {
      s._c = null;
      const st = DS.specStage(s.specimen.level), old = DS.specStage(before);
      if (st !== old) {
        DS.log(s, 'Le Spécimen a mué : stade « ' + st.name + ' ». ' + (st.perk || ''), 'alert', 'specimen');
        DS.emit('toast', 'Le Spécimen devient : ' + st.name + ' !', 'good');
      }
    }
  };
  DS.feedAvail = function (s, r) {
    if (r === 'food') return Math.max(0, s.res.food - DS.c(s).caps.food * 0.5);
    return s.res[r];
  };
  DS.feed = function (s, r, frac) {
    const f = byId(DS.SPEC_FEED.map(x => Object.assign({ id: x.res }, x)), r);
    if (!f || !s.specimen.found) return 0;
    const amt = DS.feedAvail(s, r) * frac;
    if (amt <= 0) { DS.emit('toast', r === 'food' ? 'Gardez au moins la moitié des vivres pour l’équipage.' : 'Rien à donner.', 'error'); return 0; }
    s.res[r] -= amt;
    const xp = amt * f.w * DS.c(s).E.specimenGain;
    DS.feedXp(s, xp);
    s.stats.fed++;
    DS.emit('float', '+' + DS.fmt(xp) + ' XP', 'specimen');
    return xp;
  };

  // ------------------------------------------------------------------ anomalies
  DS.startAnomaly = function (s, id) {
    const an = byId(DS.ANOMALIES, id);
    if (!an || s.anomaly.active || s.anomaly.done[id]) return false;
    s.anomaly.active = id;
    startRun(s);
    DS.log(s, 'Entrée dans l’anomalie « ' + an.name + ' ». ' + an.handicap, 'alert', 'anomaly');
    return true;
  };
  DS.abandonAnomaly = function (s) {
    if (!s.anomaly.active) return false;
    const an = byId(DS.ANOMALIES, s.anomaly.active);
    s.anomaly.active = null;
    s._c = null;
    DS.log(s, 'Anomalie abandonnée : ' + (an ? an.name : '') + '.', '', 'anomaly');
    return true;
  };

  // ------------------------------------------------------------------ Signal
  DS.buildAntenna = function (s) {
    const st = DS.ANTENNA[s.signal.antenna];
    if (!st || !s.research.antenna) return false;
    if (!DS.spend(s, st.cost)) { DS.emit('toast', 'Ressources insuffisantes pour cette étape.', 'error'); return false; }
    s.signal.antenna++;
    DS.log(s, 'Antenne de transmission : ' + st.name + ' terminé.', 'good', 'antenna');
    return true;
  };
  DS.fragGain = function (s) {
    if (s.signal.antenna < DS.ANTENNA.length) return 0;
    const E = DS.c(s).E;
    return Math.floor(Math.pow(s.echoesEarned / DS.FRAG_DIVISOR, DS.FRAG_EXP) * E.fragGain * (1 + 0.1 * Math.max(0, s.sector - 5)));
  };
  DS.emitSignal = function (s) {
    const g = DS.fragGain(s);
    if (g < 1) return false;
    const E = DS.c(s).E;
    s.signal.fragments += g;
    s.signal.earned += g;
    s.signal.emissions++;
    s.signal.antenna = 0;
    s.sector = 0;
    s.jumps = 0;
    s.echoes = 0;
    s.echoesEarned = 0;
    s.archives = {};
    s.anomaly.active = null;
    if (E.keepSpecimen) { s.specimen.xp *= 0.5; s.specimen.level = DS.specLevel(s.specimen.xp).level; }
    else s.specimen = { found: false, xp: 0, level: 0 };
    s.research = {};
    for (const id of ['cryogenics', 'hangar', 'navigation']) s.research[id] = true;
    startRun(s);
    DS.log(s, 'LE SIGNAL EST PARTI. +' + g + ' fragments de signal. L’ARCHE-09 recommence son voyage depuis la Ceinture d’Hélios.', 'good', 'fragment');
    DS.emit('emission', g);
    return true;
  };
  DS.signalCost = (s, u) => Math.ceil(u.cost * Math.pow(u.growth || 1, s.signal.upg[u.id] || 0));
  DS.buySignal = function (s, id) {
    const u = byId(DS.SIGNAL_UPG, id);
    if (!u) return false;
    const l = s.signal.upg[id] || 0;
    if (u.max && l >= u.max) return false;
    const cost = DS.signalCost(s, u);
    if (s.signal.fragments < cost) { DS.emit('toast', 'Fragments de signal insuffisants.', 'error'); return false; }
    s.signal.fragments -= cost;
    s.signal.upg[id] = l + 1;
    s._c = null;
    DS.log(s, 'Amélioration du Signal : ' + u.name + '.', 'good', 'fragment');
    if (u.final) {
      s.signal.won = true;
      DS.log(s, 'Le Dernier Signal a été transmis. Quelque part, très loin, quelqu’un l’entendra.', 'good', 'star');
      DS.emit('victory');
    }
    return true;
  };

  // ------------------------------------------------------------------ automatisations
  function automate(s, c) {
    const E = c.E;
    if (E.autoTier1 || E.autoAll) {
      for (const m of DS.MODULES) {
        if (!E.autoAll && !DS.TIER1.includes(m.id)) continue;
        if (s.auto.mods[m.id] === false || !DS.modUnlocked(s, m)) continue;
        if (m.id === 'cryo') continue;
        DS.buyModule(s, m.id, 10, true);
      }
    }
    if (E.autoResearch && s.auto.research !== false) {
      const list = DS.RESEARCH.filter(r => !s.research[r.id] && DS.researchVisible(s, r) && DS.has(s, r.cost));
      if (list.length) DS.buyResearch(s, list[0].id, true);
    }
    if (E.autoRepair && s.hull < 60 && DS.has(s, DS.repairCost(s))) DS.repair(s);
    if (E.autoJump && s.auto.jump && DS.jumpGain(s) >= Math.max(1, s.auto.jumpAt)) DS.jump(s);
  }

  // ------------------------------------------------------------------ transmissions
  DS.spawnEvent = function (s) {
    const pool = DS.EVENTS.filter(e => (!e.when || e.when(s)) && e.id !== s.event.last);
    const e = pool[Math.floor(Math.random() * pool.length)];
    if (!e) return;
    const c = DS.c(s);
    const R = (kind, a, min) => {
      if (kind === 'capEnergy') return Math.max(min, c.caps.energy * a);
      if (kind === 'capFood') return Math.max(min, c.caps.food * a);
      if (kind === 'capOxygen') return Math.max(min, c.caps.oxygen * a);
      if (kind === 'pctMetal') return s.res.metal * a;
      if (kind === 'specXp') return Math.max(min, DS.specNeed(s.specimen.level) * a);
      return Math.max(min * (1 + 0.5 * s.sector), (c.prod[kind] || 0) * a);
    };
    const round = fx => { const o = {}; for (const k in fx) o[k] = Math.abs(fx[k]) >= 10 ? Math.round(fx[k]) : Math.round(fx[k] * 10) / 10; return o; };
    s.event.pending = {
      id: e.id, tag: e.tag, title: e.title, desc: e.desc, icon: e.icon,
      choices: e.choices(R).map(ch => ({ label: ch.label, fx: round(ch.fx), risk: ch.risk || null })),
      expires: s.stats.time + 150
    };
    s.event.last = e.id;
    s.stats.events++;
    DS.log(s, 'Transmission entrante : « ' + e.title + ' ».', 'alert', 'mail');
    DS.emit('event', s.event.pending);
  };
  DS.canFx = function (s, fx) {
    for (const k in fx) if (DS.RES[k] && fx[k] < 0 && s.res[k] + 1e-9 < -fx[k]) return false;
    return true;
  };
  DS.applyFx = function (s, fx) {
    const c = DS.c(s);
    const parts = [];
    for (const k in fx) {
      const v = fx[k];
      if (DS.RES[k]) {
        if (v >= 0) { const g = DS.gain(s, k, v); if (g > 0) parts.push('+' + DS.fmt(g) + ' ' + DS.RES[k].unit); }
        else { s.res[k] = Math.max(0, s.res[k] + v); parts.push(DS.fmt(v) + ' ' + DS.RES[k].unit); }
      } else if (k === 'hull') {
        const d = v < 0 ? v * c.E.hullHit : v;
        s.hull = Math.max(1, Math.min(100, s.hull + d));
        parts.push((d > 0 ? '+' : '') + Math.round(d) + ' % coque');
      } else if (k === 'crew') {
        if (s.crew.total < c.crewMax) { s.crew.total += v; parts.push('+' + v + ' membre d’équipage'); s._c = null; }
        else { const d = DS.gain(s, 'data', Math.max(30, c.prod.data * 120)); parts.push('aucune capsule libre : +' + DS.fmt(d) + ' données'); }
      } else if (k === 'echoes') {
        s.echoes += v; s.echoesEarned += v; parts.push('+' + v + ' écho stellaire'); s._c = null;
      } else if (k === 'specimen') {
        DS.feedXp(s, v); parts.push('+' + DS.fmt(v) + ' XP Spécimen');
      } else if (k.startsWith('pct')) {
        const r = k.slice(3).toLowerCase();
        const lost = s.res[r] * -v;
        s.res[r] -= lost;
        parts.push('−' + DS.fmt(lost) + ' ' + DS.RES[r].unit);
      }
    }
    return parts.join(', ');
  };
  DS.resolveEvent = function (s, i) {
    const ev = s.event.pending;
    if (!ev || !ev.choices[i]) return false;
    const ch = ev.choices[i];
    if (!DS.canFx(s, ch.fx)) { DS.emit('toast', 'Ressources insuffisantes pour ce choix.', 'error'); return false; }
    let text = DS.applyFx(s, ch.fx);
    if (ch.risk && Math.random() < ch.risk.p) {
      const t2 = DS.applyFx(s, ch.risk.fx);
      text += (text ? ' — ' : '') + 'mauvaise surprise : ' + t2;
    }
    s.event.pending = null;
    DS.log(s, ev.title + ' : ' + ch.label.toLowerCase() + (text ? ' (' + text + ')' : '') + '.', 'alert', ev.icon);
    DS.emit('toast', ch.label + (text ? ' : ' + text : ''), 'good');
    return true;
  };
  DS.dismissEvent = function (s) {
    if (!s.event.pending) return;
    DS.log(s, 'Transmission ignorée : « ' + s.event.pending.title + ' ».', '', 'mail');
    s.event.pending = null;
  };
  function hazard(s) {
    const h = DS.HAZARDS[Math.floor(Math.random() * DS.HAZARDS.length)];
    const text = DS.applyFx(s, h.fx);
    DS.log(s, 'Alerte : ' + h.text + ' (' + text + ').', 'bad', 'anomaly');
  }

  // ------------------------------------------------------------------ objectifs
  function checkObjectives(s) {
    let guard = 0;
    while (s.obj < DS.OBJECTIVES.length && guard++ < 5) {
      const o = DS.OBJECTIVES[s.obj];
      const [a, b] = o.goal(s);
      if (a < b) break;
      let rw = '';
      if (o.reward) rw = DS.applyFx(s, o.reward);
      DS.log(s, 'Objectif atteint : ' + o.title + (rw ? ' (' + rw + ')' : '') + '.', 'good', 'target');
      s.obj++;
      DS.emit('objective', o);
    }
  }

  // ------------------------------------------------------------------ onglets
  DS.tabs = s => DS.TABS.filter(t => !t.when || t.when(s));

  // ------------------------------------------------------------------ sauvegarde
  DS.serialize = s => JSON.stringify(s, (k, v) => (k[0] === '_' ? undefined : v));

  DS.sanitize = function (raw) {
    if (!raw || typeof raw !== 'object' || !raw.res || typeof raw.res !== 'object') throw new Error('Sauvegarde invalide');
    const s = DS.newState();
    const num = (v, d, min, max) => (typeof v === 'number' && isFinite(v) ? Math.min(max == null ? 1e300 : max, Math.max(min == null ? 0 : min, v)) : d);
    const ids = list => new Set(list.map(x => x.id));
    for (const r of RO) s.res[r] = num(raw.res[r], 0);
    s.hull = num(raw.hull, 100, 0, 100);
    const modIds = ids(DS.MODULES), resIds = ids(DS.RESEARCH), archIds = ids(DS.ARCHIVES), sigIds = ids(DS.SIGNAL_UPG), anIds = ids(DS.ANOMALIES);
    s.mods = {}; for (const k in raw.mods || {}) if (modIds.has(k)) s.mods[k] = Math.floor(num(raw.mods[k], 0, 0, 1e5));
    s.research = {}; for (const k in raw.research || {}) if (resIds.has(k) && raw.research[k]) s.research[k] = true;
    s.archives = {}; for (const k in raw.archives || {}) if (archIds.has(k)) s.archives[k] = Math.floor(num(raw.archives[k], 0, 0, 1000));
    if (raw.crew && typeof raw.crew === 'object') {
      s.crew.total = Math.floor(num(raw.crew.total, DS.BASE_CREW, 1, 1000));
      for (const ro of DS.ROLES) s.crew.roles[ro.id] = Math.floor(num(raw.crew.roles && raw.crew.roles[ro.id], 0, 0, 1000));
      while (DS.assigned(s) > s.crew.total) { const k = DS.ROLES.find(r => s.crew.roles[r.id] > 0).id; s.crew.roles[k]--; }
    }
    for (const k in raw.flags || {}) if (typeof raw.flags[k] === 'boolean') s.flags[k] = raw.flags[k];
    for (const r of RO) if (raw.seen && raw.seen[r]) s.seen[r] = true;
    if (raw.run) { s.run.metal = num(raw.run.metal, 0); s.run.time = num(raw.run.time, 0); }
    s.sector = Math.floor(num(raw.sector, 0, 0, 1000));
    s.jumps = Math.floor(num(raw.jumps, 0));
    s.echoes = num(raw.echoes, 0);
    s.echoesEarned = num(raw.echoesEarned, 0);
    if (raw.specimen) {
      s.specimen.found = !!raw.specimen.found;
      s.specimen.xp = num(raw.specimen.xp, 0);
      s.specimen.level = DS.specLevel(s.specimen.xp).level;
    }
    if (raw.anomaly) {
      s.anomaly.active = anIds.has(raw.anomaly.active) ? raw.anomaly.active : null;
      for (const k in raw.anomaly.done || {}) if (anIds.has(k)) s.anomaly.done[k] = true;
    }
    if (raw.signal) {
      const g = raw.signal;
      s.signal.fragments = num(g.fragments, 0); s.signal.earned = num(g.earned, 0);
      s.signal.emissions = Math.floor(num(g.emissions, 0)); s.signal.antenna = Math.floor(num(g.antenna, 0, 0, DS.ANTENNA.length));
      s.signal.won = !!g.won;
      for (const k in g.upg || {}) if (sigIds.has(k)) s.signal.upg[k] = Math.floor(num(g.upg[k], 0, 0, 1000));
    }
    if (Array.isArray(raw.exps)) {
      s.exps = raw.exps.filter(e => e && DS.EXPEDITIONS.some(x => x.id === e.id)).slice(0, 5).map(e => {
        const reward = {};
        for (const k in e.reward || {}) if (DS.RES[k] || k === 'specimen') reward[k] = num(e.reward[k], 0);
        return { id: e.id, total: num(e.total, 30, 1, 1e6), remaining: num(e.remaining, 0, 0, 1e6), reward, risk: num(e.risk, 0.1, 0, 1) };
      });
    }
    if (raw.auto) {
      for (const k in raw.auto.mods || {}) if (modIds.has(k)) s.auto.mods[k] = !!raw.auto.mods[k];
      s.auto.research = raw.auto.research !== false;
      s.auto.jump = !!raw.auto.jump;
      s.auto.jumpAt = Math.floor(num(raw.auto.jumpAt, 10, 1, 1e15));
    }
    if (raw.cd) { s.cd.scan = num(raw.cd.scan, 0, 0, 60); s.cd.vital = num(raw.cd.vital, 0, 0, 60); }
    if (raw.distress) { s.distress.active = !!raw.distress.active; s.distress.timer = num(raw.distress.timer, 0, 0, 60); }
    if (raw.event) {
      s.event.next = num(raw.event.next, 100, 0, 1000);
      s.event.hazard = num(raw.event.hazard, 260, 0, 2000);
      const p = raw.event.pending;
      if (p && typeof p.title === 'string' && Array.isArray(p.choices)) {
        s.event.pending = {
          id: String(p.id || ''), tag: String(p.tag || ''), title: p.title.slice(0, 120), desc: String(p.desc || '').slice(0, 500),
          icon: String(p.icon || 'mail'), expires: num(p.expires, 0),
          choices: p.choices.slice(0, 4).map(ch => {
            const fx = {};
            for (const k in (ch && ch.fx) || {}) if (DS.RES[k] || ['hull', 'crew', 'echoes', 'specimen'].includes(k)) fx[k] = num(ch.fx[k], 0, -1e300);
            const risk = ch && ch.risk && ch.risk.fx ? { p: num(ch.risk.p, 0, 0, 1), fx: { hull: num(ch.risk.fx.hull, 0, -100, 0) } } : null;
            return { label: String((ch && ch.label) || '…').slice(0, 80), fx, risk };
          })
        };
      }
    }
    s.obj = Math.floor(num(raw.obj, 0, 0, DS.OBJECTIVES.length));
    for (const k in s.stats) s.stats[k] = num(raw.stats && raw.stats[k], 0);
    if (Array.isArray(raw.log)) {
      s.log = raw.log.filter(l => l && typeof l.text === 'string').slice(0, 120).map(l => ({
        t: num(l.t, Date.now()), text: l.text.slice(0, 400), tone: ['good', 'bad', 'alert'].includes(l.tone) ? l.tone : '', icon: typeof l.icon === 'string' ? l.icon : 'journal'
      }));
    }
    if (raw.settings) {
      s.settings.notation = raw.settings.notation === 'sci' ? 'sci' : 'std';
      s.settings.particles = raw.settings.particles !== false;
      s.settings.motion = raw.settings.motion !== false;
    }
    s.tutorial = raw.tutorial !== false;
    s.created = num(raw.created, Date.now());
    s.savedAt = num(raw.savedAt, Date.now());
    applyResearchFlags(s);
    s._c = null;
    return s;
  };

  DS.offline = function (s, seconds) {
    seconds = Math.min(seconds, 12 * 3600);
    const before = Object.assign({}, s.res), echoes = s.echoes, logLen = s.log.length;
    const step = Math.max(1, Math.min(30, seconds / 1500));
    let left = seconds;
    while (left > 0) { const dt = Math.min(step, left); DS.tick(s, dt, true); left -= dt; }
    const gains = {};
    for (const r of RO) gains[r] = s.res[r] - before[r];
    return { seconds, gains, echoes: s.echoes - echoes, logs: s.log.length - logLen };
  };
})(typeof window !== 'undefined' ? window.DS : globalThis.DS);
