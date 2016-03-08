var lazy = require('lazy-cache')(require);

lazy('./index', 'commands');
lazy('../install/cache');

var BaseCommand = require('../util/BaseCommand').BaseCommand;

var InfoCommand = Class(BaseCommand, function (supr) {

  this.name = 'info';
  this.description = 'displays information about this devkit installation';

  this.exec = function (command, args, cb) {
    console.log('devkit version', lazy.commands.get('version').getVersion());
    console.log('devkit location', lazy.commands.get('which').getLocation());
    console.log('cache location', lazy.installCache.getPath());

    if (cb) { cb(); }
  };

});

module.exports = InfoCommand;
