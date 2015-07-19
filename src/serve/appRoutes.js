var path = require('path');
var fs = require('fs');
var Promise = require('bluebird');
var readFile = Promise.promisify(fs.readFile);

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
    var opts;
    if (req.query.mobile == 'true') {
      // from the mobile site
      opts = {
        app: req.query.app,
        target: 'browser-mobile',
        scheme: 'debug'
      };
    } else {
      opts = {
        app: req.query.app,
        target: req.query.target,
        scheme: req.query.scheme,
        deviceId: req.query.deviceId,
        deviceType: req.query.deviceType
      };
    }

    buildFromRequest(opts)
      .then(function (mountInfo) {
        res.json(mountInfo);
      })
      .catch(function (e) {
        res.status(500).send({
          message: e.message,
          stack: e.stack
        });
      });
  });

  function mountAppFromRequest(opts) {
    var appPath = opts.app.replace(/^~[\/\\]/, HOME + path.sep);
    var buildPath = path.join(appPath, 'build', 'debug', 'simulator');
    return mountApp(appPath, buildPath);
  }

  function buildFromRequest(opts) {
    return mountAppFromRequest(opts)
      .then(function (mountInfo) {
        var buildOpts = {
              target: opts.target,
              scheme: opts.scheme,
              simulated: true,
              simulateDeviceId: opts.deviceId,
              simulateDeviceType: opts.deviceType,
              output: mountInfo.buildPath
            };

        return buildQueue
          .add(mountInfo.appPath, buildOpts)
          .return(mountInfo);
      });
  }

  function simulateMobileHTML(html, baseURL) {
    var baseTag = '<base href="'
                  // escape $ for safe regex replace
                  + baseURL.replace(/\$/g, '%24')
                  // escape " for safe usage as an html attribute value
                           .replace(/"/, '%22') + '">';

    html = html.replace(/(<head.*?>)/, '$1' + baseTag);
    // html += '<script src="/compile/mobile/simulator.js"></script>';

    return html;
  }

  api.get('/mobileIndex', function (req, res) {
    mountAppFromRequest({
      app: req.query.app
    })
      .bind({})
      .then(function (mountInfo) {
        this.mountInfo = mountInfo;
        var filePath = mountInfo.buildPath;
        return readFile(path.join(filePath, 'index.html'), 'utf8');
      })
      .then(function (html) {
        var baseURL = this.mountInfo.url;
        res.send(simulateMobileHTML(html, baseURL));
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
  function mountApp(appPath, buildPath) {
    if (!_mountedApps[appPath]) {
      _mountedApps[appPath] = apps.get(appPath)
        .then(function mountExtensions(app) {
          var routeId = generateRouteId(appPath);
          var simulatorApp = express();
          baseApp.use('/apps/' + routeId, simulatorApp);

          // Special case src directories
          simulatorApp.use('/modules', express.static(path.join(appPath, 'modules')));
          simulatorApp.use('/src', express.static(path.join(appPath, 'src')));
          // Static serve builds
          simulatorApp.use('/', express.static(buildPath));

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
              appPath: appPath,
              buildPath: buildPath,
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
