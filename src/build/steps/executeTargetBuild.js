var api = require('../../api');

exports.build = function (app, config, cb) {

  // find the build module
  var buildModule;
  var modules = app.getModules();
  var moduleKeys = Object.keys(modules);

  if (!moduleKeys.length) {
    throw new Error("Your project has no modules!  Have you tried running 'devkit install'?");
  }

  moduleKeys.forEach(function (moduleName) {
    if (!buildModule) {
      var module = modules[moduleName];
      buildModule = module.loadBuildTarget(config.target);
    }
  });

  if (!buildModule) {
    throw new Error("Build target `" + config.target + "` not found");
  }

  api.apps.get(app, function (err, appJSON) {
    if (err) { throw err; }

    // execute the build module
    buildModule.build(api, appJSON, config, cb);
  });
};
