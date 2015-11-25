var path = require('path');
var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var Promise = require('bluebird');
var readFile = Promise.promisify(fs.readFile);

var express = require('express');

var apps = require('../apps/');
var baseModules = require('../modules').getBaseModules();

var logging = require('../util/logging');
var routeIds = require('./routeIds');
var buildQueue = require('./buildQueue');
var routeIdGenerator = require('./routeIdGenerator');

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
  baseApp.io.on('connection', function(socket) {
    logger.info('socket connected');

    socket.on('handshake', function (appPath) {
      logger.info('Socket handshake:', appPath);
      MountedApp.get(appPath)
        .then(function (mountedApp) {
          mountedApp.addSocket(socket);
        });
    });

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

  // preload the routes for known apps
  apps.getAppDirs()
    .map(function (appPath) {
      routeIds.generate(appPath);
    });

  // just-in-time app mounting -- makes it easy to restart devkit and
  // keep the mounted-app routes alives
  baseApp.use('/apps/:routeId/', function (req, res, next) {
    var appPath = routeIds.lookup(req.params.routeId);
    if (appPath) {
      MountedApp.get(appPath)
        .then(function (mountedApp) {
          mountedApp.expressApp(req, res, next);
        });
    } else {
      next();
    }
  });

  api.get('/mount', function (req, res) {
    MountedApp.get(req.query.app)
      .then(function (mountedApp) {
        res.json(mountedApp);
      })
      .catch(function (e) {
        res.status(500).send({
          message: e.message,
          stack: e.stack
        });
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

      if (req.query.remote == 'true') {
        buildOpts.target = 'native-archive';
      }

    MountedApp.get(req.query.app)
      .then(function (mountedApp) {
        return mountedApp.build(buildOpts)
          .then(function (buildResult) {
            res.json(buildResult);
            // Finally, add all of the resource routes (some are dynamically added at build by devkit modules)
            var simulatorApp = mountedApp.expressApp;
            if (!simulatorApp._areResourcesMounted) {
              simulatorApp._areResourcesMounted = true;
              buildResult.config.directories.forEach(function(directory) {
                simulatorApp.use(
                  path.join('/' + directory.target),
                  express.static(directory.src)
                );
              });
            }
          });
      })
      .catch(function (e) {
        logger.error('Error mounting app', e.stack);
        res.status(500).send({
          message: e.message,
          stack: e.stack
        });
      });
  });

  api.get('/mobileIndex', function (req, res) {
    MountedApp.get(req.query.app)
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

var MountedApp = Class(EventEmitter, function () {
  var api = require('../api/');

  this.init = function (app) {
    this.id = routeIds.generate(app.paths.root);
    this.expressApp = express();
    this.app = app;
    this.url = '/apps/' + this.id + '/';
    this.sockets = [];
    this.debuggerURLs = {};
    this.buildPath = path.join(app.paths.root, 'build', 'debug', 'simulator');

    // setup routes //

    // Special case src directories
    this.appPath = this.app.paths.root;
    this.expressApp.use(
      '/modules',
      express.static(path.join(this.appPath, 'modules'))
    );
    this.expressApp.use(
      '/src',
      express.static(path.join(this.appPath, 'src'))
    );
    this.expressApp.use(
      '/lib',
      express.static(path.join(this.appPath, 'lib'))
    );

    this.expressApp.use('/', express.static(this.buildPath));

    // Everything is set, add some file watchers
    this.expressApp.watchers = [];
    this.expressApp.watchers.push(
      chokidar.watch(
        [
          path.join(this.appPath, 'manifest.json'),
          path.join(this.appPath, 'src'),
          path.join(this.appPath, 'resources')
        ],
        { recursive: true, followSymLinks: false, persistent: true, ignoreInitial: true }
      ).on('all', function(event, path) {
        logger.info(this.id + ': changed ' + path);
        this.emit('watch:changed', path);
      }.bind(this))
    );
    // ----- //

    this.expressApp._areResourcesMounted = false;

    var modules = app.getModules();
    Object.keys(modules).forEach(function (moduleName) {
      var module = modules[moduleName];
      this.loadExtensions(module);
    }, this);

    baseModules.forEach(function (module) {
      this.loadExtensions(module);
    }, this);
  };

  this.addSocket = function(clientSocket) {
    this.sockets.push(clientSocket);
    clientSocket.emit('handshakeResponse')
  };

  this.getLastBuildConfig = function () {
    return this._lastConfig;
  };

  this.build = function (opts) {
    opts.output = this.buildPath;

    // approximate build config -- TODO: get real config
    var config = require('../build/steps/getConfig').getConfig(this.app, opts);
    this._lastConfig = config;

    return buildQueue.add(this.app.paths.root, opts);
  };

  this.loadExtensions = function (module) {
    var route = '/modules/' + module.name;
    var info = module.getExtension('debugger');
    if (info) {
      // mount dynamic routes
      if (info.routes) {
        try {
          var moduleRoutes = express();
          var routes = require(path.join(module.path, info.routes));
          if (routes.init) {
            routes.init(api, this.app.toJSON(), moduleRoutes);
            this.expressApp.use(route, moduleRoutes);
          } else {
            logger.warn('expecting an init function for the routes of',
                module.path + ', but init was not found!');
          }
        } catch (e) {
          console.error('Unable to load debugger extension from', module.name);
          console.error(e.stack || e);
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

  this.makeNotUnmountSoon = function() {
    // Remove and clean up the routes after a bit of inactivity
    // remove the old timeout
    this.clearExistingCleanupTimeout();
    this.cleanupTimeout = setTimeout(
      MountedApp.unmount.bind(null, this.appPath),
      ROUTE_INACTIVE_TIME_LIMIT
    );
  };

  this.clearExistingCleanupTimeout = function() {
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
    }
  };

  this.onUnmount = function() {
    logger.info('Shutting down route for: ' + this.appPath + ' (' + this.routeId + ')');

    // Close sockets
    this.sockets.forEach(function(socket) {
      socket.disconnect();
    });

    // Remove watchers
    this.watchers.forEach(function(watcher) {
      watcher.close();
    });

    this.clearExistingCleanupTimeout();
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
      debuggerURLs: this.debuggerURLs,
      manifest: this.app.manifest
    };
  };
});


function resolvePath(appPath) {
  return path.normalize(appPath
      .replace(/^~[\/\\]/, HOME + path.sep)
      .replace(/[\/\\]/g, path.sep));
}

MountedApp._appsByPath = {};
MountedApp._get = function (appPath) {
  appPath = resolvePath(appPath);

  if (!MountedApp._appsByPath[appPath]) {
    MountedApp._appsByPath[appPath] = apps.get(appPath)
      .then(function (app) {
        return new MountedApp(app);
      });
  }

  return MountedApp._appsByPath[appPath];
};

MountedApp.get = function(appPath) {
  return MountedApp._get(appPath)
    .tap(function(mountedApp) {
      mountedApp.makeNotUnmountSoon();
    });
};

MountedApp.unmount = function(appPath) {
  return MountedApp._get(appPath)
    .then(function (mountedApp) {
      mountedApp.onUnmount();
    });
};

exports.getMountedApp = function (appPath) {
  return MountedApp._appsByPath[resolvePath(appPath)];
};
