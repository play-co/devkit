var BaseCommand = require('../util/BaseCommand').BaseCommand;

var ModulesCommand = Class(BaseCommand, function (supr) {

  this.name = 'modules';
  this.description = "prints information about the current app's modules";

  this.init = function () {
    supr(this, 'init', arguments);

    this.opts
      .alias('j', 'json').describe('json', 'print output in json')
      .alias('p', 'project').describe('project', 'location of project (defaults to current directory)')
      .describe('save-current', "save the current versions in the game's manifest")
      .describe('list-versions', 'prints all available versions (does not update anything)')
  }

  this.exec = function (command, args, cb) {
    var path = require('path');
    var ff = require('ff');
    var chalk = require('chalk');

    var apps = require('../apps');
    var Module = require('../apps/Module');
    var install = require('../install');

    var stringify = require('../util/stringify');

    var argv = this.opts.argv;
    var moduleName = args.shift();
    var isJSON = argv.json;
    apps.get('.', bind(this, function (err, app) {
      if (err) { throw err; }

      if (!isJSON) {
        console.log(chalk.yellow(app.paths.root));
        if (argv['list-versions']) {
          console.log(chalk.cyan('showing available versions'), moduleName ? chalk.cyan('for module ') + chalk.yellow(moduleName) : '');
        }
      }

      var modules = app.getModules();
      var res = {};
      var f = ff(function () {
        if (moduleName) {
          if (!modules[moduleName]) {
            return f.fail("no module found with name " + moduleName);
          }

          handleModule(modules[moduleName], f());
        } else {
          for (var name in modules) {
            if (modules[name].isDependency) {
              handleModule(modules[name], f());
            }
          }
        }
      }, function () {
        if (isJSON) {
          console.log(stringify(res));
        }
      }).cb(cb);

      function handleModule(module, cb) {
        var moduleName = module.name;
        var version = module.version;
        if (argv['list-versions']) {
          Module.getVersions(path.join(app.paths.modules, moduleName), function (err, info) {
            if (err) { return cb && cb(err); }
            if (isJSON) {
              res[moduleName] = info.versions;
            } else {
              console.log(info.versions.map(function (version) {
                return version == info.current ? chalk.yellow(version) : version;
              }).join('\t'));
            }

            cb && cb();
          });
        } else {
          Module.describeVersion(path.join(app.paths.modules, moduleName), function (err, currentVersion) {
            if (err) { return cb && cb(err); }

            if (argv['save-current']) {
              if (version != currentVersion.tag && version != currentVersion.hash) {
                // prefer tag names over hashes
                var name = currentVersion.tag || currentVersion.hash;
                console.log(chalk.yellow(moduleName) + ':', chalk.red(version), "-->", chalk.cyan(name));
                app.addDependency(moduleName, {
                  version: name
                });
              }
            } else {
              if (isJSON) {
                res[moduleName] = {
                  version: version,
                  currentVersion: currentVersion
                };
              } else {
                var name = currentVersion.tag
                  ? currentVersion.tag + ' (' + currentVersion.hash + ')'
                  : currentVersion.hash

                console.log(moduleName + ':');
                console.log('\tmanifest version:', version);
                console.log('\tcurrent version:', name);
              }
            }

            cb && cb();
          });
        }
      }
    }));
  }

});

module.exports = ModulesCommand;
