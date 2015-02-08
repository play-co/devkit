var commands = require('./index');
var BaseCommand = require('../util/BaseCommand').BaseCommand;
var commands = require('./index');
var cache = require('../install/cache');


var InfoCommand = Class(BaseCommand, function (supr) {

  this.name = 'info';
  this.description = 'displays information about this devkit installation';

  this.exec = function (command, args, cb) {
    console.log('devkit version', commands.get('version').getVersion());
    console.log('devkit location', commands.get('which').getLocation());
    console.log('cache location', cache.getPath());

    if (cb) { cb(); }
  };

});

module.exports = InfoCommand;
