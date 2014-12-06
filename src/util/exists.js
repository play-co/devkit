var fs = require('fs');

/**
 * @class IOError
 */

function IOError (message) {
  this.message = message;
  this.name = 'IOError';
  Error.captureStackTrace(this, IOError);
}

IOError.prototype = Object.create(Error.prototype);
IOError.prototype.constructor = IOError;

exports.IOError = IOError;

exports.exists = function exists (filePath) {
  return new Promise(function (resolve, reject) {
    fs.exists(filePath, function (pathExists) {
      if (pathExists) {
        return resolve(pathExists);
      }
      return reject(new IOError('ENOENT -> ' + filePath));
    });
  });
};
