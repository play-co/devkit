var path = require('path');
var fs = require('fs');

var glob = Promise.promisify(require('glob'));
var mkdirp = Promise.promisify(require('mkdirp'));

var stat = Promise.promisify(fs.stat, fs);
var chmod = Promise.promisify(fs.chmod, fs);

/**
 * Copy file at `from` into `to`
 *
 * The `from` file is assumed to exist
 *
 * @param {string} from
 * @param {string} to
 * @return {Promise}
 */
function pipeSourceToDest (from, to) {
  var ws = fs.createWriteStream(to);
  fs.createReadStream(from).pipe(ws);
  return new Promise(function pipeFilePromise (resolve, reject) {
    ws.on('close', resolve);
  });
}

/**
 * Copy files perms
 *
 * @param {string} from - source file; can be null if stats is provided
 * @param {string} to - dest file
 * @param {fs.Stats} [stats]
 * @return {Promise}
 */

function copyPerms (from, to, stats) {
  if (stats) {
    return chmod(to, stats.mode);
  }

  return stat(from).then(function (stats) {
    return chmod(to, stats.mode);
  });
}

/**
 * Copy a file while. This function skips directories and ensures target
 * directories exist. Permissions also copied.
 *
 * @param {string} from - source file
 * @param {string} to - destination file
 * @return {Promise}
 */

function copyFile (from, to) {
  return stat(from).then(function (stats) {

    if (stats.isDirectory()) {
      return;
    }

    var dirname = path.dirname(to);
    return mkdirp(dirname).then(function () {
      return pipeSourceToDest(from, to);
    }).then(function () {
      return copyPerms(from, to, stats);
    });

  });
}

/**
 * Copy all files in a path to another path including hidden files
 *
 * @param {string} from - source path
 * @param {string} to - destination path
 * @return {Promise}
 */
exports.path = function (from, to) {
  var rel = path.relative(from, to);
  return stat(from).then(function (stats) {
    // Recursively copy directories
    if (stats.isDirectory()) {
      return glob(path.join(from, '**', '*'), {dot: true}).map(function (file) {
        // File has absolute path.
        var fileFromRelative = file.replace(from, '');
        var dest = path.normalize(path.join(from, rel, fileFromRelative));
        return copyFile(file, dest);
      }, {concurrency: 32}); // 32 just felt good
    }

    // Also handle single files
    return copyFile(from, to);
  });

};
