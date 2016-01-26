
var base = require('jsio')('jsio.base');

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

if (process.env.DEVKIT_TRACE) {
  var callsite = require('callsite');

  var herePath = __dirname;

  var matchesTraceName = function(testStr) {
    var traceNames = process.DEVKIT_TRACE_NAMES;
    if (traceNames.length === 0) {
      return true;
    }

    for (var i = 0, j = traceNames.length; i < j; i++) {
      if (testStr.indexOf(traceNames[i]) === 0) {
        return true;
      }
    }
    return false;
  };

  trace = function devkitTrace () {
    var stack = callsite();
    var callSite = stack[1];
    var callerPath = callSite.getFileName();

    if (callerPath.indexOf(herePath) === 0) {
      callerPath = callerPath.substring(herePath.length + 1, callerPath.length);
    }

    if (!matchesTraceName(callerPath)) {
      return;
    }

    var args = Array.prototype.map.call(arguments, function(arg) {
      return arg;
    });

    var prefix = callerPath + ':' + callSite.getLineNumber() + '|';
    args.unshift(prefix);

    console.log.apply(console, args);
  };

  process.env.BLUEBIRD_DEBUG = 1;

  /**
   * Show devkit trace information
   */
  trace('--------------------------------------------------------------------------------');
  trace('------------------------- GAME CLOSURE DEVKIT TRACE ----------------------------');
  trace('--------------------------------------------------------------------------------');
  var version = require(__dirname + '/../package.json').version;
  trace('  VERSION =>', version, '\n\n');
} else {
  trace = function () {};
}

Promise = require('bluebird');
