
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

    var _args = [prefix + args[0]].concat(interp);
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
