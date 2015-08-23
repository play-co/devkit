from util.browser import $;
import std.uri as URI;

import ..util.ajax;
import ..util.DeviceInfo as DeviceInfo;


import ..util.upgrade;

import .RemoteUi;

var defaultParentNode = document.querySelector('devkit') || document.body;

exports = Class(function () {
  this.init = function (opts) {
    this._opts = opts;

    this._type = opts.type;
    this._screen = opts.screen;
    this._userAgent = opts.userAgent;

    this._app = opts.app;
    this._manifest = opts.manifest;

    this._deviceInfo = DeviceInfo.get(this._opts.type);
    this._buildTarget = 'native-archive';


    this._socket = io.connect(window.location.origin);
    this._socket.on('message', bind(this, function(message) {
      console.log('message', message);
      if (message.type === 'generate') {
        console.log(message);
        var text = message.host + ',' + message.port + ',' + message.secret;
        this._ui.qrcode.updateText(text);
      }
    }));
    this._socket.on('connect', bind(this, function() {
      console.log('connect');
      // debugger;
      this._socket.emit('message', {type: 'generate', app: this._app});
    }));

    // DOM simulator
    this._ui = new RemoteUi(this);
  };

  this.getUI = function () {
    return this._ui;
  };

  this.getApp = function () { return this._app; }
  this.getOpts = function () { return this._opts; };
  this.getManifest = function () { return this._manifest; };

  this.run = function() {
    return util.ajax
      .get({
        url: '/api/simulate/',
        query: {
          app: this._app,
          deviceType: this._type,
          deviceId: this.id,
          scheme: 'debug',
          target: this._buildTarget
        }
      })
      .bind(this)
      .then(function (res) {
        console.log(res);
        var res = res[0];
        this._socket.emit('message', {type: 'run', route: res.id, shortName: this._manifest.shortName});
      }, function (err) {
        logger.error('Unable to simulate', this._app);
        console.error(err);
      })
      .nodeify(cb);

  };
});
