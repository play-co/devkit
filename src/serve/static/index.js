import std.uri as URI;
from util.browser import $;
import .Simulator;
import .util.bluebird as Promise;

GLOBAL.Promise = Promise;

import .util.ajax;
import .util.DeviceInfo as DeviceInfo;

// prevent drag/drop
$.onEvent(document.body, 'dragenter', this, function (evt) { evt.preventDefault(); });
$.onEvent(document.body, 'dragover', this, function (evt) { evt.preventDefault(); });
$.onEvent(document.body, 'dragleave', this, function (evt) { evt.preventDefault(); });
$.onEvent(document.body, 'drop', this, function (evt) { evt.preventDefault(); });

// define public API
var _simulators = {};
GLOBAL.devkit = {
  createSimulator: function (app, opts) {
    var params = {app: app};

    Promise.all([
      util.ajax.get({url: '/api/hostModules', query: params}),
      util.ajax.get({url: '/api/manifest', query: params}),
      util.ajax.get({url: '/api/devices'}),
    ]).spread(function (modules, manifest, devices) {
      DeviceInfo.setInfo(devices[0]);

      var simulator = new Simulator(merge({
        parent: document.querySelector('#devkit #simulators'),
        app: app,
        manifest: manifest[0],
        modules: modules[0]
      }, opts));

      _simulators[simulator.id] = simulator;
    });
  },
  getSimulator: function (id) {
    if (!id) { for (id in _simulators) { break; } }

    if (!id) { return null; }

    return _simulators[id].api;
  },
  getSimulators: function () {
    return Object.keys(_simulators).map(function (id) {
      return _simulators[id].api;
    });
  },
  connectClient: function () {

  }
};

// handle initial uri parameters
var uri = new URI(window.location);
var app = uri.query('app');
var simOpts = uri.hash('device');
if (app && simOpts) {
  devkit.createSimulator(app, JSON.parse(simOpts));
}

