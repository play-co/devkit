var path = require('path');
var argv = require('optimist').argv;
var EventEmitter = require('events').EventEmitter;

// clone to modify the path for this jsio but not any others
var jsio = require('jsio').clone();
var logging = require('../util/logging');
var logger = logging.get('jsioCompile');

var DevKitJsioInterface = Class(function () {

  this.logger = logging.get('jsioCompile');

  this.init = function (bridge) {
    this._bridge = bridge;
  }

  // interface methods for jsioCompile hooks

  this.setCompiler = function (compiler) {
    this._compiler = compiler;
  }

  this.run = function (args, opts) {
    this._compiler.run(args, opts);
  }

  this.onError = function (msg) {
    logger.error(msg);
    process.nextTick(this._bridge.emit.bind(this._bridge, 'error', msg));
  }

  this.onFinish = function (opts, src) {
    process.nextTick(this._bridge.emit.bind(this._bridge, 'success', src));
  }

  /**
   * Create a custom compression option.
   */
  this.compress = function (filename, src, opts, cb) {
    throw new Error("not supported");
  }
});

exports.JsioCompiler = Class(EventEmitter, function () {

  this.init = function (opts) {
    var basePath = jsio.__env.getPath();

    this.opts = merge(opts, {
      environment: 'browser',
      includeJsio: true,
      appendImport: true,
      jsioPath: basePath,
      path: [],
      preprocessors: ['import', 'cls', 'logger']
    });

    this.opts.path.push(basePath);
  }

  this.compile = function (imports) {
    var importStatement = 'import ' + (Array.isArray(imports) ? imports.join(', ') : imports);
    var _jsio = jsio.clone();

    var compilerPath = path.join(jsio.__env.getPath(), '..', 'compilers');
    _jsio.path.add(compilerPath);

    var compiler = _jsio('import jsio_compile.compiler');

    // for debugging purposes, build the equivalent command that can be executed
    // from the command-line (not used for anything other than logging to the screen)
    var cmd = ["jsio_compile", JSON.stringify(importStatement)];
    for (var key in this.opts) {
      cmd.push('--' + key);

      var value = JSON.stringify(this.opts[key]);
      if (typeof this.opts[key] != 'string') {
        value = JSON.stringify(value);
      }
      cmd.push(value);
    }

    logger.log(cmd.join(' '));

    // The DevKitJsioInterface implements platform-specific functions that the js.io
    // compiler needs like basic control flow and compression.  It's really more
    // like a controller that conforms to the js.io-compiler's (controller) interface.
    this.opts['interface'] = new DevKitJsioInterface(this);
    this.opts['preCompress'] = this.preCompress.bind(this);

    // start the compile by passing something equivalent to argv (first argument is
    // ignored, but traditionally should be the name of the executable?)
    compiler.start(['jsio_compile', this.opts.cwd || '.', importStatement], this.opts);
    return this;
  }

  this.setCwd = function (cwd) { this.opts.cwd = cwd; }

  this.preCompress = function (srcTable) {}

});
