var events = require('events');
var util = require('util');

var logging = require('../../util/logging');
var logger = logging.get('CompanionMonitorClient');

function forwardEvent(event, src, target) {
  src.on(event, target.emit.bind(target, event));
}


var Client = function(server, socket) {
  events.EventEmitter.call(this);

  this.server = server;
  this.socket = socket;

  this.socket.setKeepAlive(true);

  this.socket.on('data', this.onData.bind(this));
  forwardEvent('close', this.socket, this);
};
util.inherits(Client, events.EventEmitter);

Client.prototype.onData = function(data){
  var dataString = data.toString().replace(/\s+/g, '');
  logger.log('data: ', dataString);
  try {
    var message = JSON.parse(dataString);
    this.onMessage(message);
  } catch (err) {
    logger.error('Error parsing message: ' + err);
  }
};

Client.prototype.onMessage = function(message) {
  switch (message.type) {
    case 'authenticate':
      this.server.authenticateClient(this, message.secret);
      return;
  }
}

Client.prototype.send = function(data) {
  if (typeof data === 'object') {
    data = JSON.stringify(data);
  }

  logger.log('Sending data:', data);
  this.socket.write(data);
  this.socket.write('\n');
};

Client.prototype.close = function() {
  this.socket.destroy();
};


module.exports = Client;
