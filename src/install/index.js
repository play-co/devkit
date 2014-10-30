var fs = require('fs');
var ff = require('ff');
var color = require('cli-color');
var path = require('path');
var logger = require('../util/logging').get('install');
var gitClient = require('../util/gitClient');
var Module = require('../apps/Module');

var cache = require('./cache');

exports.installDependencies = function (app, opts, cb) {
  // serially install all dependencies in the manifest
  var deps = app.manifest.dependencies;
  var index = 0;
  var names = Object.keys(deps);
  var installNext = bind(this, function (err) {
    if (err || index === names.length) {
      return cb && cb(err);
    }

    var name = names[index++];
    if (name) {
      exports.installModule(
        app, name, merge({url: deps[name]}, opts), installNext
      );
    }
  });

  installNext();
};

exports.installModule = function (app, moduleName, opts, cb) {
  var appPath = app.paths.root;

  if (!opts) { opts = {}; }

  var url = opts.url;
  var version = opts.version;
  if (url) {
    // find version in url
    var i = url.indexOf('#');
    version;
    if (i >= 0) {
      if (!version) {
        version = url.substring(i + 1);
      }
      url = url.substring(0, i);
    }

    if (opts.protocol === 'ssh') {
      var match = url.match(/^https:\/\/(.*?)\/(.*)$/);
      if (match) {
        url = 'git@' + match[1] + ':' + match[2];
      }
    }
  }

  var PROTOCOL = /^[a-z][a-z0-9+\-\.]*:/;
  var isURL = moduleName && PROTOCOL.test(moduleName);
  var cacheEntry;

  logger.log(
    color.cyanBright('Installing'),
    color.yellowBright(
      moduleName + (version ? '@' + version : '')
    ) + color.cyanBright('...')
  );

  var _hasLock = false;
  var f = ff(this, function () {
    app.acquireLock(f());
  }, function () {
    _hasLock = true;
  }, function () {
    if (moduleName && version) {
      var modulePath = path.join(app.paths.modules, moduleName);
      if (fs.existsSync(modulePath)) {
        var next = f();
        Module.describeVersion(modulePath, function (err, currentVersion) {
          if (err) {
            logger.error('Error in Module.describeVersion');
            return next(err);
          }
          var onRequestedVersion = currentVersion.hash === version ||
              currentVersion.tag === version;
          if (onRequestedVersion) { return next(null, true); }
          return next();
        });
      }
    }
  }, function (isUpdated) {
    if (isUpdated) {
      return f.succeed();
    }

    // we can't silence a clone/fetch in case the user has to enter
    // credentials
    var modulePath = path.join(app.paths.modules, moduleName);
    if (isURL || !fs.existsSync(modulePath)) {
      var next = f();
      logger.log(
        color.cyanBright(
          'Adding ' + moduleName + (version ? '@' + version : '')
        )
      );
      cache.add(url || moduleName, version, function (err, res) {
        if (err) {
          logger.error('cache.add for', moduleName + '#' + version);
          return next(err);
        }

        return next(null, res);
      });
    }

  }, function (_cacheEntry) {
    trace('_cacheEntry', _cacheEntry);
    cacheEntry = _cacheEntry;

    moduleName = cacheEntry && cacheEntry.name || moduleName;
    modulePath = path.join(app.paths.modules, moduleName);
    f(modulePath);

    if (!fs.existsSync(modulePath) && cacheEntry) {
      if (opts.link) {
        logger.log(color.cyanBright('Linking ' + app.paths.modules));
        cache.link(cacheEntry, app.paths.modules, f.wait());
      } else {
        logger.log(color.cyanBright('Copying ' + app.paths.modules));
        cache.copy(cacheEntry, app.paths.modules, f.wait());
      }
    }

    // install the version from the app manifest unless we're explicitly asked
    // to upgrade it to the latest version
    if (!version && !opts.latest) {
      var dep = app.getDependency(moduleName);
      if (dep) {
        version = dep.version;
      }
    }
  }, function (modulePath) {
    if (opts.link) {
      try {
        logger.warn(app.paths.root, '-->', fs.readlinkSync(modulePath));
      } catch (e) {
        logger.error('Unexpected error reading link', modulePath);
        logger.error(e);
      }
    }

    // checkout proper version and run install scripts
    // var next = f();
    // Module.setVersion(modulePath, version).catch(function (err) {
    //   console.error('\n\n\n\n\n\n');
    //   console.error(err);
    //   return next(err);
    // }).then(next);
    //
    Module.setVersion(modulePath, version, f());

  }, function (installedVersion) {
    logger.log('installedVersion', installedVersion);
    app.reloadModules();
    app.addDependency(moduleName, {
      url: cacheEntry && cacheEntry.url,
      version: installedVersion
    }, f.wait());

    f(installedVersion);
    // try {
    //   var name = require(path.join(modulePath, 'package.json')).name;
    // } catch (e) {
    //   // no package.json file in this module
    // }

    // // directory name should always match the name provided in package.json
    // if (name && name != moduleName) {
    //   logger.warn('This module has changed names from "' +
    //     moduleName + '" to "' + name + '". Please update your dependency.');
    // }
  }).error(function (err) {
    if (err.code === 'EEXIST' && !_hasLock) {
      return logger.error('app is locked (is a build running?)');
    }

    // console.error(err);
  }).success(function (version) {
    if (version) {
      logger.log(
        color.yellowBright(moduleName + '@' + version),
        color.cyanBright('install completed')
      );
    }
  }).cb(function (err) {
    if (_hasLock) {
      app.releaseLock(f());
    }
  }).cb(cb);
};
