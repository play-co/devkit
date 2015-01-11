var printf = require('printf');
var color = require('cli-color');
var Writable = require('stream').Writable;
var errorToString = require('./toString').errorToString;
var fs = require('fs');

/*
 * The formatter takes a tag and stdout/err streams and prints them nicely. used by things that log.
 * note: always print to stderr. stdout is for passing stuff between our processes.
 */

// When set, all logs are written to this file
var _fileTarg = null;
var _pendingWrites = 0;
var _totalWrites = 0;
var _shouldEnd = false;
exports.setFileTarg = function(path) {
  // Open file
  _fileTarg = fs.createWriteStream(path, {flags: 'w', encoding: 'unicode'});
  // Reset the write counters
  _pendingWrites = 0;
  _totalWrites = 0;
  // When set true, we start checking total writes against pending, and when they match, we close the stream
  _shouldEnd = false;
}
exports.unsetFileTarg = function() {
  if (_fileTarg) {
    _shouldEnd = true;
    // Check to see if we can end immediately
    _tryFileEnd();
  }
}
var _tryFileEnd = function() {
  if (_shouldEnd) {
    if (_totalWrites >= _pendingWrites) {
      // Close file
      _fileTarg.end()
      _fileTarg = null;
    }
  }
}
var _fileTargCB = function() {
  _totalWrites++;
  _tryFileEnd();
}
var _tryFileWrite = function(s) {
  if (_fileTarg && !_shouldEnd) {
    _pendingWrites++;
    if (Array.isArray(s)) {
      s = s.join(" ");
    } else if (typeof(s) == "string") {
      // pass
    } else {
      s = "<<UNKNOWN OBJECT PASSED TO LOGGER>>";
    }
    _fileTarg.write(s + "\n", _fileTargCB);
  }
}

var _loggers = {};
exports.get = function (name, isSilent, buffers) {
  return new exports.Logger(name, isSilent, buffers);
}

exports.Logger = Class(Writable, function () {
  this._outHadNewLine = true;
  this._errHadNewLine = true;

  this.init = function (tag, isSilent, buffers) {
    Writable.call(this);

    this._tag = tag;
    this._prefix = exports.getPrefix(tag);
    this._isSilent = isSilent || false;

    this._buffers = buffers || {};
    this._hadNewLine = {};

    this.stdout = new Writable();
    this.stdout._write = bind(this, '_buffer', 'stdout');

    this.stderr = new Writable();
    this.stderr._write = bind(this, '_buffer', 'stderr');

    this.out = bind(this, function (data) { this._buffer('out', data); });
    this.err = bind(this, function (data) { this._buffer('err', data); });
  }

  this.constructor.indent = function (indent, str) {
    var prefix = new Array(indent + 1).join(' ');
    return str.split('\n').map(function (line) {
      return prefix + line;
    }).join('\n');
  }

  this.format = function (str) {
    if (str instanceof Error) {
      return '\n' + errorToString(str);
    }

    if (typeof str == 'object') {
      return str;
    }

    return ('' + str)

      // add colour to our build logs so that it's easier to see if and where things went wrong.
      //.replace(/\d*(^|\s|[^a-zA-Z0-9-])error(s|\(s\))?/gi, function (res) { return color.redBright(res); })
      //.replace(/\d*(^|\s|[^a-zA-Z0-9-])warn(ing)?(s|\(s\))?/gi, function (res) { return color.redBright(res); })

      // fix new lines
      //.replace(/\r?\n(?!$)/g, '\n' + this._prefix);
  }

  // call these for formatted logging from code
  this.debug =
  this.info =
  this.log = function () {
    var s = [this._prefix].concat(Array.prototype.map.call(arguments, this.format, this));
    console.error.apply(console, s);
    _tryFileWrite(s);
  }

  this.warn = function () {
    var s = [this._prefix, color.redBright('[warn] ')].concat(Array.prototype.map.call(arguments, this.format, this));
    console.error.apply(console, s);
    _tryFileWrite(s);
  }

  this.error = function () {
    var s = [this._prefix, color.redBright('[error] ')].concat(Array.prototype.map.call(arguments, this.format, this));
    console.error.apply(console, s);
    _tryFileWrite(s);
  }

  this._write = function (chunk, encoding, cb) {
    this._buffer('log', chunk, encoding, cb);
  }

  this._buffer = function (buffer, chunk, encoding, cb) {
    var data = String(chunk);
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
  }

  this.toString = function() {
    return this._buffer.join("\n");
  }

  this.setLevel = function () {}
  this.getPrefix = function () { return this._prefix; }
});

exports.getPrefix = function (tag) {
  return color.cyanBright(printf('%15s   ', '[' + tag + ']'));
}

