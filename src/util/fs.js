var Promise = require('bluebird');
module.exports = Promise.promisifyAll(require('fs-extra'));
module.exports.existsAsync = function (path) {
  return new Promise(function (resolve) {
    module.exports.exists(path, function (exists) {
      resolve(exists);
    });
  });
};
