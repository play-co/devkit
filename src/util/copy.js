var cpr = require('cpr');

exports.path = function (from, to) {
  return new Promise(function (resolve, reject) {
    cpr(from, to, {
      overwrite: true
    }, function (err, files) {
      if (err) {
        return reject(err);
      }
      return resolve();
    });
  });
};
