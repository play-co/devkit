'use strict';
let lazy = require('lazy-cache')(require);
lazy('../apps');
lazy('../util/logging', 'logging');
lazy('../install/link', 'link');

let BaseCommand = require('devkit-commands/BaseCommand');

class LinkCommand extends BaseCommand {
  constructor () {
    super();

    this.name = 'link';
    this.description = 'link this module to global cache or ' +
      'install the specified module from global cache';

    this.logger = lazy.logging.get('command.link');
  }

  exec (command, args) {
    let cwd = process.cwd();
    if (args[0]) {
      return lazy.link.linkFromGlobal(cwd, args[0]);
    }
    return lazy.link.linkToGlobal(cwd);
  }
}

module.exports = LinkCommand;
