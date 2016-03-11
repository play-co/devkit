'use strict';
let lazy = require('lazy-cache')(require);

lazy('path');
lazy('chalk');
lazy('./index', 'commands');
lazy('../apps');

let BaseCommand = require('devkit-commands/BaseCommand');
let UsageError = require('devkit-commands/UsageError');

class InitCommand extends BaseCommand {
  constructor () {
    super();
    this.name = 'init';
    this.description = 'creates a new devkit app';
    this.opts
      .boolean('no-template')
      .describe('no-template', 'copy no files other than manifest.json')
      .describe('local-template', 'path to local application template')
      .describe('git-template', 'path to git repository')
      .describe('skip-install', "don't autorun devkit install");
  }

  exec (command, args) {
    let DestinationExistsError = lazy.apps.DestinationExistsError;

    let argv = this.argv;

    return Promise.then(() => {
      // check the app name
      let appPath = args.shift();
      let errorMessage;

      if (typeof(appPath) === 'undefined') {
        // TODO: print usage
        errorMessage = 'No app name provided';
        this.logger.error(errorMessage);
        return Promise.reject(new UsageError(errorMessage));
      }

      let appName = lazy.path.basename(appPath);
      if (!appName) {
        // TODO: refactor and print usage
        errorMessage = 'No app name provided';
        this.logger.error(errorMessage);
        return Promise.reject(new UsageError(errorMessage));
      }

      this.appName = appName;

      if (!/^[a-z][a-z0-9]*$/i.test(appName)) {
        errorMessage = 'App name must start with a letter and consist only of ' +
          'letters and numbers';
        this.logger.error(errorMessage);
        return Promise.reject(new UsageError(errorMessage));
      }

      this.appPath = appPath = lazy.path.resolve(process.cwd(), appPath);

      let template = {type: void 0};

      if (argv.template !== void 0) {
        template.type = 'none';
        template.path = '';
      } else if (argv['local-template']) {
        template.type = 'local';
        template.path = argv['local-template'];
      } else if (argv['git-template']) {
        template.type = 'git';
        template.path = argv['git-template'];
      }

      // create the app
      return lazy.apps.create(appPath, template);
    }).then(app => {

      if (!argv['skip-install']) {
        // change to app root and run install command
        process.chdir(app.paths.root);
        return lazy.commands.get('install').exec('install', []);
      }

    }).then(() => {

      // Success message
      this.logger.log(
        chalk.cyan('created new app'), chalk.yellow(this.appName)
      );

      return new Promise(resolve => {
        lazy.commands.get('instructions')
          .exec('instructions', ['new_application'], resolve);
      });

    }).catch(DestinationExistsError, err => {
      this.logger.error(
        'The path you specified (' + err.message + ') already exists.',
        'Aborting.'
      );
    }).catch(err => {
      console.error(err);
    });
  }
}

module.exports = InitCommand;
