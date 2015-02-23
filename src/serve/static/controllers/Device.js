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

/**
 * Note that we're in the browser runtime here, so we can assume
 * `document` and `window` exist and that util.browser and squill
 * will both import successfully.  This would not be the case in,
 * for example, the iOS runtime.
 */

import lib.PubSub;
import ..Simulator as Simulator;
import ..util.resolutions;
import .LocalController;

var DeviceAPI = Class(function () {
  this.init = function (device) {
    this._device = device;
  }

  this.getClient = function (target) {
    var conn = this._device.getConn();
    if (conn) {
      return conn.getClient(target);
    }
  }

  this.getAppId = function () {
    return this._device.getAppId();
  }

  this.getBundleId = function () {
    return this._device.getBundleId();
  }

  this.getAppTitle = function () {
    return this._device.getAppTitle();
  }
});

var Device = exports = Class(lib.PubSub, function (supr) {

  this.constructor.activeDevice = null;

  var _simulatorId = 0;

  this.init = function (controller, opts) {
    var id = opts.id;
    var isLocal = opts.isLocal !== false;
    if (!id) {
      if (isLocal) {
        id = 'sim' + (++_simulatorId);
      } else {
        throw new Error('no id for device');
      }
    }

    this._id = id;

    this._screen = opts.screen;
    this._userAgent = opts.userAgent;

    this.controller = controller;
    this.rootView = controller.view;

    if (opts.buildTarget) {
      this._buildTarget = opts.buildTarget;
    }

    if (isLocal) {
      this._local = new LocalController({
        device: this
      });
    }

    var simOpts = merge({
      controller: this,
      parent: this.rootView
    }, opts.simulator);

    delete simOpts.type;

    this._simulator = new Simulator(simOpts);

    this._simulator.on('change', bind(this, 'emit', 'change'));

    if (opts.conn) {
      this.setConn(opts.conn, opts);
    }

    if (opts.simulator.type) {
      this.setType(opts.simulator.type);
    }
    /*
          parent: this,
      manifest: this._manifest,
      rotation: parseInt(simulatorDef.rotation, 10),
      deviceName: simulatorDef.device,
      offsetX: simulatorDef.offsetX,
      offsetY: simulatorDef.offsetY,
      name: simulatorDef.name*/

    this.api = new DeviceAPI(this);
  };

  this.isDebug = function () { return true; }

  this.getType = function () { return this._type; }
  this.setType = function (type) {
    var opts = util.resolutions.get(type, {screen: this._screen, userAgent: this._userAgent});
    if (opts && opts.target) {
      this._buildTarget = opts.target;
    }

    this._type = type;
    this._simulator.setType(opts);

    if (this._local) {
      this._local.rebuild();
    }
  }

  this.isLocal = function () { return !!this._local; }
  this.getId = function () { return this._id; }
  this.getLocalController = function () { return this._local; }
  this.getBuildTarget = function () { return this._buildTarget; }

  // opts from handshake event
  this.setConn = function (conn, opts) {
    this._bundleId = opts.bundleId;
    this._appId = opts.appId;
    this._appTitle = opts.appTitle;
    this._conn = conn;
    this._simulator.setConn(conn);
    this.emit('conn', conn);
  }

  this.activate = function () {
    if (!this._local && Device.activeDevice != this) {
      Device.activeDevice = this;

      this._conn.getClient('devkit').sendRequest('ACTIVATE', {deviceId: this._id}, function (err, res) {
        if (err) {
          logger.error(err);
        } else {
          logger.log('activated device', this._id);
        }
      });
    }
  }

  this.isActive = function () {
    return this.isLocal() || Device.activeDevice == this;
  }

  this.remove = function () {
    // all remote devices share the same connection, so only end the
    // connection if it's a remote device.
    if (this.isLocal() && this._conn) {
      this._conn.end();
    }

    if (this._simulator) {
      this._simulator.remove();
    }
  }

  this.getConn = function () {
    return this._conn;
  }

  this.getManifest = function () {
    return this.controller.getManifest();
  }

  this.getAppTitle = function () { return this._appTitle; }
  this.getAppId = function () { return this._appId; }
  this.getBundleId = function () { return this._bundleId; }

  this.getSimulator = function () {
    return this._simulator;
  }

  this.toJSON = function () {
    return {
      id: this._id,
      simulator: {
        type: this._simulator.getType()
      }
    };
  }
});


