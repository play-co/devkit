'use strict';
let lazy = require('lazy-cache')(require);

lazy('./index', 'commands');
lazy('../install/cache');

let BaseCommand = require('devkit-commands/BaseCommand');

class InfoCommand extends BaseCommand {
  constructor() {
    super();
    this.name = 'info';
    this.description = 'displays information about this devkit installation';
  }

  exec (command, args) {
    console.log('devkit version', lazy.commands.get('version').getVersion());
    console.log('devkit location', lazy.commands.get('which').getLocation());
    console.log('cache location', lazy.installCache.getPath());
    return Promise.resolve();
  }
}

module.exports = InfoCommand;
