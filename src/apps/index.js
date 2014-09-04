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

var AppManager = Class(EventEmitter, function () {
  this.init = function () {
    this._apps = {};
    this._isLoaded = false;

    config.on('change', bind(this, 'reload'));
    this.reload();
  };

  this._load = function (appPath, lastOpened, persist, cb) {

    if (!appPath) {
      return cb && cb('App not found');
    }

    appPath = path.resolve(process.cwd(), appPath);

    if (this._apps[appPath]) {
      cb && cb(null, this._apps[appPath]);
    } else {
      var manifestPath = path.join(appPath, MANIFEST);
      fs.readFile(manifestPath, bind(this, function (err, contents) {
        if (err) {
          return cb && cb(err);
        }

        try {
          var manifest = JSON.parse(contents);
        } catch (e) {
          return cb && cb(new Error('failed to parse "manifest.json" (' +
                                    manifestPath + ')'));
        }

        if (!this._apps[appPath] && manifest.appID) {
          var app = new App(appPath, manifest, lastOpened);
          this._apps[appPath] = app;
          this.emit('add', app);

          if (persist) {
            this.persist();
          }
        }

        cb && cb(null, this._apps[appPath]);
      }));
    }
  };

  this.reload = function () {
    var apps = config.get('apps');

    // migrate old format
    if (Array.isArray(apps)) {
      var newApps = {};
      apps.forEach(function (appPath) { newApps[appPath] = 0; });
      apps = newApps;
    }

    if (!apps) {
      apps = {};
    }

    var appDirs = Object.keys(apps);
    if (!appDirs || !appDirs.length) {
      this._isLoaded = true;
      this.emit('update');
      return;
    }

    if (this._isReloading) { return; }

    this._isReloading = true;
    var f = ff(this, function () {
      appDirs.forEach(function (dir) {
        this._load(dir, apps[dir], false, f.waitPlain());
      }, this);
    }, function () {
      this.persist();
    }).success(function () {
      this._isLoaded = true;
    }.bind(this)).cb(function (err) {
      if (err) { logger.error(err); }
      this._isReloading = false;
      this.emit('update');
    });
  };

  this.persist = function () {
    var apps = {};
    Object.keys(this._apps).forEach(function (app) {
      apps[app] = this._apps[app].lastOpened;
    }, this);

    config.set('apps', apps);
  };

  this.getAppDirs = function (cb) {
    this.getApps(function (err, apps) {
      if (err) {
        return cb && cb(err);
      }

      cb && cb(null, Object.keys(apps));
    });
  };

  this.create = function (appPath, cb) {
    this.get(appPath, function (err, app) {
      if (err) {
        app = new App(appPath);
        app.validate({shortName: path.basename(appPath)}, function (err) {
          cb && cb(err, !err && app);
        });
      } else {
        cb && cb(null, app);
      }
    });
  };

  this.get = function (appPath, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = {};
    }

    appPath = appPath.replace(/^~[\/\\]/, HOME + path.sep);

    if (!opts) { opts = {}; }

    var f = ff(this, function () {
      this.getApps(f());
    }, function () {
      if (!appPath) {
        appPath = findNearestApp();
      }
      this._load(appPath, null, true, f());
    }, function (app) {
      f(app);

      if (app && opts.updateLastOpened !== false) {
        app.lastOpened = Date.now();
        this.persist();
      }
    }).cb(cb);
  };

  this.getApps = function (cb) {
    if (!this._isLoaded) {
      return this.once('update', bind(this, 'getApps', cb));
    }

    if (cb) {
      // Calling this function should always be async based on the
      // this._isLoaded case.
      process.nextTick(function () { cb(null, this._apps); }.bind(this));
    }
  };
});

module.exports = new AppManager();
