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

import squill.Widget;
import std.uri;

import ..components.CenterLayout as CenterLayout;
import ..components.QRCode as QRCode;

exports = Class(CenterLayout, function (supr) {

  this._def = {
    children: [
      {id: 'contents', children: [
        {id: 'qrcode', type: QRCode, qrOpts: {
          width: 500,
          height: 500
        }},
        {
          id: 'run',
          tag: 'button',
          text: 'Run'
        }
      ]}
    ]
  };

  this.init = function (remote) {
    this._remote = remote;
    // this._channel = remote.api.getChannel('devkit-simulator');
    // this._channel.on('hideSplash', bind(this, 'hideSplash'));
    // this._channel.on('connect', bind(this, '_onConnect'));

    var opts = remote.getOpts();
    supr(this, 'init', [opts]);
  };

  this.buildWidget = function () {
    supr(this, 'buildWidget', arguments);
    this.run.addEventListener('click', bind(this, function() {
      this._remote.run();
    }));
  };
});
