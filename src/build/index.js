var ff = require('ff');
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
  }

  var app;
  var f = ff(function () {
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
        next();
      }
    });
  }, function () {
    require('./steps/getConfig').getConfig(app, argv, f());
  }, function (res) {
    config = res;
  }, function () {
    require('./steps/buildHooks').getDependencies(app, config, f());
  }, function (deps) {
    // deps is an array of objects, merge them into one object and get all keys with false values
    deps = merge.apply(this, deps);
    var toRemove = Object.keys(deps).filter(function (name) { return deps[name] === false; });
    app.removeModules(toRemove);
  }, function () {
    require('./steps/moduleConfig').getConfig(app, config, f());
  }, function () {
    require('./steps/buildHooks').onBeforeBuild(app, config, f());
  }, function () {
    require('./steps/logConfig').log(app, config, f());
  }, function () {
    require('./steps/createDirectories').createDirectories(app, config, f());
  }, function () {
    require('./steps/executeTargetBuild').build(app, config, f());
  }, function () {
    require('./steps/buildHooks').onAfterBuild(app, config, f());
  })
    .error(function (err) {
      logger.error("build failed");
      if (err.stack) {
        logger.error(err.stack);
      } else {
        logger.error(err);
      }
    })
    .success(function () {
      logger.log("build succeeded");
    })
    .cb(function () {
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
