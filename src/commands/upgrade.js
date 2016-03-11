var lazy = require('lazy-cache')(require);

lazy('../apps');
lazy('../install');

var BaseCommand = require('../util/BaseCommand').BaseCommand;

var UpgradeCommand = Class(BaseCommand, function (supr) {

  this.name = 'update';
  this.description = "update the specified module (or the game's devkit module if none is provided) to the latest version";

  this.init = function () {
    supr(this, 'init', arguments);

    this.opts
      .describe('version', 'set a specific version');
  };

  this.exec = function (command, args, cb) {
    var moduleName = args.shift() || 'devkit-core';
    return lazy.apps.get('.', function (err, app) {
      if (err) { throw err; }

      var opts = {};
      var argv = this.argv;
      if (argv.version) {
        opts.version = argv.version;
      } else {
        opts.latest = true;
      }

      // FIXME: i dont think this exists anymore
      return lazy.install.installModule(app, moduleName, opts);
    }.bind(this));
  };

});

module.exports = UpgradeCommand;
