var BaseCommand = require('../util/BaseCommand').BaseCommand;
var apps = require('../apps');
var install = require('../install');

var UpdateCommand = Class(BaseCommand, function (supr) {

  this.name = 'update';
  this.description = "update the specified module (or the game's devkit module if none is provided) to the latest version";

  this.exec = function (args, cb) {
    var moduleName = args.shift() || 'devkit';

    // no module provided, read and install all modules from manifest.json
    apps.get('.', bind(this, function (err, app) {
      if (err) { throw err; }

      install.installModule(app, moduleName, {latest: true}, cb);
    }));
  }

});

module.exports = UpdateCommand;
