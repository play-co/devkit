var path = require('path');

module.exports = function (app, config, cb) {
  var modules = app.getModules();
  var baseModules = require('../../modules/').getBaseModules();

  function addDebugModule(module) {
    var extension = module.getExtension('devkit-simulator');
    if (extension) {
      // sets up the import path
      config.clientPaths[module.name] = extension;

      // add to CONFIG object for import
      config.simulator.modules.push(module.name);

      // adds the import for js compilation
      config.imports.push(module.name);
    }
  }

  if (config.isSimulated && config.scheme === 'debug') {
    var key;
    for (key in modules) { addDebugModule(modules[key]); }
    for (key in baseModules) { addDebugModule(baseModules[key]); }
  }

  cb && process.nextTick(cb);
};
