var _rimraf = Promise.promisify(require('rimraf'));

exports = function rimraf (f, cb) {
  return _rimraf(f).nodeify(cb);
};
