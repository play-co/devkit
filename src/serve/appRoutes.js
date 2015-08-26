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

var chokidar = require('chokidar');

var logger = logging.get('routes');

var HOME = process.env.HOME
      || process.env.HOMEPATH
      || process.env.USERPROFILE;
var ROUTE_INACTIVE_TIME_LIMIT = 30 * 60 * 1000;

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
    } else if (req.query.remote == 'true') {
      opts = {
        app: req.query.app,
        target: 'native-archive',
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
      .spread(function (mountInfo, buildResult) {
        res.json(mountInfo);
        // Finally, add all of the resource routes (some are dynamically added at build by devkit modules)
        var simulatorApp = getAppByPath(mountInfo.appPath);
        if (!simulatorApp._areResourcesMounted) {
          simulatorApp._areResourcesMounted = true;
          buildResult.config.directories.forEach(function(resource) {
            simulatorApp.use(
              path.join('/' + resource.target),
              express.static(resource.src)
            );
          });
        }
      })
      .catch(function (e) {
        logger.error('Error mounting app', e.stack);
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

        return buildQueue.add(mountInfo.appPath, buildOpts)
          .then(function (buildResult) {
            return [mountInfo, buildResult];
          });
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

  // Promises that resolve with mount info once ready
  var _mountedApps = {};
  // Map of appId -> app
  var _availableSimulatorApps = {};
  var getAppByPath = function(appPath) {
    for (var appId in _availableSimulatorApps) {
      var app = _availableSimulatorApps[appId];
      if (app.appPath === appPath) {
        return app;
      }
    }
    return null;
  };

  baseApp.use('/apps/:appId', function(req, res, next) {
    var app = _availableSimulatorApps[req.params.appId];
    if (app) {
      app(req, res, next);
    } else {
      next();
    }
  });

  baseApp.io.on('connection', function(socket) {
    logger.info('socket connected');

    socket.on('watch', function(appPath) {
      // Add this socket to the app
      var app = getAppByPath(appPath);
      if (app) {
        app.sockets.push(socket);
      }
    });

    socket.on('disconnect', function() {
      logger.info('socket disconnect');
    });

  });

  function mountApp(appPath, buildPath) {
    var routeId = generateRouteId(appPath);

    if (!_mountedApps[appPath]) {
      _mountedApps[appPath] = apps.get(appPath)
        .then(function mountExtensions(app) {
          var simulatorApp = express();

          // Special case src directories
          simulatorApp.use(
            '/modules',
            express.static(path.join(appPath, 'modules'))
          );
          simulatorApp.use(
            '/src',
            express.static(path.join(appPath, 'src'))
          );
          simulatorApp.use(
            '/lib',
            express.static(path.join(appPath, 'lib'))
          );

          simulatorApp._areResourcesMounted = false;

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

          // Add socket connection
          simulatorApp.sockets = [];
          simulatorApp.socketEmit = function(name, data) {
            simulatorApp.sockets.forEach(function(socket) {
              socket.emit(name, data);
            });
          };

          // Everything is set, add some file watchers
          simulatorApp.watchers = [];
          simulatorApp.watchers.push(
            chokidar.watch(
              [
                path.join(appPath, 'manifest.json'),
                path.join(appPath, 'src'),
                path.join(appPath, 'resources')
              ],
              { recursive: true, followSymLinks: false, persistent: true, ignoreInitial: true }
            ).on('all', function(event, path) {
              logger.info(routeId + ': changed ' + path);
              simulatorApp.socketEmit('watch:changed', path);
            })
          );

          // Meta data
          simulatorApp.appPath = appPath;

          // Add to available routes, return info
          _availableSimulatorApps[routeId] = simulatorApp;
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

    // Remove and clean up the routes after a bit of inactivity
    var mountedApp = _mountedApps[appPath];
    // remove the old timeout
    if (mountedApp.cleanupTimeout) {
      clearTimeout(mountedApp.cleanupTimeout);
    }
    mountedApp.cleanupTimeout = setTimeout(
      unmountApp.bind(null, appPath, routeId),
      ROUTE_INACTIVE_TIME_LIMIT
    );

    return Promise.resolve(mountedApp);
  }

  function unmountApp(appPath, routeId) {
    logger.info('Shutting down route for: ' + appPath + ' (' + routeId + ')');

    var app = _availableSimulatorApps[routeId];

    // Close sockets
    app.sockets.forEach(function(socket) {
      socket.disconnect();
    });

    // Remove watchers
    app.watchers.forEach(function(watcher) {
      watcher.close();
    });

    // Remove app routes
    delete _availableSimulatorApps[routeId];
    delete _mountedApps[appPath];
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
