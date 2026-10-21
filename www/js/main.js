// ===========================================================================
// MAIN — boot the game.
// ===========================================================================
(function () {
  var DR = globalThis.DR;
  function boot() {
    DR.Game.load();
    DR.Audio.on = DR.Game.state.settings.sound;
    DR.UI.app = document.getElementById('app');
    DR.UI.show(DR.UI.Title);
    // unlock audio on the first touch anywhere
    var unlock = function () { DR.Audio.init(); DR.Audio.resume(); window.removeEventListener('pointerdown', unlock); };
    window.addEventListener('pointerdown', unlock);
    // Android back button (Capacitor) -> go to garage / title
    document.addEventListener('backbutton', function (e) {
      e.preventDefault();
      if (DR.UI.cur && DR.UI.cur.fn !== DR.UI.Title && DR.UI.cur.fn !== DR.UI.Garage) DR.UI.show(DR.Game.state.started ? DR.UI.Garage : DR.UI.Title);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { /* fonts ready */ });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
