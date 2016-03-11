var lazy = require('lazy-cache')(require);
lazy('path');
lazy('path-extra');
lazy('../util/fs', 'fs');
lazy('../util/logging', 'logging');


var logger = lazy.logging.get('install.link');
var LINK_DIR = lazy.path.join(lazy.pathExtra.datadir(process.title), 'links');


module.exports.createLink = function(src, dest) {
  logger.debug('Creating link:', src, '-->', dest);
  return Promise.promisify(lazy.fs.lstat)(dest).catch(function (err) {
    if (err.code !== 'ENOENT') {
      return Promise.reject(err);
    }
  }).then(function (stat) {
    if (!stat) {
      return;
    }
    if (stat.isSymbolicLink()) {
      logger.debug('Existing link found, unlinking');
      return Promise.promisify(lazy.fs.unlink)(dest);
    } else {
      return Promise.reject('Existing file at: ' + dest);
    }
  }).then(function () {
    return Promise.promisify(lazy.fs.ensureDir)(lazy.path.dirname(dest));
  }).then(function() {
    return Promise.promisify(lazy.fs.symlink)(src, dest, 'junction');
  });
};


module.exports.linkToGlobal = function(cwd) {
  logger.info('Linking to global:', cwd);
  var linkPath = lazy.path.join(LINK_DIR, lazy.path.basename(cwd));
  return module.exports.createLink(cwd, linkPath);
};


module.exports.linkFromGlobal = function(cwd, name) {
  logger.info('Linking from global:', name, '-->', cwd)
  var linkPath = lazy.path.join(LINK_DIR, name);
  var destPath = lazy.path.join(cwd, 'modules', name);
  return module.exports.createLink(linkPath, destPath);
};
