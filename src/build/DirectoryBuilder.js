var path = require('path');
var fs = require('fs');
var logger = require('../util/logging').get('build-directories');

// class for representing a list of resource directories
function DirectoryBuilder(base) {
  this._base = base;
  this._directories = [];
}

DirectoryBuilder.prototype.add = function (src, target) {
  var directory;
  if (arguments.length === 1) {
    directory = {
        src: path.join(this._base, src),
        target: src
      };
  } else {
    directory = {
        src: src,
        target: target
      };
  }

  if (fs.existsSync(directory.src)) {
    this._directories.push(directory);
  } else {
    logger.warn('Directory does not exist, ignoring files from',
                      directory);
  }
};

DirectoryBuilder.prototype.getPaths = function () {
  return this._directories.map(function (dir) { return dir.src; });
};

DirectoryBuilder.prototype.getDirectories = function () {
  return this._directories;
};

module.exports = DirectoryBuilder;
