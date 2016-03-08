var lazy = require('lazy-cache')(require);

lazy('bluebird', 'Promise');
lazy('fs');
lazy('url');

lazy('../apps');
lazy('../util/logging');
lazy('../util/lockfile');
lazy('../install');
lazy('../install/cacheErrors', 'cacheErrors');

var BaseCommand = require('../util/BaseCommand').BaseCommand;

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
      )
      .describe(
        'app-path',
        'The app to run install for'
      )
        .default('app-path', '.')
      .describe('unsafe', 'attempts to switch versions even if there is a potential conflict')
      .describe(
        'skip-defaults',
        'if default dependencies are missing from the manifest, do NOT insert them'
      );
  };

  this.exec = function (command, args, cb) {
    var argv = this.argv;
    var module = args.shift();

    var logger = lazy.utilLogging.get('command.install');
    logger.debug('Devkit install running', command, args, argv);

    function printErrorAndExit (msg, err, code) {
      console.log();
      logger.error.apply(logger, msg);
      if (err) {
        logger.debug(err.stack);
      }
      process.exit(code || 1);
    }

    var opts = {
      link: argv.link,
      protocol: argv.ssh ? 'ssh' : 'https',
      unsafe: argv.unsafe,
      skipFetch: argv['skip-fetch']
    };

    return lazy.apps.get(argv.appPath).then(function (app) {
      logger.debug('ensure modules directory exists');
      if (!lazy.fs.existsSync(app.paths.modules)) {
        lazy.fs.mkdirSync(app.paths.modules);
      } else {
        logger.debug('ensure modules directory is directory');
        if (!lazy.fs.statSync(app.paths.modules).isDirectory()) {
          return lazy.Promise.reject(
            new Error('`your-app/modules` must be a directory')
          );
        }
      }

      if (module) {
        logger.debug('single module provided, installing: ', module);
        var moduleUrl = lazy.url.parse(module);
        if (moduleUrl.protocol && moduleUrl.host && moduleUrl.href) {
          opts.url = moduleUrl.href;
          opts.protocol = moduleUrl.protocol.replace(':', '');
        } else {
          var pieces = module.split(/[@#]/);
          if (pieces.length === 2) {
            module = pieces[0];
            opts.version = pieces[1];
          }
        }

        return lazy.install.installModule(app, module, opts).return(app);
      }

      // no module provided, install all dependencies after we ensure we
      // have dependencies
      var deps = app.manifest.dependencies;
      if ((!deps || !deps['devkit-core']) && !argv['skip-defaults']) {
        // ensure devkit is a dependency
        logger.log('Adding default dependencies to "manifest.json"...');
        return app
          .validate({protocol: opts.protocol})
          .return(app);
      }

      return app;
    }).then(function installDependenciesIfNeeded (app) {
      // if we installed a single module, we're done
      if (module) {
        return;
      }
      // otherwise, need to install all dependencies
      return lazy.install.runInDirectory(app.paths.root, { useLockfile: true });
    })
    // TODO: handle git errors
    .catch(lazy.apps.ApplicationNotFoundError, function (err) {
      return printErrorAndExit([
        'Could not find a valid devkit application. Are you in a devkit',
        'application directory?'
      ], err);
    }).catch(lazy.apps.InvalidManifestError, function (err) {
      return printErrorAndExit([
        'Could not parse manifest.json. Are you in a devkit',
        'application directory? Is your manifest a valid json file?'
      ], err);
    }).catch(lazy.utilLockfile.FileLockerError, function (err) {
      return printErrorAndExit([
        'Could not get a lock on this app. Is there a build or other devkit',
        'process running?'
      ], err);
    })
    // Cache errors
    .catch(
      lazy.cacheErrors.DirectoryCollision,
      lazy.cacheErrors.DirtyRepo,
      lazy.cacheErrors.UnknownLocalCommit,
    function (err) {
      return printErrorAndExit([
        'Cache error:', err.message
      ], err);
    })
    // unknown error
    .catch(function installErrorHandler (err) {
      console.error('Unexpected error');
      console.error(err && err.stack || err);
    }).nodeify(cb);
  };
});

module.exports = InstallCommand;
