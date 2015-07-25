from util.browser import $;

import .util.ajax;
import .util.DeviceInfo as DeviceInfo;

import .ui.Chrome;

import .API;
import .util.upgrade;

var defaultParentNode = document.querySelector('devkit') || document.body;

exports = Class(function () {
  var _simulatorId = 0;

  this.init = function (opts) {
    this._opts = opts;
    this.id = opts.id || ('sim' + (++_simulatorId));

    this._type = opts.type;
    this._screen = opts.screen;
    this._userAgent = opts.userAgent;

    this._app = opts.app;
    this._manifest = opts.manifest;

    this._deviceInfo = DeviceInfo.get(this._opts.type);
    this._buildTarget = opts.buildTarget || this._deviceInfo.getTarget();

    // api used by simulator frame
    this.api = new API(this);

    // DOM simulator
    this._ui = new ui.Chrome(this);

    this._hasSocket = false;
    this.socket = this._makeSocket();

    /** @type {Promise} */
    this._requestSimulatePromise = null;

    this._modules = {};
    this.loadModules(opts.modules);
    this.rebuild();
  };

  this._makeSocket = function() {
    var socket = new io();

    socket.on('connect', function() {
      this._hasSocket = true;

      socket.emit('watch', this._app);

      // Do this right off the bat to make sure that the routes are all set up right
      this._requestSimulate(true, true);
    }.bind(this));

    socket.on('disconnect', function() {
      this._hasSocket = false;
    }.bind(this));

    socket.on('watch:changed', function(data) {
      // reload
      this._requestSimulate(true, true);
    }.bind(this));

    return socket;
  };

  this.getUI = function () {
    return this._ui;
  };

  this.getApp = function () { return this._app; }
  this.getOpts = function () { return this._opts; };
  this.getManifest = function () { return this._manifest; };

  this.loadModules = function (modules) {
    if (!modules) { return; }

    Object.keys(modules).forEach(function (name) {
      if (name in this._modules) { return; }

      this._modules[name] = $({
        parent: this._opts.parent || defaultParentNode,
        tag: 'iframe',
        src: modules[name],
        className: 'module-frame'
      });
    }, this);
  };

  /** Make a request to /simulate and return a promise  */
  this._requestSimulate = function(softReload, ignoreSocket) {
    if (this._hasSocket && !ignoreSocket) {
      // Use the socket connection to make a simulate request as soon as a change occurs
      return this._requestSimulatePromise || Promise.resolve();
    }

    // Is there an existing promise or do we need a new one
    if (!this._requestSimulatePromise) {
      this._requestSimulatePromise = util.ajax.get({
        url: '/api/simulate/',
        query: {
          app: this._app,
          deviceType: this._type,
          deviceId: this.id,
          scheme: 'debug',
          target: this._buildTarget
        },
        async: true
      })
      .bind(this)
      .then(function (res) {
        var res = res[0];
        if (!softReload) {
          this.setURL(res.url);
        }
        this.loadModules(res.debuggerURLs);
      }, function (err) {
        logger.error('Unable to simulate', this._app);
        console.error(err);
      })
      .finally(function() {
        // Clear the promise so that we run it next time
        this._requestSimulatePromise = null;
      });
    }

    return this._requestSimulatePromise;
  };

  this.rebuild = function (cb, softReload) {
    var ui = this._ui;
    var tasks = [];

    ui.setBuilding(true);

    if (softReload) {
      tasks.push(ui.softReload()
        .then(ui.refresh.bind(ui))
        .catch(function (e) {
          logger.log("Error with soft reload", e);
        })
      );
    }

    // get or update a simulator port with the following options
    tasks.push(this._requestSimulate(softReload));

    // Some final clean up
    var promise = Promise.all(tasks);
    if (softReload) {
      promise = promise.then(ui.continueLoad.bind(ui));
    }
    prommise = promise.then(function() { ui.setBuilding(false); });
    return promise.nodeify(cb);
  };

  this.setURL = function (url) {
    this._ui.loadURL(url);
  };
});
