'use strict';
let lazy = require('lazy-cache')(require);

lazy('../apps');
lazy('../util/walk');

let BaseCommand = require('devkit-commands/BaseCommand');

class RegisterCommand extends BaseCommand {
  constructor () {
    super();

    this.name = 'register';
    this.description = "adds the current directory to devkit's list of apps";

    this.opts
      .describe('recursive', 'searches directories recursively for devkit apps (nested apps are not allowed)')
      .alias('recursive', 'r')
      .boolean('recursive');
  }

  exec (command, args) {
    let logger = this.logger;
    let argv = this.argv;
    let _args = argv._;
    let appPath = _args[2] || process.cwd() || argv.recursive;

    let recursiveSearch = basePath => {
      let walk = lazy.utilWalk.walk;
      return new Promise((resolve, reject) => {
        // FIXME: walk doesnt handle early exit
        walk(basePath, {
          onDirectory: (dir, stat, cb) => {
            lazy.apps.get(dir, (err, app) => {
              if (err instanceof lazy.apps.ApplicationNotFoundError) {
                // app not found, keep recursing
                resolve();
              } else {
                // unknown error or app not found
                if (!err) {
                  logger.log('registered', dir);
                }
                reject(err || 'app-found');
              }
            });
          }
        });
      });
    };

    return lazy.apps.get(appPath, (err, app) => {
      if (err) {
        if (!(err instanceof lazy.apps.ApplicationNotFoundError)) {
          logger.error(err);
        } else if (argv.recursive) {
          return recursiveSearch(appPath);
        }
        throw err;
      } else {
        logger.log('registered', appPath);
      }
    });
  }
}

module.exports = RegisterCommand;
