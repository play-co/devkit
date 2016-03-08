var lazy = require('lazy-cache')(require);

lazy('path');
lazy('chalk');
lazy('./index', 'commands');
lazy('../apps');

var UsageError = require('../util/BaseCommand').UsageError;
var BaseCommand = require('../util/BaseCommand').BaseCommand;

var InitCommand = Class(BaseCommand, function (supr) {

  this.name = 'init';
  this.description = 'creates a new devkit app';

  this.init = function () {
    supr(this, 'init', arguments);
    this.opts
      .boolean('no-template')
      .describe('no-template', 'copy no files other than manifest.json')
      .describe('local-template', 'path to local application template')
      .describe('git-template', 'path to git repository')
      .describe('skip-install', "don't autorun devkit install");
  };

  this.exec = function (command, args, cb) {
    var DestinationExistsError = lazy.apps.DestinationExistsError;

    var argv = this.argv;

    return Promise.bind(this).then(function () {
      // check the app name
      var appPath = args.shift();
      var errorMessage;

      if (typeof(appPath) === 'undefined') {
        // TODO: print usage
        errorMessage = 'No app name provided';
        this.logger.error(errorMessage);
        return Promise.reject(new UsageError(errorMessage));
      }

      var appName = lazy.path.basename(appPath);
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

      var template = {type: void 0};

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
    }).then(function (app) {

      if (!argv['skip-install']) {
        // change to app root and run install command
        process.chdir(app.paths.root);
        return lazy.commands.get('install').exec('install', []);
      }

    }).then(function () {

      // Success message
      this.logger.log(
        chalk.cyan('created new app'), chalk.yellow(this.appName)
      );

      return new Promise(function (resolve) {
        lazy.commands.get('instructions')
          .exec('instructions', ['new_application'], resolve);
      });

    }).catch(DestinationExistsError, function (err) {
      this.logger.error(
        'The path you specified (' + err.message + ') already exists.',
        'Aborting.'
      );
    }).catch(function (err) {
      console.error(err);
    }).nodeify(cb);
  };
});


module.exports = InitCommand;
