var fs = require('fs');
var ff = require('ff');
var path = require('path');

var color = require('cli-color');

var commands = require('./index');
var apps = require('../apps');

var BaseCommand = require('../util/BaseCommand').BaseCommand;

var InitCommand = Class(BaseCommand, function (supr) {

  this.name = 'init';
  this.description = 'creates a new devkit app';

  this.exec = function (args, cb) {

    // check the app name
    var appName = args.shift();
    if (!appName) {
      throw new Error('No app name provided');
    }

    if (!/[a-z][a-z0-9]+/i.test(appName)) {
      throw new Error('App name must start with a letter and consist only of letters and numbers');
    }

    // create the directory
    if (!fs.existsSync(appName)) {
      fs.mkdirSync(appName);
    }

    var f = ff(this, function () {
      apps.create(appName, f());
    }, function (app) {
      process.chdir(app.paths.root);
      commands.get('install').exec([], f());
    }).error(bind(this, function (err) {
      this.logger.error(err);
    })).success(bind(this, function () {
      this.logger.log(color.cyanBright('created new app'), color.yellowBright(appName));
    })).cb(cb);
  };
});


module.exports = InitCommand;
