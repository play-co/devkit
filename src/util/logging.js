var printf = require('printf');
var chalk = require('chalk');

var Writable = require('stream').Writable;
var errorToString = require('./toString').errorToString;

exports.DEBUG = 1;
exports.LOG = 2;
exports.INFO = 3;
exports.WARN = 4;
exports.ERROR = 5;
exports.NONE = 10;

/*
 * The formatter takes a tag and stdout/err streams and prints them nicely. used by things that log.
 * note: always print to stderr. stdout is for passing stuff between our processes.
 */
var _loggers = {};
exports.get = function (name, isSilent, buffers) {
  var logger = _loggers[name] || (_loggers[name] = new exports.Logger(name));
  if (buffers) {
    logger.setBuffers(buffers, isSilent);
  }

  return logger;
};

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
      this._isSilent = isSilent || false;
      this._buffers = {};
      this._hadNewLine = {};

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
        if (this._hadNewLine[buffer]) {
          process.stderr.write(this._prefix);
        }

        process.stderr.write(this.format(data));
        this._hadNewLine[buffer] = /\n$/.test(data);
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
      return '\n' + errorToString(str);
    }

    if (typeof str == 'object') {
      return str;
    }

    return ('' + str);

      // add colour to our build logs so that it's easier to see if and where things went wrong.
      //.replace(/\d*(^|\s|[^a-zA-Z0-9-])error(s|\(s\))?/gi, function (res) { return chalk.redBright(res); })
      //.replace(/\d*(^|\s|[^a-zA-Z0-9-])warn(ing)?(s|\(s\))?/gi, function (res) { return chalk.redBright(res); })

      // fix new lines
      //.replace(/\r?\n(?!$)/g, '\n' + this._prefix);
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
    this._level <= exports.WARN && this._log(chalk.yellow('[warn] '), arguments);
  };

  this.error = function () {
    this._level <= exports.ERROR && this._log(chalk.red('[error] '), arguments);
  };

  this._log = function (prefix, args) {
    args = Array.prototype.map.call(args, this.format, this);
    prefix && args.unshift(prefix);
    args.unshift(this._prefix);
    console.error.apply(console, args);
  };

  this._write = function (chunk, encoding, cb) {
    this._log(undefined, chunk.toString());
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

exports.getPrefix = function (tag) {
  return chalk.cyan(printf('%15s   ', '[' + tag + ']'));
};

