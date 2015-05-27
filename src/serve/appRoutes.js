var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');

var apps = require('../apps/');
var baseModules = require('../modules').getBaseModules();

var jvmtools = require('../jvmtools');
var logging = require('../util/logging');
var buildQueue = require('./buildQueue');

var logger = logging.get('routes');

var HOME = process.env.HOME
      || process.env.HOMEPATH
      || process.env.USERPROFILE;

exports.addToAPI = function (opts, api) {

  var modulesApp = express();
  api.use('/modules/', modulesApp);

  // root express app
  var baseApp = opts.app;

  // Rebuilds the app for a requested target (e.g. browser-mobile) and scheme
  // (debug/release). Returns the url where the app is hosted.
  api.get('/simulate', function (req, res) {

    var appPath = req.query.app.replace(/^~[\/\\]/, HOME + path.sep);
    var outputPath = path.join(appPath, 'build', 'debug', 'simulator');
    var buildOpts = {
          target: req.query.target,
          scheme: req.query.scheme,
          simulated: true,
          simulateDeviceId: req.query.deviceId,
          simulateDeviceType: req.query.deviceType,
          output: outputPath
        };

    mountApp(appPath, outputPath)
      .then(function (mountInfo) {
        return buildQueue
          .add(appPath, buildOpts)
          .then(function () {
            res.json(mountInfo);
          })
      })
      .catch(function (e) {
        res.status(500).send({
          message: e.message,
          stack: e.stack
        });
      });
  });

  function addSimulatorAPI(app) {
    // a better js syntax checker
    app.use('/api/syntax', bodyParser.urlencoded({extended: true}));
    app.post('/api/syntax', function(req, res) {
      jvmtools.checkSyntax(req.body.javascript, function (err, syntaxErrors) {
        if (err) {
          res.send([false, err]);
        } else {
          res.send([true, syntaxErrors]);
        }
      });
    });
  }

  var _mountedApps = {};
  function mountApp(appPath, outputPath) {
    if (!_mountedApps[appPath]) {
      _mountedApps[appPath] = apps.get(appPath)
        .then(function mountExtensions(app) {
          var routeId = generateRouteId(appPath);
          var simulatorApp = express();
          baseApp.use('/apps/' + routeId, simulatorApp);

          simulatorApp.use('/', express.static(outputPath));
          addSimulatorAPI(simulatorApp);

          var modules = app.getModules();
          var debuggerURLs = {};
          var simulatorURLs = {};
          var loadExtension = function (module) {
            var extension = module.loadExtension('debugger');
            if (!extension || !extension.getMiddleware) { return; }
            try {
              var routes = extension.getMiddleware(require('../api'), app);
              if (!routes) { return; }

              var routeName;

              if (routes.simulator) {
                routeName = '/modules/' + module.name;
                simulatorApp.use(routeName, routes.simulator);
                simulatorURLs[module.name] = '/apps/' + routeId + routeName;
              }

              if (routes.debugger) {
                routeName = '/' + routeId + '/' + module.name;
                modulesApp.use(routeName, routes.debugger);
                debuggerURLs[module.name] = '/api/modules' + routeName;
              }
            } catch (e) {
              logger.error('Unable to mount simulator middleware for',
                           module.name, e);
            }
          };

          Object.keys(modules).forEach(function (moduleName) {
            var module = modules[moduleName];
            loadExtension(module);
          });

          baseModules.forEach(function (module) { loadExtension(module); });

          return {
              id: routeId,
              url: '/apps/' + routeId + '/',
              simulatorURLs: simulatorURLs,
              debuggerURLs: debuggerURLs
            };
        });
    }

    return Promise.resolve(_mountedApps[appPath]);
  }

  // tracks used route uuids
  var _routes = {};
  var _routeMap = {};

  // create a unique route hash from the app path
  function generateRouteId(appPath) {
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

    // increase until unique
    var routeId;
    do {
      routeId = hash.toString(36);
    } while ((routeId in _routes) && ++hash);
    _routes[routeId] = true;
    _routeMap[appPath] = routeId;
    return routeId;
  }
};
