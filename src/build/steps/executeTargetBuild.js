var api = require('../../api');

exports.build = function (app, config, cb) {

  // find the build module
  var buildModule;
  var modules = app.getModules();

  for (var i = 0, module; module = modules[i]; ++i) {
    buildModule = module.loadBuildTarget(config.target);
    if (buildModule) { break; }
  }

  if (!buildModule) {
    throw new Error("Build target `" + config.target + "` not found");
  }

  api.apps.get(app.paths.root, function (err, appJSON) {
    if (err) { throw err; }

    // execute the build module
    buildModule.build(api, appJSON, config, cb);
  });
}
