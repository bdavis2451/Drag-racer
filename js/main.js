// ===========================================================================
// MAIN — boot the game.
// ===========================================================================
(function () {
  var DR = globalThis.DR;
  function boot() {
    // (in the installed app, a save the OS cleared comes back from native storage first)
    if (DR.Game.restoreNative && !boot.restored) { boot.restored = true; var t = setTimeout(boot, 1500); return DR.Game.restoreNative().then(function () { clearTimeout(t); if (!boot.done) boot(); }, function () { clearTimeout(t); if (!boot.done) boot(); }); }
    if (boot.done) return;
    boot.done = true;
    DR.Game.load();
    DR.Audio.on = DR.Game.state.settings.sound;
    DR.Audio.setVolume(DR.Game.state.settings.volume != null ? DR.Game.state.settings.volume : 1);
    DR.UI.app = document.getElementById('app');
    DR.UI.show(DR.UI.Title);
    // warm the sprite and ET caches in spare frames: every stock car, then
    // the career rivals, so the dealer, race menus and shows open instantly
    Object.keys(DR.CARS).forEach(function (id) {
      var c = DR.CARS[id], inst = { carId: id, engine: c.engine, parts: {}, tune: {}, vis: {}, color: c.col };
      DR.UI.warm(function () { DR.carSprite(DR.carLook(inst)); });
      DR.UI.warm(function () { DR.Game.estimate(inst, DR.QUARTER); });
    });
    DR.RIVALS.forEach(function (band) { band.forEach(function (o) {
      DR.UI.warm(function () { DR.Game.estimate(DR.Game.oppInst(o), DR.EIGHTH, 0.85); });
    }); });
    // unlock audio on the first touch anywhere
    // (iOS counts a tap's end, not its start, as permission to play sound,
    // and Safari mutes web audio on the silent switch unless the page asks
    // to play like a media app)
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* older iOS */ }
    var unlock = function () {
      DR.Audio.init(); DR.Audio.resume();
      if (DR.Audio.ctx && DR.Audio.ctx.state === 'running') ['pointerdown', 'touchend', 'click'].forEach(function (ev) { window.removeEventListener(ev, unlock, true); });
    };
    ['pointerdown', 'touchend', 'click'].forEach(function (ev) { window.addEventListener(ev, unlock, true); });
    // Back: Capacitor's Android back button walks the WebView history, so keep
    // one history entry in hand and turn each pop into an in-game back step
    // (Cordova's backbutton and the Escape key go the same way).
    try {
      history.replaceState({ dr: 0 }, '');
      history.pushState({ dr: 1 }, '');
      window.addEventListener('popstate', function () { history.pushState({ dr: 1 }, ''); DR.UI.goBack(); });
    } catch (e) { /* sandboxed frame */ }
    document.addEventListener('backbutton', function (e) { e.preventDefault(); DR.UI.goBack(); });
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); DR.UI.goBack(); } });
    // going to the background: silence the engines (the race loop freezes on
    // its own while the page is hidden)
    document.addEventListener('visibilitychange', function () {
      var A = DR.Audio; if (!A.ctx) return;
      if (document.hidden) A.ctx.suspend(); else if (A.on) A.ctx.resume();
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { /* fonts ready */ });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
