var path = require('path');
var http = require('http');
var express = require('express');
var compression = require('compression');
var bodyParser = require('body-parser');
var printf = require('printf');
var open = require('open');

var apps = require('../apps');

var ip = require('../util/ip');
var logging = require('../util/logging');

var config = require('../config');

var appRoutes = require('./appRoutes');
var routeIds = require('./routeIds');

var logger = logging.get('serve');

var Z_BEST_COMPRESSION = 9;

// launches the web server
exports.serveWeb = function (opts, cb) {
  var port = opts.port;

  // common.track("BasilServe");
  var app = express();
  var server = http.Server(app);

  app.io = require('socket.io')(server);

  // var deviceManager = require('./deviceManager').get();
  // deviceManager.init(app.io);

  app.use(compression({level: Z_BEST_COMPRESSION}));

  app.use(function noCacheControl(req, res, next) {
    res.header('Cache-Control', 'no-cache');
    res.header('Expires', '-1');
    next();
  });

  app.use('/api/', getAPIRouter(merge({
    app: app
  }, opts)));

  // serve static files
  app.use('/', express.static(getPath('static')));

  // Serve
  server.listen(port, function () {
    logger.log(printf('serving at http://localhost:%(port)s/ and '
      + 'http://%(ip)s:%(port)s/', {
          ip: ip.getLocalIP(),
          port: port
        }));

    config.startWatch();

    cb && cb();
  }).on('error', function (e) {
    console.log(e);
    if (e.code === 'EADDRINUSE') {
      cb && cb(e);
      cb = null;
    }
  });
};

function getAPIRouter(opts) {

  var api = express();
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
        var appData = {};
        for (var appPath in apps) {
          appData[appPath] = apps[appPath].toJSON();
          appData[appPath].routeId = routeIds.generate(appPath);
        }

        res.json(appData);
      }
    });
  });

  api.get('/redirect', function (req, res) {
    var url = req.query.url;
    var app = req.query.app;
    apps.get(app, {updateLastOpened: false}, function (err, app) {
      url = url.replace(/:app/g, app)
        .replace(/:routeId/g, routeIds.generate(app.paths.root));
      console.log(url);
      res.redirect(url);
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
    });
  });

  api.get('/icon', function (req, res) {
    var appPath = req.query.app;
    apps.get(appPath, {updateLastOpened: false}, function (err, app) {
      if (err) { return res.status(404).send(err); }
      var iconFile = app.getIcon(req.query.targetSize || 512);
      var iconPath = path.join(app.paths.root, iconFile);
      res.sendFile(iconPath);
    });
  });

  api.get('/manifest', function (req, res) {
    var appPath = req.query.app;
    apps.get(appPath, {updateLastOpened: false}, function (err, app) {
      if (err) { return res.status(404).send(err); }
      res.send(app.manifest);
    });
  });

  api.get('/upgrade', function (req, res) {
    apps.get(req.query.app, {updateLastOpened: false}, function (err, app) {
      var module = req.query.module || 'devkit-core';
      var version = req.query.version || 'latest';
      require('../install').installModule(app, module, {version: version}, function (err, result) {
        if (err) {
          console.log(err.stack);
          res.status(500).send(err.message);
        } else {
          res.status(200).send(result);
        }
      });
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

  appRoutes.addToAPI(opts, api);

  return api;
}

function getPath() {
  var args = [__dirname].concat(Array.prototype.slice.call(arguments));
  return path.join.apply(path, args);
}
