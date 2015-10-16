var fs = require('fs');
var chalk = require('chalk');
var path = require('path');
var logger = require('../util/logging').get('install');
var Module = require('../modules/Module');

var cache = require('./cache');

exports.installDependencies = function (app, opts) {
  // serially install all dependencies in the manifest
  var deps = app.manifest.dependencies;
  var names = Object.keys(deps);
  return Promise.map(names, function (name) {
    if (name && name !== 'devkit') {
      var installOpts = merge({url: deps[name]}, opts);
      return exports.installModule(app, name, installOpts);
    }
  }, {concurrency: 1});
};

function parseURL (url, protocol) {
  // find version in url
  var i = url.indexOf('#');
  var version;
  if (i >= 0) {
    if (!version) {
      version = url.substring(i + 1);
    }
    url = url.substring(0, i);
  }

  if (protocol === 'ssh') {
    var match = url.match(/^https:\/\/(.*?)\/(.*)$/);
    if (match) {
      url = 'git@' + match[1] + ':' + match[2];
    }
  }

  return {
    url: url,
    version: version
  };
}

/**
 * Figure out which version the user wishes to be installed.
 */

function resolveRequestedModuleVersion (app, moduleName, version, opts) {
  if (opts.latest || version === 'latest') {
    opts.latest = true;
    return void 0;
  } else if (!version) {
    // Not latest and no version provided, look up in manifest
    var dep = app.getDependency(moduleName);
    if (dep) {
      return dep.version;
    }
  } else {
    // The version was explicitly requested
    return version;
  }
}

exports.installModule = function (app, moduleName, opts, cb) {
  if (!opts) { opts = {}; }

  var url = opts.url;
  var version = opts.version;

  if (opts.url) {
    var urlInfo = parseURL(url, opts.protocol);
    url = urlInfo.url;
    version = urlInfo.version;
  }

  version = resolveRequestedModuleVersion(app, moduleName, version, opts);

  var PROTOCOL = /^[a-z][a-z0-9+\-\.]*:/;
  var isURL = !!url || moduleName && PROTOCOL.test(moduleName);

  logger.log(
    chalk.cyan('Installing'),
    chalk.yellow(
      moduleName + (version ? '@' + version : '')
    ) + chalk.cyan('...')
  );

  trace('[installModule] moduleName:', moduleName);
  trace('[installModule] version:', version);
  trace('[installModule] url:', url);
  trace('[installModule] isURL:', isURL);

  return Promise.bind({}).then(function () {
    this.hasLock = false;
    return app.acquireLock();
  }).then(function () {
    this.hasLock = true;

    if (moduleName) {
      var modulePath = path.join(app.paths.modules, moduleName);
      if (fs.existsSync(modulePath)) {
        return Module.describeVersion(modulePath);
      }
    }

    return Promise.resolve();
  }).then(function passOrInstallModule (currentVersion) {
    trace('currentVersion', currentVersion);
    // if there is no current version, use version from manifest or fetch latest
    // if there is a current version,
    //    - if you request latest, version is not defined
    //    - if you request a version, version is defined
    //    - if you don't provide a version, version is defined if present in the
    //      manifest, undefined otherwise
    var hasRequestedVersion;
    if (!currentVersion) {
      hasRequestedVersion = false;
    } else if (!version && !opts.latest) {
      // no version provided and latest not requested, then don't do anything
      hasRequestedVersion = true;
    } else {
      // does requested version match current version?
      hasRequestedVersion = currentVersion.hash === version
        || currentVersion.tag === version;
    }

    if (hasRequestedVersion) {
      return Promise.resolve();
    } else if (isURL) {
      return installModuleFromURL(app, moduleName, url, version, opts);
    } else {
      return installModuleFromName(app, moduleName, version, opts);
    }
  }).tap(function (installedVersion) {
    installedVersion && logger.log(
      chalk.yellow(moduleName + '@' + installedVersion),
      chalk.cyan('install completed')
    );
  }).finally(function () {
    // Unlock the app for future use
    if (this.hasLock) {
      return app.releaseLock();
    }
  }).nodeify(cb);
};

function updateCache(name, url, version) {
  return cache.has(name)
    ? cache.add(name, version)
    : cache.add(url, version);
}

/**
 * Lookup URL for module by name then defer to installModuleFromURL
 *
 * @return {Promise<string>} resolves with installed version
 */
function installModuleFromName (app, name, version, opts) {
  if (name == 'devkit-core') {
    return installModuleFromURL(app, name, 'git@github:gameclosure/devkit-core', version, opts);
  }
  // TODO
  return Promise.reject(
    new Error('Installing module by name is not [yet] supported')
  );
}

/**
 * Install a module in an app given a URL
 *
 * @return {Promise<string>} resolves with installed version
 */
function installModuleFromURL (app, name, url, version, opts) {
  // we can't silence a clone/fetch in case the user has to enter credentials
  logger.log(chalk.cyan('Adding ' + name + (version ? '@' + version : '')));

  var modulePath = path.join(app.paths.modules, name);
  var exists = fs.existsSync(modulePath);

  return Promise
    .bind({})
    .then(function () {
      if (!exists) {
        // if destination path doesn't exist, add module to cache then add
        // module to app
        return updateCache(name, url, version)
          .bind(this)
          .then(function (cacheEntry) {
            this.cacheEntry = cacheEntry;
            return addModuleToApp(app, cacheEntry, name, opts);
          });
      }
    })
    .then(function () {
      // modulePath may be invalid if name is a URL, use the cacheEntry for the
      // latest values
      if (this.cacheEntry) {
        name = this.cacheEntry.name;
        modulePath = path.join(app.paths.modules, this.cacheEntry.name);
      }

      if (opts.link) { displayLinkWarning(app, modulePath); }

      return Module.setVersion(modulePath, version, {
        forceInstall: true,
        unsafe: opts.unsafe
      });
    })
    .then(function (installedVersion) {
      this.installedVersion = installedVersion;

      app.reloadModules(); // synchronous
      return app.addDependency(name, {
        url: this.cacheEntry && this.cacheEntry.url,
        version: this.installedVersion
      });
    })
    .then(function () {
      // Return value for installModuleFromURL
      return this.installedVersion;
    });
}

/**
 * Link module into app's moudles folder
 *
 * @return {Promise}
 */

function linkModuleIntoApp (app, cacheEntry) {
  logger.log(chalk.cyan('Linking ' + app.paths.modules));
  return cache.link(cacheEntry, app.paths.modules);
}

/**
 * Copy module into app's modules folder
 *
 * @return {Promise}
 */

function copyModuleIntoApp (app, cacheEntry) {
  logger.log(chalk.cyan('Copying ' + app.paths.modules));
  return cache.copy(cacheEntry, app.paths.modules);
}

/**
 * Add module to app's `./modules` folder. Default action is to copy. If
 * opts.link is truthy, create a symlink instead.
 *
 * @return {Promise}
 */

function addModuleToApp (app, cacheEntry, moduleName, opts) {
  trace('addModuleToApp cacheEntry:', cacheEntry);
  moduleName = cacheEntry && cacheEntry.name || moduleName;

  if (opts.link) {
    return linkModuleIntoApp(app, cacheEntry);
  } else {
    return copyModuleIntoApp(app, cacheEntry);
  }
}

/**
 * The module installation for this app is a symlink. Remind the user :)
 */

function displayLinkWarning (app, modulePath) {
  try {
    logger.warn(app.paths.root, '-->', fs.readlinkSync(modulePath));
  } catch (e) {
    logger.error('Unexpected error reading link', modulePath);
    logger.error(e);
  }
}
