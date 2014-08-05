var base = require('jsio.base');

GLOBAL.Class = base.Class;
GLOBAL.merge = base.merge;
GLOBAL.bind = base.bind;

// catch SIGTERM and SIGINT so `exit` events properly trigger on the process
// object (e.g. killing child processes)
process.on('SIGTERM', function () {
  process.exit(1);
});

process.on('SIGINT', function () {
  process.exit(2);
});
