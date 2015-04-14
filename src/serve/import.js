var path = require('path');

var JsioCompiler = require('../build/jsio_compiler').JsioCompiler;

var ROOT_PATH = path.join(__dirname, '..', '..');

module.exports = function (basePath) {

  return function importMiddleware(req, res, next) {
    if ('GET' != req.method && 'HEAD' != req.method) return next();
    var pathname = req.path;
    if (!/\.js$/.test(pathname)) { return next(); }

    var compiler = new JsioCompiler({
      env: 'browser',
      cwd: basePath,

      // add a trailing import statement so the JS executes the requested import
      // immediately when downloaded
      appendImport: true,

      // path: anything in these folders is importable
      path: [
          path.join(ROOT_PATH, 'node_modules/ff/lib/'),
          path.join(ROOT_PATH, 'node_modules/printf/lib')
        ],

      // pathCache: key-value pairs of prefixes that map to folders (eg. prefix
      // 'squill' handles all 'sqill.*' imports)
      pathCache: {
        'squill': path.join(ROOT_PATH, 'node_modules/squill/')
      }
    });

    var imp = pathname.replace(/\.js$/, '').replace(/\//g, '.');
    compiler.compile([imp, 'jsio.preprocessors.import', 'jsio.preprocessors.cls', 'jsio.util.syntax'])
      .on('error', function (err) {
        res.status(404)
           .send(err);
      })
      .on('success', function (src) {
        res.header('Content-Type', 'application/javascript');
        res.send(src);
      });
  };
};
