var fs = require('fs');
var chalk = require('chalk');
var path = require('path');

var lockFile = require('../util/lockfile');
var logger = require('../util/logging').get('install');

var cache = require('./cache');

var PROTOCOL_PATTERN = /^[a-z][a-z0-9+\-\.]*:/;


var parseURL = function(url, protocol) {
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
};

/** @returns {Promise} */
var getManifest = function(dir) {
  var manifestPath = path.join(dir, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    logger.silly('no manifest here!');
    return Promise.reject();
  }

  var contents = fs.readFileSync(manifestPath, 'utf8');

  try {
    var manifest = JSON.parse(contents);
    return Promise.resolve(manifest);
  } catch(e) {
    logger.warn('Malformed manifest at:', manifestPath);
    return Promise.reject();
  }
};

/**
 * Install a module in a folder given a URL and version
 *
 * @return {Promise<string>} resolves with installed version
 */
var installModuleFromURL = function(baseDir, name, url, version, opts) {
  opts = opts || {};

  if (opts.colorLog) {
    logger.log(
      chalk.cyan('Installing:'),
      chalk.yellow(name + (version ? '@' + version : '')) + chalk.cyan('...')
    );
  } else {
    logger.log('Installing:', name + (version ? '@' + version : ''));
  }

  var modulePath = path.join(baseDir, 'modules', name);

  // Skip links
  if (fs.existsSync(modulePath)) {
    var stat = fs.statSync(modulePath);
    if (!stat.isDirectory()) {
      return Promise.reject('File exists at: ' + modulePath);
    }
    if (stat.isSymbolicLink()) {
      logger.log('Skipping install for symlink:', modulePath);
      return Promise.resolve();
    }
  }

  return cache.doesLocalNeedUpdate(modulePath, version)
    .then(function(needsUpdate) {
      if (!needsUpdate) {
        logger.debug('Local module already at correct version');
        logger.debug('Checking for sub dependencies');
        return exports.runInDirectory(modulePath);
      }
    })
    .then(function() {
      if (cache.has(name)) {
        return cache.update(name, version);
      } else {
        return cache.add(name, url);
      }
    })
    .then(function(entry) {
      return cache.localUpdate(name, modulePath, version);
    })
    .then(function() {
      logger.debug('Checking for sub dependencies');
      return exports.runInDirectory(modulePath);
    })
    .then(function() {
      logger.log('Installation complete for:', name);
    })
    .catch(function(err) {
      if (err) { throw err; }
    });
};

var installAll = function(dir, deps, opts) {
  opts = opts || {};

  return Promise.map(
    Object.keys(deps),
    function(moduleName) {
      var rawURL = deps[moduleName];
      var parsed = parseURL(rawURL);

      var version = parsed.version;
      var url = parsed.url;
      var isURL = !!url || PROTOCOL_PATTERN.test(moduleName);

      logger.silly('isURL:', isURL);

      if (isURL) {
        return installModuleFromURL(dir, moduleName, url, version, opts);
      }
      console.error('Installing by name is not yet supported. Please use URL/');
      throw new Error('installing by name not yet supported');
      // return installModuleFromName(dir, moduleName, version, opts);
    },
    { concurrency: 1}
  );
};

/**
 * @param  {String} dir
 * @param  {Object} [opts]
 * @param  {Boolean} [opts.useLockfile=false]
 * @return {Promise}
 */
exports.runInDirectory = function(dir, opts) {
  opts = opts || {};
  var hasLock = false;

  logger.debug('installing in', dir);
  return getManifest(dir)
    .bind({})
    .then(function(manifest) {
      this.manifest = manifest;
      if (!manifest.dependencies) {
        logger.silly('no dependencies in the manifest');
        return Promise.reject();
      }
    })
    .then(function() {
      if (opts.useLockfile) {
        return lockFile.lock(dir).then(function() {
          hasLock = true;
        });
      }
    }).then(function() {
      return installAll(dir, this.manifest.dependencies, { colorLog: hasLock });
    })
    .catch(function(err) {
      // raise any errors
      if (err) { throw err; }
    })
    .finally(function() {
      if (hasLock) {
        return lockFile.unlock(dir);
      }
    });
};
