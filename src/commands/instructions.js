'use strict';
let lazy = require('lazy-cache')(require);

lazy('chalk');

let BaseCommand = require('devkit-commands/BaseCommand');

class InstructionsCommand extends BaseCommand {
  constructor () {
    super();
    this.name = 'instructions';
    this.description = 'prints some basic getting started instructions';
  }

  exec (command, args) {
    let target = args.shift();

    // TODO: make context based coloring and remove all of this cruft
    console.log('-----------------------------------------------');
    console.log('Use ' + lazy.chalk.yellow('devkit help') +
                 ' to see the full command list.\n');

    if (target === 'devkit_install') {
      console.log(
        lazy.chalk.magenta('Devkit2 is now installed!') +
        '\n'
      );
      console.log(' * Create your first application with ' +
                 lazy.chalk.yellow('devkit init <game_name>') +
                 '\n');
    } else if (target === 'new_application') {
      console.log(
        lazy.chalk.magenta('Your application is now ready!') + ' ' +
        lazy.chalk.cyan('Some quick tips:\n')
      );
      console.log(' * Your application entry point is now src/Application.js' +
                 '\n');
      console.log(' * Start the Devkit simulator with ' +
                 lazy.chalk.yellow('devkit serve') +
                 ' then open localhost:9200 in your browser.' +
                 '\n');
      console.log(' * Create a debug build for mobile with ' +
                lazy.chalk.yellow(
                  'devkit debug <build-target> [native-android, native-ios]'
                ) +
                '\n'
              );
      console.log(' * Create a release build for mobile with ' +
                lazy.chalk.yellow(
                  'devkit release <build-target> [native-android, native-ios]'
                ) +
                '\n'
              );
      console.log(' * Create a build for the browser with ' +
                lazy.chalk.yellow(
                  'devkit <build-type> [debug, release] ' +
                  '<build-target> [browser-desktop, browser-mobile]'
                ) +
                '\n'
              );
    }
    console.log(lazy.chalk.cyan(
      'Please report any issues at https://github.com/gameclosure/devkit2.'
    ));
    console.log(lazy.chalk.green(
      'The documentation is available online at http://docs.gameclosure.com'
    ));
    console.log(lazy.chalk.cyan(
      'Get additional help in IRC - #gameclosure on irc.freenode.net'
    ));
    console.log('-----------------------------------------------');
    return Promise.resolve();
  }
}

module.exports = InstructionsCommand;
