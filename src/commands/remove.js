var fs = require('fs');
var ff = require('ff');

var path = require('path');
var rimraf = require('rimraf');
var cache = require('../install/cache');

var apps = require('../apps');

var BaseCommand = require('../util/BaseCommand').BaseCommand;

var RemoveCommand = Class(BaseCommand, function (supr) {

  this.name = 'remove';
  this.alias = 'rm';
  this.description = 'removes a dependency from your app';

  this.init = function () {
    supr(this, 'init', arguments);

    this.opts
      .describe('--cache', 'removes the module from the DevKit module cache');
  }

  this.exec = function (command, args, cb) {

    var argv = this.opts.argv;
    var protocol = argv.ssh ? 'ssh' : 'https';
    var module = args.shift();

    var f = ff(this, function () {
      apps.get('.', f());
    }, function (app) {
      app.removeDependency(module, f.wait());
      if (argv.cache) {
        this.logger.log('removing from cache...');
        cache.remove(module, f.wait());
      }
    }).cb(cb);
  }
});

module.exports = RemoveCommand;
