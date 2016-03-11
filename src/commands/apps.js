'use strict';
let lazy = require('lazy-cache')(require);

lazy('fs');
lazy('printf');
lazy('chalk');

lazy('../apps', 'apps');
lazy('../util/stringify', 'stringify');
lazy('../util/obj', 'obj');
lazy('../util/logging', 'logging');

let BaseCommand = require('devkit-commands/BaseCommand');

class AppsCommand extends BaseCommand {
  constructor() {
    super();

    this.name = 'apps';
    this.description = 'prints devkit apps on this system. Set or get a value from an app manifest with the command "devkit apps [set|get]-config key [value]" ';

    this.opts
      .alias('s', 'short').describe('short', 'skip details')
      .alias('j', 'json').describe('json', 'prints details with json to stdout')
      .describe('set-config')
      .describe('get-config');
  }

  exec (name, args) {
    let defer = Promise.defer();
    let argv = this.argv;

    let logger = lazy.logging.get('command.apps');

    let MAX_LENGTH = 120;
    let truncate = str => {
      if (str.length > MAX_LENGTH) {
        return str.substring(0, MAX_LENGTH) + ' …';
      }
      return str;
    };

    if (argv.setConfig) {
      let key = args.shift();
      let value = args.shift();
      lazy.apps.get('.', (err, app) => {
        let manifest;
        let manifestPath;

        if (!err && app) {
          manifest = app.manifest;
          manifestPath = app.paths.manifest;
        }

        if (err instanceof lazy.apps.ApplicationNotFoundError && lazy.fs.existsSync('manifest.json')) {
          try {
            manifestPath = 'manifest.json';
            manifest = JSON.parse(lazy.fs.readFileSync('manifest.json', 'utf8'));
            err = null;
          } catch (e) {
            err = e;
          }
        }

        if (err) { throw err; }

        logger.log(key, '<--', value);
        lazy.obj.setVal(manifest, key, value);

        lazy.fs.writeFile(manifestPath, lazy.stringify(manifest), err => {
          if (err) { throw err; }
          defer.resolve();
        });
      });
    } else if (argv.getConfig) {
      let key = args.shift();
      lazy.apps.get('.', (err, app) => {
        if (err) { throw err; }
        console.log(lazy.obj.getVal(app.manifest, key));
        defer.resolve();
      });
    } else {
      lazy.apps.getApps((err, apps) => {
        if (err) { throw err; }

        if (argv.json) {
          let appList = [];
          for (let appPath in apps) {
            if (argv.short) {
              appList.push(appPath);
            } else {
              appList.push(apps[appPath].toJSON());
            }
          }
          console.log(lazy.stringify(appList));
          return defer.resolve();
        }

        let keyMap = {
          title: 'title',
          lastOpened: 'last opened',
          appId: 'app id',
          clientPaths: 'client paths',
          modules: 'modules'
        };

        let shortKeyMap = {
          title: 'title',
          appId: 'app id'
        };

        for (let appPath in apps) {
          console.log(lazy.chalk.yellow(lazy.printf('%17s', appPath)));
          let app = apps[appPath].toJSON();
          let map = (argv.short ? shortKeyMap : keyMap);
          for (let key in map) {
            if (key == 'modules') {
              console.log(lazy.chalk.yellow(lazy.printf('%21s', map[key] + ':')));
              let modules = app.modules;
              for (let name in modules) {
                if (modules[name].isDependency) {
                  console.log(lazy.chalk.green(lazy.printf('%28s', name + ':')), modules[name].version);
                }
              }
            } else if (key == 'lastOpened') {
              let d = new Date(app.lastOpened);
              console.log(lazy.chalk.yellow(lazy.printf('%21s', map[key] + ':')), d.toLocaleDateString() + ',', d.toLocaleTimeString());
            } else {
              let strValue = typeof app[key] == 'object' ? JSON.stringify(app[key]) : '' + app[key];
              console.log(lazy.chalk.yellow(lazy.printf('%21s', map[key] + ':')), truncate(strValue));
            }
          }
        }
        defer.resolve();
      });
    }

    return defer.promise;
  }
}

module.exports = AppsCommand;
