var fs = require('fs');
var ff = require('ff');

var path = require('path');
var apps = require('../apps');

var BaseCommand = require('../util/BaseCommand').BaseCommand;

var InitCommand = Class(BaseCommand, function (supr) {

  this.name = 'init';
  this.description = 'creates a new devkit app';

  this.exec = function (commands, args) {

    // check the app name
    var app = args.shift();
    if (!app) {
      throw new Error('No app name provided');
    }

    if (!/[a-z][a-z0-9]+/i.test(app)) {
      throw new Error('App name must start with a letter and consist only of letters and numbers');
    }

    // create the directory
    if (!fs.existsSync(app)) {
      fs.mkdirSync(app);
    }

    // add a manifest
    var manifestFile = path.join(app, 'manifest.json');
    if (!fs.existsSync(manifestFile)) {
      fs.writeFileSync(manifestFile, "{}");
    }

    apps.get(app, function (err, app) {
      if (err) {
        throw new Error(err);
      }

      app.validate({shortname: app});

      process.chdir(app.paths.root);
      commands.install.exec(commands, []);
    });
  }
});

module.exports = InitCommand;
