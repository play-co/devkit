var fs = require('fs');
var ff = require('ff');
var path = require('path');
var rimraf = require('rimraf');
var lockFile = require('lockfile');

var Module = require('./Module');
var logger = require('../util/logging').get('apps');
var stringify = require('../util/stringify');

var LOCK_FILE = 'devkit.lock';
var UNCAUGHT_CB = function (err) {
  if (err) {
    throw err;
  }
};

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

    this.manifest = manifest || {};
    this._dependencies = this._parseDeps();
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

  // assuming app is loaded, reload the manifest and modules synchronously
  this.reloadSync = function () {
    if (!fs.existsSync(this.paths.manifest)) {
      // app does not exist anymore?
      require('./index').unload(this.paths.root);
    } else {
      this.manifest = JSON.parse(fs.readFileSync(this.paths.manifest, 'utf8'));
      if (this._modules) {
        this.reloadModules();
      }
    }
  }

  this.reloadModules = function () {
    this._modules = {};
    this._loadModules();
  }

  this._loadModules = function () {
    if (!this._modules) {
      this._modules = {};
    }

    var _queue = [];

    function addToQueue(parentPath) {
      function scanDir(basePath) {
        try {
          return fs.readdirSync(basePath)
            .map(function (item) {
              return {
                path: path.join(basePath, item),
                parent: parentPath
              };
            });

        } catch (e) {}
      }

      _queue.push.apply(_queue, scanDir(path.join(parentPath, 'modules')));
      _queue.push.apply(_queue, scanDir(path.join(parentPath, 'node_modules')));
    }

    addToQueue(this.paths.root);

    while (_queue[0]) {
      var item = _queue.shift();
      var modulePath = path.resolve(this.paths.root, item.path);
      var parentPath = path.resolve(this.paths.root, item.parent);
      var packageFile = path.join(modulePath, 'package.json');

      if (fs.existsSync(packageFile)) {
        var packageContents;
        try {
          packageContents = require(packageFile);
        } catch (e) {
          return logger.warn("Module", item.path, "failed to load");
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
            var version = null;
            var isDependency = (this.paths.root == parentPath);
            if (isDependency && this._dependencies[name]) {
              version = this._dependencies[name].version;
            }

            this._modules[name] = new Module({
              name: name,
              path: modulePath,
              parent: parentPath,
              isDependency: isDependency,
              version: version,
              packageContents: packageContents
            });
          }

          addToQueue(modulePath);
        }
      }
    }
  }

  this.getDependency = function (name) {
    return this._dependencies[name];
  }

  this._parseDeps = function () {
    var deps = {};
    var src = this.manifest.dependencies;
    for (var name in src) {
      var url = src[name];
      var pieces = url.split('#', 2);
      deps[name] = {
        url: pieces[0],
        version: pieces[1]
      };
    }

    return deps;
  }

  this._stringifyDeps = function () {
    var deps = this.manifest.dependencies = {};
    Object.keys(this._dependencies).forEach(function (name) {
      var dep = this._dependencies[name];
      deps[name] = (dep.url || '') + '#' + (dep.version || '');
    }, this);
  }

  /* Manifest */

  function createUUID (a) {
    return a
      ? (a ^ Math.random() * 16 >> a / 4).toString(16)
      : ([1e7]+1e3+4e3+8e3+1e11).replace(/[018]/g, createUUID);
  }

  var DEFAULT_PROTOCOL = "https";
  var DEFAULT_DEPS = [
    {
      name: "devkit-core",
      ssh: "git@github.com:",
      https: "https://github.com/",
      repo: "gameclosure/devkit-core",
      tag: ""
    }
  ];

  function getDefaultDeps(protocol) {
    protocol = protocol == 'ssh' ? 'ssh' : 'https';

    var out = {};
    DEFAULT_DEPS.forEach(function (dep) {
      out[dep.name] = dep[protocol] + dep.repo + (dep.tag ? '#' + dep.tag : '');
    });
    return out;
  }

  this.validate = function (opts, cb) {
    if (typeof opts == 'function') {
      cb = opts;
      opts = {};
    }

    if (!opts) { opts = {}; }

    var defaults = {
      "appID": createUUID(),
      "shortName": opts.shortName || "",
      "title": opts.title || opts.shortName || "",

      "studio": {
        "name": "Your Studio Name",
        "domain": "studio.example.com",
        "stagingDomain": "staging.example.com"
      },

      "supportedOrientations": [
        "portrait",
        "landscape"
      ],

      "dependencies": {}
    };

    var changed = false;

    for (var key in defaults) {
      if (!(key in this.manifest)) {
        this.manifest[key] = defaults[key];
        changed = true;
      }
    }

    var defaultDeps = getDefaultDeps(opts.protocol || 'https');
    for (var key in defaultDeps) {
      if (!(key in this.manifest.dependencies)) {
        this.manifest.dependencies[key] = defaultDeps[key];
        changed = true;
      }
    }

    if (changed) {
      this._dependencies = this._parseDeps();
      this._stringifyDeps();
      this.saveManifest(cb);
    } else {
      cb && process.nextTick(cb);
    }
  };

  this.setModuleVersion = function (moduleName, version, cb) {
    this.validate(null, bind(this, function (err) {
      if (!err) {
        var dep = this._dependencies[moduleName];
        if (dep && dep.version != version) {
          dep.version = version;
        }
      }
    }));
  }

  this.addDependency = function (name, opts, cb) {
    var dep = this._dependencies[name];
    var changed = false;
    if (!dep) {
      this._dependencies[name] = dep = {};
      changed = true;
    }

    if (opts.url) {
      dep.url = opts.url;
      changed = true;
    }

    if (opts.version) {
      dep.version = opts.version;
      changed = true;
    }

    var write = bind(this, function () {
      this._stringifyDeps();
      this.saveManifest(cb);
    });

    if (!dep.url) {
      Module.getURL(path.join(this.paths.modules, name), function (err, url) {
        if (!err) { dep.url = url; }
        write();
      });
    } else if (changed) {
      write();
    } else {
      cb && process.nextTick(cb);
    }
  }

  this.removeDependency = function (name, cb) {
    var f = ff(this, function () {
      // remove from manifest dependencies
      if (this._dependencies[name]) {
        logger.log('removing dependency from manifest...');
        delete this._dependencies[name];
        this._stringifyDeps();
        this.saveManifest(f.wait());
      }

      // remove from file system
      var modulePath = path.join(this.paths.modules, name);
      if (fs.existsSync(modulePath)) {
        logger.log('removing module directory...');
        rimraf(modulePath, f.wait());
      }
    }).cb(cb);
  }

  this.saveManifest = function (cb) {
    var data = stringify(this.manifest);
    return fs.writeFile(path.join(this.paths.manifest), data, cb);
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

  this.acquireLock = function (cb) {
    lockFile.lock(path.join(this.paths.root, LOCK_FILE), cb || UNCAUGHT_CB);
  }

  this.releaseLock = function (cb) {
    lockFile.unlock(path.join(this.paths.root, LOCK_FILE), cb || UNCAUGHT_CB);
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
