var path = require('path');
var fs = require('fs');
var ncp = require('ncp');

/**
 * Copy all files in a path to another path including hidden files
 *
 * @param {string} from - source path
 * @param {string} to - destination path
 * @return {Promise}
 */

exports.path = function (from, to) {
  return new Promise(function (resolve, reject) {
    // Delegate to ncp
    ncp(from, to, function (err) {
      if (err) { return reject(err); }
      return resolve();
    });
  });
};
