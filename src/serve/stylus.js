var path = require('path');
var fs = require('fs');

var stylus = require('stylus');
var nib = require('nib');

module.exports = function (basePath) {
  return function stylusMiddleware(req, res, next) {
    if ('GET' != req.method && 'HEAD' != req.method) return next();
    var pathname = req.path;
    if (!/\.styl$/.test(pathname)) { return next(); }

    var stylusPath = path.join(basePath, pathname);
    fs.readFile(stylusPath, 'utf8', function(err, str) {
      if (err) {
        if ('ENOENT' == err.code) {
          return res.send(404, err);
        }

        return next(err)
      }

      stylus(str)
        .set('filename', stylusPath)
        .set('sourcemap', {inline: true})
        .use(nib())
        .define('theme', req.query.theme ? req.query.theme : 'dark')
        .render(function(err, css) {
          if (err) return next(err);

          res.header('Content-Type', 'text/css');
          res.send(css);
        });
    });
  }
}
