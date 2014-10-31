var lockfile = require('lockfile');

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

/**
 * Promisified lockfile.lock
 *
 * @return {Promise<void 0, FileLockerError>}
 */

exports.lock = function (file, opts) {
  opts = opts || {};

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
