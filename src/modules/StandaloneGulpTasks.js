var path = require('path');
var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();
var source = require('vinyl-source-stream');
var browserify = require('browserify');
var watchify = require('watchify');
var babelify = require('babelify');
var nib = require('nib');
var Promise = require('bluebird');

var CompilerTasks = require('./CompilerTasks');

var _logger = require('../util/logging');
var logger = _logger.get('StandaloneGulpTasks');


var StandaloneGulpTasks = Class(CompilerTasks, function(supr) {

  this.init = function(opts) {
    supr(this, 'init', arguments);

    this.path = {
      HTML: path.join(this.srcPath, '**', '**.html'),
      HTML_INDEX: path.join(this.srcPath, 'index.html'),
      MINIFIED_OUT: 'build.min.js',
      OUT: 'build.js',
      DEST: this.buildPath,
      DEST_BUILD: path.join(this.buildPath, 'build'),
      DEST_SRC: path.join(this.buildPath, 'src'),
      ENTRY_POINT: path.join(this.srcPath, 'index.js'),
      CSS_ENTRY_POINT: path.join(this.srcPath, 'css', '*.styl'),
      STYLUS_FILES: path.join(this.srcPath, 'css', '**', '**.*'),
      FONT: path.join(this.srcPath, 'fonts', '*.*'),
      DEST_FONT: path.join(this.buildPath, 'fonts')
    };

    this.compress = false;
    this.sourcemaps = false;
  };

  this.stylus = function () {
    return gulp
      .src(this.path.CSS_ENTRY_POINT)
      .pipe(plugins.stylus({

        // cross-platform css rules
        use: nib(),

        // inline @import-ed css files
        'include css': true,

        // deploy opts
        sourcemap: this.sourcemaps,
        compress: this.compress
      }))
      .pipe(plugins.rename({extname: '.css'}))
      .pipe(gulp.dest(this.path.DEST))
      .pipe(plugins.livereload());
  };

  this.copy = function() {
    return gulp.src(this.path.HTML)
      .pipe(gulp.dest(this.path.DEST))
      .pipe(plugins.livereload());
  };

  this.font = function() {
    return gulp.src(this.path.FONT)
      .pipe(gulp.dest(this.path.DEST_FONT));
  };

  // ['copy', 'font', 'stylus']
  this._watch = function() {
    this.sourcemaps = true;
    this.compress = false;

    plugins.livereload.listen();

    gulp.watch(this.path.HTML, this.copy.bind(this));
    gulp.watch(this.path.STYLUS_FILES, this.stylus.bind(this));

    var watcher  = watchify(browserify({
      entries: [this.path.ENTRY_POINT],
      transform: [babelify.configure({stage: 0})],
      debug: true,
      cache: {}, packageCache: {}, fullPaths: true
    }));

    return watcher.on('update', function () {
      logger.log('updating...');
      watcher.bundle()
        .on('error', function (err) {
          logger.log(err.toString());
          this.emit('end');
        })
        .pipe(source(this.path.OUT))
        .pipe(plugins.debug())
        .pipe(gulp.dest(this.path.DEST_SRC))
        .pipe(plugins.livereload());
    }.bind(this))
      .bundle()
      .pipe(source(this.path.OUT))
      .pipe(gulp.dest(this.path.DEST_SRC));
  };

  this.build = function() {
    return browserify({
      entries: [this.path.ENTRY_POINT],
      transform: [babelify.configure({stage: 0})],
    })
      .bundle()
      .pipe(source(this.path.MINIFIED_OUT))
      .pipe(plugins.streamify(plugins.uglify()))
      .pipe(gulp.dest(this.path.DEST_BUILD));
  };

  this.replaceHTML = function() {
    return gulp.src(this.path.HTML)
      .pipe(plugins.htmlReplace({
        'js': 'build/' + this.path.MINIFIED_OUT
      }))
      .pipe(gulp.dest(this.path.DEST));
  };

  this.runAsPromise = function(taskName) {
    logger.info('Starting:', taskName);
    return new Promise(function(resolve, reject) {
      var stream = (this[taskName].bind(this))();

      stream.on('end', function() {
        logger.info('Complete:', taskName);
        resolve();
      });
      stream.on('error', function(err) {
        logger.info('Error:', taskName, err);
        reject(err);
      });
    }.bind(this));
  };

  this.compile = function(tasks) {
    tasks.push(this.runAsPromise('copy'));
    tasks.push(this.runAsPromise('stylus'));
    tasks.push(this.runAsPromise('build'));
    tasks.push(this.runAsPromise('font'));
  };

  this.watch = function(tasks) {
    tasks.push(this.runAsPromise('_watch'));
  };

});

module.exports = StandaloneGulpTasks;
// gulp.task('production', ['replaceHTML', 'build', 'font']);

// gulp.task('default', ['watch']);
