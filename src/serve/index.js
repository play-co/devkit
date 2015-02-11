var path = require('path');
var fs = require('fs');
var http = require('http');
var express = require('express');
var bodyParser = require('body-parser');
var printf = require('printf');
var os = require('os');
var exec = require('child_process').exec;
var open = require('open');
var YAML = require('js-yaml');

var apps = require('../apps');
var baseModules = require('../modules').getBaseModules();

var ip = require('../util/ip');
var logging = require('../util/logging');

var config = require('../config');
var jvmtools = require('../jvmtools');

var stylus = require('./stylus');
var importMiddleware = require('./import');
var appRoutes = require('./appRoutes');

var logger = logging.get('serve');

// launches the web server
exports.serveWeb = function (opts, cb) {
  var basePort = opts.port;
  var incrementPorts = !opts.singlePort;

  // common.track("BasilServe");
  var app = express();
  var server = http.Server(app);

  app.io = require('socket.io')(server);

  // var deviceManager = require('./deviceManager').get();
  // deviceManager.init(app.io);

  app.use(function noCacheControl(req, res, next) {
    res.header('Cache-Control', 'no-cache');
    res.header('Expires', '-1');
    next();
  });

  app.use('/api/', getAPIRouter(merge({
    simulatorPort: basePort + 1,
    app: app
  }, opts)));

  // serve compiled CSS
  app.use('/', stylus(getPath('static')));

  // serve compiled JS
  app.use(/^(?!\/apps\/|\/api\/)/, importMiddleware(getPath('static/')));

  // serve static files
  app.use('/', express.static(getPath('static')));

  baseModules.forEach(function (module) {
    var ext = module.loadExtension('simulator');
    if (ext) {
      var api = {};
      ext.init(api);
    }
  });

  // Serve
  server.listen(basePort, function () {
    exports.serveTestApp(basePort);

    logger.log(printf('serving at http://localhost:%(port)s/ and http://%(ip)s:%(port)s/', {
      ip: ip.getLocalIP(),
      port: basePort
    }));

    config.startWatch();

    cb && cb();
  }).on('error', function (e) {
    console.log(e);
    if (e.code == 'EADDRINUSE') {
      cb && cb(e);
      cb = null;
    }
  });
};

exports.serveTestApp = function (basePort) {
  // Launch multicast server (only on OS X for now)
  var addresses = ip.getLocalIP();
  var address = addresses[0];
  if (address) {
    var hostname = require('os').hostname();
    jvmtools.exec({
      tool: 'jmdns',
      args: [
        '-rs', hostname, 'devkit._tcp', 'local', basePort
      ]
    }, function (err, stdout, stderr) {
    });
  }
}

function getAPIRouter(opts) {

  var api = express();
  var send = require('send');
  var deviceTypes = require('../util/deviceTypes');

  api.get('/devices', function (req, res) {
    res.json(deviceTypes);
  });

  api.get('/app', function (req, res) {
    var appPath = req.query.app;
    apps.get(appPath, {updateLastOpened: false}, function (err, app) {
      res.json(app);
    });
  });

  api.get('/apps', function (req, res) {
    var reload = req.query.reload;
    apps.getApps(function (err, apps) {
      if (reload) {
        for (var appPath in apps) {
          apps[appPath].reloadSync();
        }
      }

      if (err) {
        res.status(404).send(err);
      } else {
        res.json(apps);
      }
    });
  });

  api.get('/openAppExternal', function (req, res) {
    apps.get(req.query.app, {updateLastOpened: false}, function (err, app) {
      if (app) {
        // Used open package to
        open(app.paths.root);
      }

      res.status(200).send();
    });

  });

  api.get('/title', function (req, res) {
    var appPath = req.query.app;
    apps.get(appPath, {updateLastOpened: false}, function (err, app) {
      if (err) { return res.status(404).send(err); }

      // TODO: localized titles?
      res.status(200).send(app.manifest.title);
    })
  });

  api.get('/icon', function (req, res) {
    var appPath = req.query.app;
    apps.get(appPath, {updateLastOpened: false}, function (err, app) {
      if (err) { return res.status(404).send(err); }
      res.sendFile(
        path.join(app.paths.root, app.getIcon(req.query.targetSize || 512)),
        function (err) {
          if (err) {
            res.status(err.status).end();
          }
        }
      );
    })
  });

  api.get('/manifest', function (req, res) {
    var appPath = req.query.app;
    apps.get(appPath, {updateLastOpened: false}, function (err, app) {
      if (err) { return res.status(404).send(err); }
      res.send(app.manifest);
    });
  });

  api.get('/home', function (req, res) {
    res.json({path: process.env.HOME
      || process.env.HOMEPATH
      || process.env.USERPROFILE});
  });

  // gets the ip of the server.
  // usage: make a GET request to /api/ip
  api.get('/ip', function (req, res) {
    res.json({ip: ip.getLocalIP()});
  });

  // a better js syntax checker
  api.use('/syntax', bodyParser.urlencoded({extended: true}));
  api.post('/syntax', function(req, res) {
    jvmtools.checkSyntax(req.body.javascript, function (err, syntaxErrors) {
      if (err) {
        res.send([false, err]);
      } else {
        res.send([true, syntaxErrors]);
      }
    });
  });

  // endpoint to retrive compiled javascript
  api.get('/compile/*', function (req, res) {

  });

  appRoutes.addToAPI(opts, api);

  return api;
}


function getPath() {
  return path.join.apply(path, [__dirname].concat(Array.prototype.slice.call(arguments)));
}
