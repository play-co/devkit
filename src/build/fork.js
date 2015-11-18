require('../globals');

var build = require('./index');
var args = JSON.parse(process.argv[2]);
build.build(args.appPath, args.buildOpts, function (err, res) {
  process.send({err: err, res: res});

  // remove listener, otherwise node won't exit
  process.removeListener('message', onInterrupt);
});

function onInterrupt(m) {
  if (m === 'stop') {
    process.exit(1);
  }
}

process.on('message', onInterrupt);
