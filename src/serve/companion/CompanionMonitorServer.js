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
var config = require('../../config');

var routeIdGenerator = require('../routeIdGenerator');
var getAppPathByRouteId = Promise.promisify(routeIdGenerator.getAppPathByRouteId.bind(routeIdGenerator));

var UIClient = require('./UIClient');
var RunTargetClient = require('./RunTargetClient');
var RemoteDebuggingProxy = require('devkit-remote-debugger-server');

var logger = logging.get('CompanionMonitorServer');

var CONFIG_KEY = 'Companion.';

var Server = function(opts) {
  events.EventEmitter.call(this);
  // Optionally override some of the defaults
  this.debuggerHostOverride = opts.remoteDebuggingHost || null;

  this._uiClients = [];
  this._runTargetClients = [];

  // This is a random string sent to the phone to verify its identity
  this.secret = null;
  this._staticPaths = {};

  // Object shared across any incomming browser socket
  this.browserData = null;
  this._buildId = 0;

  // This is what the phone's tealeaf and chrome devtools connect to
  this.remoteDebuggingProxy = new RemoteDebuggingProxy();
};
util.inherits(Server, events.EventEmitter);

Server.prototype._resetBrowserData = function() {
  this.browserData = {
    devtoolsWsId: null,
    runTargetUUID: null
  };
};

/**
 * @param  app - express app with .io
 */
Server.prototype.start = function(app) {
  this.app = app;
  logger.log('Starting companion monitor server');

  // Set up the companion rest endpoints
  app.get('/info', function(req, res) {
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

  // // Set up the websocket connections // //
  // UIClients
  var UIClientWSPath = '/companion/remotesocket/ui';
  logger.log('Listening for UIClients at', UIClientWSPath);
  this.app.io.of(UIClientWSPath).on('connection', this.onUIConnection.bind(this));

  // RunTargetClients
  this.loadRunTargets();
  var RunTargetClientWSPath = '/remotesocket/runTarget';
  logger.log('Listening for RunTargetClients at', '/companion' + RunTargetClientWSPath);
  this.app.ws(RunTargetClientWSPath, this.onRunTargetConnection.bind(this));

  // Remote debugger (FF remote debug protocol)
  var remoteDebuggerPath = '/remotesocket/debugger';
  logger.info('Starting debugger server');
  logger.info('  listening for phones on client path', '/companion' + remoteDebuggerPath);
  this.app.ws(remoteDebuggerPath, this.remoteDebuggingProxy.onClientConnection.bind(this.remoteDebuggingProxy));
  this.remoteDebuggingProxy.start();
};

/** Make sure that there is a /bundle/latest route to that app */
Server.prototype.verifyHasRoute = function(shortName, appPath, buildPath) {
  var routeId = routeIdGenerator.get(appPath);
  if (this._staticPaths[routeId]) return;

  this._staticPaths[routeId] = this.app.use(
    '/app/' + routeId + '/bundle/latest',
    express.static(path.join(buildPath, shortName + '.zip'))
  );
};

Server.prototype.onUIConnection = function (socket) {
  logger.log('UIClient Connected');
  var client = new UIClient({
    server: this,
    logger: this._getSocketClientLogger('UIClient', socket)
  });
  client.setSocket(socket);

  this._uiClients.push(client);
};

Server.prototype.onRunTargetConnection = function (ws) {
  logger.log('RunTargetClient Connected');

  var client = new RunTargetClient({
    server: this,
    logger: this._getSocketClientLogger('RunTargetClient', ws)
  });
  client.setSocket(ws);

  this.addRunTargetClient(client);
};

Server.prototype._getSocketName = function (socket) {
  if (!socket) {
    return 'unknown(undefined)';
  }

  var address;
  if (socket.handshake) {
    address = socket.handshake.address;
  }
  else if (socket.upgradeReq) {
    address = socket.upgradeReq.connection.remoteAddress;
  }
  else {
    return 'unknown';
  }

  var parts = address.split(':');
  return parts[parts.length - 1];
};

Server.prototype._getSocketClientLogger = function (prefix, socket) {
  return logging.get(prefix + '.' + this._getSocketName(socket));
};

Server.prototype.removeUIClient = function (client) {
  var index = this._uiClients.indexOf(client);
  if (index >= 0) {
    this._uiClients.splice(index, 1);
  }
};

Server.prototype.addRunTargetClient = function(client) {
  this._runTargetClients.push(client);
};

/**
 * @param  {RunTargetClient}  client
 * @param  {Object}           [opts]
 * @param  {Boolean}          [opts.onlyInMemory] Only remove from memory. Do not send update to UIClients and do not write to config.
 */
Server.prototype.removeRunTargetClient = function (client, opts) {
  opts = opts || {};

  // If it was a client that UI cared about
  if (!opts.onlyInMemory) {
    if (client.isReady()) {
      this._uiClients.forEach(function(uiClient) {
        uiClient.send('removeRunTarget', {
          UUID: client.UUID
        });
      });
    }

    this._writeConfig();
  }

  var index = this._runTargetClients.indexOf(client);
  if (index >= 0) {
    this._runTargetClients.splice(index, 1);
  }
};

/**
 * Send all relevant state to the browser socket
 */
Server.prototype.sendBrowserData = function() {
    // Send devtools url
  this._uiClients.forEach(function(client) {
    client.send('browserData', this.browserData);
  }.bind(this));
};

Server.prototype.sendToAll = function(message, data) {
  //message = 'server:' + message;
  logger.info('Send to all:', message, data);

  var send = function(client) {
    logger.debug('Sending to client:', this._getSocketName(client.socket));
    if (client.isReady()) {
      client.send(message, data);
    }
  }.bind(this);

  this._uiClients.forEach(send);
  this._runTargetClients.forEach(send);
};

Server.prototype.updateRunTarget = function(client, isNew) {
  if (!client.isReady()) {
    return;
  }

  var data = {
    runTargetInfo: client.toInfoObject(),
    isNew: isNew
  };
  this._uiClients.forEach(function(uiClient) {
    uiClient.send('updateRunTarget', data);
  });
};

/** Called once a run target has connected with valid info */
Server.prototype.saveRunTarget = function(client) {
  // TODO: Right now the save / restore is not very smart and we just save all the
  //     ready clients
  this._writeConfig();
};

Server.prototype._writeConfig = function() {
  var clients = this.getRunTargets();
  var saveObj = {};
  clients.forEach(function(client) {
    // save runtarget
    saveObj[client.UUID] = client.toObject();
  });
  config.set(CONFIG_KEY + 'runTargets', saveObj);
}

Server.prototype.loadRunTargets = function() {
  if (this._runTargetClients.length > 0) {
    logger.warn('CompanionMonitorServer.loadRunTargets should be called with caution if _runTargetClients is already populated');
  }

  var runTargets = config.get(CONFIG_KEY + 'runTargets');
  if (!runTargets) {
    return;
  }

  for (var key in runTargets) {
    var runTargetData = runTargets[key];
    var client = RunTargetClient.fromObject(this, logger, runTargetData);
    this.addRunTargetClient(client);
  }
};

Server.prototype.getRunTarget = function(runTargetUUID) {
  for (var i = 0; i < this._runTargetClients.length; i++) {
    var testRunTargetClient = this._runTargetClients[i];
    if (testRunTargetClient.UUID === runTargetUUID) {
      return testRunTargetClient;
    }
  }
  return null;
};

Server.prototype.getRunTargets = function() {
  var res = [];
  this._runTargetClients.forEach(function(client) {
    if (client.isReady()) {
      res.push(client);
    }
  });
  return res;
};

Server.prototype.buildApp = function(appPath, runTargetClient) {
  var buildID = this._buildId;
  this._buildId++;

  logger.info('Building app at', appPath, 'for client', runTargetClient.UUID, '(' + buildID + ')');

  // What uuid is the devtools link for
  this.browserData.runTargetUUID = runTargetClient.UUID;
  this.sendBrowserData();

  this.sendToAll('buildStarted', {
    appPath: appPath,
    runTargetUUID: runTargetClient.UUID,
    buildID: buildID
  });

  return Promise.promisify(apps.get.bind(apps))(appPath)
    .then(function(app) {
      var buildOpts = {
        target: 'native-archive',
        scheme: 'debug',
        simulated: false
      };

      return buildQueue.add(appPath, buildOpts)
        .tap(function(buildResult) {
          // verify that there is a route to the bundle
          this.verifyHasRoute(app.manifest.shortName, appPath, buildResult.config.outputPath);
        }.bind(this))
        .then(function(buildResult) {
          // Build is done, update the proxy with the new native.js
          return this.remoteDebuggingProxy.onRun(buildResult.config.outputPath);
        }.bind(this))
        .then(function () {
          this.sendToAll('buildComplete', {
            appPath: appPath,
            runTargetUUID: runTargetClient.UUID,
            buildID: buildID,
            success: true
          });

          return {
            success: true,
            route: routeIdGenerator.get(appPath),
            shortName: app.manifest.shortName,
            debuggerHost: this.debuggerHostOverride
          };
        }.bind(this));
    }.bind(this))
    .catch(function(err) {
      logger.error('error while building', err);
      this.sendToAll('buildComplete', {
        appPath: appPath,
        runTargetUUID: runTargetClient.UUID,
        buildID: buildID,
        success: false,
        error: err.toString()
      });

      return {
        success: false,
        error: err.toString()
      };
    });
}

Server.prototype.updateSecret = function() {
  this.secret = 'SECRETSES';  //randomstring.generate(16);
  logger.info('companion secret is: ' + this.secret);
  return this.secret;
};

Server.prototype.isSecretValid = function(testSecret) {
  return testSecret === this.secret;
};

module.exports = Server;
