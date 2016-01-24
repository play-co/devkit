var printf = require('printf');
var chalk = require('chalk');
var eyes = require('eyes');

var Writable = require('stream').Writable;
var errorToString = require('./toString').errorToString;


var inspect = eyes.inspector({
  styles: {                 // Styles applied to stdout
    all:     'white',      // Overall style applied to everything
    label:   'underline', // Inspection labels, like 'array' in `array: [1, 2, 3]`
    other:   'inverted',  // Objects which don't have a literal representation, such as functions
    key:     'bold',      // The keys in object literals, like 'a' in `{a: 1}`
    special: 'grey',      // null, undefined...
    string:  'green',
    number:  'magenta',
    bool:    'blue',      // true false
    regexp:  'green',     // /\d+/
  },
  pretty: true,
  maxLength: 2048,
  stream: null
});


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

exports.defaultLogLevel = exports.LOG;

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

    this._level = null;
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
      return exports.DEBUG ? inspect(str) : str;
    }

    // It's actually a string!
    return ('' + str)
      .split('\n')
      .join('\n ' + exports.nullPrefix);
  };

  this.setLevel = function (level) {
    this._level = level;
  };

  this.getLevel = function() {
    return this._level || exports.defaultLogLevel;
  };

  // call these for formatted logging from code
  this.debug = function () {
    this.getLevel() <= exports.DEBUG && this._log(exports.DEBUG && exports.debugPrefix, arguments);
  };

  this.log = function () {
    this.getLevel() <= exports.LOG && this._log(exports.DEBUG && exports.infoPrefix, arguments);
  };

  this.info = function () {
    this.getLevel() <= exports.INFO && this._log(exports.DEBUG && exports.infoPrefix, arguments);
  };

  this.warn = function () {
    this.getLevel() <= exports.WARN && this._log(exports.warnPrefix, arguments);
  };

  this.error = function () {
    this.getLevel() <= exports.ERROR && this._log(exports.errorPrefix, arguments);
  };

  /** Use this if you want to skip log formatting (don't use this unless you really mean it) */
  this.trace = function() {
    if (process.env.DEVKIT_TRACE) {
      console.log.apply(console, arguments);
    }
  };

  this._log = function (prefix, args) {
    // Run custom formatter on each individual argument
    args = Array.prototype.map.call(args, this.format, this);

    // Add the prefix if there is one
    if (prefix) {
      args.unshift(prefix);
    }
    // Add the render prefix (coloring, mostly)
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
    return this._buffer.join('\n');
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
exports.debugPrefix = chalk.gray('[debug] ');
exports.infoPrefix = chalk.white('[info]  ');
exports.warnPrefix = chalk.yellow('[warn]  ');
exports.errorPrefix = chalk.red('[error] ');

exports.getPrefix = function (tag) {
  return chalk.cyan(printf('%18s ', tag && '[' + tag + ']' || ''));
};
