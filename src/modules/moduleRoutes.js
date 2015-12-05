var path = require('path');
var fs = require('fs');

var express = require('express');

var logging = require('../util/logging');
var logger = logging.get('moduleRoutes');

module.exports = {

  loadExtensions: function(expressApp, appRoutes, module) {
    logger.debug('Loading extensions for: ' + module.name);
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
      for (var uiRoute in info) {
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
          continue;
        }
        if (appRoutes && standaloneUIInfo.isGlobal) {
          logger.debug('Standalone UI global and appRoutes set. Skipping: ', staticPath);
          continue;
        }

        var staticRoute = path.join(route, 'extension', uiRoute);

        logger.debug('standaloneUI route: ' + staticRoute + ' -> ' + staticPath);
        expressApp.use(staticRoute, express.static(staticPath));
        // handle html5 routers
        if (standaloneUIInfo.html5History) {
          logger.debug('Adding catch all route for html5 history');
          expressApp.get(staticRoute + '/*', function (req, res) {
            res.sendFile(path.join(staticPath, 'index.html'));
          });
        }
      }
    }
  }
};
