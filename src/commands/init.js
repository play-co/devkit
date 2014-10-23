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

  this.init = function () {
    supr(this, 'init', arguments);
    this.opts
      .boolean('no-template')
      .describe('no-template', 'copy no files other than manifest.json')
      .describe('local-template', 'path to local application template')
      .describe('git-template', 'path to git repository')
  }

  this.exec = function (args, cb) {

    // check the app name
    var appPath = args.shift();

    if (!appPath) {
      // TODO: print usage
      var errorMessage = 'No app name provided';
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    var appName = path.basename(appPath);
    if (!appName) {
      // TODO: refactor and print usage
      var errorMessage = 'No app name provided';
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    if (!/^[a-z][a-z0-9]*$/i.test(appName)) {
      var errorMessage = 'App name must start with a letter and consist only of letters and numbers';
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    appPath = path.resolve(process.cwd(), appPath);

    var f = ff(this, function () {
      var template = {type: void 0};

      if (this.opts.argv.template !== void 0) {
        template.type = 'none';
        template.path = '';
      } else if (this.opts.argv['local-template']) {
        template.type = 'local';
        template.path = this.opts.argv['local-template'];
      } else if (this.opts.argv['git-template']) {
        template.type = 'git';
        template.path = this.opts.argv['git-template'];
      }

      // create the app
      apps.create(appPath, template, f());
    }, function (app) {
      // change to app root and run install command
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
