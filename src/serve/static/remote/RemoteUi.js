/** @license
 * This file is part of the Game Closure SDK.
 *
 * The Game Closure SDK is free software: you can redistribute it and/or modify
 * it under the terms of the Mozilla Public License v. 2.0 as published by Mozilla.

 * The Game Closure SDK is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * Mozilla Public License v. 2.0 for more details.

 * You should have received a copy of the Mozilla Public License v. 2.0
 * along with the Game Closure SDK.  If not, see <http://mozilla.org/MPL/2.0/>.
 */

/* globals Class, merge, bind, logger */

from util.browser import $;

import squill.Widget as Widget;
import squill.Button as Button;
import std.uri;

import ..components.FrameBackground as FrameBackground;
import ..components.CenterLayout as CenterLayout;
import ..components.QRCode as QRCode;

exports = Class(CenterLayout, function (supr) {

  this._def = {
    children: [
      {id: 'contents', children: [
        {id: 'header', text: 'Device'},
        {id: 'notConnectedEl', children: [
          {id: 'qrcode', type: QRCode, qrOpts: {
            colorLight: '#2A2828',
            colorDark: '#AAAAAA'
          }},
        ]},
        {id: 'connectedEl', children: [
          {id: 'deviceImage', tag: 'img'},

          {
            id: 'run',
            type: Button,
            text: 'Run'
          },
          {
            id: 'connectUri'
          },

        ]},
        {id: 'build-spinner', children: [{id: 'spinner'}]},
      ]}
    ]
  };

  this.init = function (remote) {
    this._remote = remote;
    this._isConnected = false;

    var opts = remote.getOpts();
    supr(this, 'init', [opts]);
  };

  this.isConnected = function() {
    return this._isConnected;
  };

  this.buildWidget = function () {
    supr(this, 'buildWidget', arguments);
    this.setConnected(this._isConnected);
    this.updateDeviceImage();
    this.run.on('Select', bind(this, function() {
      this._remote.run();
    }));
  };

  this.setBuilding = function(isBuilding) {
    var spinner = this['build-spinner'];
    if (!isBuilding) {
      setTimeout(bind(this, function () {
        $.hide(this['build-spinner']);
        this.removeClass('building');
      }), 1000);
      spinner.style.opacity = 0;
      spinner.style.pointerEvents = 'none';
    } else {
      spinner.style.display = 'block';
      setTimeout(bind(this, function () {
        spinner.style.opacity = 0.5;
        this.addClass('building');
      }), 100);
      spinner.style.pointerEvents = 'auto';
    }
  };

  this.setConnected = function(isConnected) {
    if (isConnected) {
      this._isConnected = true;
      this.notConnectedEl.style.display = 'none';
      this.connectedEl.style.display = 'flex';
    } else {
      this._isConnected = false;
      this.notConnectedEl.style.display = 'flex';
      this.connectedEl.style.display = 'none';
    }
  };

  this.setQRCodeText = function(text) {
    this.qrcode.updateText(text);
  };


  this.setDebuggerConnectUri = function(debuggerPort) {
    this.connectUri.textContent = 'Connect your debugger client to ' + location.host + ':' + debuggerPort;
  };

  this.updateDeviceImage = function() {
    var device = this._remote._deviceInfo.getBackground(0);
    this.deviceImage.src = '/images/' + device.img;
  };
});
