import std.uri as URI;
from util.browser import $;
import ..util.bluebird as Promise;

GLOBAL.Promise = Promise;

import ..util.ajax;
import .Remote as Remote;

import ..util.DeviceInfo as DeviceInfo;

// prevent drag/drop
$.onEvent(document.body, 'dragenter', this, function (evt) { evt.preventDefault(); });
$.onEvent(document.body, 'dragover', this, function (evt) { evt.preventDefault(); });
$.onEvent(document.body, 'dragleave', this, function (evt) { evt.preventDefault(); });
$.onEvent(document.body, 'drop', this, function (evt) { evt.preventDefault(); });

// define public API
var _remote;
GLOBAL.devkit = {
  createRemote: function (app, opts) {
    var params = {app: app};

    Promise.all([
        util.ajax.get({url: '/api/manifest', query: params}),
        util.ajax.get({url: '/api/devices'}),
      ])
      .spread(function (manifest, devices) {
        DeviceInfo.setInfo(devices[0]);
        var remote = new Remote(merge({
          parent: document.querySelector('#devkit #remote'),
          app: app,
          manifest: manifest[0]
        }, opts));

        _remote = remote;
      })
      .catch(function (e) {
        logger.error('unable to start remote');
        console.error(e);
      });
  },
  getRemote: function () {
    return _remote;
  }
};

// handle initial uri parameters
var uri = new URI(window.location);
var app = uri.query('app');
var simOpts = uri.hash('device');
if (app) {
  devkit.createRemote(app, JSON.parse(simOpts));
}
