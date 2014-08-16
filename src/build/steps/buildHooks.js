var ff = require('ff');
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
  var f = ff(function () {
    var modules = app.getModules();
    var group = f.group();
    Object.keys(modules).forEach(function (moduleName) {
      var module = modules[moduleName];
      var buildExtension = module.loadExtension('build');
      if (!buildExtension || !buildExtension[buildHook]) {
        return;
      }

      try {
        buildExtension[buildHook](api, app.toJSON(), config, group());
      } catch (e) {
        console.error('Error in module', module.name + ':', ' build hook', buildHook, 'threw an exception');
        group.fail(e);
      }
    });
  }).cb(cb);
}
