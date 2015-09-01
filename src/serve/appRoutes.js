var path = require('path');
var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var Promise = require('bluebird');
var readFile = Promise.promisify(fs.readFile);

var express = require('express');

var api = require('../api/');
var apps = require('../apps/');
var baseModules = require('../modules').getBaseModules();

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
  baseApp.io.on('connection', function(socket) {
    logger.info('socket connected');

    socket.on('handshake', function (appPath) {
      MountedApp.get(baseApp, appPath)
        .then(function (mountedApp) {
          mountedApp.addSocket(socket);
        });
    });

    socket.on('disconnect', function() {
      logger.info('socket disconnect');
    });
  });

  // Rebuilds the app for a requested target (e.g. browser-mobile) and scheme
  // (debug/release). Returns the url where the app is hosted.
  api.get('/simulate', function (req, res) {
    // from the mobile site
    var isMobile = (req.query.mobile == 'true');
    var buildOpts = {
        target: isMobile ? 'browser-mobile' : req.query.target,
        scheme: isMobile ? 'debug' : req.query.scheme,
        simulated: true,
        simulateDeviceId: req.query.deviceId,
        simulateDeviceType: req.query.deviceType
      };

    MountedApp.get(baseApp, req.query.app)
      .then(function (mountedApp) {
        buildOpts.output = mountedApp.buildPath;
        return buildQueue.add(mountedApp.app.paths.root, buildOpts)
          .then(function (buildResult) {
            return [mountedApp, buildResult];
          });
      })
      .spread(function (mountedApp, buildResult) {
        res.json(mountedApp);
      })
      .catch(function (e) {
        res.status(500).send({
          message: e.message,
          stack: e.stack
        });
      });
  });

  api.get('/mobileIndex', function (req, res) {
    MountedApp.get(baseApp, req.query.app)
      .then(function (mountedApp) {
        var filePath = mountedApp.buildPath;
        return readFile(path.join(filePath, 'index.html'), 'utf8')
          .then(function (html) {
            var baseURL = mountedApp.url;
            res.send(simulateMobileHTML(html, baseURL));
          });
      })
      .catch(function (e) {
        res.status(500).send({
          message: e.message,
          stack: e.stack
        });
      });
  });

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
};

var RouteIds = (function () {
  // tracks used route uuids
  var _routes = {};
  var _routeMap = {};

  // create a unique route hash from the app path
  return {
    generate: function (appPath) {
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
})();

var MountedApp = Class(EventEmitter, function () {
  this.init = function (app, buildPath) {
    this.id = RouteIds.generate(app.paths.root);
    this.expressApp = express();
    this.app = app;
    this.url = '/apps/' + this.id + '/';
    this.sockets = [];
    this.debuggerURLs = {};
    this.buildPath = buildPath;

    // setup routes
    this.expressApp.use('/', express.static(buildPath));

    var modules = app.getModules();
    Object.keys(modules).forEach(function (moduleName) {
      var module = modules[moduleName];
      this.loadExtensions(module);
    }, this);

    baseModules.forEach(function (module) {
      this.loadExtensions(module);
    }, this);
  };

  this.loadExtensions = function (module) {
    var route = '/modules/' + module.name;
    var info = module.getExtension('debugger');
    if (info) {
      // mount dynamic routes
      if (info.routes) {
        var moduleRoutes = express();
        var routes = require(path.join(module.path, info.routes));
        if (routes.init) {
          routes.init(api, this.app.toJSON(), moduleRoutes);
          this.expressApp.use(route, moduleRoutes);
        } else {
          logger.warn('expecting an init function for the routes of',
              module.path + ', but init was not found!');
        }
      }

      // setup a main file
      if (info.main) {
        var mainFile = info.main;
        var ext = path.extname(mainFile).toLowerCase();
        if (!ext) {
          mainFile += '.js';
          ext = '.js';
        }

        // simulator will init all urls in this.debuggerURLs
        var routeName = route + '/' + mainFile;
        this.debuggerURLs[module.name] = '/apps/' + this.id + routeName;
      }

      // mount static routes
      if (info.static) {
        var staticPath = path.join(module.path, info.static);
        this.expressApp.use(route, express.static(staticPath));
      }
    }
  };

  this.emit = function (name, data) {
    this.sockets.forEach(function (socket) {
      socket.emit(name, data);
    });
  };

  this.toJSON = function () {
    return {
      id: this.id,
      url: this.url,
      appPath: this.app.paths.root,
      buildPath: this.buildPath,
      debuggerURLs: this.debuggerURLs
    };
  };
});

MountedApp._appsByPath = {};
MountedApp.get = function (baseApp, appPath) {
  appPath = path.normalize(appPath
      .replace(/^~[\/\\]/, HOME + path.sep)
      .replace(/[\/\\]/g, path.sep));

  var buildPath = path.join(appPath, 'build', 'debug', 'simulator');

  if (!MountedApp._appsByPath[appPath]) {
    MountedApp._appsByPath[appPath] = apps.get(appPath)
      .then(function (app) {
        var mountedApp = new MountedApp(app, buildPath);
        baseApp.use('/apps/' + mountedApp.id, mountedApp.expressApp);
        return mountedApp;
      });
  }

  return MountedApp._appsByPath[appPath];
};
