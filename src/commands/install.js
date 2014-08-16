var fs = require('fs');
var ff = require('ff');

var path = require('path');

var apps = require('../apps');

var install = require('../install');

var BaseCommand = require('../util/BaseCommand').BaseCommand;

var InstallCommand = Class(BaseCommand, function (supr) {

  this.name = 'install';
  this.description = 'installs (or updates) devkit dependencies for an app or a specific dependency if one is provided';

  this.init = function () {
    supr(this, 'init', arguments);

    this.opts
      .describe('ssh', 'switches git protocol to ssh, default: false (https)');
  }

  this.exec = function (commands, args, cb) {

    var argv = this.opts.argv;
    var protocol = argv.ssh ? 'ssh' : 'https';
    var module = args.shift();

    var f = ff(function () {
      apps.get('.', {create: true, protocol: protocol}, f());
    }, function (app) {
      // forward along the app
      f(app);

      // ensure modules directory exists
      if (!fs.existsSync(app.paths.modules)) {
        fs.mkdirSync(app.paths.modules);
      }

      if (!fs.statSync(app.paths.modules).isDirectory()) {
        throw new Error('"your-app/modules" must be a directory');
      }

      if (module) {
        // single module provided, install it
        install.installModule(app, module, {protocol: protocol}, f());
      } else {
        // no module provided, install all dependencies after we ensure we
        // have dependencies
        var deps = app.manifest.dependencies;
        if (!deps) {
          // ensure devkit is a dependency
          logger.log('Adding default dependencies to "manifest.json"...');
          app.validate(f());
        }
      }
    }, function (app) {
      if (module) {
        // installed a single module, we're done
        return f.succeed();
      } else {
        // need to install all modules
        install.installDependencies(app, cb);
      }
    });
  }
});

module.exports = InstallCommand;
