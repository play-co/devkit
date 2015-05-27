var fs = require('fs');
var path = require('path');
var Module = require('./Module');
var logger = require('../util/logging').get('modules');

var _modules = null;

var BASE_PATH = path.join(__dirname, '..', '..', 'modules');

exports.getBaseModules = function () {
  if (!_modules) {
    try {
      _modules = fs.readdirSync(BASE_PATH)
        .map(function (item) {
          return Module.load(path.join(BASE_PATH, item));
        })
        .filter(function (module) { return module; });
    } catch (e) {
      logger.error(e);
      _modules = [];
    }
  }

  return _modules;
};
