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

import .util.debugging;

import net;
import std.uri as URI;
import lib.PubSub;
import util.Animation;
import util.ajax;
from util.browser import $;

import squill.Window;
import squill.Widget;
import squill.Delegate;

import .controllers.Device as Device;
import .controllers.SimulatorServer as SimulatorServer;

import .components.Logger as Logger;
from .components.viewInspector import ViewInspector;

import .Simulator;
import .util.TargetCuppa;

var MainView = Class(squill.Widget, function (supr) {

  this._def = {
    id: 'devkit',
    children: [
      {id: 'header'},
      {id: 'middle', children: [
        {id: 'inspector', type: ViewInspector},
        {id: 'mainContainer', children: [
          {id: 'myIP', type: 'label'},
          {id: 'logger', type: Logger}
        ]}
      ]},
      {id: 'bottom'}
    ]
  };

  this.buildWidget = function () {
    var opts = this._opts;

    new squill.Window().subscribe('ViewportChange', this, 'onViewportChange');

    if (opts.simpleUI) {
      this.myIP.hide();
      this.logger.hide();
    }

    this._zIndex = 0;
    this._simulatorButtons = [];

    this.inspector
      .on('open', bind(this, 'onViewportChange'))
      .on('close', bind(this, 'onViewportChange'));

    this.controller.on('activeDevice', bind(this, '_onActiveDevice'));

    util.ajax.get({url: '/api/ip', type: 'json'}, bind(this, '_onIP'));
  }

  this._onIP = function(err, response) {
    if (!err) {
      this.myIP.setLabel(response.ip.join(", "));
    }
  };

  this.selectSimulator = function (evt) {
    var x = evt.clientX;
    var y = evt.clientY;
    var simulators = this.controller.getSimulators();

    for (var i = simulators.length - 1; i >= 0; --i) {
      var simulator = simulators[i];
      var rect = simulator.contents.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        simulator.getElement().style.zIndex = ++this._zIndex;

        try {
          var evtCopy = new MouseEvent(evt.type, evt);
          document.elementFromPoint(x, y).dispatchEvent(evtCopy);
        } catch (e) {}
        break;
      }
    }

    // document.body.dispatchEvent(evtCopy);
    // debugger;
  }

  this.getViewInspector = function () { return this.inspector; }

  this._onActiveDevice = function (device) {
    this.inspector.setDevice(device);
    this.logger.setDevice(device);
  }

  this.onViewportChange = function () {
    this.positionSimulators();
  };

  this.positionSimulators = function () {
    this.controller.getSimulators().forEach(function (simulator) {
      simulator.update();
    }, this);
  }

  this.getSimulatorButtons = function () {
    return this._simulatorButtons;
  }

  this.addSimulatorButton = function (opts, cb) {
    var widget = this.addWidget({
        type: 'button',
        text: opts.text,
        attrs: {tooltip: opts.tooltip}
      }, this.middle);

    this._simulatorButtons.push(widget);
    widget.remove();

    cb && widget.on('Select', cb);
    return widget;
  }

  this.addElement = function (el, where) {
    var parent = where == 'top' ? this.top : where == 'bottom' ? this.bottom : this.middle;
    parent.appendChild(el);
    this.positionSimulators();
    return el;
  }

  this.addRightPane = function (def) {
    var widget = this.addWidget(def, this.middle);
    var el = widget.getElement ? widget.getElement() : widget;
    el.style.order = 100;

    this.positionSimulators();
    return widget;
  }

  this.getContainer = function () { return this.mainContainer || this._el; }

  this.addWidget = function (widget) {
    if (widget instanceof Simulator) {
      widget.getElement().style.zIndex = ++this._zIndex;
    }

    return supr(this, 'addWidget', arguments);
  }

  this.getAvailableRect = function () {
    var rect = this.content.getBoundingClientRect();
    return {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height
    };
  };
});

var PluginAPI = Class(lib.PubSub, function () {
  this.init = function (controller) {
    this._controller = controller;
  }

  // el: a DOM node
  // where: 'middle', 'top', or 'bottom'
  this.addElement = function (el, where) {
    return this._controller.view.addElement(el, where);
  }

  this.getContentArea = function () {
    return this._controller.view.middle;
  }

  this.addSimulatorButton = function (opts, cb) {
    return this._controller.view.addSimulatorButton(opts, cb);
  }

  this.getDeviceAPI = function () {
    return this._deviceAPI;
  }
});

var MainController = exports = Class(lib.PubSub, function() {
  this.init = function (opts) {
    this._app = opts.app;
    this._manifest = opts.manifest;

    this._devices = {};
    this._simpleUI = opts.simpleUI;

    this.view = new MainView({
      controller: this,
      parent: document.body,
      simpleUI: opts.simpleUI
    });

    // communicate with local simulators
    this._server = new SimulatorServer();
    this._server.listen();
    this._server.on('connection', bind(this, '_onConn'));

    // connect to DevKit API
    this._conn = new DevKitConn(this);
    // net.connect(this._conn, 'csp', {url: '/devices/'});
    net.connect(this._conn, 'socketio', {namespace: '/devices/'});

    this.api = new PluginAPI(this);
  };

  this.getApp = function () { return this._app; }
  this.getManifest = function () { return this._manifest; }

  var DevKitConn = Class(util.TargetCuppa, function (supr) {

    var DEVKIT_CUPPA_TARGET = 'devkit';

    this.init = function (controller) {
      supr(this, 'init');

      this._controller = controller;
    }

    this.connectionMade = function () {
      supr(this, 'connectionMade', arguments);

      var client = this.getClient(DEVKIT_CUPPA_TARGET);
      client.sendEvent('HANDSHAKE', {type: 'debugger'});
      client.sendRequest('DEVICES', bind(this, function (err, res) {
        if (!err) {
          res.devices.forEach(function (info) {
            this._addConn(info);
          }, this);
        }
      }));

      client.onEvent('NEW_DEVICE', bind(this, function (evt) {
        this._addConn(evt.args.device);
      }));
    }

    this._addConn = function (info) {
      this._controller._onConn(this, {
        deviceId: info.deviceId,
        isLocal: false,
        conn: this,
        type: info.deviceType,
        userAgent: info.userAgent,
        screen: info.screen
      });
    }
  });

   // new connection has received HANDSHAKE event
  this._onConn = function (conn, opts) {
    var deviceId = opts.deviceId;
    if (deviceId) {
      var device = this._devices[deviceId];
      if (device) {
        device.setConn(conn, opts);
      } else {
        var device = new Device(this, merge({
            conn: conn,
            id: deviceId
          }, opts));

        this.addDevice(device);
      }
    }
  }

  // accepts a string, device opts, or Device instance
  this.addDevice = function (device) {

    // convert string to opts
    if (typeof device == 'string') {
      try {
        device = {
          id: 'simulator',
          simulator: JSON.parse(device)
        };
      } catch (e) {
        device = {
          id: 'simulator',
          simulator: {type: 'iphone'}
        };
      }

      device.simulator.simpleUI = this._simpleUI;
    }

    if (!device) { return; }

    // convert opts to Device instance
    if (!(device instanceof Device)) {
      device = new Device(this, device);
    }

    // remove old Device instance
    var id = device.getId();
    if (this._devices[id]) {
      this.removeDevice(id);
    }

    // add Device instance
    this._devices[id] = device;
    if (!this._activeDevice) {
      this.setActiveDevice(device);
    }

    device.on('change', bind(this, 'updateURL'));
  }

  this.removeDevice = function (device) {
    var id = device && device.getId && device.getId() || device;
    if (this._devices[id]) {
      this._devices[id].remove();
      delete this._devices[id];
    }
  }

  this.getActiveDeviceAPI = function () {
    var device = this._activeDevice;
    if (device && device.getConn()) {
      return device.api;
    } else {
      return null;
    }
  }

  this.setActiveDevice = function (device) {
    if (this._activeDevice == device) { return; }
    if (this._activeDevice) {
      this._activeDevice.unsubscribe('conn', this);
    }

    if (this.getActiveDeviceAPI()) {
      this.api.emit('end');
    }

    this._activeDevice = device;

    var conn = device.getConn();
    if (conn) {
      this.api.emit('connect', device.api);
    }

    device.subscribe('conn', this, function () {
      if (this.getActiveDeviceAPI()) {
        this.api.emit('end');
      }

      this.api.emit('connect', device.api);
    });

    this.api.emit('device', device.api);
    this.emit('activeDevice', device);
  }

  this.getSimulators = function () {
    return Object.keys(this._devices).map(function (deviceId) {
      return this._devices[deviceId].getSimulator();
    }, this);
  }

  this.updateURL = function () {
    var deviceOpts;
    for (var id in this._devices) {
      var device = this._devices[id];
      if (device.isLocal()) {
        var sim = device.getSimulator();
        if (!sim) { continue; }
        var json = sim.toJSON();

        if (deviceOpts) {
          if (!isArray(deviceOpts)) {
            deviceOpts = [deviceOpts];
          }

          deviceOpts.push(json);
        } else {
          deviceOpts = json;
        }
        break;
      }
    }

    if (deviceOpts) {
      var kvp = URI.parseQuery(location.hash.replace(/^\#/, ''));
      kvp.device = JSON.stringify(deviceOpts);
      window.location.hash = safeHash(URI.buildQuery(kvp));
    }
  }

  function safeHash(url) {
    return url
      .replace(/\%7B/g, '{')
      .replace(/\%7D/g, '}')
      .replace(/\%3A/g, ':')
      .replace(/\%22/g, '"')
      .replace(/\%2C/g, ',');
  }
});

var _controller;

/**
 * Launch simulator.
 */
exports.start = function () {
  import ff;
  import util.ajax;
  import squill.cssLoad;

  // extract app from query string
  var uri = new URI(window.location);
  var app = uri.query('app');
  if (!app) {
    location = '/';
    return;
  }

  var simpleUI = !!uri.hash('simpleUI');

  // set window/tab title to app title
  util.ajax.get({
      url: '/api/title',
      query: {
        app: app
      }
    }, function (err, title) {
      if (title) {
        document.title = title;
      }
    });

  // load css, host any modules with simulator extensions
  var f = new ff(function () {
    squill.cssLoad.get('/stylesheets/simulator.styl', f.wait());
    util.ajax.get({
      url: '/api/hostModules',
      query: {
        app: app
      }
    }, f());
    util.ajax.get({
      url: '/api/manifest',
      query: {
        app: app
      }
    }, f());
  }, function (modules, manifest) {
    _controller = new MainController({
      app: app,
      manifest: manifest,
      modules: modules,
      simpleUI: simpleUI
    });

    _controller.addDevice(uri.hash('device'));

    var api = _controller.api;
    GLOBAL.devkit = api;

    modules.names.forEach(function (name) {
      $({
        parent: document.body,
        tag: 'iframe',
        src: '/api' + modules.route + name,
        className: 'module-frame'
      });
    });

  }).error(function (err) {
    if (err.stack) { throw err; }

    if (err.response) {
      document.body.appendChild(document.createElement('div')).innerHTML = err.response + '<br><br>';
    }

    try {
      var e = typeof err == 'string' ? err : (err.stack || JSON.stringify(err, null, '  '));
    } catch (e2) {
      throw err;
    }
    document.body.appendChild(document.createElement('div')).innerText = e;
    document.body.style.cssText = 'white-space: pre-wrap; word-break: break-all; padding: 40px; font: bold 16px "Monaco", "Andale Mono", Consolas, monospace;';
  });
};

$.onEvent(document.body, 'dragenter', this, function (evt) { evt.preventDefault(); });
$.onEvent(document.body, 'dragover', this, function (evt) { evt.preventDefault(); });
$.onEvent(document.body, 'dragleave', this, function (evt) { evt.preventDefault(); });
$.onEvent(document.body, 'drop', this, function (evt) { evt.preventDefault(); });

exports.start();
