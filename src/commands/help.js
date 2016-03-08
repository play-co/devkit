var commands = require('./index');
var BaseCommand = require('../util/BaseCommand').BaseCommand;

var HelpCommand = Class(BaseCommand, function (supr) {

  this.name = 'help';
  this.description = 'prints this help message';

  this.exec = function (command, args, cb) {
    var cmd = args.shift();

    trace('running help:', cmd, args);

    if (commands.has(cmd)) {
      commands.get(cmd).showHelp(args);
    } else {
      commands._yargsObj.showHelp();
    }

    cb && cb();
  };
});

module.exports = HelpCommand;
