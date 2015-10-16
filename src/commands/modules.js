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
      .describe('list-versions', 'prints all available versions (does not update anything)');
  };

  this.exec = function (command, args, cb) {
    var path = require('path');
    var chalk = require('chalk');

    var apps = require('../apps');
    var Module = require('../modules/Module');
    var stringify = require('../util/stringify');

    var argv = this.opts.argv;
    var moduleName = args.shift();
    var isJSON = argv.json;
    var allModules = argv.r || argv.recursive || argv.all;

    apps.get('.')
      .then(function (app) {
        if (!isJSON) {
          console.log(chalk.yellow(app.paths.root));
        }

        var modules = app.getModules();
        if (moduleName) {
          if (!modules[moduleName]) {
            throw new Error("no module found with name " + moduleName);
          }

          return onModule(app, modules[moduleName])
            .then(function (info) {
              if (info) {
                console.log(stringify(res));
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
                console.log(stringify(res));
              }
            });
        }
      })
      .nodeify(cb);

    function onModule(app, module) {
      return (argv['list-versions'] ? listVersions : describeVersion)(app, module);
    }

    function listVersions(app, module) {
      return Module.getVersions(module.path)
        .then(function (info) {
          if (isJSON) {
            return info.versions;
          } else {
            console.log(chalk.cyan('available versions'),
                module.name ? chalk.cyan('for module ')
                              + chalk.yellow(module.name)
                            : '');

            console.log(info.versions.map(function (version) {
              return version == info.current ? chalk.yellow(version) : version;
            }).join('\t'));
          }
        });
    }

    function describeVersion(app, module) {
      var version = module.version;
      return Module.describeVersion(module.path)
        .then(function (currentVersion) {
          if (argv['save-current']) {
            if (version != currentVersion.tag && version != currentVersion.hash) {
              // prefer tag names over hashes
              var name = currentVersion.tag || currentVersion.hash;
              console.log(chalk.yellow(module.name) + ':', chalk.red(version), "-->", chalk.cyan(name));
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
              var name = currentVersion.tag
                ? currentVersion.tag + ' (' + currentVersion.hash + ')'
                : currentVersion.hash;

              console.log(module.name + ':');
              console.log('\tlocation:', module.path);
              console.log('\tinstalled version:', name);
              console.log('\trequested version:', version, '(in manifest.json)');
            }
          }

          cb && cb();
        });
    }
  };

});

module.exports = ModulesCommand;
