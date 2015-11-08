var path = require('path');
var fs = require('fs');
var gulp = require('gulp');
var stylus = require('stylus');
var nib = require('nib');

var compress = true;
var sourcemaps = false;

var devkit = path.join(__dirname, '../../src/web/');

gulp.task('default', ['setup-dev', 'dist', 'watch']);

gulp.task('setup-dev', function () {
  compress = false;
  sourcemaps = true;
});

gulp.task('watch', ['setup-dev'], function () {
  gulp.watch(path.join(__dirname, 'mobileUI/stylesheets/**/*.styl'), ['dist']);
});

gulp.task('dist', function (cb) {

  var filename = path.join(__dirname, 'mobileUI', 'stylesheets', 'debugMenu.styl');
  var output = path.join(__dirname, 'mobileUI', 'embeddedCSS.js');
  fs.readFile(filename, 'utf8', function (err, res) {
    if (err) { return cb(err); }

    stylus(res)
      .set('filename', filename)
      .set('sourcemap', sourcemaps ? {inline: true} : false)
      .set('compress', compress)
      .set('paths', [path.join(devkit, 'stylesheets')])
      .use(nib())
      .render(function (err, css) {
        if (err) { return cb(err); }

        fs.writeFile(output, [
            'from util.browser import $;',
            'var style = $({tag: \'style\', parent: $(\'head\')[0]});',
            'style.innerText = ' + JSON.stringify(css) + ';'
          ].join('\n'), cb);
      });
  });
});
