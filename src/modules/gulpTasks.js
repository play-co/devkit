var gulp = require('gulp');
var nib = require('nib');
var path = require('path');
var plugins = require('gulp-load-plugins')();
var fs = require('fs');
var UglifyJS = require('uglify-js');
var resolve = require('resolve');
var Promise = require('bluebird');

var CompilerTasks = require('./CompilerTasks');

var logging = require('../util/logging');


var GulpTasks = Class(CompilerTasks, function(supr) {

  this.init = function(opts) {
    supr(this, 'init', arguments);

    this.paths = {
      base: path.join(__dirname, '..', '..'),
      jsio: path.dirname(resolve.sync('jsio')),
      squill: path.join(__dirname, '..', '..', 'node_modules', 'squill'),

      stylusMain: path.join(this.srcPath, 'stylus', 'main.styl')
    };

    this.logger = logging.get('GulpTasks.' + this.moduleName + '.' + this.src);

    this.compress = false;
    this.sourcemaps = false;

    this.promiseBuildStylus = Promise.promisify(this._buildStylus.bind(this));
    this.promiseBuildJS = Promise.promisify(this._buildJS.bind(this));
  };


  this._buildStylus = function (stylusMainPath, cb) {
    this.logger.info('Compiling stylus for ' + this.moduleName + ': ' + stylusMainPath);

    var stream = gulp.src(stylusMainPath)
      .pipe(plugins.stylus({
        use: nib(),
        sourcemap: this.sourcemaps,
        compress: this.compress
      }))
      .pipe(plugins.concat('index.css'))
      .pipe(gulp.dest(this.buildPath));

    stream.on('end', function() {
      cb();
    });
    stream.on('error', function(err) {
      cb(err);
    });
  };


  this._buildJS = function (cb) {
    var moduleMain = this.src;
    var buildPath = this.buildPath;
    var jsPath = this.srcPath;
    var basePath = path.dirname(jsPath);

    var logger = this.logger;
    logger.info('Compiling jsMain for ' + this.moduleName + ': ' + moduleMain);
    logger.debug('jsio path:', this.paths.jsio);
    logger.debug('module jsPath:', jsPath);

    var jsio = require('jsio');
    var compilerPath = path.join(jsio.__env.getPath(), '..', 'compilers');
    jsio.path.add(compilerPath);

    var compiler = jsio('import jsio_compile.compiler');
    compiler.start(['jsio_compile', jsPath, 'import src.' + moduleMain], {
      cwd: basePath,
      environment: 'browser',
      path: [this.paths.jsio],
      includeJsio: false,
      appendImport: true,
      compressSources: this.compress,
      compressResult: this.compress,
      pathCache: {
        jsio: this.paths.jsio,
        squill: this.paths.squill,
        src: basePath
      },
      interface: {
        setCompiler: function (compiler) { this.compiler = compiler; },
        run: function (args, opts) { this.compiler.run(args, opts); },
        onError: function (err) {
          logger.error('Error while compiling:', err);
          cb && cb(err);
        },
        onFinish: function (opts, code) {
          if (!fs.existsSync(buildPath)) {
            fs.mkdirSync(buildPath);
          }

          code = ';(function(jsio){' + code + '})(jsio.clone());';
          var filename = path.join(buildPath, 'index.js');
          fs.writeFile(filename, code, cb);
        },
        compress: function (filename, src, opts, cb) {
          var result = UglifyJS.minify(src, {
            fromString: true,
            compress: {
              global_defs: {
                DEBUG: false
              }
            }
          });

          cb(result.code);
        }
      }
    });
  };


  this.compile = function(tasks) {
    // Check for stylus main file
    if (fs.existsSync(this.paths.stylusMain)) {
      tasks.push(this.promiseBuildStylus(this.paths.stylusMain));
    }

    // Check for javascript stuff (required)
    tasks.push(this.promiseBuildJS());
  };


  this.watch = function(tasks) {
    var runningTask = null;
    var taskQueue = [];
    var queueTask = function(fn) {
      if (runningTask) {
        this.logger.info('watch task already running, queueing');
        taskQueue.push(fn);
        return;
      }

      runningTask = fn();
      runningTask.then(function() {
        if (taskQueue.length > 0) {
          runningTask = taskQueue.shift()();
        } else {
          runningTask = null;
        }
      });
    }.bind(this);

    gulp.watch(path.join(this.srcPath, 'stylus', '**', '**.styl'), function() {
      this.logger.info('stylus changed');
      queueTask(function() {
        return this.promiseBuildStylus(this.paths.stylusMain);
      }.bind(this));
    }.bind(this));

    gulp.watch([
      path.join(this.srcPath, '**', '**.js')
    ], function() {
      this.logger.info('js changed');
      queueTask(function() {
        return this.promiseBuildJS();
      }.bind(this));
    }.bind(this));
  };

});


module.exports = GulpTasks;
