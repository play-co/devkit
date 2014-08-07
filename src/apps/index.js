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

var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var path = require('path');
var ff = require('ff');

var logger = require('../util/logging').get('apps');

var config = require('../config');
var App = require('./App');

var AppManager = Class(EventEmitter, function () {
  this.init = function () {
    this._apps = {};
    this._isLoaded = false;

    config.on('change', bind(this, 'reload'));
    this.reload();
  };

  this._load = function (appPath, lastOpened, persist, cb) {
    var appPath = path.resolve(process.cwd(), appPath);

    if (this._apps[appPath]) {
      cb && cb(null, this._apps[appPath]);
    } else {
      var manifestPath = path.join(appPath, 'manifest.json');
      fs.readFile(manifestPath, bind(this, function (err, contents) {
        if (err) {
          return cb && cb(err);
        }

        try {
          var manifest = JSON.parse(contents);
        } catch (e) {
          return cb && cb(new Error('failed to parse "manifest.json" (' + manifestPath + ')'));
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
  }

  this.reload = function () {
    var apps = config.get('apps');

    // migrate old format
    if (Array.isArray(apps)) {
      var newApps = {};
      apps.forEach(function (appPath) { newApps[appPath] = 0; });
      apps = newApps;
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
  }

  this.getAppDirs = function (cb) {
    this.getApps(function (err, apps) {
      if (err) {
        return cb && cb(err);
      }

      cb && cb(null, Object.keys(apps));
    });
  };

  this.get = function (appPath, dontUpdate, cb) {
    if (typeof arguments[1] == 'function') {
      cb = arguments[1];
      dontUpdate = false;
    }

    var f = ff(this, function () {
      this.getApps(f());
    }, function () {
      this._load(appPath, null, true, f());
    }, function (app) {
      f(app);

      if (app && !dontUpdate) {
        app.lastOpened = Date.now();
        this.persist();
      }
    }).cb(cb);
  }

  this.getApps = function (cb) {
    if (!this._isLoaded) {
      return this.once('update', bind(this, 'getApps', cb));
    }

    cb && cb(null, this._apps);
  };
});

module.exports = new AppManager();
