var path = require('path');
var Promise = require('bluebird');
var api = require('../../api');
var DirectoryBuilder = require('../DirectoryBuilder');
var fs = require('fs');

var readDir = Promise.promisify(fs.readdir);
var stat = Promise.promisify(fs.stat);

exports.getDependencies = function (app, config, cb) {
  app.reloadModules();

  // allows modules to disable other modules
  executeHook('getDependencies', app, config)
    .nodeify(cb);
};

exports.onBeforeBuild = function (app, config, cb) {
  executeHook('onBeforeBuild', app, config)
    .nodeify(cb);
};

exports.onAfterBuild = function (app, config, cb) {
  executeHook('onAfterBuild', app, config)
    .nodeify(cb);
};

exports.getResourceDirectories = function (app, config, cb) {
  var builder = new DirectoryBuilder(app.paths.root);
  builder.add('resources');
  executeHook('getResourceDirectories', app, config)
    .map(function (res) {
      var module = res.module;
      var directories = res.data;
      directories.forEach(function (directory) {
        var target = path.join('modules', module.name, directory.target);
        builder.add(directory.src, target);
      });
    })
    .then(function () {
      // add any localized resource directories
      return readDir(app.paths.root);
    })
    .filter(function (filename) {
      if (/^resources-/.test(filename)) {
        return stat(path.join(app.paths.root, filename)).then(function (info) {
          return info.isDirectory();
        }, function onStatFail() {
          return false;
        });
      }

      return false;
    })
    .map(function (filename) {
      builder.add(filename);
    })
    .then(function () {
      return builder.getDirectories();
    })
    .nodeify(cb);
};

function executeHook(buildHook, app, config) {
  var modules = app.getModules();

  return Promise.resolve(Object.keys(modules))
    .map(function (moduleName) {
      var module = modules[moduleName];
      var buildExtension = module.loadExtension('build');
      if (!buildExtension || !buildExtension[buildHook]) {
        return;
      }
      return new Promise(function (resolve, reject) {
          var retVal = buildExtension[buildHook](api, app.toJSON(), config, function (err, res) {
            if (err) {
              reject(err);
            } else {
              resolve(res);
            }
          });

          if (retVal) { resolve(retVal); }
        })
        .then(function (data) {
          return {
            module: module,
            data: data
          };
        });
    })
    .filter(function (res) { return res; });
}
