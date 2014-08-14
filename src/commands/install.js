var fs = require('fs');
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

    var directory = path.resolve(process.cwd(), 'modules');

    // no module provided, read and install all modules from manifest.json
    apps.get('.', {create: true, protocol: protocol}, bind(this, function (err, app) {
      if (err) { throw err; }

      // ensure modules directory exists
      if (!fs.existsSync(app.paths.modules)) {
        fs.mkdirSync(app.paths.modules);
      }

      if (!fs.statSync(app.paths.modules).isDirectory()) {
        throw new Error('"your-app/modules" must be a directory');
      }

      var deps = app.manifest.dependencies;
      if (module) {
        // single module provided, install it
        install.installModule(app, module, cb);
      } else {
        if (!deps) {
          return logger.error('No dependencies found in "manifest.json"');
        }

        install.installDependencies(app, cb);
      }
    }));
  }
});

module.exports = InstallCommand;
