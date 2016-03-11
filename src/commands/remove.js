var lazy = require('lazy-cache')(require);

lazy('../apps');
lazy('../install/cache');

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

  this.exec = function (command, args) {
    var argv = this.argv;
    var module = args.shift();

    return lazy.apps.get('.')
      .then(function (app) {
        return app.removeDependency(module);
      })
      .then(function () {
        if (argv.cache) {
          this.logger.log('removing from cache...');
          return lazy.installCache.remove(module);
        }
      });
  };
});

module.exports = RemoveCommand;
