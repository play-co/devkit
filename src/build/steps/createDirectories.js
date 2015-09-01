var fs = require('../../util/fs');

exports.createDirectories = function (app, config, cb) {
  return fs.ensureDirAsync(config.outputPath)
    .nodeify(cb);
};
