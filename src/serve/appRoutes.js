var path = require('path');
var http = require('http');
var express = require('express');

var apps = require('../apps/');
var build = require('../build/');
var logging = require('../util/logging');

var logger = logging.get('routes');

// A mapping between app paths and http ports that we're listening on.
// Each app gets a unique port.  We try to keep each app on a separate
// port.
//
//    portMap[pathToApp:string] = {
//        port: httpPort:integer,
//        app: expressApp:object
var portMap = {};

exports.addToAPI = function (opts, api) {

  var modulesApp = express();
  api.use('/modules/', modulesApp);

  // Hosts a app's modules at /modules/uuid/module-name and returns the
  // host path. The uuid is a unique hash of the app path so we can host
  // multiple app's modules on the same express server without conflict.
  api.get('/hostModules', function (req, res) {
      var appPath = req.query.app;
      mountExtensions(appPath, function (err, mount) {
        if (err) { return res.send(500, err); }

        res.json(mount.info);
      });
    });

  // root express app
  var baseApp = opts.app;

  // initial simulator port to try (each simulator gets its own port)
  var basePort = opts.simulatorPort;

  // Rebuilds the app for a requested target (e.g. browser-mobile) and scheme
  // (debug/release). Reuses the port assigned to the app or allocates a new
  // port if none exists. Returns the port where the app is hosted.
  api.get('/simulate', function (req, res) {
      var appPath = req.query.app;

      build.build(req.query.app, {
        target: req.query.target,
        scheme: req.query.scheme,
        simulated: true,
        simulateDeviceId: req.query.deviceId,
        simulateDeviceType: req.query.deviceType
      }, function (err, build) {
        if (err) {
          res.send(500, err);
        } else {
          mountApp(appPath, build.config.outputPath, function (err) {
            if (err) { return res.send(500, err); }

            res.json({port: portMap[appPath].port});
          });
        }
      });
    });

  // mounts the simulator extensions for a app on an express app
  //
  // returns {
  //    app: expressApp:object
  //    modules: [ moduleName:string, ... ]
  // }
  function mountExtensions (appPath, cb) {
    if (_moduleMap[appPath]) {
      // TODO: if we reload these modules then we won't have to restart the
      // devkit process when they change
      return cb && cb(null, _moduleMap[appPath]);
    }

    apps.get(appPath, function (err, app) {
      if (err) { return cb(err); }

      var modules = {};
      var route = generateRoute(appPath);
      var middleware = express();
      modulesApp.use(route, middleware);

      app.getModules().forEach(function (module) {
        var extension = module.loadExtension('simulator');
        if (extension && extension.getMiddleware) {
          try {
            var routes = extension.getMiddleware(require('../api'));
          } catch (e) {
            logger.error(e);
          }

          if (routes) {
            modules[module.name] = routes;

            // host devkit
            if (routes.devkit) {
              middleware.use('/' + module.name, routes.devkit);
            }

            // host simulator routes on simulator server
            if (portMap[appPath] && routes.simulator) {
              portMap[appPath].middleware.use('/' + module.name, routes.simulator);
            }
          }
        }
      });

      _moduleMap[appPath] = {
        middleware: middleware,
        modules: modules,
        info: {
          route: '/modules' + route,
          names: Object.keys(modules)
        }
      };

      cb(null, _moduleMap[appPath]);
    });
  }

  function mountApp(appPath, outputPath, cb) {
    if (appPath in portMap) {
      // TODO When output path changes, update app
      // portMap[appPath].app.
      return cb(null, portMap[appPath]);
    }

    var simulatorApp = express();
    simulatorApp.use('/', express.static(outputPath));

    var modules = _moduleMap[appPath].modules;
    Object.keys(modules).forEach(function (name) {
      if (modules[name] && modules[name].simulator) {
        simulatorApp.use('/modules/' + name, modules[name].simulator);
      }
    });

    var simulatorServer = http.createServer(simulatorApp);
    baseApp.io.listen(simulatorServer);
    listen();

    function listen() {
      var port = basePort++;
      simulatorServer.listen(port, function () {
        logger.log("binding port", port, "to", outputPath);

        portMap[appPath] = {
            port: port,
            middleware: simulatorApp
          };

        cb && cb(null, {port: port});
      }).on('error', function (e) {
        if (e.code == 'EADDRINUSE') {
          listen();
        }
      });
    }
  }

  // maps app paths to the corresponding module express app
  var _moduleMap = {};

  // tracks used route uuids
  var _routes = {};

  // create a unique route hash from the app path
  function generateRoute(appPath) {

    // compute a hash
    var hash = 5381;
    var i = appPath.length;
    while(i) {
      hash = (hash * 33) ^ appPath.charCodeAt(--i);
    }
    hash >>> 0;

    // get a unique route
    var route;
    do { route = '/' + hash.toString(36) + '/'; } while ((route in _routes) && ++hash);
    _routes[route] = true;
    return route;
  }
}
