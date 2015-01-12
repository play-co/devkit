var ff = require('ff');
var fs = require('fs');
var path = require('path');
var color = require('cli-color');
var printf = require('printf');
var logger = require('../util/logging').get('build');
var apps = require('../apps');

exports.build = function (appPath, argv, cb) {
  var startTime = Date.now();
  logger.log(color.cyanBright("starting build at", new Date()));

  var config;
  var elapsed = 0;
  function onFinish(err, res) {
    cb(err, merge({
      elapsed: elapsed,
      config: config
    }, res));

    if (!argv['get-config']) {
      setBuildInfo('active', false);
      setBuildInfo('timeStopped', Date.now());
    }
  }

  // TODO: Would be nice to use a lib for mirroring this object on dist instead
  // of these custom functions
  var buildInfoPath;
  /** key is optional. if no key, return the whole object */
  var getBuildInfo = function(key) {
    if (!buildInfoPath) {
      logger.error('Cannot GET build info before buildInfoPath is set');
      return null;
    }
    var buildInfo = JSON.parse(fs.readFileSync(buildInfoPath));
    if (key) {
      return buildInfo[key];
    }
    return buildInfo;
  }
  /** if no value is set, key is assumed to be whole object and old object obliterated */
  var setBuildInfo = function(key, value) {
    if (!buildInfoPath) {
      logger.error('Cannot SET build info before buildInfoPath is set');
      return null;
    }
    if (value === undefined) {
      if (typeof key == 'object') {
        fs.writeFileSync(buildInfoPath, JSON.stringify(key));
      } else {
        logger.error('Cannot write non object for buildInfo' + key);
      }
    } else {
      var buildInfo = getBuildInfo();
      buildInfo[key] = value;
      fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo));
    }
  }
  /** Increments currentStep in buildInfo, and then continues f chain */
  var incrementBuildInfoStep = function() {
      setBuildInfo('currentStep', getBuildInfo('currentStep') + 1);
      f(arguments);
  }

  var app;
  var _hasLock = false;
  var f = ff(function () {
    apps.has(appPath, f());
  }, function (appLoaded) {
    var next = f.wait();
    apps.get(appPath, function (err, res) {
      if (err && !argv.help) {
        if (err.code == 'ENOENT') {
          logger.error('the current directory is not a devkit app');
        } else {
          logger.error(err);
        }
        next(err);
      } else {
        app = res;

        // ensure the manifest is up-to-date
        try {
          if (appLoaded) { app.reloadSync(); }
        } catch (e) {
          return next(e);
        }

        next();
      }
    });
  }, function () {
    // app.acquireLock(f());
  }, function () {
    // _hasLock = true;
    require('./steps/getConfig').getConfig(app, argv, f());
  }, function (res) {
    config = res;

    // Skip to success
    if (argv['get-config']) {
      // ONLY print config to stdout
      console.log(config);
      f.succeed();
    } else {
      // Set up the .buildInfo file
      // TODO: if there is an error before this point, we fail silently.  This is bad
      buildInfoPath = config.outputPath + '/.buildInfo';
      // Overwrite old one
      setBuildInfo({
        timeStarted: startTime,
        timeStopped: 0,
        active: true,
        currentStep: 0,
        steps: 8,
        errors: ''
      });
    }
  }, function () {
    require('./steps/buildHooks').getDependencies(app, config, f());
  }, incrementBuildInfoStep, function (deps) {
    // deps is an array of objects, merge them into one object and get all keys with false values
    deps = merge.apply(this, deps);
    var toRemove = Object.keys(deps).filter(function (name) { return deps[name] === false; });
    app.removeModules(toRemove);
  }, incrementBuildInfoStep, function () {
    require('./steps/moduleConfig').getConfig(app, config, f());
  }, incrementBuildInfoStep, function () {
    require('./steps/buildHooks').onBeforeBuild(app, config, f());
  }, incrementBuildInfoStep, function () {
    require('./steps/logConfig').log(app, config, f());
  }, incrementBuildInfoStep, function () {
    require('./steps/createDirectories').createDirectories(app, config, f());
  }, incrementBuildInfoStep, function () {
    require('./steps/executeTargetBuild').build(app, config, f());
  }, incrementBuildInfoStep, function () {
    require('./steps/buildHooks').onAfterBuild(app, config, f());
  }, incrementBuildInfoStep)
    .error(function (err) {
      if (err.code == 'EEXIST' && !_hasLock) {
        return logger.error('another build is already in progress');
      }

      logger.error("build failed");
      var errMsg;
      if (err.stack) {
        errMsg = err.stack;
      } else {
        errMsg = err;
      }
      logger.error(errMsg);

      setBuildInfo('errors', errMsg);
    })
    .success(function () {
      logger.log("build succeeded");
    })
    .cb(function () {
      if (_hasLock) {
        app.releaseLock(function (err) {
          if (err) {
            logger.error(err);
          }
        });
      }

      elapsed = (Date.now() - startTime) / 1000;
      var minutes = Math.floor(elapsed / 60);
      var seconds = (elapsed % 60).toFixed(2);
      logger.log((minutes ? minutes + ' minutes, ' : '') + seconds + ' seconds elapsed');
    })
    .cb(onFinish);
}

exports.showHelp = function (app, /* optional */ target) {
  require('./steps/executeTargetBuild').showHelp(app, target);
}
