var path = require('path');
var net = require('net');
var events = require('events');
var util = require('util');
var http = require('http');

var Promise = require('bluebird');
var request = require('request');
var randomstring = require("randomstring");

var apps = require('../../apps');
var ip = require('../../util/ip');
var logging = require('../../util/logging');
var logger = logging.get('CompanionMonitorServer');

var RemoteDebuggingProxy = require('jsio-remote-debugger-server');

var CompanionMonitorClient = require('./CompanionMonitorClient');

var Server = function(companionMonitorPort) {
  events.EventEmitter.call(this);
  this.companionMonitorPort = companionMonitorPort || 6005;
  this.debuggerClientPort = 6000;

  this.browserSocket = null;
  this.companionClient = null;

  // This is a random string sent to the phone to verify its identity
  this.secret = null;

  // Object shared across any incomming browser socket
  this.browserData = null;

  // This is what the phone's tealeaf and chrome devtools connect to
  this.remoteDebuggingProxy = new RemoteDebuggingProxy();
};
util.inherits(Server, events.EventEmitter);

Server.prototype._resetBrowserData = function() {
  this.browserData = {
    devtoolsWsHost: null,
    devtoolsWsId: null
  };
};

Server.prototype.start = function(io) {
  logger.log('Starting server on port ' + this.companionMonitorPort);
  // connect to the custom namespace '/remote' to avoid any collisions
  io.of('/remote').on('connection', this.onBrowserConnection.bind(this));
  // the companion app will try to make a websocket connection to this server
  net.createServer(this.onClient.bind(this)).listen(this.companionMonitorPort);

  // update the secret
  this.updateSecret();
  this._resetBrowserData();

  this.remoteDebuggingProxy.on('adaptor.ready', function(jsonUrl) {
    logger.log('getting devtools id from: ' + jsonUrl);

    // TODO: dont make a request here, just grab the info directly
    request(jsonUrl, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var data = JSON.parse(body);
        var devtoolsId = data[0].id;

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

  socket.on('run', this.onRun.bind(this));
  socket.on('initBrowserRequest', this.initBrowser.bind(this));
};

/**
 * Send all relevant state to the browser socket
 */
Server.prototype.sendBrowserData = function() {
  if (this.browserSocket === null) {
    return;
  }

  // Send connected client
  this.browserSocket.emit('clientConnected', this.isClientConnected());
  // Send devtools url
  this.browserSocket.emit('browserData', this.browserData);
};

Server.prototype.updateSecret = function() {
  this.secret = randomstring.generate(16);
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
    companionPort: this.companionMonitorPort,
    secret: this.secret
  });
  this.sendBrowserData();
};

Server.prototype.onClient = function(socket) {
  logger.log('Companion connected');

  var companionClient = new CompanionMonitorClient(this, socket);
};

Server.prototype.authenticateClient = function(companionClient, secret) {
  var success = this.isSecretValid(secret);
  companionClient.send({
    type: 'authenticate',
    status: success ? 'success' : 'failure' // TODO: change this to a boolean
  });

  if (success) {
    logger.log('Companion auth success');
    // Disconnect any old ones
    if (this.companionClient !== null) {
      logger.log('Cleaning old companion connection')
      this.companionClient.close();
      return;
    }
    // Set the current client to the recently connected one
    this.companionClient = companionClient;
    companionClient.on('close', this.onCompanionClose.bind(this));
    // inform browser of new client
    this.sendBrowserData();
  } else {
    companionClient.close();
  }
};

Server.prototype.onRun = function(message) {
  logger.log('onRun');
  if (this.isClientConnected()) {
    logger.log('Getting App for: ' + message.shortName);
    Promise.promisify(apps.getFromShortName.bind(apps))(message.shortName)
      .then(function(app) {
        logger.log('-> remoteDebuggingProxy onRun');
        // TODO: dont hardcode this path
        var buildPath = path.join(app.paths.build, 'debug', 'simulator');
        return this.remoteDebuggingProxy.onRun(buildPath);
      }.bind(this))
      .then(function() {
        logger.log('Sending run info to client');

        this.browserData.devtoolsWsHost = message.hostname;

        var runInfo = {
          type: 'loadApp',
          path: 'http://' + message.host + '/apps/' + message.route,
          shortName: message.shortName,
          debuggerHost: message.hostname,
          debuggerPort: this.debuggerClientPort
        };
        logger.log('run info: ', runInfo);
        this.companionClient.send(JSON.stringify(runInfo));
        if (this.isBrowserConnected()) {
          this.browserSocket.emit('run', {
            status: 'ok',
          });
        };
      }.bind(this))
  }
};

Server.prototype.onCompanionClose = function() {
  logger.log('Companion disconnected');
  this.companionClient = null;
  this._resetBrowserData();
  this.sendBrowserData();
};

Server.prototype.isClientConnected = function() {
  return this.companionClient !== null;
};

Server.prototype.isBrowserConnected = function() {
  return this.browserSocket !== null;
};


module.exports = Server;
