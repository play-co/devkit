var net = require('net');
var events = require('events');
var util = require('util');
var logging = require('../util/logging');
var logger = logging.get('debuggerProxy');

function ClientConnection(socket){

  events.EventEmitter.call(this);
  this.socket = socket;
  this.socket.on('data', this.onData.bind(this));
  this.socket.on('close', this.onClose.bind(this));
}

exports.ClientConnection = ClientConnection;

util.inherits(ClientConnection, events.EventEmitter);

ClientConnection.prototype.onData = function(data) {
  var dataString = data.toString().replace(/\s+/g, '');
  if (dataString == 'SERVER') {
    this.emit('serverConnected', this);
  }
};

ClientConnection.prototype.send = function(data) {
  this.socket.write(data);
};

ClientConnection.prototype.onClose = function() {
  this.emit('close', this);
};

function Server(port) {
  this.clients = [];
  this.port = port;
}

exports.Server = Server;

Server.prototype.start = function() {
  logger.log('Starting server on port ' + this.port);
  net.createServer(this.onClient.bind(this)).listen(this.port);
}

Server.prototype.onClient = function(socket) {
  logger.log('Got a connection');
  var client = new ClientConnection(socket);
  this.clients.push(client);
  client.on('serverConnected', this.serverConnected.bind(this));
  client.on('close', this.onClose.bind(this));
  if (this.server != null) {
    this.client = client;
    this.startDebugging();
  }
}

Server.prototype.serverConnected = function(client) {
  logger.log('Got a server connection');
  this.server = client;
}

Server.prototype.startDebugging = function() {
  logger.log('Starting debugging!');
  this.server.send('connected');
  this.server.socket.pipe(this.client.socket);
  this.client.socket.pipe(this.server.socket);
  this.client.on('close', this.endDebugging.bind(this));
  this.server.on('close', this.endDebugging.bind(this));
}

Server.prototype.endDebugging = function() {
  logger.log('client disconnected, stopping debugging');
  if (this.server) {
    this.server.socket.destroy();
    this.server = null;
  }
  if (this.client) {
    this.client.socket.destroy();
    this.client = null;
  }
}

Server.prototype.onClose = function(connection) {
  logger.log('connection ended, cleaning up');
  if (connection === this.server) {
    this.server = null;
  }
  if (connection === this.client) {
    this.client = null;
  };
  connection.socket.destroy();
};