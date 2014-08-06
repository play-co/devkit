var fs = require('fs');
var ff = require('ff');

var path = require('path');
var gitClient = require('../util/gitClient');
var stringify = require('../util/stringify');
var spawn = require('child_process').spawn;

var BaseCommand = require('../util/BaseCommand').BaseCommand;

var DEFAULT_PROTOCOL = "https";
var DEFAULT_DEPS = [
  {
    name: "devkit",
    ssh: "git@github.com:",
    https: "https://github.com/",
    repo: "gameclosure/gcapi-priv",
    tag: "2.0.0-beta.5"
  }
];

var InstallCommand = Class(BaseCommand, function (supr) {

  this.name = 'install';
  this.description = 'installs (or updates) devkit dependencies for an app or a specific dependency if one is provided';

  this.init = function () {
    supr(this, 'init', arguments);

    this.opts
      .describe('ssh', 'switches git protocol to ssh, default: false (https)');

  }

  this.exec = function (commands, args) {

    var argv = this.opts.argv;
    var protocol = argv.ssh ? 'ssh' : 'https';
    var module = args.shift();

    // ensure modules directory exists
    if (!fs.existsSync('modules')) {
      fs.mkdirSync('modules');
    }

    if (!fs.statSync('modules').isDirectory()) {
      throw new Error('"modules" must be a directory');
    }

    var directory = path.resolve(process.cwd(), 'modules');

    if (module) {
      // single module provided, install it
      this.install(directory, module);
    } else {
      // no module provided, read and install all modules from package.json
      if (!fs.existsSync('package.json')) {
        // create package.json with default dep for new games
        fs.writeFileSync('package.json', stringify({"devkitDependencies": toJSON(protocol, DEFAULT_DEPS)}));
      }

      try {
        var deps = JSON.parse(fs.readFileSync('package.json')).devkitDependencies;
      } catch (e) {
        throw new Error('Unable to read "package.json"');
      }

      // serially install all dependencies
      var index = 0;
      var names = Object.keys(deps);
      var next = bind(this, function () {
        var name = names[index++];
        if (name) {
          this.install(directory, name, deps[name], null, next);
        }
      });
      next();
    }
  }

  function toJSON(protocol, deps) {
    var out = {};
    deps.forEach(function (dep) {
      out[dep.name] = dep[protocol] + dep.repo + (dep.tag ? '#' + dep.tag : '');
    });
    return out;
  }

  this.install = function (directory, moduleName, url, tag, cb) {
    var modulePath = path.join(directory, moduleName);
    var git = gitClient.get(path.join(directory, moduleName));
    if (url) {

      // find tag in url
      var i = url.indexOf('#');
      if (!tag && i >= 0) {
        var tag = url.substring(i + 1);
        url = url.substring(0, i);
      }

      this.logger.log('"' + moduleName + '" installing into', modulePath);
      var f = ff(this, function () {
        if (!fs.existsSync(modulePath)) {
          var modulesGit = gitClient.get(directory, {customFds: [0, 1, 2]});
          modulesGit('clone', url, moduleName, f());
        } else {
          git('fetch', f());
        }
      }, function () {
        if (tag) {
          git('checkout', tag, f());
        }
      }, function () {
        var npm = spawn('npm', ['install'], {customFds: [0, 1, 2], cwd: modulePath});
        npm.on('close', f());
      }, function () {
        try {
          var name = require(path.join(directory, moduleName, 'package.json')).name;
        } catch (e) {
          // no package.json file in this module
        }

        // directory name should always match the name provided in package.json
        if (name && name != moduleName) {
          this.logger.warn('This module has changed names from "' +
            moduleName + '" to "' + name + '". Please update your dependency.');
        }
      }).error(function (err) {
        logger.error(err);
      }).cb(cb);
    }
  }
});

module.exports = InstallCommand;
