var color = require('cli-color');

var spawn = require('child_process').spawn;
var logging = require('../logging');

// gitClient errors and functions
var errors = require('./errors');
var gitFunctions = require('./functions');

/**
 * @reexport UnknownGitOption
 */

var UnknownGitOption = exports.UnknownGitOption = errors.UnknownGitOption;

/**
 * @reexport UnknownGitRevision
 */

var UnknownGitRevision = exports.UnknownGitRevision = errors.UnknownGitRevision;

/**
 * @reexport FatalGitError
 */

var FatalGitError = exports.FatalGitError = errors.FatalGitError;

/**
 * Spawn a git process with a logger. Reject non zero exit codes with
 * appropriate error types.
 *
 * @return {Promise}
 */

function spawnWithLogger(args, opts, cb) {

  // defaults
  opts = merge(opts, {silent: true, buffer: true});

  var name = 'git';
  var buffers;
  if (opts.buffer || opts.silent) {
    buffers = {stdout: [], stderr: []};
  }

  if (!args[0]) {
    throw new Error('no git command provided');
  }

  var logger = logging.get(name, opts.silent, buffers);

  if (!opts.extraSilent) {
    logger.log(color.yellow('-> ' + args.join(' ')));
  }

  if (!opts.stdio) {
    opts.stdio = [process.stdin, 'pipe', 'pipe'];
  }

  var logErrorContext = function () {
    logger.error('[child process error]', name, args.join(' '));
  };

  var ranCallback = false;
  var child = spawn(name, args, {stdio: opts.stdio, cwd: opts.cwd});
  child.stdout && child.stdout.pipe(logger.stdout, {end: false});
  child.stderr && child.stderr.pipe(logger.stderr, {end: false});

  return new Promise(function (resolve, reject) {
    child.on('close', function (code) {
      var stdout = buffers && buffers.stdout.join('');
      var stderr = buffers && buffers.stderr.join('');

      if (!ranCallback) {
        ranCallback = true;
        if (code === 0) {
          return resolve(stdout);
        }

        var cmd = name + ' ' + args.join(' ');
        if (code === 128) {
          reject(new FatalGitError('during `' + cmd + '`: ' + stderr));
        } else if (code === 129) {
          reject(new UnknownGitOption('during `' + cmd + '`: ' + stderr));
        } else {
          reject({code: code, stderr: stderr});
        }
      }
    });

    child.on('error', function (err) {
      logErrorContext();
      if (!ranCallback) {
        ranCallback = true;
        if (!(err instanceof Error)) {
          err = new Error(err);
        }
        reject(err);
      }
    });
  }).nodeify(cb);
}

/**
 * opts:
 *   - buffer: capture stdout to an array
 *   - silent: don't print to screen
 *   - stdio: custom io handling forwarded to child_process.spawn
 */
exports.get = function (dir, opts) {
  opts = merge(opts, {cwd: dir});

  var client = function () {
    var last = arguments.length - 1;
    var singleOpts = arguments[last - 1];
    var cb = arguments[last];

    if (typeof cb !== 'function') {
      singleOpts = cb;
      cb = void 0;
      last++;
    }

    if (typeof singleOpts === 'object') {
      singleOpts = merge({}, singleOpts, opts);
      --last;
    } else {
      singleOpts = merge({}, opts);
    }

    // TODO fix arguments allocation
    var args = Array.prototype.slice.call(arguments, 0, last);
    return spawnWithLogger(args, singleOpts, cb);
  };

  for (var functionName in gitFunctions) {
    client[functionName] = gitFunctions[functionName];
  }

  return client;
};

