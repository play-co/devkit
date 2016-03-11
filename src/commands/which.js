'use strict';
let lazy = require('lazy-cache')(require);

lazy('path');

let BaseCommand = require('devkit-commands/BaseCommand');

class VersionCommand extends BaseCommand {
  constructor () {
    super();
    this.name = 'which';
    this.description = 'prints the full path to DevKit';
  }

  exec () {
    console.log(this.getLocation());
    return Promise.resolve();
  }

  getLocation () {
    return lazy.path.join(__dirname, '..', '..');
  }
}

module.exports = VersionCommand;
