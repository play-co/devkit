var ff = require('ff');
var api = require('../../api');

exports.onBeforeBuild = function(app, config, cb) {
  executeHook('onBeforeBuild', app, config, cb);
}

exports.onAfterBuild = function(app, config, cb) {
  executeHook('onAfterBuild', app, config, cb);
}

function executeHook(buildHook, app, config, cb) {
  var f = ff(function () {
    app.getModules().forEach(function (module) {
      var buildExtension = module.loadExtension('build');
      if (!buildExtension || !buildExtension[buildHook]) {
        return;
      }

      try {
        buildExtension[buildHook](api, app.toJSON(), config, f());
      } catch (e) {
        console.error('Error in module', module.name + ':', ' build hook', buildHook, 'threw an exception');
        f.fail(e);
      }
    });
  }).cb(cb);
}
