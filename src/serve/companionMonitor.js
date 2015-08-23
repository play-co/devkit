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
}

ClientConnection.prototype.onMessage = function(message) {
  console.log(message);
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
}

ClientConnection.prototype.onClose = function() {
  this.emit('close');
}



function Server(devkitPort, companionMonitorPort, debuggerPort) {
  events.EventEmitter.call(this);
  this.devkitPort = devkitPort;
  this.companionMonitorPort = companionMonitorPort || 6001;
  this.debuggerPort = debuggerPort || 6000;
}

util.inherits(Server, events.EventEmitter);

exports.Server = Server;

Server.prototype.start = function(webserver) {
  logger.log('Starting server on port ' + this.companionMonitorPort);
  this.webserver = webserver
  this.webserver.on('run', this.onRun.bind(this));
  net.createServer(this.onClient.bind(this)).listen(this.companionMonitorPort);
  this.debuggerProxy = new debuggerProxy.Server(this.debuggerPort);
  this.debuggerProxy.start();
}

Server.prototype.onClient = function(socket) {
  logger.log('Got a connection');
  var client = new ClientConnection(socket);
  this.client = client;
  this.client.on('close', this.onClose.bind(this));
  this.emit('connect');
}

Server.prototype.onRun = function(shortName, route) {
  if (this.client != null) {
    logger.log('sending run info to client');
    var j = {
      type: 'loadApp',
      path: 'http://' + ip.getLocalIP()[0] + ':' + this.devkitPort + '/apps/' + route,
      shortName: shortName,
      debuggerHost: ip.getLocalIP()[0],
      debuggerPort: this.debuggerPort
    };
    console.log(j);
    this.client.send(JSON.stringify(j));
  }
}

Server.prototype.onClose = function() {
    this.emit('disconnect');
}

Server.prototype.isClientConnected = function() {
  return this.client != null;
};
