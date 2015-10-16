var fs = require('fs-extra');
var path = require('path');
var nib = require('nib');
var Promise = require('bluebird');

var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();

var UglifyJS = require('uglify-js');

/**
 * Usage: gulp [task]
 *
 * VALID TASKS
 *  - (no task specified)
 *       builds and watches for changes
 *  - publish
 *       cleans and builds for deployment
 *  - build
 *       builds docs into dist/
 */

var MAIN_JS_FILES = ['index.js', 'apps.js', 'devkit.js', 'mobile/apps.js', 'remote/index.js'];

var paths = {
  'dest': 'src/serve/static/',
  'js': path.join(__dirname, 'src/web/'),
  'jsio': path.join(__dirname, 'node_modules', 'jsio', 'packages'),
  'squill': path.join(__dirname, 'node_modules', 'squill')
};

var globs = {
  'js': 'src/web/**/*.js',
  'static': 'src/web/**/!(*.js|*.styl)',
  'stylus': 'src/web/stylesheets/*.styl',
  'stylusWatcher': 'src/web/stylesheets/**/*.styl', // catches includes too
};

// default settings
var sourcemaps = false;
var compress = true;

gulp.task('default', plugins.sequence('setup-dev', 'build', 'watch'));

gulp.task('setup-dev', function (cb) {
  // overwrite defaults
  sourcemaps = true;
  compress = false;
  cb();
});

gulp.task('watch', function () {
  gulp.watch(globs.js, ['js']);
  gulp.watch(globs.static, ['static']);
  gulp.watch(globs.stylusWatcher, ['stylus']);
  gulp.src(paths.dest);
});


var jsio = require('jsio');
var compilerPath = path.join(jsio.__env.getPath(), '..', 'compilers');
function getCompiler() {
  var j = jsio.clone();
  j.path.add(compilerPath);
  return j('import jsio_compile.compiler');
}

gulp.task('js', function (cb) {

  jsio.path.add(compilerPath);

  Promise.map(MAIN_JS_FILES, function (file) {
      var importString = path.join('.', file);
      return new Promise(function (resolve, reject) {
        getCompiler().start(['jsio_compile', paths.js, importString], {
          cwd: paths.js,
          environment: 'browser',
          path: [paths.jsio],
          includeJsio: true,
          appendImport: true,
          compressSources: compress,
          compressResult: compress,
          pathCache: {
            jsio: paths.jsio,
            squill: paths.squill
          },
          interface: {
            setCompiler: function (compiler) { this.compiler = compiler; },
            run: function (args, opts) { this.compiler.run(args, opts); },
            onError: function (err) {
              cb && cb(err);
            },
            onFinish: function (opts, code) {
              if (!fs.existsSync(paths.dest)) {
                fs.mkdirSync(paths.dest);
              }

              var filename = path.join(paths.dest, file);
              fs.outputFile(filename, code, function (err) {
                if (err) {
                  reject(err);
                } else {
                  resolve();
                }
              });
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

              // console.log(filename, '-->', result.code)
              cb(result.code);
            }
          }
        });
      });
    })
    .nodeify(cb);
});

gulp.task('stylus', function () {
  return gulp
    .src(globs.stylus)
    .pipe(plugins.stylus({

      // cross-platform css rules
      use: nib(),

      // inline @import-ed css files, required since we import directly from node_modules
      'include css': true,

      // deploy opts
      sourcemap: sourcemaps,
      compress: compress
    }))
    .pipe(plugins.rename({extname: '.css'}))
    .pipe(gulp.dest(paths.dest));
});

gulp.task('static', function () {
  // copy all images and static files to dist/ unmodified
  return gulp
    .src(globs.static)
    .pipe(plugins.filter(function (file) {
      return file.stat.isFile();
    }))
    .pipe(plugins.debug({title: 'static'}))
    .pipe(gulp.dest(paths.dest));
});

gulp.task('clean', function (cb) {
  require('fs-extra').remove(paths.dest, cb);
});

gulp.task('build', ['stylus', 'js', 'static']);

gulp.task('publish', plugins.sequence('clean', 'build'));
