var api = require('../../api');

exports.getConfig = function(app, config, cb) {
  // find the build module
  var buildModule;
  var modules = app.getModules();
  Object.keys(modules).forEach(function (moduleName) {
    if (!buildModule) {
      var module = modules[moduleName];
      buildModule = module.loadBuildTarget(config.target);
    }
  });

  if (buildModule && buildModule.configure) {
    buildModule.configure(api, app, config, function (err, res) {
      if (err) {
        logger.error("Could not configure build", err);
      }

      cb(err, config);
    });
  } else {
    cb(null, config);
  }
}
