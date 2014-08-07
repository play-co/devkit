var fs = require('fs');
var path = require('path');
var Module = require('./Module');
var logger = require('../util/logging').get('apps');
var stringify = require('../util/stringify');

var App = module.exports = Class(function () {

  this.init = function (root, manifest, lastOpened) {
    this.paths = {
      root: root,
      shared: path.join(root, 'shared'),
      src: path.join(root, 'src'),
      resources: path.join(root, 'resources'),
      modules: path.join(root, 'modules'),
      icons: path.join(root, 'resources', 'icons'),
      lang: path.join(root, 'resources', 'lang'),
      manifest: path.join(root, 'manifest.json')
    };

    this.manifest = manifest;
    this.lastOpened = lastOpened || Date.now();
  }

  this.getModules = function () {
    if (!this._modules) {
      this._loadModules();
    }

    return this._modules;
  }

  this.removeModules = function (toRemove) {
    toRemove.forEach(function (moduleName) {
      delete this._modules[moduleName];
    }, this);
  }

  this.getClientPaths = function () {
    var appPath = this.paths.root;
    var paths = {'*': []};
    Object.keys(this.getModules()).forEach(function (moduleName) {
      var module = this._modules[moduleName];
      var clientPaths = module.getClientPaths();
      for (var key in clientPaths) {
        var p = path.relative(appPath, path.resolve(module.path, clientPaths[key]));
        if (key == '*') {
          paths[key] = paths[key].concat(p)
        } else {
          paths[key] = p;
        }
      }
    }, this);

    return paths;
  }

  this._loadModules = function () {
    if (!this._modules) {
      this._modules = {};
    }

    var _queue = [];

    function addToQueue(basePath) {
      try {
        _queue.push.apply(_queue, fs.readdirSync(path.join(basePath, 'modules')).map(function (item) { return path.join(basePath, 'modules', item); }));
        _queue.push.apply(_queue, fs.readdirSync(path.join(basePath, 'node_modules')).map(function (item) { return path.join(basePath, 'node_modules', item); }));
      } catch (e) {}
    }

    addToQueue(this.paths.root);

    while (_queue[0]) {
      var module = _queue.shift();
      var modulePath = path.resolve(this.paths.root, module);
      var packageFile = path.join(modulePath, 'package.json');

      if (fs.existsSync(packageFile)) {
        var packageContents;
        try {
          packageContents = require(packageFile);
        } catch (e) {
          return logger.warn("Module", module, "failed to load");
        }

        if (packageContents.devkit) {
          var existingModule = this._modules[packageContents.name];
          if (existingModule) {
            if (existingModule.version != packageContents.version) {
              throw new Error(packageContents.name + ' included twice with different versions:\n'
                  + existingModule.version + ': ' + existingModule.path + '\n'
                  + packageContents.version + ': ' + modulePath);
            }
          } else {
            var name = path.basename(modulePath);
            this._modules[name] = new Module(name, modulePath, packageContents);
          }

          addToQueue(modulePath);
        }
      }
    }
  }

  /* Manifest */

  function createUUID (a) {
    return a
      ? (a ^ Math.random() * 16 >> a / 4).toString(16)
      : ([1e7]+1e3+4e3+8e3+1e11).replace(/[018]/g, createUUID);
  }

  this.validate = function (opts, cb) {
    var opts = opts || {};
    var defaults = {
      "appID": createUUID(),
      "shortName": opts.shortName || "",
      "title": opts.title || "",

      "studio": {
        "name": "Your Studio Name",
        "domain": "studio.example.com",
        "stagingDomain": "staging.example.com"
      },

      "supportedOrientations": [
        "portrait",
        "landscape"
      ]
    };

    var changed = false;

    for (var key in defaults) {
      if (!(key in this.manifest)) {
        this.manifest[key] = defaults[key];
        changed = true;
      }
    }

    if (changed) {
      this.saveManifest(cb);
    }
  };

  this.saveManifest = function (cb) {
    return fs.writeFile(path.join(this.paths.manifest), stringify(this.manifest), cb);
  };

  this.getPackageName = function() {
    var studio = this.manifest.studio;
    if (studio && studio.domain && this.manifest.shortName) {
      return printf("%(reversedDomain)s.%(shortName)s", {
        reversedDomain: studio.domain.split(/\./g).reverse().join('.'),
        shortName: this.manifest.shortName
      });
    }
    return '';
  }

  this.getId = function () {
    return this.manifest.appID.toLowerCase();
  }

  this.getIcon = function (targetSize) {
    return this.manifest.icon
      || getIcon(this.manifest.android && this.manifest.android.icons, targetSize)
      || getIcon(this.manifest.ios && this.manifest.ios.icons, targetSize)
      || '/images/defaultIcon.png';

    function getIcon(iconList, targetSize) {
      var sizes = [], closest = null;

      if (iconList) {
        for (var size in iconList) {
          if (parseInt(size, 10) == size) {
            sizes.push(parseInt(size, 10));
          }
        }

        sizes.sort(function (a, b) { return a < b ? -1 : 1; });

        for (var i = sizes.length - 1; i >= 0; i--) {
          if (sizes[i] <= targetSize) {
            return iconList[sizes[i]];
          }
        }

        if (sizes.length) {
          return iconList[sizes.pop()];
        }
      }

      return null;
    }
  }

  // defines the public JSON API for DevKit extensions
  this.toJSON = function () {
    var modules = {};
    Object.keys(this.getModules()).forEach(function (moduleName) {
      modules[moduleName] = this._modules[moduleName].toJSON();
    }, this);

    return {
        "id": this.paths.root,
        "lastOpened": this.lastOpened,
        "appId": this.getId(),
        "modules": modules,
        "clientPaths": this.getClientPaths(),
        "paths": merge({}, this.paths),
        "manifest": this.manifest,
        "title": this.manifest.title
      };
  }
});
