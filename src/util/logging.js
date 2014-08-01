var printf = require('printf');
var color = require('cli-color');
var Writable = require('stream').Writable;
var errorToString = require('./toString').errorToString;

/*
 * The formatter takes a tag and stdout/err streams and prints them nicely. used by things that log.
 * note: always print to stderr. stdout is for passing stuff between our processes.
 */

var _loggers = {};
exports.get = function (name) {
  return _loggers[name] || (_loggers[name] = new exports.Logger(name));
}

exports.Logger = Class(Writable, function () {
  this._outHadNewLine = true;
  this._errHadNewLine = true;

  this.init = function (tag, isSilent, outBuffer, errBuffer) {
    Writable.call(this);

    this._tag = tag;
    this._prefix = exports.getPrefix(tag);
    this._isSilent = isSilent || false;

    this._outBuffer = outBuffer;
    this._errBuffer = errBuffer;

    this.out = this.out.bind(this);
    this.err = this.err.bind(this);
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
      .replace(/\d*(^|\s|[^a-zA-Z0-9-])error(s|\(s\))?/gi, function (res) { return color.redBright(res); })
      .replace(/\d*(^|\s|[^a-zA-Z0-9-])warn(ing)?(s|\(s\))?/gi, function (res) { return color.redBright(res); })

      // fix new lines
      .replace(/\r?\n(?!$)/g, '\n' + this._prefix);
  }

  // call these for formatted logging from code
  this.debug =
  this.info =
  this.log = function () {
    console.error.apply(console, [this._prefix].concat(Array.prototype.map.call(arguments, this.format, this)));
  }

  this.warn = function () {
    console.error.apply(console, [this._prefix, color.redBright('[warn] ')].concat(Array.prototype.map.call(arguments, this.format, this)));
  }

  this.error = function () {
    console.error.apply(console, [this._prefix, color.redBright('[error] ')].concat(Array.prototype.map.call(arguments, this.format, this)));
  }

  // hook these up to streaming logs (stdout and stderr)
  this.out = function (data) {
    if (this._outBuffer) { this._outBuffer.push(data); }
    if (!this._isSilent) {
      if (this._outHadNewLine) {
        process.stderr.write(this._prefix);
      }

      process.stderr.write(this.format(data));
      this._outHadNewLine = /\n$/.test(data);
    }
  }

  this._write = function (chunk, encoding, cb) {
    this.out(chunk);
    cb();
  }

  this.toString = function() {
    return this._buffer.join("\n");
  }

  this.err = function (data) {
    if (this._errBuffer) { this._errBuffer.push(data); }
    if (!this._isSilent) {
      if (this._errHadNewLine) {
        process.stderr.write(this._prefix);
      }

      data = String(data);

      process.stderr.write(this.format(data));
      this._errHadNewLine = /\n$/.test(data);
    }
  }

  this.setLevel = function () {}
  this.getPrefix = function () { return this._prefix; }
});

exports.getPrefix = function (tag) {
  return color.cyanBright(printf('%15s   ', '[' + tag + ']'));
}
