var BaseCommand = require('../util/BaseCommand').BaseCommand;

var RemoveCommand = Class(BaseCommand, function (supr) {

  this.name = 'remove';
  this.alias = 'rm';
  this.description = 'removes a dependency from your app';

  this.init = function () {
    supr(this, 'init', arguments);

    this.opts
      .describe('--cache', 'removes the module from the DevKit module cache');
  };

  this.exec = function (command, args, cb) {
    var apps = require('../apps');
    var cache = require('../install/cache');
    var argv = this.opts.argv;
    var module = args.shift();

    apps.get('.')
      .then(function (app) {
        return app.removeDependency(module);
      })
      .then(function () {
        if (argv.cache) {
          this.logger.log('removing from cache...');
          return cache.remove(module);
        }
      })
      .nodeify(cb);
  };
});

module.exports = RemoveCommand;
