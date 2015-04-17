var gulp = require('gulp');
var nib = require('nib');
var plugins = require('gulp-load-plugins')();

var compress = true;
var sourcemaps = false;

gulp.task('default', ['setup-dev', 'dist', 'watch']);

gulp.task('setup-dev', function () {
  compress = false;
  sourcemaps = true;
});

gulp.task('watch', ['setup-dev'], function () {
  gulp.watch('debugger/stylesheets/**/*.styl', ['dist']);
});

gulp.task('dist', function () {
  return gulp
    .src('debugger/stylesheets/*.styl')
    .pipe(plugins.stylus({
      use: nib(),
      sourcemap: sourcemaps,
      compress: compress
    }))
    .pipe(plugins.concat('inspector.css'))
    .pipe(gulp.dest('debugger/static'));
});
