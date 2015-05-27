import .ajax;

var LISTENER_KEY = '__devkit_old_devkit_core_listener';

if (!window[LISTENER_KEY]) {
  window[LISTENER_KEY] = handleOldDevkitCoreMessage;

  // old devkit-core support
  window.addEventListener('message', handleOldDevkitCoreMessage);
}

function handleOldDevkitCoreMessage(evt) {
  if (evt.data && /devkit-simulator\{"type":"open"/.test(evt.data)) {
    console.warn('old devkit-core detected, attempting to connect...');
    exports.promptUpgrade();

    try {
      var uid = JSON.parse(evt.data.substring(16)).uid;
      evt.source.postMessage('devkit-simulator' + JSON.stringify({type:"open",uid:uid}), '*');
    } catch (e) {
      console.warn('failed to construct response for old devkit-core', e);
    }
  }
}

exports.promptUpgrade = function () {
  var simulator = window.devkit && window.devkit.getSimulator();
  if (simulator) {
    simulator
      .prompt({
        type: 'banner',
        text: 'This game has an outdated version of devkit-core.',
        dismissable: true,
        action: 'upgrade'
      })
      .then(function () {
        console.log("upgrading...");
        try {
          simulator.getFrame().contentWindow.GC.app.engine.pause();
        } catch (e) {}

        return ajax
          .get({url: '/api/upgrade', query: {
            app: simulator.getApp(),
            module: 'devkit-core',
            version: 'latest'
          }})
          .then(function (res) {
            simulator.rebuild();
          }, function (err) {
            alert("Could not upgrade!\n\n" + err.response);
          });
      }, function () {
        console.log("ignoring...");
      });
  }
};
