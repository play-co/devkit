var net = require('net');
var events = require('events');
var util = require('util');
var logging = require('../util/logging');
var logger = logging.get('companionMonitor');
var debuggerProxy = require('./debuggerProxy');
var ip = require('../util/ip');
var apps = require('../apps');

function ClientConnection(socket) {
  events.EventEmitter.call(this);
  this.socket = socket;
  this.socket.setKeepAlive(true);
  this.socket.on('data', this.onData.bind(this));
  this.socket.on('close', this.onClose.bind(this));
}

util.inherits(ClientConnection, events.EventEmitter);

exports.ClientConnection = ClientConnection;

ClientConnection.prototype.onData = function(data){
  var dataString = data.toString().replace(/\s+/g, '');
  logger.log('data: ', dataString);
  try {
    var message = JSON.parse(dataString);
    this.onMessage(message);
  } catch (e) {
    console.error('Error parsing message');
  }
};

ClientConnection.prototype.onMessage = function(message) {
  switch (message.type) {
    case 'authenticate':
      var secret = message.secret;
      apps.has(secret, function(err, hasApp) {
        var returnMessage = {
          type: 'authenticate'
        };
        if (!err && hasApp) {
          returnMessage['status'] = 'success';
        } else {
          returnMessage['status'] = 'failure';
        }
        logger.log('sending returnMessage', returnMessage);
        this.send(JSON.stringify(returnMessage));
        if (returnMessage['status'] == 'failure') {
          this.socket.destroy();
        }
      }.bind(this));
  }
}

ClientConnection.prototype.send = function(data) {
  logger.log('sending');
  this.socket.write(data);
  this.socket.write('\n');
};

ClientConnection.prototype.close = function() {
  this.socket.close();
};

ClientConnection.prototype.onClose = function() {
  this.emit('close');
};



function Server(companionMonitorPort, debuggerPort) {
  events.EventEmitter.call(this);
  this.companionMonitorPort = companionMonitorPort || 6001;
  this.debuggerPort = debuggerPort || 6000;
}

util.inherits(Server, events.EventEmitter);

exports.Server = Server;

Server.prototype.start = function(io) {
  logger.log('Starting server on port ' + this.companionMonitorPort);
  // connect to the custom namespace '/remote' to avoid any collisions
  io.of('/remote').on('connection', this.onBrowserConnection.bind(this));
  net.createServer(this.onClient.bind(this)).listen(this.companionMonitorPort);
  this.debuggerProxy = new debuggerProxy.Server(this.debuggerPort);
  this.debuggerProxy.start();
};

Server.prototype.onBrowserConnection = function (socket){
  this.browserSocket = socket;
  logger.log('browser connected');
  socket.on('disconnect', function() {
    logger.log('browser disconnected');
  });
  socket.on('run', this.onRun.bind(this));
  socket.on('init', this.onInit.bind(this));
  if (this.isClientConnected()) {
    socket.emit('clientConnected');
  };
}

Server.prototype.onInit = function(message) {
  this.browserSocket.emit('init', {companionPort: this.companionMonitorPort, debuggerPort: this.debuggerPort, secret: message.app});
};

Server.prototype.onClient = function(socket) {
  logger.log('companion connected');
  if (this.isClientConnected()) {
    logger.log('Already have a connection. closing new connection')
    socket.close();
    return;
  }
  var client = new ClientConnection(socket);
  this.client = client;
  this.client.on('close', this.onClose.bind(this, client));
  if (this.browserSocket != null) {
    this.browserSocket.emit('clientConnected');
  }
  this.emit('connect');
};

Server.prototype.onRun = function(message) {
  if (this.isClientConnected()) {
    logger.log('sending run info to client');
    var runInfo = {
      type: 'loadApp',
      path: 'http://' + message.hostname + '/apps/' + message.route,
      shortName: message.shortName,
      debuggerHost: message.hostname,
      debuggerPort: this.debuggerPort
    };
    logger.log('run info: ', runInfo);
    this.client.send(JSON.stringify(runInfo));
    if (this.isBrowserConnected()) {
      thos.browserSocket.emit('run', {
        status: 'ok',
      });
    };
  }
};

Server.prototype.onClose = function(client) {
  logger.log('companion disconnected');
  if (this.client === client) {
    this.client = null;
  }
  if (this.isBrowserConnected()) {
    this.browserSocket.emit('clientDisconnected');
  }
  this.emit('disconnect');
};

Server.prototype.isClientConnected = function() {
  return this.client != null;
};

Server.prototype.isBrowserConnected = function() {
  return this.browserSocket != null;
};

