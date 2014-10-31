var _rimraf = Promise.promisify(require('rimraf'));

module.exports = function rimraf (f, cb) {
  return _rimraf(f).nodeify(cb);
};
