var printf = require('printf');
var chalk = require('chalk');
var eyes = require('eyes');

var Writable = require('stream').Writable;
var errorToString = require('./toString').errorToString;
var Class = require('jsio')('jsio.base').Class;


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

exports.LEVELS = {
  SILLY: {
    prefix: chalk.gray('[silly] '),
    level: 5
  },
  DEBUG: {
    prefix: chalk.gray('[debug] '),
    level: 4
  },
  LOG: {
    prefix: chalk.white('[log]   '),
    prefixLevel: 4,
    level: 3
  },
  INFO: {
    prefix: chalk.white('[info]  '),
    prefixLevel: 4,
    level: 3
  },
  WARN: {
    prefix: chalk.yellow('[warn]  '),
    level: 2
  },
  ERROR: {
    prefix: chalk.red('[error] '),
    level: 1
  },
  NONE: {
    prefix: printf('%18s ', ''),
    level: 10
  }
};

exports.defaultLogLevel = exports.LEVELS.INFO.level;


var _lastPrefix;


var LoggerStream = Class(function () {
  this.init = function (logger, buffers, isSilent) {
    this._logger = logger;
    this._isSilent = isSilent === undefined ? false : isSilent;
    this._buffers = {};

    // add buffer instances
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


exports.Logger = Class(Writable, function () {
  this._outHadNewLine = true;
  this._errHadNewLine = true;

  this.init = function (tag) {
    Writable.call(this);

    this._tag = tag;
    this._prefix = exports.getPrefix(tag);

    this._level = null;

    // add logging functions
    Object.keys(exports.LEVELS).forEach(function(key) {
      var logLevel = exports.LEVELS[key];
      this[key.toLowerCase()] = function() {
        var currentLevel = this.getLevel();
        if (currentLevel >= logLevel.level) {
          var prefix;
          if (currentLevel >= (logLevel.prefixLevel || logLevel.level)){
            prefix = logLevel.prefix;
          }
          this._log(prefix, arguments);
        }
      }.bind(this);
    }.bind(this));
  };

  // adds writable streams to this logger that pipe to the console unless
  // isSilent is set to true
  this.createStreams = function (buffers, isSilent) {
    return new LoggerStream(this, buffers, isSilent);
  };

  this.constructor.indent = function (indent, str) {
    var prefix = new Array(indent + 1).join(' ');
    return str.split('\n').map(function (line) {
      return prefix + line;
    }).join('\n');
  };

  this.setLevel = function (level) {
    this._level = level;
  };

  this.getLevel = function() {
    return this._level || exports.defaultLogLevel;
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
      var currentLevel = this.getLevel();
      return currentLevel >= exports.LEVELS.DEBUG.level ? inspect(str) : str;
    }

    // It's actually a string!
    return ('' + str)
      .split('\n')
      .join('\n ' + exports.LEVELS.NONE.prefix);
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
      return exports.LEVELS.NONE.prefix;
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

exports.getPrefix = function (tag) {
  return chalk.cyan(printf('%18s ', tag && '[' + tag + ']' || ''));
};
