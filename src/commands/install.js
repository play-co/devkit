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

  this.exec = function (args, cb) {

    var argv = this.opts.argv;
    var protocol = argv.ssh ? 'ssh' : 'https';
    var module = args.shift();

    var f = ff(function () {
      apps.get('.', f());
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
        if (!deps || !deps['devkit-core']) {
          // ensure devkit is a dependency
          logger.log('Adding default dependencies to "manifest.json"...');
          app.validate({protocol: protocol}, f());
        }
      }
    }, function (app) {
      // if we installed a single module, we're done
      if (!module) {
        // otherwise, need to install all dependencies
        install.installDependencies(app, {protocol: protocol}, f());
      }
    }).cb(cb);
  }
});

module.exports = InstallCommand;
