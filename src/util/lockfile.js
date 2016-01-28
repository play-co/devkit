var path = require('path');
var lockfile = require('lockfile');

var logger = require('./logging').get('lockfile');

var DEFAULT_LOCK_FILE = 'devkit.lock';

/**
 * @class FileLockerError
 */
function FileLockerError (message) {
  this.message = message;
  this.name = 'FileLockerError';
  Error.captureStackTrace(this, FileLockerError);
}

FileLockerError.prototype = Object.create(Error.prototype);
FileLockerError.prototype.constructor = FileLockerError;

exports.FileLockerError = FileLockerError;


var ensurePath = function(file) {
  if (path.extname(file).toLowerCase() === '.lock') {
    return file;
  }

  return path.join(file, DEFAULT_LOCK_FILE);
};


/**
 * Promisified lockfile.lock
 *
 * @return {Promise<void 0, FileLockerError>}
 */
exports.lock = function (file, opts) {
  opts = opts || {};
  file = ensurePath(file);

  logger.silly('Locking', file);

  return new Promise(function (resolve, reject) {
    lockfile.lock(file, opts, function (err) {
      if (err) {
        reject(new FileLockerError('could not lock ' + file));
      } else {
        resolve();
      }
    });
  });
};

/**
 * Promisified lockfile.unlock
 *
 * @return {Promise<void 0, FileLockerError>}
 */
exports.unlock = function (file, cb) {
  file = ensurePath(file);
  logger.silly('Unlocking', file);
  return new Promise(function (resolve, reject) {
    lockfile.unlock(file, function (err) {
      if (err) {
        reject(new FileLockerError('could not unlock ' + file));
      } else {
        resolve();
      }
    });
  }).nodeify(cb);
};
