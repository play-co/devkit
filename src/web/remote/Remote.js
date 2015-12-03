from util.browser import $;
import std.uri as URI;

import ..util.ajax;
import ..util.DeviceInfo as DeviceInfo;


import ..util.upgrade;

import .RemoteAPI;
import .RemoteUi;

var defaultParentNode = document.querySelector('devkit') || document.body;

exports = Class(function () {
  this.init = function (opts) {
    this._opts = opts;

    this._type = opts.type;
    this._screen = opts.screen;
    this._userAgent = opts.userAgent;

    this.host = location.host;

    this._app = opts.app;
    this._manifest = opts.manifest;

    this._deviceInfo = DeviceInfo.get('iphone6');

    this._ui = new RemoteUi(this);
    this._ui.setConnected(false);

    this._qrData = { secret: null, routeId: null };

    // connect to the custom namespace '/remote' to avoid any collisions
    var RemoteAPI = GC.RemoteAPI;
    var socketUrl = window.location.origin + '/companion/remotesocket/ui';
    RemoteAPI.init(socketUrl);

    RemoteAPI.on('connectionStatus', function (data) {
      this._ui.setConnected(data.connected);
      if (data.connected) {
        RemoteAPI.send('initBrowserRequest');
      }
    }.bind(this));

    RemoteAPI.on('initBrowserResponse', function (message) {
      this._updateQRCode({
        secret: message.secret
      });
      this._ui.updateDevtoolsLink(null);
    }.bind(this));

    RemoteAPI.on('clientConnected', function (isConnected) {
      this._ui.setPhoneConnected(isConnected);
    }.bind(this));

    RemoteAPI.on('browserData', function (data) {
      // TODO: make this less janky
      this._ui.setPhoneConnected((data && data.devtoolsWsId));

      this._ui.updateDevtoolsLink(data);
    }.bind(this));
  };

  this.getUI = function () {
    return this._ui;
  };

  this._updateQRCode = function(opts) {
    // maybe set new data
    this._qrData.secret = opts.secret || this._qrData.secret;
    this._qrData.routeId = opts.routeId || this._qrData.routeId;

    var text = this.host + ',' + this._qrData.secret;
    this._ui.setQRCodeText(text);
  };

  this.getApp = function () { return this._app; }
  this.getOpts = function () { return this._opts; };
  this.getManifest = function () { return this._manifest; };

});
