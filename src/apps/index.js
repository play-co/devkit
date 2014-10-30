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

var MANIFEST = 'manifest.json';

var HOME = process.env.HOME
      || process.env.HOMEPATH
      || process.env.USERPROFILE;

function isDevkitApp (cwd) {
  var manifestPath = path.join(cwd, 'manifest.json');
  var manifest;
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (e) {
      manifest = {};
    }

    if (manifest.appID) {
      return true;
    }
  }
  return false;
}

function findNearestApp (dir) {
  if (!dir) {
    dir = process.cwd();
  }

  if (isDevkitApp(dir)) {
    return dir;
  } else if (fs.existsSync(path.join(dir, '..'))) {
    return findNearestApp(path.normalize(path.join(dir, '..')));
  } else {
    return null;
  }
}

function resolveAppPath(appPath) {
  return appPath && path.resolve(
    process.cwd(), appPath.replace(/^~[\/\\]/, HOME + path.sep)
  ) || findNearestApp();
}

// error message when failing to load an app
var APP_NOT_FOUND = 'App not found';

var ApplicationNotFoundError = require('./errors').ApplicationNotFoundError;

var AppManager = Class(EventEmitter, function () {
  this.init = function () {
    this._apps = {};
    this._isLoaded = false;

    config.on('change', bind(this, 'reload'));
    this.reload();
  };

  this._load = function (appPath, lastOpened, persist, cb) {

    if (!appPath) {
      return Promise.reject(new ApplicationNotFoundError()).nodeify(cb);
    }

    appPath = resolveAppPath(appPath);

    if (this._apps[appPath]) {
      return Promise.resolve(this._apps[appPath]).nodeify(cb);
    }

    var manifestPath = path.join(appPath, MANIFEST);
    var readFile = Promise.promisify(fs.readFile, fs);
    return readFile(manifestPath).bind(this).catch(function (err) {
      if (err.code === 'ENOENT') {
        err = new ApplicationNotFoundError('manifest not found');
        return Promise.reject(err);
      } else {
        return Promise.reject(err);
      }
    }).then(function (contents) {
      var manifest = JSON.parse(contents);
      return manifest;
    }).catch(function (err) {
      return Promise.reject(
        new ApplicationNotFoundError('failed to parse manifest.json')
      );
    }).then(function (manifest) {
      if (!this._apps[appPath] && manifest.appID) {
        var app = new App(appPath, manifest, lastOpened);
        this._apps[appPath] = app;
        this.emit('add', app);

        if (persist) {
          this.persist();
        }
      }

      if (this._apps[appPath]) {
        return this._apps[appPath];
      } else {
        return Promise.reject(new ApplicationNotFoundError(appPath));
      }

    }).nodeify(cb);
  };

  this.reload = function (cb) {
    var apps = config.get('apps');
    if (!apps) {
      apps = {};
    }

    var appDirs = Object.keys(apps);
    if (!appDirs || !appDirs.length) {
      this._isLoaded = true;
      this.emit('update');
      return Promise.resolve().nodeify(cb);
    }

    if (this._isReloading) { return; }

    this._isReloading = true;
    return Promise.bind(this).return(appDirs).each(function (dir) {
      return this._load(dir, apps[dir], false);
    }).all().then(function () {
      this.persist();
    }).then(function () {
      this._isLoaded = true;
    }).catch(function (err) {
      logger.log(err);
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
    // create the app directory
    if (!fs.existsSync(appPath)) {
      fs.mkdirSync(appPath);
    }

    var readFile = Promise.promisify(fs.readFile, fs);

    return this.get(appPath).bind(this).then(function (app) {
      return app;
    }).catch(function (err) {
      // app not found, create a new one
      var manifestPath = path.join(appPath, MANIFEST);

      return readFile(manifestPath, 'utf8').catch(function (err) {
        return '{}';
      }).then(function (rawManifest) {
        var manifest = JSON.parse(rawManifest);
        this.app = new App(appPath, manifestPath);
        return this.app.createFromTemplate(template);
      }).then(function () {
        return this.app.validate({shortName: path.basename(appPath)});
      }).then(function () {
        return this.app;
      });
    }).nodeify(cb);
  };

  this.unload = function (appPath) {
    if (this._apps[appPath]) {
      delete this._apps[appPath];
    }
  };

  this.has = function (appPath, cb) {
    appPath = resolveAppPath(appPath);

    return this.getApps().bind(this).then(function () {
      return appPath in this._apps;
    }).nodeify(cb);
  };

  this.get = function (appPath, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = {};
    }

    if (!opts) { opts = {}; }

    appPath = resolveAppPath(appPath);

    return this.getApps().bind(this).then(function () {
      return this._load(appPath, null, true);
    }).then(function (app) {
      if (app && opts.updateLastOpened !== false) {
        app.lastOpened = Date.now();
        this.persist();
      }
      return app;
    }).nodeify(cb);
  };

  this.getApps = function (cb) {
    if (this._isLoaded) {
      return Promise.delay(0).return(this._apps).nodeify(cb);
    }

    var self = this;
    return new Promise(function (resolve) {
      self.once('update', resolve);
    }).then(function () {
      return self.getApps();
    }).nodeify(cb);
  };
});

module.exports = new AppManager();
module.exports.APP_NOT_FOUND = APP_NOT_FOUND;

/**
 * @reexport ApplicationNotFoundError
 */
module.exports.ApplicationNotFoundError = ApplicationNotFoundError;
