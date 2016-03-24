var setVal = require('../../util/obj').setVal;

module.exports = function processArgs(app) {
  var argv = process.argv;
  var n = argv.length;
  for (var i = 0; i < n; ++i) {
    if (/^--manifest:/.test(argv[i])) {
      var key = argv[i].substring(11);
      try {
        setVal(app.manifest, key, JSON.parse(argv[i + 1]));
      } catch (e) {
        console.warn('Value for', key, 'is not JSON parseable:', argv[i + 1]);
      }
    }
  }
};
