var BaseCommand = require('../util/BaseCommand').BaseCommand;

var RegisterCommand = Class(BaseCommand, function (supr) {

  this.name = 'register';
  this.description = "adds the current directory to devkit's list of apps";

  this.init = function () {
    supr(this, 'init', arguments);

    this.opts
      .describe('recursive', 'searches directories recursively for devkit apps (nested apps are not allowed)')
      .alias('recursive', 'r')
      .boolean('recursive');
  }

  this.exec = function (command, args, cb) {
    var fs = require('fs');
    var path = require('path');

    var apps = require('../apps');
    var walk = require('../util/walk').walk;

    var logger = this.logger;
    var argv = this.opts.argv;
    var args = argv._;
    var appPath = args[3] || process.cwd() || argv.recursive;

    apps.get(appPath, function (err, app) {
      if (err) {
        if (!(err instanceof apps.ApplicationNotFoundError)) {
          logger.error(err);
        } else if (argv.recursive) {
          recursiveSearch(appPath);
        }
      } else {
        logger.log('registered', appPath);
      }
      cb && cb(err, app);
    });

    function recursiveSearch(basePath) {
      walk(basePath, {
        onDirectory: function (dir, stat, cb) {
          apps.get(dir, function (err, app) {
            if (err instanceof apps.ApplicationNotFoundError) {
              // app not found, keep recursing
              cb();
            } else {
              // unknown error or app not found
              cb(err || 'app-found');

              if (!err) {
                logger.log('registered', dir);
              }
            }
          });
        }
      });
    }
  }

});

module.exports = RegisterCommand;
