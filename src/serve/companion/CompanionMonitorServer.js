var path = require('path');
var net = require('net');
var events = require('events');
var util = require('util');
var http = require('http');
var express = require('express');

var Promise = require('bluebird');
var request = require('request');
var randomstring = require("randomstring");

var apps = require('../../apps');
var ip = require('../../util/ip');
var buildQueue = require('../buildQueue');
var logging = require('../../util/logging');

var routeIdGenerator = require('../routeIdGenerator');
var getAppPathByRouteId = Promise.promisify(routeIdGenerator.getAppPathByRouteId.bind(routeIdGenerator));

var logger = logging.get('CompanionMonitorServer');

var RemoteDebuggingProxy = require('devkit-remote-debugger-server');

var Server = function(companionMonitorPort) {
  events.EventEmitter.call(this);
  this.debuggerClientPort = 6000;

  this.browserSocket = null;

  // This is a random string sent to the phone to verify its identity
  this.secret = null;
  this._staticPaths = {};

  // Object shared across any incomming browser socket
  this.browserData = null;

  // This is what the phone's tealeaf and chrome devtools connect to
  this.remoteDebuggingProxy = new RemoteDebuggingProxy();
};
util.inherits(Server, events.EventEmitter);

Server.prototype._resetBrowserData = function() {
  this.browserData = {
    devtoolsWsId: null
  };
};

Server.prototype.start = function(httpServer, ioServer) {
  logger.log('Starting server on port ' + this.companionMonitorPort);
  // connect to the custom namespace '/remote' to avoid any collisions
  ioServer.of('/remote').on('connection', this.onBrowserConnection.bind(this));

  this.httpServer = httpServer;

  // Set up the companion rest endpoints
  httpServer.get('/companion/info', function(req, res) {
    if (!this.isSecretValid(req.query.secret)) {
      res.send({ success: false, message: 'invalid secret' });
      return;
    }

    var routeId = req.query.routeId;
    var appPath = null;

    getAppPathByRouteId(routeId)
      .then(function(_appPath) {
        appPath = _appPath;
        logger.info('info: ' + appPath);
        return Promise.promisify(apps.get.bind(apps))(appPath);
      })
      .then(function(app) {
        res.send({
          success: true,
          name: app.manifest.title,
          icon: '' // TODO:
        });
      }.bind(this))
      .catch(function(err) {
        logger.error('error while getting info', err);
        res.send({ success: false, error: err.toString() });
      });
  }.bind(this));

  httpServer.get('/companion/build', function(req, res) {
    // Check the secret
    if (!this.isSecretValid(req.query.secret)) {
      res.send({ success: false, message: 'invalid secret' });
      return;
    }

    var routeId = req.query.routeId;
    var appPath = null;
    logger.info('build: ' + appPath);

    getAppPathByRouteId(routeId)
      .then(function(_appPath) {
        appPath = _appPath;
        logger.info('info: ' + appPath);
        return Promise.promisify(apps.get.bind(apps))(appPath);
      })
      .then(function(app) {
        // TODO: dont hardcode this path
        var buildPath = path.join(appPath, 'debug', 'native-archive');
        var routeId = routeIdGenerator.get(appPath);
        var buildOpts = {
          target: 'native-archive',
          scheme: 'debug',
          simulated: true,
          output: buildPath
        };

        return buildQueue.add(appPath, buildOpts)
          .then(function() {
            // verify that there is a route to the bundle
            this.verifyHasRoute(app.manifest.shortName, appPath, buildPath);
          }.bind(this))
          .then(function(buildResult) {
            // Build is done, update the proxy with the new native.js
            return this.remoteDebuggingProxy.onRun(buildPath);
          }.bind(this))
          .then(function () {
            res.send({
              success: true,
              route: routeId,
              shortName: app.manifest.shortName,
              debuggerPort: 6000
              // hostname // for the http request
            });
          });
      }.bind(this))
      .catch(function(err) {
        logger.error('error while building', err);
        res.send({ success: false, error: err.toString() });
      });
  }.bind(this))

  // update the secret
  this.updateSecret();
  this._resetBrowserData();

  this.remoteDebuggingProxy.on('adaptor.reset', function() {
    logger.log('devtoolsWsId being nulled, adaptor reset');
    this._resetBrowserData();
    this.sendBrowserData();
  }.bind(this));

  this.remoteDebuggingProxy.on('adaptor.ready', function(jsonUrl) {
    logger.log('getting devtools id from: ' + jsonUrl);

    // TODO: dont make a request here, just grab the info directly
    request(jsonUrl, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var data = JSON.parse(body);
        var devtoolsId = data[data.length - 1].id;

        logger.log('devtoolsWsId determined: ' + devtoolsId);
        this.browserData.devtoolsWsId = devtoolsId;
        this.sendBrowserData();
      }
    }.bind(this));
  }.bind(this));

  this.remoteDebuggingProxy.start({
    clientPort: this.debuggerClientPort
  });
};

/** Make sure that there is a /bundle/latest route to that app */
Server.prototype.verifyHasRoute = function(shortName, appPath, buildPath) {
  var routeId = routeIdGenerator.get(appPath);
  if (this._staticPaths[routeId]) return;

  this._staticPaths[routeId] = this.httpServer.use(
    '/companion/app/' + routeId + '/bundle/latest',
    express.static(path.join(buildPath, shortName + '.zip'))
  );
};

Server.prototype.onBrowserConnection = function (socket){
  logger.log('Browser connected');
  // Disconnect any old ones
  if (this.browserSocket) {
    logger.log('Cleaning old browser socket');
    this.browserSocket.disconnect(); // disconnect for websocket
  }

  this.browserSocket = socket;

  socket.on('disconnect', function() {
    logger.log('Browser disconnected');
  });

  socket.on('initBrowserRequest', this.initBrowser.bind(this));
};

/**
 * Send all relevant state to the browser socket
 */
Server.prototype.sendBrowserData = function() {
  if (this.browserSocket === null) {
    return;
  }

  // Send devtools url
  this.browserSocket.emit('browserData', this.browserData);
};

Server.prototype.updateSecret = function() {
  this.secret = 'SECRETSES';//randomstring.generate(16);
  logger.info('companion secret is: ' + this.secret);
  return this.secret;
};

Server.prototype.isSecretValid = function(testSecret) {
  return testSecret === this.secret;
};

/**
 * Called when a browser connects
 */
Server.prototype.initBrowser = function(message) {
  this.browserSocket.emit('initBrowserResponse', {
    routeId: routeIdGenerator.get(message.app),
    secret: this.secret
  });
  this.sendBrowserData();
};

Server.prototype.isBrowserConnected = function() {
  return this.browserSocket !== null;
};


module.exports = Server;
