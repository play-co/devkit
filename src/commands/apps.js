var fs = require('fs');
var path = require('path');
var printf = require('printf');
var color = require('cli-color');

var apps = require('../apps');
var BaseCommand = require('../util/BaseCommand').BaseCommand;
var stringify = require('../util/stringify');

var MAX_LENGTH = 120;
function truncate(str) {
  if (str.length > MAX_LENGTH) {
    return str.substring(0, MAX_LENGTH) + ' …';
  }

  return str;
}

var AppsCommand = Class(BaseCommand, function (supr) {

  this.name = 'which';
  this.description = 'prints devkit apps on this system';

  this.init = function () {
    supr(this, 'init', arguments);

    this.opts
      .alias('s', 'short').describe('short', 'skip details')
      .alias('j', 'json').describe('json', 'prints details with json to stdout');
  }

  this.exec = function () {
    var argv = this.opts.argv;

    apps.getApps(function (err, apps) {
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
        console.log(stringify(appList));
      } else {
        var keyMap = {
          appId: 'app id',
          clientPaths: 'client paths',
          title: 'title'
        };

        for (var appPath in apps) {
          console.log(color.yellowBright(printf('%17s', appPath)));
          var app = apps[appPath].toJSON();
          for (var key in keyMap) {
            strValue = typeof app[key] == 'object' ? JSON.stringify(app[key]) : '' + app[key];
            console.log(color.yellow(printf('%21s', keyMap[key] + ':')), truncate(strValue));
          }

          console.log(color.yellow(printf('%21s', 'modules:')));
          var modules = app.modules;
          for (var name in modules) {
            if (modules[name].parent == app.paths.root) {
              console.log(color.green(printf('%28s', name + ':')), modules[name].version);
            }
          }

          var d = new Date(app.lastOpened);
          console.log(color.yellow(printf('%21s', 'last opened:')), d.toLocaleDateString() + ',', d.toLocaleTimeString());
        }
      }
    });
  }
});

module.exports = AppsCommand;
