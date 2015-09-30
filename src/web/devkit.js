import .Simulator;
import .util.DeviceInfo as DeviceInfo;
import .util.ajax;
import .util.bluebird as Promise;

var resolveURL = util.ajax.resolveURL;

var devkit = window.devkit;
if (!devkit) {
  devkit = window.devkit = {};
}

// define public API
var _simulators = {};
GLOBAL.devkit = {
  // the constructor for the DevKit API Promise objects
  Promise: Promise,

  // resolves to the apps currently known by DevKit
  getApps: function () {
    return util.ajax.get({url: resolveURL('/api/apps')})
      .then(function (res) {
        return res[0];
      });
  },

  // for cross-domain hosting
  setHost: function (host) {
    util.ajax.setHost(host);
  },

  createSimulator: function (app, opts) {
    var params = {app: app};

    return Promise.all([
        util.ajax.get({url: resolveURL('/api/mount'), query: params}),
        util.ajax.get({url: resolveURL('/api/devices')}),
      ])
      .bind(this)
      .spread(function (mountInfo, devices) {
        DeviceInfo.setInfo(devices[0]);

        mountInfo = mountInfo[0];

        // convert response to absolute URLs
        mountInfo.url = resolveURL(mountInfo.url);
        Object.keys(mountInfo.debuggerURLs).forEach(function (name) {
          mountInfo.debuggerURLs[name] = resolveURL(mountInfo.debuggerURLs[name]);
        });

        var simulator = new Simulator(merge({
          parent: opts.parent,
          app: app,
          mountInfo: mountInfo
        }, opts));

        this._lastSimulator = simulator;

        _simulators[simulator.id] = simulator;
        return simulator.api;
      })
      .catch(function (e) {
        logger.error('unable to start simulator');
        console.error(e);
      });
  },
  getSimulator: function (id) {
    if (!id) { return this._lastSimulator.api || null; }
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
