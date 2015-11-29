
var Logger = Class(function() {

  this.init = function(name, opts) {
    opts = opts || {};

    this._name = name;
    this._tagColor = opts.tagColor || 'blue';
  };

  this.log = this.info = function() {
    this._doLog(console.log, 'INFO', arguments);
  };

  this.warn = function() {
    this._doLog(console.warn, 'WARN', arguments);
  };

  this.error = function() {
    this._doLog(console.error, 'ERROR', arguments);
  };

  this._doLog = function(fn, level, args) {
    // ensure args is an array object
    args = Array.prototype.slice.call(args);
    var interp = [];

    var prefix = '%c[' + this._name + ']';
    interp.push('color: ' + this._tagColor);

    if (level === 'WARN') {
      prefix += '\t%c[warn]';
      interp.push('color: orange');
    }
    else if (level === 'ERROR') {
      prefix += '\t%c[error]';
      interp.push('color: red');
    }

    prefix += '\t%c';
    interp.push('color: black');

    var _args = [prefix];
    if (typeof args[0] === 'string') {
      _args[0] += args[0];
      _args = _args.concat(interp);
    } else {
      _args = _args.concat(interp);
      _args.push(args[0]);
    }

    if (args.length > 1) {
      _args = _args.concat(Array.prototype.slice.call(args, 1));
    }

    fn.apply(console, _args);
  };

  this.get = function(name) {
    return new Logger(this._name + '.' + name);
  };

})

module.exports = Logger;
