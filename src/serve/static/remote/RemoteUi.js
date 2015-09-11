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

var QR_SIZE = 225;

exports = Class(CenterLayout, function (supr) {

  this._def = {id: 'remote', children: [
    {id: 'header', text: 'Remote Device'},

    {id: 'notConnectedEl', children: [
      {id: 'qrcode', type: QRCode, qrOpts: {
        colorLight: '#fff',
        colorDark: '#000',
        width: QR_SIZE,
        height: QR_SIZE
      }},
      {id: 'instructions', children: [
        {tag: 'p', class: 'bold', text: 'Instructions:'},
        {tag: 'p', text: '1. Download and Install the ', children:[
          {tag: 'a', text: 'js.io Companion App', attrs:{
            href:'https://builds.js.io', target: '_blank'
          }}
        ]},
        {tag: 'p', text: '2. Open the companion app and scan this QR code'}
      ]}
    ]},

    {id: 'connectedEl', children: [
      {children: [
        {id: 'device', children: [
          {id: 'deviceImage', tag: 'img'},
          {id: 'dimensions', text: 'WWW x HHH'}
        ]},
        {id: 'deviceName', text: 'My Device'},
      ]},
      {id: 'btnContainer', children: [
        {id: 'run', class: 'btn', type: Button, text: 'Run'},
        {id: 'devtoolsLink', class: 'btn', tag: 'a', text: 'Open Dev Tools'},
      ]}
    ]},

    {id: 'build-spinner', children: [
      {id: 'spinner'}
    ]}
  ]};

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
      this.removeClass('building');
      setTimeout(function () {
        spinner.style.visibility = 'hidden';
      }, 250);
      spinner.style.pointerEvents = 'none'; // ?
    } else {
      this.addClass('building');
      spinner.style.visibility = 'visible';
      spinner.style.pointerEvents = 'auto'; // ?
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

  this.updateDevtoolsLink = function() {
    // this.devtoolsLink.href = '';
    this.devtoolsLink.removeAttribute('href');
    $.addClass(this.devtoolsLink, 'disabled');
  };

  this.setQRCodeText = function(text) {
    this.qrcode.updateText(text);
  };

  this.updateDeviceImage = function() {
    var device = this._remote._deviceInfo.getBackground(0);
    this.deviceImage.src = '/images/' + device.img;
  };
});
