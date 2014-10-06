var ff = require('ff');
var semver = require('semver');
var color = require('cli-color');

var spawn = require('child_process').spawn;
var logging = require('./logging');

function spawnWithLogger(args, opts, cb) {

  // defaults
  opts = merge(opts, {silent: true, buffer: true});

  var name = 'git';
  var buffers;
  if (opts.buffer || opts.silent) {
    buffers = {stdout: [], stderr: []};
  }

  if (!args[0]) {
    throw new Error("no git command provided")
  }

  var logger = logging.get(name, opts.silent, buffers);

  if (!opts.extraSilent) {
    logger.log(color.yellow('-> ' + args[0]));
  }

  if (!opts.stdio) {
    opts.stdio = [process.stdin, 'pipe', 'pipe'];
  }

  var child = spawn('git', args, {stdio: opts.stdio, cwd: opts.cwd});
  child.stdout && child.stdout.pipe(logger.stdout, {end: false});
  child.stderr && child.stderr.pipe(logger.stderr, {end: false});
  child.on('close', function (err) {
    var stdout = buffers && buffers.stdout.join('');
    var stderr = buffers && buffers.stderr.join('');

    if (!opts.extraSilent) {
      if (err) {
        var errorText = err.code ? err.code : '('+err+')';
        logger.log(color.redBright(' <- failed ' + errorText));
      }
      logger.log(color.yellow(' <- done'));
    }

    // normally hide output if silent, but if there was an exit code, print everything
    if (!opts.extraSilent && opts.silent && err) {
      logger.error('<<<');
      stdout && logger.error(stdout);
      stderr && logger.error(stderr);
      logger.error('>>> [exited with code ' + err + ']', opts.cwd);
    }

    cb(err, stdout, stderr);
  });
}

/**
 * opts:
 *   - buffer: capture stdout to an array
 *   - silent: don't print to screen
 *   - stdio: custom io handling forwarded to child_process.spawn
 */
exports.get = function (dir, opts) {
  var opts = merge(opts, {cwd: dir});

  var client = function () {
    var last = arguments.length - 1;
    var singleOpts = arguments[last - 1];
    var cb = arguments[last];

    if (typeof singleOpts == 'object') {
      singleOpts = merge({}, singleOpts, opts);
      --last;
    } else {
      singleOpts = merge({}, opts);
    }

    var args = Array.prototype.slice.call(arguments, 0, last);
    spawnWithLogger(args, singleOpts, cb);
  };

  client.getLatestLocalVersion = getLatestLocalVersion;
  client.getLocalVersions = getLocalVersions;
  return client;
}

function getLatestLocalVersion (cb) {
  var git = this;
  var f = ff(function () {
    git('tag', '-l', {extraSilent: true}, f());
  }, function (tags) {
    if (tags) {
      tags = tags.split('\n').filter(semver.valid);
      tags.sort(semver.rcompare);
      f(tags[0]);
    }
  }).cb(cb);
}

function getLocalVersions (cb) {
  var git = this;
  var f = ff(function () {
    git('tag', '-l', {extraSilent: true}, f());
  }, function (tags) {
    if (tags) {
      tags = tags.split('\n').filter(semver.valid);
      tags.sort(semver.rcompare);
      f(tags);
    }
  }).cb(cb);
}
