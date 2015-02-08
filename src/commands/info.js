var commands = require('./index');
var BaseCommand = require('../util/BaseCommand').BaseCommand;
var color = require('cli-color');
var commands = require('./index');
var cache = require('../install/cache');


var InfoCommand = Class(BaseCommand, function (supr) {

  this.name = 'info';
  this.description = 'displays information about this devkit installation';

  this.exec = function (command, args, cb) {
    console.log(color.yellowBright('Gameclosure DevKit'));
    console.log(color.cyanBright('Devkit Version: ') +
                commands.get('version').getVersion());
    console.log(color.cyanBright('Devkit Location: ') +
                commands.get('which').getLocation());
    console.log(color.cyanBright('Cache Location: ') +
                cache.getPath());


    cb && cb();
  }
});

module.exports = InfoCommand;
