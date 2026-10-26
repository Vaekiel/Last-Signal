/* Dernier Signal — démarrage, boucle de jeu et sauvegardes. */
'use strict';
(function (DS) {
  const KEY = 'dernier-signal-save';
  const ui = DS.ui;
  let s = null;

  // ------------------------------------------------------------------ sauvegarde locale
  function readLocal() {
    try {
      const str = localStorage.getItem(KEY);
      return str ? DS.sanitize(JSON.parse(str)) : null;
    } catch (e) { return null; }
  }
  function writeLocal() {
    if (!s) return false;
    s.savedAt = Date.now();
    try { localStorage.setItem(KEY, DS.serialize(s)); ui.lastSave = Date.now(); return true; } catch (e) { return false; }
  }
  DS.save = function (manual) {
    const ok = writeLocal();
    cloudSave(!!manual);
    if (manual) DS.emit('toast', ok ? 'Partie sauvegardée.' : 'Ce navigateur refuse le stockage local : exportez votre code de sauvegarde.', ok ? 'good' : 'error');
    return ok;
  };
  DS.exportCode = function () {
    s.savedAt = Date.now();
    return btoa(unescape(encodeURIComponent(DS.serialize(s))));
  };
  DS.importCode = function (code) {
    const str = decodeURIComponent(escape(atob(String(code).trim())));
    return DS.sanitize(JSON.parse(str));
  };
  DS.replaceState = function (next, msg) {
    s = next;
    s.savedAt = Date.now();
    ui.tab = 'ship';
    ui.init(s);
    writeLocal();
    cloudSave(true);
    if (msg) DS.emit('toast', msg, 'good');
  };
  DS.resetGame = function () {
    const fresh = DS.newState();
    DS.log(fresh, 'ARCHE-09 en ligne. Balise de détresse émise. Personne ne répond.', 'alert', 'antenna');
    DS.replaceState(fresh, 'Nouvelle partie commencée.');
  };

  // ------------------------------------------------------------------ sauvegarde sur le compte (si disponible)
  const cloud = { ref: null, lastStr: '', lastAt: 0, busy: false };
  async function cloudInit() {
    const claude = window.claude;
    if (!claude || typeof claude.use !== 'function') return;
    try {
      const [db, user] = await Promise.all([claude.use('db'), claude.use('user')]);
      if (!db || !user) return;
      const id = await user.id();
      if (!id) return;
      ui.cloud = 'sync';
      const ref = db.doc('data/users/' + id + '/save');
      const snap = await ref.get();
      cloud.ref = ref;
      if (snap.exists) {
        const d = snap.data();
        if (d && typeof d.data === 'string' && (d.savedAt || 0) > (s.savedAt || 0) + 5000) {
          try {
            const remote = DS.sanitize(JSON.parse(d.data));
            cloud.lastStr = d.data;
            DS.replaceState(remote, 'Sauvegarde de votre compte chargée (plus récente).');
          } catch (e) { /* sauvegarde distante illisible : on garde la locale */ }
        }
      }
      ui.cloud = 'ok';
      cloudSave(true);
    } catch (e) {
      ui.cloud = 'off';
    }
  }
  async function cloudSave(force) {
    if (!cloud.ref || cloud.busy || !s) return;
    const now = Date.now();
    if (!force && now - cloud.lastAt < 60000) return;
    if (force && now - cloud.lastAt < 10000) return;
    const str = DS.serialize(s);
    if (str === cloud.lastStr) return;
    cloud.busy = true;
    try {
      await cloud.ref.set({ savedAt: s.savedAt || now, version: DS.VERSION, data: str });
      cloud.lastStr = str;
      cloud.lastAt = Date.now();
      ui.cloud = 'ok';
    } catch (e) {
      if (e && e.code === 'invalid_argument') { cloud.ref = null; ui.cloud = 'readonly'; }
      else if (e && (e.code === 'revoked' || e.code === 'not_granted' || e.code === 'capability_disabled')) { cloud.ref = null; ui.cloud = 'off'; }
      cloud.lastAt = Date.now();
    }
    cloud.busy = false;
  }

  // ------------------------------------------------------------------ boucles
  let lastTick = Date.now();
  function tick() {
    if (!s) return;
    const now = Date.now();
    const dt = (now - lastTick) / 1000;
    lastTick = now;
    if (dt <= 0) return;
    if (dt > 5) {
      const rep = DS.offline(s, dt);
      if (dt > 60) ui.offlineReport(rep);
    } else {
      DS.tick(s, dt, document.hidden);
    }
    ui.render();
  }

  let lastFrame = 0;
  const reducedMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function frame(now) {
    requestAnimationFrame(frame);
    if (!s || document.hidden) { lastFrame = now; return; }
    const dt = Math.min(0.1, (now - lastFrame) / 1000);
    if (dt < 1 / 32) return;
    lastFrame = now;
    const still = reducedMotion.matches || s.settings.motion === false;
    if (ui.tab === 'ship' && ui.scene && ui.scene.cv.isConnected) {
      ui.scene.reduced = still;
      ui.scene.setState(s);
      ui.scene.frame(dt);
    }
    if (ui.tab === 'specimen' && ui.specCanvas && ui.specCanvas.isConnected) {
      DS.drawSpecimen(ui.specCanvas.getContext('2d'), 120, 120, s.specimen.level, now / 1000, still);
    }
  }

  // ------------------------------------------------------------------ démarrage
  function boot(data) {
    let st = null;
    if (data && typeof data.save === 'string') { try { st = DS.sanitize(JSON.parse(data.save)); } catch (e) { st = null; } }
    const restoredHot = !!st;
    if (!st) st = readLocal();
    const fresh = !st;
    s = st || DS.newState();
    if (fresh) DS.log(s, 'ARCHE-09 en ligne. Balise de détresse émise. Personne ne répond.', 'alert', 'antenna');
    ui.init(s);
    if (!fresh && !restoredHot) {
      const elapsed = (Date.now() - (s.savedAt || Date.now())) / 1000;
      if (elapsed > 10) {
        const rep = DS.offline(s, elapsed);
        ui.render(true);
        ui.offlineReport(rep);
      }
    }
    lastTick = Date.now();
    setInterval(tick, 100);
    setInterval(() => DS.save(false), 15000);
    requestAnimationFrame(frame);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { writeLocal(); cloudSave(true); }
      else lastTick = Math.max(lastTick, Date.now() - 12 * 3600 * 1000);
    });
    window.addEventListener('pagehide', writeLocal);
    cloudInit();
  }

  const hot = window.claude && window.claude.hot;
  try { if (hot && typeof hot.snapshot === 'function') hot.snapshot(() => ({ save: s ? DS.serialize(s) : null })); } catch (e) { /* facultatif */ }
  if (hot && typeof hot.ready === 'function') hot.ready(boot);
  else boot((hot && hot.data) || {});
})(window.DS);
