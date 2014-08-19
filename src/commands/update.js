var BaseCommand = require('../util/BaseCommand').BaseCommand;
var apps = require('../apps');
var color = require('cli-color');
var Module = require('../apps/Module');
var install = require('../install');
var path = require('path');

var UpdateCommand = Class(BaseCommand, function (supr) {

  this.name = 'update';
  this.description = "update the specified module (or the game's devkit module if none is provided) to the latest version";

  this.init = function () {
    supr(this, 'init', arguments);

    this.opts
      .describe('version', 'set a specific version')
      .describe('show-versions', 'prints all available versions (does not update anything)').boolean('show-versions', false);
  }

  this.exec = function (args, cb) {
    var moduleName = args.shift() || 'devkit';

    // no module provided, read and install all modules from manifest.json
    apps.get('.', bind(this, function (err, app) {
      if (err) { throw err; }

      var opts = {};
      var argv = this.opts.argv;
      if (argv.version) {
        opts.version = argv.version;
      } else {
        opts.latest = true;
      }

      if (argv['show-versions']) {
        Module.getVersions(path.join(app.paths.modules, moduleName), function (err, res) {
          if (err) {
            cb && cb(err);
          } else {
            console.log(res.versions.map(function (version) {
              return version == res.current ? color.yellowBright(version) : version;
            }).join('\t'));
          }
        });
      } else {
        install.installModule(app, moduleName, opts, cb);
      }
    }));
  }

});

module.exports = UpdateCommand;
