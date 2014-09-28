require = require('jsio');
require('../globals');

var build = require('./index');
var args = JSON.parse(process.argv[2]);
build.build(args.appPath, args.buildOpts, function (err, res) {
  process.send({err: err, res: res});
  process.exit();
});
