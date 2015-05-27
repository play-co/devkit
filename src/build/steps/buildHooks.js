var ff = require('ff');
var Promise = require('bluebird');
var api = require('../../api');

exports.getDependencies = function (app, config, cb) {
  app.reloadModules();

  // allows modules to disable other modules
  executeHook('getDependencies', app, config, cb);
}

exports.onBeforeBuild = function (app, config, cb) {
  executeHook('onBeforeBuild', app, config, cb);
}

exports.onAfterBuild = function (app, config, cb) {
  executeHook('onAfterBuild', app, config, cb);
}

function executeHook(buildHook, app, config, cb) {
  var modules = app.getModules();

  Promise.all(Object.keys(modules).map(function (moduleName) {
    var module = modules[moduleName];
    var buildExtension = module.loadExtension('build');
    if (!buildExtension || !buildExtension[buildHook]) {
      return;
    }

    return Promise.fromNode(buildExtension[buildHook].bind(buildExtension, api, app.toJSON(), config));
  })).nodeify(cb);
}
