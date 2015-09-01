/* globals trace */
var fs = require('../util/fs');
var printf = require('printf');
var path = require('path');
var semver = require('semver');
var chalk = require('chalk');

var Module = require('../modules/Module');

var lockFile = require('../util/lockfile');
var gitClient = require('../util/gitClient');
var FatalGitError = gitClient.FatalGitError;
var logger = require('../util/logging').get('apps');
var stringify = require('../util/stringify');

var ApplicationNotFoundError = require('./errors').ApplicationNotFoundError;
var InvalidManifestError = require('./errors').InvalidManifestError;

var LOCK_FILE = 'devkit.lock';

var APP_TEMPLATE_ROOT = path.join(__dirname, 'templates');
var DEFAULT_TEMPLATE = 'default';

var appFunctions = require('./functions');
var resolveAppPath = appFunctions.resolveAppPath;

var createUUID = function createUUID (a) {
  return a ?
    (a ^ Math.random() * 16 >> a / 4).toString(16) :
    ([1e7]+1e3+4e3+8e3+1e11).replace(/[018]/g, createUUID);
};

var MANIFEST = 'manifest.json';
var App = module.exports = Class(function () {

  this.init = function (root, manifest, lastOpened) {
    trace('Instantiating App with root path:', root);
    this.paths = {
      root: root,
      build: path.join(root, 'build'),
      shared: path.join(root, 'shared'),
      src: path.join(root, 'src'),
      modules: path.join(root, 'modules'),
      resources: path.join(root, 'resources'),
      icons: path.join(root, 'resources', 'icons'),
      lang: path.join(root, 'resources', 'lang'),
      manifest: path.join(root, 'manifest.json')
    };

    if (manifest && manifest.toString() === '[object Object]') {
      this.manifest = manifest;
    } else {
      this.manifest = {};
    }

    this._dependencies = this._parseDeps();
    this.lastOpened = lastOpened || Date.now();
  };

  this.getModules = function () {
    if (!this._modules) {
      this._loadModules();
    }

    return this._modules;
  };

  this.removeModules = function (toRemove) {
    toRemove.forEach(function (moduleName) {
      delete this._modules[moduleName];
    }, this);
  };

  this.getClientPaths = function () {
    var appPath = this.paths.root;
    var paths = {'*': []};
    Object.keys(this.getModules()).forEach(function (moduleName) {
      var module = this._modules[moduleName];
      var clientPaths = module.getClientPaths();
      for (var key in clientPaths) {
        var p = path.relative(
          appPath, path.resolve(module.path, clientPaths[key])
        );
        if (key === '*') {
          paths[key] = paths[key].concat(p);
        } else {
          paths[key] = p;
        }
      }
    }, this);

    return paths;
  };

  // assuming app is loaded, reload the manifest and modules synchronously
  this.reloadSync = function () {
    if (!fs.existsSync(this.paths.manifest)) {
      // app does not exist anymore?
      require('./index').unload(this.paths.root);
    } else {
      logger.log(this.paths.manifest);
      try {
        this.manifest = JSON.parse(
          fs.readFileSync(this.paths.manifest, 'utf8')
        );
      } catch (e) {
        logger.error('Error loading and parsing manifest at',
                     this.paths.manifest);
        throw e;
      }
      if (this._modules) {
        this.reloadModules();
      }
    }
  };

  this.reloadModules = function () {
    this._modules = {};
    this._loadModules();
  };

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

    var rootPath = this.paths.root;

    addToQueue(rootPath);

    while (_queue[0]) {
      var item = _queue.shift();
      var modulePath = path.resolve(rootPath, item.path);
      var parentPath = path.resolve(rootPath, item.parent);
      var isDependency = (rootPath === parentPath);
      var module = Module.load(modulePath, {
        parent: parentPath,
        isDependency: isDependency,
      });

      if (!module) { continue; }

      if (module.name in this._modules) {
        if (this._modules[module.name].version != module.version) {
          var existingModule = this._modules[module.name];
          logger.warn(chalk.red(
            module.name +
            ' included twice with different versions:\n\t') +
            existingModule.name + '@' + existingModule.version + ' from '
              + path.relative(rootPath, existingModule.path) + '\n\t' +
            module.name + '@' + module.version + ' from '
              + path.relative(rootPath, modulePath));

          if (semver.gt(module.version, existingModule.version)) {
            this._modules[module.name] = module;
            addToQueue(modulePath);
          } else {
            module = existingModule;
          }

          logger.warn(chalk.red('using ' + module.name + '@' + module.version));
        }
      } else {
        this._modules[module.name] = module;
        addToQueue(modulePath);
      }
    }
  };

  this.getDependency = function (name) {
    return this._dependencies[name];
  };

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
  };

  this._stringifyDeps = function () {
    var deps = this.manifest.dependencies = {};
    Object.keys(this._dependencies).forEach(function (name) {
      var dep = this._dependencies[name];
      deps[name] = (dep.url || '') + '#' + (dep.version || '');
    }, this);
  };

  /* Manifest */

  var REQUIRED_DEPS = [
    {
      name: 'devkit-core',
      ssh: 'git@github.com:',
      https: 'https://github.com/',
      repo: 'gameclosure/devkit-core',
      tag: ''
    }
  ];

  function getRequiredDeps(protocol) {
    protocol = protocol === 'ssh' ? 'ssh' : 'https';

    var out = {};
    REQUIRED_DEPS.forEach(function (dep) {
      out[dep.name] = dep[protocol] + dep.repo + (dep.tag ? '#' + dep.tag : '');
    });
    return out;
  }

  this.validate = function (opts, cb) {
    trace('validating application');
    if (typeof opts === 'function') {
      cb = opts;
      opts = {};
    }

    if (!opts) { opts = {}; }

    var defaults = {
      appID: createUUID(),
      shortName: opts.shortName || '',
      title: opts.title || opts.shortName || '',

      studio: {
        name: 'Your Studio Name',
        domain: 'studio.example.com',
        stagingDomain: 'staging.example.com'
      },

      supportedOrientations: [
        'portrait',
        'landscape'
      ],

      dependencies: {}
    };

    var changed = false;
    var key;

    // create defaults for anything missing
    for (key in defaults) {
      if (!this.manifest.hasOwnProperty(key)) {
        this.manifest[key] = defaults[key];
        changed = true;
      }
    }

    // ensure required dependencies are set
    var requiredDeps = getRequiredDeps(opts.protocol || 'https');
    if (this.manifest.dependencies) {
      for (key in requiredDeps) {
        if (!this.manifest.dependencies.hasOwnProperty(key)) {
          this.manifest.dependencies[key] = requiredDeps[key];
          changed = true;
        }
      }
    } else {
      this.manifest.dependencies = requiredDeps;
    }

    // if manifest has been changed, save it and update dependencies
    if (changed) {
      this._dependencies = this._parseDeps();
      this._stringifyDeps();
      return this.saveManifest(cb);
    } else {
      return Promise.delay(0).nodeify(cb);
    }
  };

  this.setModuleVersion = function (moduleName, version, cb) {
    return this.validate(null).bind(this).then(function () {
      var dep = this._dependencies[moduleName];
      if (dep && dep.version !== version) {
        dep.version = version;
      }
    }).nodeify(cb);
  };

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
  };

  this.removeDependency = function (name, cb) {
    var promises = [];
    // remove from manifest dependencies
    if (this._dependencies[name]) {
      logger.log('removing dependency from manifest...');
      delete this._dependencies[name];
      this._stringifyDeps();
      promises.push(this.saveManifest());
    }

    // remove from file system
    var modulePath = path.join(this.paths.modules, name);
    if (fs.existsSync(modulePath)) {
      logger.log('removing module directory...');
      promises.push(fs.removeAsync(modulePath));
    }

    return Promise.all(promises).nodeify(cb);
  };

  this.saveManifest = function (cb) {
    trace('App#saveManifest');
    var data = stringify(this.manifest);
    return fs.writeFileAsync(path.join(this.paths.manifest), data).nodeify(cb);
  };

  this.getPackageName = function() {
    var studio = this.manifest.studio;
    if (studio && studio.domain && this.manifest.shortName) {
      return printf('%(reversedDomain)s.%(shortName)s', {
        reversedDomain: studio.domain.split(/\./g).reverse().join('.'),
        shortName: this.manifest.shortName
      });
    }
    return '';
  };

  this.getId = function () {
    return this.manifest.appID.toLowerCase();
  };

  this.getIcon = function (targetSize) {
    return this.manifest.icon
      || getIcon(this.manifest.android && this.manifest.android.icons,
                 targetSize)
      || getIcon(this.manifest.ios && this.manifest.ios.icons, targetSize)
      || '/resources/icons/defaultIcon.png';

    function getIcon(iconList, targetSize) {
      var sizes = [];

      if (iconList) {
        for (var size in iconList) {
          var numSize = parseInt(size);
          if (!Number.isNaN(numSize) && numSize.toString() === size) {
            sizes.push(numSize);
          } else {
            logger.warn('Non integer icon size encountered:', size);
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
  };

  this.createFromTemplate = function (template) {

    var creator;
    if (template.type == 'git') {
      creator = this._createFromGitTemplate(template);
    } else if (template.type == 'local') {
      // TODO: support expanding user home dir and other shortcuts
      var templatePath = path.normalize(template.path);
      if (fs.existsSync(templatePath) &&
          fs.lstatSync(templatePath).isDirectory()) {
        logger.log('Creating app using local template ' + templatePath);
        creator = this._copyLocalTemplate(templatePath);
      } else {
        logger.warn('Failed to find template ' + templatePath);
      }
    } else if (template.type == 'none') {
      logger.log('Creating application with no template');
      creator = Promise.resolve();
    } else if (!template.type) {
      logger.log('Creating app using default template');
    } else {
      logger.error('Invalid template - using default');
    }

    if (!creator) {
      creator = this.createFromDefaultTemplate();
    }

    return creator
      .bind(this)
      .then(function () {
        return fs.readFileAsync(this.paths.manifest, 'utf8');
      })
      .then(function (manifest) {
        // try to prepopulate manifest keys with template manifest
        if (manifest) {
          try {
            this.manifest = JSON.parse(manifest);
          } catch (e) {}
        }
      }, function () {
        // template did not have a manifest probably, ignore
      });
  };

  this.createFromDefaultTemplate = function () {
    logger.log('Creating app using default application template');
    var templatePath = path.join(APP_TEMPLATE_ROOT, DEFAULT_TEMPLATE);
    return this._copyLocalTemplate(templatePath);
  };

  this._copyLocalTemplate = function (templatePath) {
    trace('_copyLocalTemplate');

    // read every file/folder in the template
    return fs.copyAsync(templatePath, this.paths.root);
  };

  this._createFromGitTemplate = function (template) {
    // if template is not a local path, attempt to clone it
    var tempPath = path.join(APP_TEMPLATE_ROOT, '_template');
    return fs.removeAsync(tempPath)
      .bind(this)
      .then(function () {
        // shallow clone the repository
        logger.log('Creating app using remote template ' + template.path);
        var git = gitClient.get(APP_TEMPLATE_ROOT);
        return git('clone', '--depth', '1', template.path, tempPath);
      })
      .then(function () {
        logger.log('Copying ' + tempPath + ' to ' + this.paths.root);
        return this._copyLocalTemplate(tempPath);
      })
      .catch(FatalGitError, function (err) {
        logger.error(err.message);
        logger.log('Falling back to default template creation');
        return this.createFromDefaultTemplate();
      })
      .finally(function () {
        return fs.removeAsync(tempPath);
      });
  };

  this.acquireLock = function (cb) {
    return lockFile.lock(path.join(this.paths.root, LOCK_FILE)).nodeify(cb);
  };

  this.releaseLock = function (cb) {
    return lockFile.unlock(path.join(this.paths.root, LOCK_FILE)).nodeify(cb);
  };

  // defines the public JSON API for DevKit extensions
  this.toJSON = function () {
    var modules = {};
    Object.keys(this.getModules()).forEach(function (moduleName) {
      modules[moduleName] = this._modules[moduleName].toJSON();
    }, this);

    return {
        'id': this.paths.root,
        'lastOpened': this.lastOpened,
        'appId': this.getId(),
        'modules': modules,
        'clientPaths': this.getClientPaths(),
        'paths': merge({}, this.paths),
        'manifest': this.manifest,
        'title': this.manifest.title
      };
  };
});

App.loadFromPath = function loadAppFromPath (appPath, lastOpened) {
  trace('loadAppFromPath');
  trace('\tappPath', appPath);

  if (!appPath) {
    trace('returning early');
    return Promise.reject(new ApplicationNotFoundError());
  }

  appPath = resolveAppPath(appPath);
  var manifestPath = path.join(appPath, MANIFEST);

  trace('trying to read manifest from', manifestPath);
  return fs.readFileAsync(manifestPath, 'utf8')
    .bind(this)
    .catch(function (err) {
      if (err.code === 'ENOENT' || err.cause.code === 'ENOENT') {
        trace('returning ApplicationNotFoundError');
        return Promise.reject(new ApplicationNotFoundError('No application found at ' + appPath));
      }

      trace('forwarding unexpected error');
      return Promise.reject(err);
    })
    .then(function (contents) {
      trace('opened manifest');
      var manifest = JSON.parse(contents);
      return manifest;
    })
    .catch(SyntaxError, function (err) {
      trace('Error parsing manifest in appPath', appPath);
      return Promise.reject(new InvalidManifestError('Invalid JSON in manifest at ' + manifestPath));
    })
    .then(function (manifest) {

      // if manifest has no appID, assume this isn't a devkit app
      if ('appID' in manifest === false) {
        return Promise.reject(new ApplicationNotFoundError(appPath));
      } else if (manifest.appID) {
        return Promise.resolve(manifest);
      } else {

        // if manifest has a blank/false/0 appID, generate one and save manifest
        manifest.appID = createUUID();
        var data = stringify(manifest);
        return fs.writeFileAsync(manifestPath, data)
          .return(manifest);
      }

    })
    .then(function (manifest) {
      trace('returning App for appPath', appPath);
      return Promise.resolve(new App(appPath, manifest, lastOpened));
    });
};
