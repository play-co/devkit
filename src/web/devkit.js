from util.browser import $;

import .Simulator;
import .util.DeviceInfo as DeviceInfo;
import .util.ajax;
import util.path;
import .util.bluebird as Promise;

import squill.Button as Button;

import .util.ConsoleLogger as ConsoleLogger;

var resolveURL = util.ajax.resolveURL;

var devkit = window.devkit;
if (!devkit) {
  devkit = window.devkit = {};
}

// define public API
var _simulators = {};

GLOBAL.devkit = {
  // the constructor for the DevKit API Promise objects
  Promise: Promise,
  logger: new ConsoleLogger('devkit'),
  _modules: {},

  // resolves to the apps currently known by DevKit
  getApps: function () {
    return util.ajax.get({url: resolveURL('/api/apps')})
      .then(function (res) {
        return res[0];
      });
  },

  // for cross-domain hosting
  setHost: function (host) {
    util.ajax.setHost(host);
  },

  createSimulator: function (app, opts) {
    var params = {app: app};
    this.logger.info('Creating simulator for: ' + app);

    return Promise.all([
        util.ajax.get({url: resolveURL('/api/mount'), query: params}),
        util.ajax.get({url: resolveURL('/api/devices')}),
      ])
      .bind(this)
      .spread(function (mountInfo, devices) {
        DeviceInfo.setInfo(devices[0]);

        mountInfo = mountInfo[0];

        // convert response to absolute URLs
        mountInfo.url = resolveURL(mountInfo.url);
        Object.keys(mountInfo.debuggerURLs).forEach(function (name) {
          mountInfo.debuggerURLs[name] = resolveURL(mountInfo.debuggerURLs[name]);
        });

        // Load the debugger modules
        Object.keys(mountInfo.debuggerModules).forEach(function (name) {
          this.addModule(name, mountInfo.debuggerModules[name]);
        }.bind(this));

        var simulator = new Simulator(merge({
          parent: opts.parent,
          app: app,
          mountInfo: mountInfo
        }, opts));

        this._lastSimulator = simulator;

        _simulators[simulator.id] = simulator;
        return simulator.api;
      })
      .catch(function (e) {
        this.logger.error('unable to start simulator');
        this.logger.error(e);
      });
  },

  addModule: function(name, info) {
    var src = resolveURL(info.mainPath);
    this.logger.info('adding module: ' + name + ' (main ' + src + ')');

    if (name in this._modules) {
      this.logger.info('module already exists, skipping');
      return;
    }

    this._modules[name] = {
      path: src,
      info: info
    };

    // Load the main file
    var el;
    if (/\.js$/.test(src)) {
      var head = document.getElementsByTagName('head')[0];
      el = $({
        parent: head,
        tag: 'script',
        src: src
      });
    } else {
      var defaultParentNode = document.querySelector('devkit') || document.body;
      el = $({
        parent: defaultParentNode,
        tag: 'iframe',
        src: src,
        className: 'module-frame'
      });
    }

    // Load any styles
    if (info.styles) {
      if (!Array.isArray(info.styles)) {
        info.styles = [info.styles];
      }
      info.styles.forEach(function(stylePath) {
        this.addModuleStyle(name, stylePath);
      }.bind(this));
    }

    this._modules[name].el = el;
  },

  addModuleStyle: function(moduleName, stylePath) {
    var module = this._modules[moduleName];
    var directory = util.path.splitPath(module.path).directory;
    this.logger.info('Loading module style', moduleName, stylePath);

    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = util.path.join(directory, 'inspector.css');
    document.querySelector('head').appendChild(link);
  },

  addModuleButton: function(opts) {
    opts.parent = document.getElementById('extension-bar');
    opts.children = [{
      tagName: 'span',
      className: opts.iconClassName
    }];
    return new Button(opts);
  },

  getSimulator: function (id) {
    if (!id) { return this._lastSimulator.api || null; }
    return _simulators[id].api;
  },

  getSimulators: function () {
    return Object.keys(_simulators).map(function (id) {
      return _simulators[id].api;
    });
  },

  connectClient: function () {

  }
};
