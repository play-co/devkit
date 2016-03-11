'use strict';
var lazy = require('lazy-cache')(require);

lazy('../apps');
lazy('../install/cache');

var BaseCommand = require('devkit-commands/BaseCommand');

class RemoveCommand extends BaseCommand {
  constructor () {
    super();

    this.name = 'remove';
    this.alias = 'rm';
    this.description = 'removes a dependency from your app';

    this.opts.describe('--cache', 'removes the module from the DevKit module cache');
  }

  exec (command, args) {
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
  }
}

module.exports = RemoveCommand;
