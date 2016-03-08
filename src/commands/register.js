var lazy = require('lazy-cache')(require);

lazy('../apps');
lazy('../util/walk');

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
  };

  this.exec = function (command, args, cb) {
    var logger = this.logger;
    var argv = this.argv;
    var args = argv._;
    var appPath = args[2] || process.cwd() || argv.recursive;

    lazy.apps.get(appPath, function (err, app) {
      if (err) {
        if (!(err instanceof lazy.apps.ApplicationNotFoundError)) {
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
      var walk = lazy.utilWalk.walk;
      walk(basePath, {
        onDirectory: function (dir, stat, cb) {
          lazy.apps.get(dir, function (err, app) {
            if (err instanceof lazy.apps.ApplicationNotFoundError) {
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
  };
});

module.exports = RegisterCommand;
