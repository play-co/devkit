var gulp = require('gulp');
var nib = require('nib');
var path = require('path');
var plugins = require('gulp-load-plugins')();
var fs = require('fs');
var UglifyJS = require('uglify-js');

var compress = true;
var sourcemaps = false;

var paths = {
  'build': path.join(__dirname, 'build/'),
  'base': path.join(__dirname, '..'),
  'js': path.join(__dirname, 'debugger/'),
  'jsio': path.join(__dirname, '..', '..', 'node_modules', 'jsio', 'packages'),
  'squill': path.join(__dirname, '..', '..', 'node_modules', 'squill')
};

gulp.task('default', ['setup-dev', 'dist', 'watch']);

gulp.task('setup-dev', function () {
  compress = false;
  sourcemaps = true;
});

gulp.task('watch', ['setup-dev'], function () {
  gulp.watch('debugger/**/*.styl', ['styles']);
  gulp.watch('debugger/**/*.js', ['js']);
});

gulp.task('styles', function () {
  return gulp
    .src('debugger/inspector.styl')
    .pipe(plugins.stylus({
      use: nib(),
      sourcemap: sourcemaps,
      compress: compress
    }))
    .pipe(plugins.concat('inspector.css'))
    .pipe(gulp.dest(paths.build));
});

gulp.task('js', function (cb) {
  var jsio = require('jsio');
  var compilerPath = path.join(jsio.__env.getPath(), '..', 'compilers');
  jsio.path.add(compilerPath);

  var compiler = jsio('import jsio_compile.compiler');
  compiler.start(['jsio_compile', paths.js, 'import src.devkit-view-inspector.debugger'], {
    cwd: paths.base,
    environment: 'browser',
    path: [paths.jsio],
    includeJsio: false,
    appendImport: true,
    compressSources: compress,
    compressResult: compress,
    pathCache: {
      jsio: paths.jsio,
      squill: paths.squill,
      src: paths.base
    },
    interface: {
      setCompiler: function (compiler) { this.compiler = compiler; },
      run: function (args, opts) { this.compiler.run(args, opts); },
      onError: function (err) {
        cb && cb(err);
      },
      onFinish: function (opts, code) {
        if (!fs.existsSync(paths.build)) {
          fs.mkdirSync(paths.build);
        }

        code = ';(function(jsio){' + code + '})(jsio.clone());';
        var filename = path.join(paths.build, 'compiled.js');
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
});

gulp.task('dist', ['js', 'styles']);
