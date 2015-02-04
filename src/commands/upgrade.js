var BaseCommand = require('../util/BaseCommand').BaseCommand;

var UpgradeCommand = Class(BaseCommand, function (supr) {

  this.name = 'update';
  this.description = "update the specified module (or the game's devkit module if none is provided) to the latest version";

  this.init = function () {
    supr(this, 'init', arguments);

    this.opts
      .describe('version', 'set a specific version');
  }

  this.exec = function (command, args, cb) {

    var apps = require('../apps');
    var Module = require('../apps/Module');
    var install = require('../install');

    var moduleName = args.shift() || 'devkit-core';
    apps.get('.', bind(this, function (err, app) {
      if (err) { throw err; }

      var opts = {};
      var argv = this.opts.argv;
      if (argv.version) {
        opts.version = argv.version;
      } else {
        opts.latest = true;
      }

      install.installModule(app, moduleName, opts, cb);
    }));
  }

});

module.exports = UpgradeCommand;
