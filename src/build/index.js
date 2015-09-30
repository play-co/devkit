var ff = require('ff');
var chalk = require('chalk');
var logging = require('../util/logging');
var logger = logging.get('build');
var apps = require('../apps');

exports.build = function (appPath, argv, cb) {
  var startTime = Date.now();
  logger.log(chalk.cyan("starting build at", new Date()));

  logging.install();

  var config;
  var elapsed = 0;
  function onFinish(err, res) {
    cb(err, merge({
      elapsed: elapsed,
      config: config
    }, res));
  }

  var onlyGetConfig = argv['get-config'];

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
    config = require('./steps/getConfig').getConfig(app, argv);
    require('./steps/createDirectories').createDirectories(app, config, f());
  }, function () {
    require('./steps/buildHooks').getDependencies(app, config, f());
  }, function (res) {
    var modules = res.reduce(function (modules, res) {
      var toRemove = Object.keys(res.data)
        .filter(function (name) {
          return res.data[name] === false;
        });

      if (toRemove.length) {
        logger.log('module', res.module.name, 'getDependencies:');
        toRemove.forEach(function (module) {
          logger.log('  removing module', module);
        });
      }
      return modules.concat(toRemove);
    }, []);

    app.removeModules(modules);
  }, function () {
    require('./steps/addDebugCode')(app, config, f());
  }, function () {
    require('./steps/moduleConfig').getConfig(app, config, f());
  }, function () {
    require('./steps/buildHooks').getResourceDirectories(app, config, f());
  }, function (directories) {
    config.directories = directories;
  }, function () {
    require('./steps/buildHooks').onBeforeBuild(app, config, f());
  }, function () {
    // Skip to success
    if (onlyGetConfig) {
      // ONLY print config to stdout
      process.stdout.write(JSON.stringify(merge({title: app.manifest.title}, config)));
      process.exit(0);
    } else {
      require('./steps/logConfig').log(app, config, f());
    }
  }, function () {
    require('./steps/executeTargetBuild').build(app, config, f());
  }, function (buildRes) {
    f(buildRes);
    require('./steps/buildHooks').onAfterBuild(app, config, f.wait());
  })
    .error(function (err) {
      if (err.code == 'EEXIST' && !_hasLock) {
        return logger.error('another build is already in progress');
      }

      logger.error(err);
      logger.log('build failed');
      process.exit(1);
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
};

exports.showHelp = function (app, /* optional */ target) {
  require('./steps/executeTargetBuild').showHelp(app, target);
};
