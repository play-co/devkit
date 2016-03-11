'use strict';
let lazy = require('lazy-cache')(require);
lazy('chalk');
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

    this.opts.option('list', {
      alias: 'ls',
      describe: 'list all modules in global cache'
    }).option('json', {
      describe: 'display list as json'
    });
  }

  exec (command, args) {
    let cwd = process.cwd();

    if (this.argv.list) {
      return lazy.link.getAllLinks().then(links => {
        if (this.argv.json) {
          console.log(JSON.stringify(links));
          return;
        }

        for (let i = 0; i < links.length; i++) {
          let link = links[i];
          console.log(
            link.path + '\n',
            '\t' + lazy.chalk.yellow('name: ') + link.name + '\n',
            '\t' + lazy.chalk.yellow('version: ') + link.version
          );
        }
      });
    }

    if (args[0]) {
      return lazy.link.linkFromGlobal(cwd, args[0]);
    }
    return lazy.link.linkToGlobal(cwd);
  }
}

module.exports = LinkCommand;
