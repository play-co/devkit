var mkdirp = require('mkdirp');

exports.createDirectories = function (app, config, cb) {
  mkdirp(config.outputPath, cb);
}
