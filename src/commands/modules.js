var lazy = require('lazy-cache')(require);

lazy('chalk');

lazy('../apps');
lazy('../modules/Module', 'Module');
lazy('../util/stringify');

var BaseCommand = require('../util/BaseCommand').BaseCommand;

var ModulesCommand = Class(BaseCommand, function (supr) {

  this.name = 'modules';
  this.description = "prints information about the current app's modules";

  this.init = function () {
    supr(this, 'init', arguments);

    this.opts
      .alias('j', 'json').describe('json', 'print output in json')
      .alias('p', 'project').describe('project', 'location of project (defaults to current directory)')
      .describe('save-current', 'save the current versions in the game\'s manifest')
      .describe('list-versions', 'prints all available versions (does not update anything)');
  };

  this.exec = function (command, args) {
    var argv = this.argv;
    var moduleName = args.shift();
    var isJSON = argv.json;
    var allModules = argv.r || argv.recursive || argv.all;

    var onModule = function(app, module) {
      return (argv['list-versions'] ? listVersions : describeVersion)(app, module);
    };

    var listVersions = function(app, module) {
      return lazy.Module.getVersions(module.path)
        .then(function (info) {
          if (isJSON) {
            return info.versions;
          } else {
            var moduleName = '';
            if (module.name) {
              moduleName = lazy.chalk.cyan('for module ') +
                lazy.chalk.yellow(module.name);
            }
            console.log(lazy.chalk.cyan('available versions'), moduleName);

            console.log(info.versions.map(function (version) {
              return version == info.current ? lazy.chalk.yellow(version) : version;
            }).join('\t'));
          }
        });
    };

    var describeVersion = function(app, module) {
      var version = module.version;
      return lazy.Module.describeVersion(module.path)
        .then(function (currentVersion) {
          if (argv['save-current']) {
            if (version != currentVersion.tag && version != currentVersion.hash) {
              // prefer tag names over hashes
              var name = currentVersion.tag || currentVersion.hash;
              console.log(lazy.chalk.yellow(module.name) + ':', lazy.chalk.red(version), '-->', lazy.chalk.cyan(name));
              app.addDependency(module.name, {
                version: name
              });
            }
          } else {
            if (isJSON) {
              return {
                version: version,
                currentVersion: currentVersion,
                path: module.path
              };
            } else {
              var name = currentVersion.tag ?
                currentVersion.tag + ' (' + currentVersion.hash + ')'
                : currentVersion.hash;

              console.log(module.name + ':');
              console.log('\tlocation:', module.path);
              console.log('\tinstalled version:', name);
              console.log('\trequested version:', version, '(in manifest.json)');
            }
          }
        });
    };

    return lazy.apps.get('.').then(function (app) {
      if (!isJSON) {
        console.log(lazy.chalk.yellow(app.paths.root));
      }

      var modules = app.getModules();
      if (moduleName) {
        if (!modules[moduleName]) {
          throw new Error('no module found with name: ' + moduleName);
        }

        return onModule(app, modules[moduleName]).then(function (info) {
          if (info) {
            console.log(lazy.utilStringify(res));
          }
        });
      } else {
        var res = {};
        return Promise.map(Object.keys(modules), function (name) {
          if (modules[name].isDependency || allModules) {
            return onModule(app, modules[name])
              .then(function (info) {
                res[name] = info;
              })
              .catch(function (e) {
                if (e.code == 'ENOENT') {
                  console.error('Module', name, 'does not exist');
                } else {
                  throw e;
                }
              });
          }
        })
        .then(function () {
          if (isJSON) {
            console.log(lazy.utilStringify(res));
          }
        });
      }
    });
  };

});

module.exports = ModulesCommand;
