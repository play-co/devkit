module.exports = function (app, config, cb) {
  var modules = app.getModules();
  var baseModules = require('../../modules/').getBaseModules();

  function addDebugModule(module) {
    var extension = module.getExtension('client-debugger');
    if (extension) {
      // sets up the import path
      config.jsioPath['devkit-debug-' + module.name] = path.join(module.path, extension);

      // adds the import for js compilation
      config.imports.push('devkit-debug-' + module.name);
    }
  }

  if (config.isSimulated && config.scheme == 'debug') {
    for (var key in modules) { addDebugModule(modules[key]); }
    for (var key in baseModules) { addDebugModule(baseModules[key]); }
  }

  cb && process.nextTick(cb);
}
