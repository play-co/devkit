var path = require('path');
var fs = require('fs');
var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();
var source = require('vinyl-source-stream');
var browserify = require('browserify');
var watchify = require('watchify');
var babelify = require('babelify');
var nib = require('nib');
var Promise = require('bluebird');
var mainBowerFiles = require('main-bower-files');
var bower = require('bower');

var CompilerTasks = require('./CompilerTasks');

var logging = require('../util/logging');


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
      STYLUS_FILES: path.join(this.srcPath, 'css', '**', '*.*'),
      FONT: path.join(this.srcPath, 'fonts', '*.*'),
      DEST_FONT: path.join(this.buildPath, 'fonts'),
      BOWER_JSON: path.join(this.modulePath, 'bower.json'),
      BOWER_DEST: path.join(this.buildPath, 'bower')
    };

    this.logger = logging.get('StandaloneGulpTasks.' + this.moduleName + '.' + this.src);

    this.compress = false;
    this.sourcemaps = true;
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

  this._bower = function() {
    return this.runAsPromise('bowerInstall').then(function() {
      return this.runAsPromise('mainBowerFiles');
    }.bind(this));
  };

  this.bowerInstall = function() {
    return bower.commands.install();
  };

  this.mainBowerFiles = function() {
    var jsFilter = plugins.filter('**/*.js', {restore: true});
    var cssFilter = plugins.filter('**/*.css', {restore: true});

    return gulp.src(mainBowerFiles())
      .pipe(jsFilter)
        .pipe(plugins.debug({ title: 'bower js' }))
        .pipe(plugins.concat('bower.js'))
        .pipe(jsFilter.restore)
      .pipe(cssFilter)
        .pipe(plugins.debug({ title: 'bower css' }))
        .pipe(plugins.concat('bower.css'))
        .pipe(cssFilter.restore)
      .pipe(gulp.dest(this.path.BOWER_DEST));
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
    var logger = this.logger;

    plugins.livereload.listen();

    gulp.watch(this.path.BOWER_JSON, this._bower.bind(this));
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
    this.logger.info('Starting:', taskName);
    return new Promise(function(resolve, reject) {
      var stream = (this[taskName].bind(this))();

      var onEnd = function() {
        this.logger.info('Complete:', taskName);
        resolve();
      }.bind(this);

      var onError = function(err) {
        this.logger.info('Error:', taskName, err);
        reject(err);
      }.bind(this);

      stream.on('end', onEnd);
      stream.on('error', onError);
      stream.on('err', onError);
    }.bind(this));
  };

  this.compile = function(tasks) {
    tasks.push(this.runAsPromise('copy'));
    if (fs.existsSync(this.path.BOWER_JSON)) {
      tasks.push(this._bower());
    }
    tasks.push(this.runAsPromise('stylus'));
    tasks.push(
      this.runAsPromise('build').then(function() {
        return this.runAsPromise('replaceHTML');
      }.bind(this))
    );
    tasks.push(this.runAsPromise('font'));
  };

  this.watch = function(tasks) {
    tasks.push(this.runAsPromise('_watch'));
  };

});

module.exports = StandaloneGulpTasks;
// gulp.task('production', ['replaceHTML', 'build', 'font']);

// gulp.task('default', ['watch']);
