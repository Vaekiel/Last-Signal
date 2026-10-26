/* Simulation d'équilibrage : un joueur automatique joue à Dernier Signal
   et affiche le temps nécessaire pour atteindre chaque étape.
   Utilisation : node tools/simulation.js [heures] [clics_par_seconde] */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = { console, Math, Date, JSON, Object, Array, Set, Number, String, isFinite };
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['data.js', 'engine.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), ctx, { filename: f });
}
const DS = ctx.DS;

const HOURS = +process.argv[2] || 12;
const CPS = +process.argv[3] || 3;
const DT = 0.5;
let seed = 12345;
Math.random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const s = DS.newState();
const t0 = () => DS.fmtTime(s.stats.time);
const marks = [];
const mark = (txt) => { marks.push('[' + t0().padStart(12) + '] ' + txt); };
DS.on('objective', o => mark('Objectif : ' + o.title));
let runInfo = '';
DS.on('jump', g => mark('SAUT → secteur ' + (s.sector + 1) + ' (+' + g + ' échos, total ' + s.echoesEarned + ')' + runInfo));
DS.on('emission', g => mark('ÉMISSION DU SIGNAL (+' + g + ' fragments, total ' + s.signal.earned + ')'));
DS.on('victory', () => mark('VICTOIRE'));
let deaths = 0, breaches = 0;
DS.on('breach', () => breaches++);

const weight = { metal: 1, ice: 3, data: 30, alloy: 60 };
const metalEq = cost => Object.keys(cost).reduce((a, r) => a + cost[r] * (weight[r] || 1), 0);
let runStart = 0, lastFeed = 0, lastRunMetal = 0, anomalyStart = 0;

function botStep() {
  const c = DS.calc(s); s._c = c;
  const E = c.E;
  // clics
  for (let i = 0; i < CPS * DT; i++) DS.salvage(s);
  if (s.res.ice < 30 && s.stats.time < 1200) DS.drill(s);
  if (s.cd.scan <= 0 && s.res.energy > 20) DS.scan(s);
  // vital
  if (s.res.oxygen < 15 || s.res.food < 8) DS.vital(s);
  if (s.hull < 55) DS.repair(s);
  // besoins vitaux
  const need = [];
  if (c.net.oxygen < 0.05) need.push('condenser');
  if (c.net.food < 0.03) need.push('greenhouse');
  if (c.net.energy < 0.3 || c.ratio.energy < 1) need.push(s.mods.fusion || DS.modUnlocked(s, DS.MODULES.find(m => m.id === 'fusion')) && s.res.alloy > 1000 ? 'fusion' : 'solar');
  if (c.net.ice < 0.2 || c.ratio.ice < 1) need.push('collector');
  if (c.net.oxygen < 0 && DS.modUnlocked(s, DS.MODULES.find(m => m.id === 'biodome'))) need.push('biodome');
  for (const id of need) DS.buyModule(s, id, 1, true);
  if (c.caps.energy - s.res.energy < 1 && DS.modUnlocked(s, DS.MODULES[5]) && (s.mods.battery || 0) < 3) DS.buyModule(s, 'battery', 1, true);
  // recherche
  const avail = DS.RESEARCH.filter(r => !s.research[r.id] && DS.researchVisible(s, r)).sort((a, b) => metalEq(a.cost) - metalEq(b.cost));
  for (const r of avail) if (DS.has(s, r.cost)) DS.buyResearch(s, r.id, true);
  // modules économiques
  const eco = ['drone', 'extractor', 'harvester', 'lab', 'array', 'quantum', 'foundry', 'plasma', 'nanites', 'solar', 'collector'];
  let best = null, bestScore = Infinity;
  for (const id of eco) {
    const m = DS.MODULES.find(x => x.id === id);
    if (!DS.modUnlocked(s, m)) continue;
    if (id === 'nanites' && (s.mods.nanites || 0) >= 5) continue;
    if ((id === 'solar' || id === 'collector') && (s.mods[id] || 0) > (s.mods.drone || 0)) continue;
    const cost = DS.modCost(s, m, 1);
    let score = metalEq(cost);
    if (id === 'lab' || id === 'array' || id === 'quantum') score *= 0.6;
    if (score < bestScore) { bestScore = score; best = id; }
  }
  if (best) DS.buyModule(s, best, 'max', true);
  // équipage
  if (s.flags.crew) {
    if (s.crew.total < c.crewMax && c.net.oxygen > 0.3 && c.net.food > 0.1 && DS.has(s, DS.wakeCost(s))) DS.wake(s);
    if (DS.modUnlocked(s, DS.MODULES.find(m => m.id === 'cryo')) && s.crew.total >= c.crewMax && DS.has(s, DS.modCost(s, DS.MODULES.find(m => m.id === 'cryo'), 1)) && s.res.metal > metalEq(DS.modCost(s, DS.MODULES.find(m => m.id === 'cryo'), 1)) * 5) DS.buyModule(s, 'cryo', 1, true);
    while (DS.assigned(s) < s.crew.total) {
      const order = ['engineer', 'scientist', 'engineer', 'botanist', 'technician'];
      DS.assign(s, order[DS.assigned(s) % order.length], 1);
    }
  }
  // expéditions
  if (s.flags.exps) for (const x of DS.EXPEDITIONS.slice().reverse()) if (DS.expUnlocked(s, x) && DS.has(s, x.cost) && s.res.energy > x.cost.energy * 1.5) DS.startExp(s, x.id);
  // transmissions
  if (s.event.pending) {
    const i = s.event.pending.choices.findIndex(ch => DS.canFx(s, ch.fx) && !(ch.fx.hull < 0 && s.hull < 40));
    DS.resolveEvent(s, i >= 0 ? i : s.event.pending.choices.length - 1);
    if (s.event.pending) DS.dismissEvent(s);
  }
  // archives
  for (let k = 0; k < 5; k++) {
    const list = DS.ARCHIVES.filter(a => !(a.max && (s.archives[a.id] || 0) >= a.max)).sort((a, b) => DS.archiveCost(s, a) - DS.archiveCost(s, b));
    const pref = list.find(a => s.echoes >= DS.archiveCost(s, a));
    if (pref) DS.buyArchive(s, pref.id); else break;
  }
  // Spécimen
  if (s.specimen.found && s.stats.time - lastFeed > 30) {
    lastFeed = s.stats.time;
    DS.feed(s, 'food', 0.5);
    if (avail.length === 0 || !avail.some(r => r.cost.data < s.res.data * 4)) DS.feed(s, 'data', 0.2);
    DS.feed(s, 'alloy', 0.05);
  }
  // signal
  if (s.research.antenna) DS.buildAntenna(s);
  for (const u of DS.SIGNAL_UPG) if (!(u.max && (s.signal.upg[u.id] || 0) >= u.max) && s.signal.fragments >= DS.signalCost(s, u)) DS.buySignal(s, u.id);
  const fg = DS.fragGain(s);
  if (fg >= 1 && fg >= Math.max(1, s.signal.earned * 0.5)) { DS.emitSignal(s); runStart = s.stats.time; return; }
  // anomalies
  if (!s.anomaly.active && s.stats.maxSector >= 2 && s.run.time < 5) {
    const an = DS.ANOMALIES.find(a => !s.anomaly.done[a.id] && lastRunMetal > a.goal * 6);
    if (an) { DS.startAnomaly(s, an.id); anomalyStart = s.stats.time; mark('Anomalie : ' + an.name); }
  }
  if (s.anomaly.active && s.stats.time - anomalyStart > 2400) { mark('Abandon anomalie ' + s.anomaly.active); DS.abandonAnomaly(s); }
  // saut
  const g = DS.jumpGain(s);
  const runT = s.stats.time - runStart;
  if (g >= 1 && runT > 240 && (g >= Math.max(2, s.echoesEarned * 0.8) || (runT > 3600 && g >= s.echoesEarned * 0.25)) && !(s.sector >= 5 && s.signal.antenna < 3 && s.research.antenna && fg < 1 && s.sector < 8)) {
    lastRunMetal = s.run.metal;
    runInfo = ' | cycle ' + DS.fmtTime(runT) + ', métal ' + DS.fmt(s.run.metal) + ', ' + DS.fmt(c.prod.metal) + '/s, données ' + DS.fmt(c.prod.data) + '/s, alliages ' + DS.fmt(c.prod.alloy) + '/s, ' + Object.keys(s.research).length + ' rech.';
    DS.jump(s);
    runStart = s.stats.time;
  }
}

let lastReport = 0;
const end = HOURS * 3600;
while (s.stats.time < end) {
  botStep();
  DS.tick(s, DT, false);
  if (s.stats.time - lastReport >= 1800) {
    lastReport = s.stats.time;
    const c = DS.c(s);
    marks.push('   · ' + t0() + ' | secteur ' + (s.sector + 1) + ' | métal ' + DS.fmt(s.res.metal) + ' (' + DS.fmt(c.prod.metal) + '/s) | données ' + DS.fmt(s.res.data) + ' | alliages ' + DS.fmt(s.res.alloy) +
      ' | échos ' + s.echoesEarned + ' | spécimen ' + s.specimen.level + ' | équipage ' + s.crew.total + ' | anomalies ' + Object.keys(s.anomaly.done).length + ' | frag ' + s.signal.earned + ' | gain saut ' + DS.jumpGain(s));
  }
  if (s.signal.won) break;
}
if (process.env.DUMP) fs.writeFileSync(process.env.DUMP, DS.serialize(s));
console.log(marks.join('\n'));
console.log('\nPertes d’équipage : ' + s.stats.crewLost + ' | brèches : ' + breaches + ' | transmissions : ' + s.stats.events + ' | expéditions : ' + s.stats.exps);
console.log('Recherches possédées : ' + Object.keys(s.research).length + ' | modules : ' + JSON.stringify(s.mods));
