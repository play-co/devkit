var fs = require('fs');
var ff = require('ff');

var path = require('path');
var apps = require('../apps');
var install = require('../install');
var lockfile = require('../util/lockfile');
var logger = require('../util/logging').get('devkit');

var url = require('url');

var gitClient = require('../util/gitClient');

var UnknownGitRevision = gitClient.UnknownGitRevision;
var FatalGitError = gitClient.FatalGitError;
var UnknownGitOption = gitClient.UnknownGitOption;
var ApplicationNotFoundError = apps.ApplicationNotFoundError;
var InvalidManifestError = apps.InvalidManifestError;
var FileLockerError = lockfile.FileLockerError;

var BaseCommand = require('../util/BaseCommand').BaseCommand;

function printErrorAndExit (msg, err, code) {
  logger.error.apply(logger, msg);
  process.env.DEVKIT_TRACE && console.error(err.stack);
  process.exit(code || 1);
}

var InstallCommand = Class(BaseCommand, function (supr) {

  this.name = 'install';
  this.description = 'installs (or updates) devkit dependencies ' +
    'for an app or a specific dependency if one is provided';

  this.init = function () {
    supr(this, 'init', arguments);

    this.opts
      .describe('ssh', 'switches git protocol to ssh, default: false (https)')
      .describe('link', 'uses symlinks to the module cache (development only)')
      .describe(
        'skip-fetch',
        'if version is not specified, server query for the latest version'
      );
  };

  this.exec = function (command, args, cb) {

    var argv = this.opts.argv;
    var protocol = argv.ssh ? 'ssh' : 'https';
    var skipFetch = argv['skip-fetch'];
    var module = args.shift();

    return apps.get('.').then(function (app) {
      // ensure modules directory exists
      if (!fs.existsSync(app.paths.modules)) {
        fs.mkdirSync(app.paths.modules);
      }

      if (!fs.statSync(app.paths.modules).isDirectory()) {
        return Promise.reject(
          new Error('`your-app/modules` must be a directory')
        );
      }

      if (module) {
        // single module provided, install it
        var opts = {
          protocol: protocol
        };

        var moduleUrl = url.parse(module);
        if (moduleUrl.protocol && moduleUrl.host && moduleUrl.href) {
          opts.url = moduleUrl.href;
          opts.protocol = moduleUrl.protocol.replace(':', '');
        }

        return install.installModule(app, module, opts).return(app);
      }

      // no module provided, install all dependencies after we ensure we
      // have dependencies
      var deps = app.manifest.dependencies;
      if (!deps || !deps['devkit-core']) {
        // ensure devkit is a dependency
        logger.log('Adding default dependencies to "manifest.json"...');
        return app.validate({protocol: protocol}).return(app);
      }

      return app;
    }).then(function installDependenciesIfNeeded (app) {
      // if we installed a single module, we're done
      if (!module) {
        // otherwise, need to install all dependencies
        return install.installDependencies(app, {
          protocol: protocol, link: argv.link
        });
      }
    }).catch(UnknownGitRevision, function (err) {
      return printErrorAndExit([
        'The module version you asked for doesn\'t seem to be a',
        'valid ref. The error message from git is:', err.message
      ], err);
    }).catch(FatalGitError, function (err) {
      return printErrorAndExit([
        'Git exitted unexpectedly while installing a module. The',
        'message from git was', err.message
      ], err);
    }).catch(UnknownGitOption, function (err) {
      return printErrorAndExit([
        'devkit ran an invalid git command. This can sometimes happen when a',
        'module URL specifier is malformatted.'
      ], err);
    }).catch(ApplicationNotFoundError, function (err) {
      return printErrorAndExit([
        'Could not find a valid devkit application. Are you in a devkit',
        'application directory?'
      ], err);
    }).catch(InvalidManifestError, function (err) {
      return printErrorAndExit([
        'Could not parse manifest.json. Are you in a devkit',
        'application directory? Is your manifest a valid json file?'
      ], err);
    }).catch(FileLockerError, function (err) {
      return printErrorAndExit([
        'Could not get a lock on this app. Is there a build or other devkit',
        'process running?'
      ], err);
    }).catch(function installErrorHandler (err) {
      console.error('Unexpected error');
      console.error(err && err.stack || err);
    }).nodeify(cb);
  };
});

module.exports = InstallCommand;
