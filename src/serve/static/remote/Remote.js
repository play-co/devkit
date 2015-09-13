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

    this.host = location.host.split(':')[0];

    this._app = opts.app;
    this._manifest = opts.manifest;

    this._deviceInfo = DeviceInfo.get('iphone6');

    this._ui = new RemoteUi(this);
    this._ui.setConnected(false);

    // connect to the custom namespace '/remote' to avoid any collisions
    this._socket = io(window.location.origin + '/remote');

    this._socket.on('initBrowserResponse', bind(this, function(message) {
      var text = this.host + ',' + message.companionPort + ',' + message.secret;
      this._ui.setQRCodeText(text);
      this._ui.updateDevtoolsLink(null);
    }));

    this._socket.on('clientConnected', bind(this, function(isConnected) {
      this._ui.setPhoneConnected(isConnected);
    }));

    this._socket.on('connect', bind(this, function() {
      this._ui.setConnected(true);
      this._socket.emit('initBrowserRequest', {app: this._app});
    }));

    // This is called frequently to sync serverside data with this client
    this._socket.on('browserData', bind(this, function(data) {
      this._ui.updateDevtoolsLink(data);
    }));

    // Connection status
    this._socket.on('disconnect', bind(this, function(data) {
      this._ui.setConnected(false);
    }));

    this._socket.on('reconnect', bind(this, function(data) {
      this._ui.setConnected(true);
    }));
  };

  this.getUI = function () {
    return this._ui;
  };

  this.getApp = function () { return this._app; }
  this.getOpts = function () { return this._opts; };
  this.getManifest = function () { return this._manifest; };

  this.run = function(cb) {
    console.log('run');
    this._ui.setBuilding(true);
    return util.ajax
      .get({
        url: '/api/simulate/',
        query: {
          app: this._app,
          remote: true
        }
      })
      .bind(this)
      .then(function (res) {
        this._ui.setBuilding(false);
        var res = res[0];
        this._socket.emit('run', {
          route: res.id,
          shortName: this._manifest.shortName,
          host: location.host,
          hostname: location.hostname
        });
      }, function (err) {
        this._ui.setBuilding(false);
        logger.error('Unable to build for remote', this._app);
        console.error(err);
      })
      .nodeify(cb);
  };
});
