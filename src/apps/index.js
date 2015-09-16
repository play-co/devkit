/** @license This file is part of the Game Closure SDK.
 *
 * The Game Closure SDK is free software: you can redistribute it and/or modify
 * it under the terms of the Mozilla Public License v. 2.0 as published by
 * Mozilla.

 * The Game Closure SDK is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 * or FITNESS FOR A PARTICULAR PURPOSE. See the Mozilla Public License v. 2.0
 * for more details.

 * You should have received a copy of the Mozilla Public License v. 2.0 along
 * with the Game Closure SDK.  If not, see <http://mozilla.org/MPL/2.0/>.
 */

var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var path = require('path');
var ff = require('ff');

var logger = require('../util/logging').get('apps');

var config = require('../config');
var App = require('./App');

var appFunctions = require('./functions');
var resolveAppPath = appFunctions.resolveAppPath;

var errorTypes = require('./errors');

var ApplicationNotFoundError = errorTypes.ApplicationNotFoundError;
var InvalidManifestError = errorTypes.InvalidManifestError;
var DestinationExistsError = errorTypes.DestinationExistsError;

var MANIFEST = 'manifest.json';


var AppManager = Class(EventEmitter, function () {
  this.init = function () {
    this._apps = {};
    this._isLoaded = false;

    config.on('change', bind(this, 'reload'));

    this.reload();
  };

  this.reload = function (cb) {
    trace('reload');
    var persistedApps = config.get('apps');
    if (!persistedApps) {
      persistedApps = {};
    }

    var appDirs = Object.keys(persistedApps);
    if (!appDirs || !appDirs.length) {
      this._isLoaded = true;
      this.emit('update');
      return Promise.resolve().nodeify(cb);
    }

    if (this._isReloading) {
      return Promise.resolve().nodeify(cb);
    }

    this._isReloading = true;

    var appCache = this._apps;

    Promise.map(appDirs, function (dir) {
      trace('loading dir', dir);
      var lastLoadTime = persistedApps[dir];
      return App.loadFromPath(
        dir, lastLoadTime
      ).catch(ApplicationNotFoundError, function (err) {
        // Remove missing apps from cache
        trace(err);
        delete appCache[err.message];
        return Promise.resolve(false);
      });
    }).filter(function (app) {
      trace('!!app', !!app);
      return Promise.resolve(!!app);
    }).bind(this).each(function (app) {
      trace('adding app to runtime cache');
      this._apps[app.paths.root] = app;
      this.emit('add', app);
      return Promise.resolve();
    }).then(function () {
      this.persist();
      this._isLoaded = true;
      return Promise.resolve();
    }).finally(function () {
      this._isReloading = false;
      this.emit('update');
    }).nodeify(cb);
  };

  this.persist = function () {
    var apps = {};
    Object.keys(this._apps).forEach(function (app) {
      apps[app] = this._apps[app].lastOpened;
    }, this);

    config.set('apps', apps);
  };

  this.getAppDirs = function (cb) {
    return this.getApps().then(function (apps) {
      return Object.keys(apps);
    }).nodeify(cb);
  };

  this.create = function (appPath, template, cb) {
    trace('AppManager#create');

    // create the app directory
    if (!fs.existsSync(appPath)) {
      fs.mkdirSync(appPath);
    } else {
      return Promise.reject(new DestinationExistsError(appPath)).nodeify(cb);
    }

    return this.get(appPath).then(function (app) {
      // Don't create apps if folder is already a valid app
      var err = new DestinationExistsError(appPath);
      return Promise.reject(err);
    }).catch(ApplicationNotFoundError, function (err) {
      trace('creating application');

      // app not found, create a new one
      var manifestPath = path.join(appPath, MANIFEST);
      var app = new App(appPath, manifestPath);

      return app.createFromTemplate(template).then(function () {
        trace('validating application');
        return app.validate({shortName: path.basename(appPath)});
      }).then(function () {
        return app;
      });

    }).then(function (app) {
      trace('app exists');
      return app;
    }).nodeify(cb);
  };

  this.unload = function (appPath) {
    if (this._apps[appPath]) {
      delete this._apps[appPath];
    }
  };

  this.has = function (appPath, cb) {
    trace('AppManager#has');
    appPath = resolveAppPath(appPath);

    return this.getApps().bind(this).then(function () {
      return appPath in this._apps;
    }).nodeify(cb);
  };

  this.get = function (appPath, opts, cb) {
    trace('AppManager#get');
    if (typeof opts === 'function') {
      cb = opts;
      opts = {};
    }

    if (this._apps[appPath]) {
      return Promise.resolve(this._apps[appPath]).nodeify(cb);
    }

    if (!opts) { opts = {}; }

    appPath = resolveAppPath(appPath);

    return this.getApps().bind(this).then(function () {
      trace('Getting', appPath);
      return App.loadFromPath(appPath, null);
    }).catch(ApplicationNotFoundError, function (err) {
      trace('got app not found error');
      if (err.message) {
        delete this._apps[appPath];
        this.persist();
      }
      return Promise.reject(err);
    }).then(function (app) {
      trace('updating app cache');
      this._apps[app.paths.root] = app;
      if (app && opts.updateLastOpened !== false) {
        app.lastOpened = Date.now();
        trace('persisting app cache');
        this.persist();
      }

      trace('forwarding app');
      return app;
    }).nodeify(cb);
  };

  this.getApps = function (cb) {
    trace('AppManager#getApps');

    if (this._isLoaded) {
      trace('already loaded');
      return Promise.resolve(this._apps).nodeify(cb);
    }

    return this.waitForUpdateEvent().bind(this).then(function () {
      trace('resolving with this._apps');
      return this._apps;
    }).nodeify(cb);
  };

  this.waitForUpdateEvent = function () {
    if (this._isLoaded) {
      return Promise.resolve();
    }

    var self = this;
    return new Promise(function (resolve, reject) {
      trace('waiting for `update` event');
      self.once('update', function () {
        trace('got update event');
        resolve(void 0);
      });
    });
  };

});

module.exports = new AppManager();

/**
 * @reexport ApplicationNotFoundError
 */

module.exports.ApplicationNotFoundError = ApplicationNotFoundError;

/**
 * @reexport InvalidManifestError
 */

module.exports.InvalidManifestError = InvalidManifestError;

/**
 * @reexport DestinationExistsError
 */

module.exports.DestinationExistsError = DestinationExistsError;
