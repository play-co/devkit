
var BaseCommand = require('../util/BaseCommand').BaseCommand;

var HelpCommand = Class(BaseCommand, function (supr) {

  this.name = 'help';
  this.description = 'prints this help message';

  this.exec = function (commands, args) {
    var cmd = args.shift();
    if (cmd in commands) {
      commands[cmd].showHelp(commands, args);
    } else {
      require('optimist').showHelp();
    }
  }
});

module.exports = HelpCommand;
