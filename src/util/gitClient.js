var logging = require('./logging');
var spawn = require('child_process').spawn;

function spawnWithLogger(args, opts, cb) {
  var name = 'git-' + args[0];
  var logger = logging.get(name);
  // logger.log('git', args.join(' '));
  var child = spawn('git', args, opts);
  child.stdout && child.stdout.pipe(logger, {end: false});
  child.stderr && child.stderr.pipe(logger, {end: false});
  child.on('close', function (err) {
    cb(err);
  });
}

exports.get = function (dir, opts) {
  var opts = merge(opts, {cwd: dir});

  var client = function () {
    var last = arguments.length - 1;
    var cb = arguments[last];
    var onResult = function (code) {
      cb && cb.apply(this, arguments);
    };

    if (Array.isArray(arguments[0])) {
      var args = arguments[0];
      var i = 0;
      var _out = [], _err = [];
      var next = function (code, out, err) {
        _out.push(out);
        _err.push(err);
        if (code || !args[i]) { return onResult(code, _out, _err); }
        spawnWithLogger(args[i++], opts, next);
      };

      next();
    } else {
      var args = Array.prototype.slice.call(arguments, 0, last);
      spawnWithLogger(args, opts, onResult);
    }
  };

  return client;
}
