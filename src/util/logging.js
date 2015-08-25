var printf = require('printf');
var chalk = require('chalk');

var Writable = require('stream').Writable;
var errorToString = require('./toString').errorToString;

// save the current console values in case we overwrite them later
exports.console = console;
exports.log = console.log;
exports.error = console.error;

exports.DEBUG = 1;
exports.LOG = 2;
exports.INFO = 3;
exports.WARN = 4;
exports.ERROR = 5;
exports.NONE = 10;

var Class = require('jsio')('jsio.base').Class;

/*
 * The formatter takes a tag and stdout/err streams and prints them nicely. used
 * by things that log. Note: always print to stderr. stdout is for passing stuff
 * between our processes.
 */
var _loggers = {};
exports.get = function (name, isSilent, buffers) {
  var logger = _loggers[name] || (_loggers[name] = new exports.Logger(name));
  if (buffers) {
    logger.setBuffers(buffers, isSilent);
  }

  return logger;
};

exports.install = function () {
  var logger = exports.get('devkit');
  console.log = logger.log.bind(logger);
};

var _lastPrefix;

exports.Logger = Class(Writable, function () {
  this._outHadNewLine = true;
  this._errHadNewLine = true;

  this.init = function (tag) {
    Writable.call(this);

    this._tag = tag;
    this._prefix = exports.getPrefix(tag);

    this._level = exports.LOG;
  };

  // adds writable streams to this logger that pipe to the console unless
  // isSilent is set to true
  this.createStreams = function (buffers, isSilent) {
    return new LoggerStream(this, buffers, isSilent);
  };

  var LoggerStream = Class(function () {
    this.init = function (logger, buffers, isSilent) {
      this._logger = logger;
      this._isSilent = isSilent === undefined ? false : isSilent;
      this._buffers = {};

      buffers.forEach(function (name) {
        if (!this[name]) {
          this[name] = new Writable();
          this[name]._write = bind(this, '_buffer', name);
          this._buffers[name] = [];
        }
      }, this);
    };

    this.get = function (name) {
      return this._buffers[name].join('');
    };

    this._buffer = function (buffer, chunk, encoding, cb) {
      var data = chunk.toString();
      if (this._buffers[buffer]) {
        this._buffers[buffer].push(data);
      }

      if (!this._isSilent) {
        this._logger._write(data);
      }

      cb && cb();
    };
  });

  this.constructor.indent = function (indent, str) {
    var prefix = new Array(indent + 1).join(' ');
    return str.split('\n').map(function (line) {
      return prefix + line;
    }).join('\n');
  };

  this.format = function (str) {
    if (str instanceof Error) {
      if (str.showStack === false) {
        return str.toString();
      } else {
        return '\n' + errorToString(str);
      }
    }

    if (typeof str == 'object') {
      return str;
    }

    return ('' + str)
      .split('\n')
      .join('\n ' + exports.nullPrefix);
  };

  this.setLevel = function (level) {
    this._level = level;
  };

  // call these for formatted logging from code
  this.debug = function () {
    this._level <= exports.DEBUG && this._log(undefined, arguments);
  };

  this.log = function () {
    this._level <= exports.LOG && this._log(undefined, arguments);
  };

  this.info = function () {
    this._level <= exports.INFO && this._log(undefined, arguments);
  };

  this.warn = function () {
    this._level <= exports.WARN && this._log(exports.warnPrefix, arguments);
  };

  this.error = function () {
    this._level <= exports.ERROR && this._log(exports.errorPrefix, arguments);
  };

  this._log = function (prefix, args) {
    args = Array.prototype.map.call(args, this.format, this);
    prefix && args.unshift(prefix);
    args.unshift(this._getRenderPrefix());
    exports.error.apply(exports.console, args);
  };

  this._getRenderPrefix = function () {
    if (_lastPrefix == this._prefix) {
      return exports.nullPrefix;
    } else {
      _lastPrefix = this._prefix;
      return this._prefix;
    }
  };

  this._write = function (chunk, encoding, cb) {
    var buffer = this._buffer || (this._buffer = '');
    buffer += chunk.toString();
    while (true) {
      var splitAt = buffer.indexOf('\n');
      if (splitAt >= 0) {
        // stderr
        exports.error(this._getRenderPrefix() + ' ' + this.format(buffer.substring(0, splitAt)));
        buffer = buffer.substring(splitAt + 1);
      } else {
        break;
      }
    }

    this._buffer = buffer;

    cb && cb();
  };

  this.getPrefix = function () { return this._prefix; };

  this.toString = function() {
    return this._buffer.join("\n");
  };

  // deprecated
  // backwards-compatible logging API
  Object.defineProperty(this, 'out', {
    'get': function () {
      return this.log.bind(this);
    }
  });

  // deprecated
  // backwards-compatible logging API
  Object.defineProperty(this, 'err', {
    'get': function () {
      return this.error.bind(this);
    }
  });
});

exports.nullPrefix = printf('%18s ', '');
exports.warnPrefix = chalk.yellow('[warn] ');
exports.errorPrefix = chalk.red('[error] ');

exports.getPrefix = function (tag) {
  return chalk.cyan(printf('%18s ', tag && '[' + tag + ']' || ''));
};
