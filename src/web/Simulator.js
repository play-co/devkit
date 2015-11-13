from util.browser import $;

import .util.ajax;
import .util.DeviceInfo as DeviceInfo;
import .util.ChannelAPI as ChannelAPI;

import .ui.Chrome;

import .util.upgrade;

import .devkitConn;

var resolveURL = util.ajax.resolveURL;
var defaultParentNode = document.querySelector('devkit') || document.body;
var head = document.getElementsByTagName('head')[0];

var Simulator = exports = Class(function () {
  var _simulatorId = 0;

  function PUBLIC_API(f) {
    f.PUBLIC_API = true;
    return f;
  }

  // connection to simulator frame
  var API = Class(ChannelAPI, function (supr) {
    this.init = function (simulator) {
      supr(this, 'init');

      this._simulator = simulator;

      devkitConn.getTransport().bind(this).then(function (socket) {
        this.devkit.setTransport(socket);
      });

      for (var key in Simulator.prototype) {
        if (typeof Simulator.prototype[key] == 'function' && Simulator.prototype[key].PUBLIC_API) {
          this[key] = simulator[key].bind(simulator);
        }
      }
    };

    // connection to devkit server
    this.devkit = new ChannelAPI();
  });

  this.init = function (opts) {
    this._opts = opts;
    this.id = opts.id || ('sim' + (++_simulatorId));

    this._type = opts.type;
    this._screen = opts.screen;
    this._userAgent = opts.userAgent;

    this._app = opts.app;

    this._deviceInfo = DeviceInfo.get(this._opts.type);
    this._buildTarget = opts.buildTarget || this._deviceInfo.getTarget();

    // api used by simulator frame
    this.api = new API(this);

    this._mountInfo = opts.mountInfo;

    // DOM simulator
    if (opts.chrome !== false) {
      this._ui = new ui.Chrome(this);
      this._ui.on('change:type', bind(this, 'onDeviceChange'));
    }

    this._modules = {};
    this.loadModules(opts.modules);

    if (opts.debuggerModules !== false) {
      this.loadModules(this._mountInfo.debuggerURLs);
    }
  };

  this.getURL = PUBLIC_API(function () {
    return this._mountInfo.url;
  });

  this.getUI = function () {
    return this._ui;
  };

  this.getApp = PUBLIC_API(function () { return this._app; });
  this.getOpts = function () { return this._opts; };
  this.getManifest = PUBLIC_API(function () { return this._mountInfo.manifest; });
  this.getModules = PUBLIC_API(function () {
    return this._modules;
  });

  this.loadModules = function (modules) {
    if (!modules) { return; }

    Object.keys(modules).forEach(function (name) {
      if (name in this._modules) { return; }

      var src = modules[name];
      var el;
      if (/\.js$/.test(src)) {
        el = $({
          parent: head,
          tag: 'script',
          src: src
        });
      } else {
        el = $({
          parent: this._opts.parent || defaultParentNode,
          tag: 'iframe',
          src: src,
          className: 'module-frame'
        });
      }

      this._modules[name] = {
        path: src,
        el: el
      };
    }, this);
  };

  this.onDeviceChange = function() {
    this._deviceInfo = this._ui.getDeviceInfo();
    this._type = this._deviceInfo.getId();
    window.location.hash = 'device=' + JSON.stringify({ type: this._type });
    this.rebuild();
  };

  this.rebuild = PUBLIC_API(function () {
    this._ui && this._ui.setBuilding(true);

    console.log('%cbuilding ' + this._mountInfo.manifest.shortName + '...', 'font-weight: bold; color: blue');

    // get or update a simulator port with the following options
    return util.ajax
      .get({
        url: resolveURL('/api/simulate/'),
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
        console.log('%cbuild completed:%c ' + res[0].elapsed + ' seconds', 'font-weight: bold; color: blue', 'color: green');
        console.log('build result:', res[0]);

        if (this._ui) {
          this._ui.setBuilding(false);
          this._ui.loadURL(this._mountInfo.url);
        }

        return res;
      }, function (err) {
        logger.error('Unable to simulate', this._app);
        console.error(err);
      });
  });

  /**
   * getFrame - available if the simulator chrome is not null
   * @returns {HTMLElement} Iframe for the simulator
   */
  this.getFrame = PUBLIC_API(function () {
    return this._ui && this._ui.getFrame();
  });

  /**
   * getDevicePixelRatio - available if the simulator chrome is not null
   * @returns {float} device's device pixel ratio
   */
  this.getDevicePixelRatio = PUBLIC_API(function () {
    return this._ui && this._ui.getDevicePixelRatio() || window.devicePixelRatio;
  });

  /**
   * getParent - available if the simulator chrome is not null
   * @returns {HTMLElement} Parent DOM node
   */
   this.getParent = PUBLIC_API(function () {
    return this._ui && this._ui.getParent() || null;
  });

  /**
   * prompt - (internal) shows upgrade messages
   * @returns {Promise} resolves if user agrees to prompt, rejects if user cancels
   */
   this.prompt = PUBLIC_API(function (opts) {
    return this._ui && this._ui.prompt(opts) || Promise.reject();
  });
});
