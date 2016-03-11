'use strict';
let lazy = require('lazy-cache')(require);

lazy('chalk');

lazy('../apps');
lazy('../modules/Module', 'Module');
lazy('../util/stringify');

let BaseCommand = require('devkit-commands/BaseCommand');

class ModulesCommand extends BaseCommand {
  constructor () {
    super();

    this.name = 'modules';
    this.description = "prints information about the current app's modules";

    this.opts
      .alias('j', 'json').describe('json', 'print output in json')
      .alias('p', 'project').describe('project', 'location of project (defaults to current directory)')
      .describe('save-current', 'save the current versions in the game\'s manifest')
      .describe('list-versions', 'prints all available versions (does not update anything)');
  }

  exec (command, args) {
    let argv = this.argv;
    let moduleName = args.shift();
    let isJSON = argv.json;
    let allModules = argv.r || argv.recursive || argv.all;

    let onModule = (app, module) => {
      return (argv['list-versions'] ? listVersions : describeVersion)(app, module);
    };

    let listVersions = (app, module) => {
      return lazy.Module.getVersions(module.path)
        .then(info => {
          if (isJSON) {
            return info.versions;
          } else {
            let moduleName = '';
            if (module.name) {
              moduleName = lazy.chalk.cyan('for module ') +
                lazy.chalk.yellow(module.name);
            }
            console.log(lazy.chalk.cyan('available versions'), moduleName);

            console.log(info.versions.map(version => {
              return version == info.current ? lazy.chalk.yellow(version) : version;
            }).join('\t'));
          }
        });
    };

    let describeVersion = (app, module) => {
      let version = module.version;
      return lazy.Module.describeVersion(module.path)
        .then(currentVersion => {
          if (argv['save-current']) {
            if (version != currentVersion.tag && version != currentVersion.hash) {
              // prefer tag names over hashes
              let name = currentVersion.tag || currentVersion.hash;
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
              let name = currentVersion.tag ?
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

    return lazy.apps.get('.').then(app => {
      if (!isJSON) {
        console.log(lazy.chalk.yellow(app.paths.root));
      }

      let modules = app.getModules();
      if (moduleName) {
        if (!modules[moduleName]) {
          throw new Error('no module found with name: ' + moduleName);
        }

        return onModule(app, modules[moduleName]).then(info => {
          if (info) {
            console.log(lazy.utilStringify(res));
          }
        });
      } else {
        let res = {};
        return Promise.map(Object.keys(modules), name => {
          if (modules[name].isDependency || allModules) {
            return onModule(app, modules[name])
              .then(info => {
                res[name] = info;
              })
              .catch(e => {
                if (e.code == 'ENOENT') {
                  console.error('Module', name, 'does not exist');
                } else {
                  throw e;
                }
              });
          }
        })
        .then(() => {
          if (isJSON) {
            console.log(lazy.utilStringify(res));
          }
        });
      }
    });
  }
}

module.exports = ModulesCommand;
