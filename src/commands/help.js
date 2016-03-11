var lazy = require('lazy-cache')(require);

lazy('./index', 'commands');
var BaseCommand = require('../util/BaseCommand').BaseCommand;

var HelpCommand = Class(BaseCommand, function (supr) {

  this.name = 'help';
  this.description = 'prints this help message';

  this.exec = function (command, args) {
    var cmd = args.shift();

    trace('running help:', cmd, args);

    if (lazy.commands.has(cmd)) {
      lazy.commands.get(cmd).showHelp(args);
    } else {
      lazy.commands._yargsObj.showHelp();
    }
    return Promise.resolve();
  };
});

module.exports = HelpCommand;
