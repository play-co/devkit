var lazy = require('lazy-cache')(require);

lazy('fs');
lazy('printf');
lazy('chalk');

lazy('../apps', 'apps');
lazy('../util/stringify', 'stringify');
lazy('../util/obj', 'obj');

var BaseCommand = require('../util/BaseCommand').BaseCommand;

var AppsCommand = Class(BaseCommand, function (supr) {

  this.name = 'apps';
  this.description = 'prints devkit apps on this system. Set or get a value from an app manifest with the command "devkit apps [set|get]-config key [value]" ';

  this.init = function () {
    supr(this, 'init', arguments);

    this.opts
      .alias('s', 'short').describe('short', 'skip details')
      .alias('j', 'json').describe('json', 'prints details with json to stdout')
      .describe('set-config');
  };

  this.exec = function (name, args) {
    var argv = this.argv;

    var MAX_LENGTH = 120;
    function truncate(str) {
      if (str.length > MAX_LENGTH) {
        return str.substring(0, MAX_LENGTH) + ' …';
      }

      return str;
    }

    // sub-commands are for scripting, so set an exit code and exit on
    // completion
    var handleCmdError = function(err) {
      if (err) {
        console.error(err);
        process.exit(1);
      }
    };

    var subcmd = args.shift();
    if (subcmd == 'set-config') {
      var key = args.shift();
      var value = args.shift();
      lazy.apps.get('.', function (err, app) {
        var manifest;
        var manifestPath;

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

        handleCmdError(err);

        console.log(key, '<--', value);
        lazy.obj.setVal(manifest, key, value);

        lazy.fs.writeFile(manifestPath, lazy.stringify(manifest), function (err) {
          handleCmdError(err);
          process.exit(0);
        });
      });
      return;
    } else if (subcmd == 'get-config') {
      var key = args.shift();
      lazy.apps.get('.', function (err, app) {
        handleCmdError(err);
        console.log(lazy.obj.getVal(app.manifest, key));
        process.exit(0);
      });
      return;
    }

    lazy.apps.getApps(function (err, apps) {
      if (err) { throw err; }

      if (argv.json) {
        var appList = [];
        for (var appPath in apps) {
          if (argv.short) {
            appList.push(appPath);
          } else {
            appList.push(apps[appPath].toJSON());
          }
        }
        console.log(lazy.stringify(appList));
      } else {
        var keyMap = {
          title: 'title',
          lastOpened: 'last opened',
          appId: 'app id',
          clientPaths: 'client paths',
          modules: 'modules'
        };

        var shortKeyMap = {
          title: 'title',
          appId: 'app id'
        };

        for (var appPath in apps) {
          console.log(lazy.chalk.yellow(lazy.printf('%17s', appPath)));
          var app = apps[appPath].toJSON();
          var map = (argv.short ? shortKeyMap : keyMap);
          for (var key in map) {
            if (key == 'modules') {
              console.log(lazy.chalk.yellow(lazy.printf('%21s', map[key] + ':')));
              var modules = app.modules;
              for (var name in modules) {
                if (modules[name].isDependency) {
                  console.log(lazy.chalk.green(lazy.printf('%28s', name + ':')), modules[name].version);
                }
              }
            } else if (key == 'lastOpened') {
              console.log(lazy.chalk.yellow(lazy.printf('%21s', map[key] + ':')), d.toLocaleDateString() + ',', d.toLocaleTimeString());
            } else {
              var d = new Date(app.lastOpened);
              strValue = typeof app[key] == 'object' ? JSON.stringify(app[key]) : '' + app[key];
              console.log(lazy.chalk.yellow(lazy.printf('%21s', map[key] + ':')), truncate(strValue));
            }
          }
        }
      }
    });
  };
});

module.exports = AppsCommand;
