var path = require('path');
var fs = require('fs');
var url = require('url');

var express = require('express');

var logging = require('../util/logging');
var logger = logging.get('moduleRoutes');

module.exports = {

  loadExtensions: function(expressApp, appRoutes, module) {
    logger.debug('Loading extensions for: ' + module.name);

    var api = require('../api/');
    var route = '/modules/' + module.name;
    var appRoute = appRoutes ? path.join('apps', appRoutes.id) : null;

    var info = module.getExtension('serve');
    if (info && appRoutes) {
      // mount dynamic routes
      if (info.routes) {
        logger.debug('serve routes:', info.routes);
        try {
          var moduleRoutes = express();
          var routes = require(path.join(module.path, info.routes));
          if (routes.init) {
            routes.init(api, appRoutes.app.toJSON(), moduleRoutes);
            expressApp.use(route, moduleRoutes);
          } else {
            logger.warn('expecting an init function for the routes of',
                module.path + ', but init was not found!');
          }
        } catch (e) {
          logger.error('Unable to load debugger extension from', module.name);
          logger.error(e.stack || e);
        }
      }
      // Mount static routes
      if (info.static) {
        if (!Array.isArray(info.static)) {
          info.static = [info.static];
        }

        for (var i = 0; i < info.static.length; i++) {
          var staticEntry = info.static[i];
          var staticPath = path.join(module.path, staticEntry);
          var staticRoute;
          if (i === 0) {
            staticRoute = route;
          } else {
            staticRoute = path.join(route, staticEntry);
          }

          logger.debug('serve static route: ' + staticRoute  + ' -> ' + staticPath);
          expressApp.use(staticRoute, express.static(staticPath));
        }
      }
    }

    info = module.getExtension('debuggerUI');
    if (info && appRoutes) {
      for (var i = 0; i < info.length; i++) {
        // debuggerUI will be loaded by devkit front end
        var mainFile = info[i];
        var staticPath = path.join(module.path, 'build', mainFile);
        var staticRoute = path.join(route, 'extension', mainFile);

        var debuggerUIInfo = {
          main: 'index.js',
          route: path.join(appRoute, staticRoute),
          styles: []
        };

        // Check for a main style file
        var styleMainPath = path.join(staticPath, 'index.css');
        if (fs.existsSync(styleMainPath)) {
          logger.debug('Inferring style at:', styleMainPath);
          debuggerUIInfo.styles.push('index.css');
        }

        if (appRoutes) {
          logger.debug('debuggerUI info:', debuggerUIInfo);
          appRoutes.debuggerUI[module.name] = debuggerUIInfo;
        }
        logger.debug('debuggerUI route: ' + staticRoute + ' -> ' + staticPath);
        expressApp.use(staticRoute, express.static(staticPath));
      }
    }

    info = module.getExtension('standaloneUI');
    if (info) {
      // Mount standalone UIs
      Object.keys(info).forEach(function(uiRoute) {
        var standaloneUIInfo;
        if (typeof info[uiRoute] === 'string') {
          standaloneUIInfo = { src: info[uiRoute] };
        } else {
          standaloneUIInfo = info[uiRoute];
        }
        var staticPath = path.join(module.path, 'build', standaloneUIInfo.src);

        // Validate
        if (!appRoutes && !standaloneUIInfo.isGlobal) {
          logger.debug('Standalone UI not global and no appRoutes. Skipping: ', staticPath);
          return;
        }
        if (appRoutes && standaloneUIInfo.isGlobal) {
          logger.debug('Standalone UI global and appRoutes set. Skipping: ', staticPath);
          return;
        }

        var staticRoute = path.join(route, 'extension', uiRoute);

        logger.debug('standaloneUI route: ' + staticRoute + ' -> ' + staticPath);
        expressApp.use(staticRoute, express.static(staticPath));
        // handle html5 routers
        if (standaloneUIInfo.html5History) {
          logger.debug('Adding catch all route for html5 history');
          expressApp.get(staticRoute + '/*', function (req, res) {
            var filename = null;
            var ext = path.extname(req.path);
            if (ext) {
              logger.debug('Attempting to infer resource path:', req.path);
              var referrerRaw = req.get('Referrer');
              if (referrerRaw) {
                var referrer = url.parse(referrerRaw);
                // Take the static path off of the request
                var referrerDirname = path.dirname(referrer.pathname);
                if (req.path.indexOf(referrerDirname) === 0) {
                  filename = req.path.substring(referrerDirname.length, req.path.length);
                }
              }

              if (!filename) {
                logger.warn('Unable to resolve resource:', req.path);
              }
            }
            res.sendFile(path.join(staticPath, filename || 'index.html'));
          });
        }
      }.bind(this));
    }
  }
};
