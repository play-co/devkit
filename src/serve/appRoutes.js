var path = require('path');
var http = require('http');
var ff = require('ff');

var childProcess = require('child_process');
var express = require('express');
var bodyParser = require('body-parser');

var apps = require('../apps/');
var jvmtools = require('../jvmtools');
var logging = require('../util/logging');

var logger = logging.get('routes');

var HOME = process.env.HOME
      || process.env.HOMEPATH
      || process.env.USERPROFILE;

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
      var args = {
        appPath: req.query.app.replace(/^~[\/\\]/, HOME + path.sep),
        buildOpts: {
          target: req.query.target,
          scheme: req.query.scheme,
          simulated: true,
          simulateDeviceId: req.query.deviceId,
          simulateDeviceType: req.query.deviceType
        }
      };

      var f = ff(this, function () {
        if (opts.separateBuildProcess) {
          logger.log('running build in separate process');
          var build = childProcess.fork(
            path.resolve(__dirname, '../build/fork'), [JSON.stringify(args)]
          );
          var onBuild = f();
          build.on('message', function (msg) { onBuild(msg.err, msg.res); });
        } else {
          build = require('../build/');
          build.build(args.appPath, args.buildOpts, f());
        }

        if (!_moduleMap[args.appPath]) {
          mountExtensions(args.appPath, f.wait());
        }
      }, function (build) {
        mountApp(args.appPath, build.config.outputPath, f());
      }).error(function (err) {
        logger.log(err);
        return res.send(500, err);
      }).success(function () {
        res.json(portMap[args.appPath].res);
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

      var moduleRoutes = {};
      var route = generateRoute(appPath);
      var middleware = express();
      modulesApp.use(route, middleware);

      var modules = app.getModules();
      var extensionNames = [];
      Object.keys(modules).forEach(function (moduleName) {
        var module = modules[moduleName];
        var extension = module.loadExtension('simulator');
        if (extension && extension.getMiddleware) {
          try {
            var routes = extension.getMiddleware(require('../api'), app);
          } catch (e) {
            logger.error(
              'Unable to mount simulator middleware for', moduleName
            );
            logger.error(e);
          }

          if (routes) {
            extensionNames.push(module.name);
            moduleRoutes[module.name] = routes;

            // host devkit
            if (routes.devkit) {
              middleware.use('/' + module.name, routes.devkit);
            }

            // host simulator routes on simulator server
            if (portMap[appPath] && routes.simulator) {
              portMap[appPath].middleware.use(
                '/' + module.name, routes.simulator
              );
            }
          }
        }
      });

      _moduleMap[appPath] = {
        middleware: middleware,
        routes: moduleRoutes,
        info: {
          key: route,
          route: '/modules' + route,
          names: extensionNames
        }
      };

      cb(null, _moduleMap[appPath]);
    });
  }

  function mountApp(appPath, outputPath, cb) {
    if (appPath in portMap) {
      // TODO When output path changes, update app
      // portMap[appPath].app.
      return cb(null, portMap[appPath].res);
    }

    var simulatorApp = express();
    simulatorApp.use('/', express.static(outputPath));

    // a better js syntax checker
    simulatorApp.use('/api/syntax', bodyParser.urlencoded({extended: true}));
    simulatorApp.post('/api/syntax', function(req, res) {
      jvmtools.checkSyntax(req.body.javascript, function (err, syntaxErrors) {
        if (err) {
          res.send([false, err]);
        } else {
          res.send([true, syntaxErrors]);
        }
      });
    });

    var routes = _moduleMap[appPath].routes;
    Object.keys(routes).forEach(function (name) {
      if (routes[name] && routes[name].simulator) {
        simulatorApp.use('/modules/' + name, routes[name].simulator);
      }
    });

    if (opts.singlePort) {
      var route = '/apps' + _moduleMap[appPath].info.key;
      baseApp.use(route, simulatorApp);
      portMap[appPath] = {
        res: {url: route},
        middleware: simulatorApp
      };
      cb && cb(null, portMap[appPath].res);
    } else {
      var simulatorServer = http.createServer(simulatorApp);
      baseApp.io.listen(simulatorServer);

      var listen = function listen() {
        var port = basePort++;
        simulatorServer.listen(port, function () {
          logger.log('binding port', port, 'to', outputPath);

          portMap[appPath] = {
              port: port,
              res: {port: port},
              middleware: simulatorApp
            };

          cb && cb(null, portMap[appPath].res);
        }).on('error', function (e) {
          if (e.code === 'EADDRINUSE') {
            listen();
          }
        });
      };

      listen();
    }
  }

  // maps app paths to the corresponding module express app
  var _moduleMap = {};

  // tracks used route uuids
  var _routes = {};
  var _routeMap = {};

  // create a unique route hash from the app path
  function generateRoute(appPath) {
    if (appPath in _routeMap) {
      return _routeMap[appPath];
    }

    // compute a hash
    var hash = 5381;
    var i = appPath.length;
    while(i) {
      hash = (hash * 33) ^ appPath.charCodeAt(--i);
    }
    hash >>> 0;

    // get a unique route
    var route;
    do {
      route = '/' + hash.toString(36) + '/';
    } while ((route in _routes) && ++hash);
    _routes[route] = true;
    _routeMap[appPath] = route;
    return route;
  }
};
