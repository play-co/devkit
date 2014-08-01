var api = require('../../api');

exports.getConfig = function(app, config, cb) {
  // find the build module
  var buildModule;
  var modules = app.getModules();
  for (var i = 0, module; module = modules[i]; ++i) {
    buildModule = module.loadBuildTarget(config.target);
    if (buildModule) { break; }
  }

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
