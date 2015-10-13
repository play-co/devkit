var util = require('util');
var EventEmitter = require('events').EventEmitter;

/**
 * @param  {Object} opts
 * @param  {CompanionMonitorServer} opts.server
 * @param  {logger} opts.logger
 */
var CompanionSocketClient = function(opts) {
  this._server = opts.server;
  this._logger = opts.logger;
};
util.inherits(CompanionSocketClient, EventEmitter)

/** Accepts either socket.io or wss client sockets */
CompanionSocketClient.prototype.setSocket = function(socket) {
  this.socket = socket;
  if (this.socket) {
    this.socket.on('message', function message(dataStr) {
      try {
        var data = JSON.parse(dataStr);
      }
      catch (err) {
        this._error('bad_json', 'client must send messages as json');
        return;
      }
      if (!data.message) {
        this._error('missing_message', 'client must send message field');
        return;
      }

      this.emit(data.message, data.data);
    }.bind(this));

    this.socket.on('disconnect', this.onDisconnect.bind(this));
    this.socket.on('close',      this.onDisconnect.bind(this));
  }
};

CompanionSocketClient.prototype.send = function(message, data) {
  this.socket.send(JSON.stringify({
    message: message,
    data: data
  }));
};

CompanionSocketClient.prototype.disconnect = function() {
  if (this.socket.disconnect !== undefined) {
    this.socket.disconnect();
  }
  else if (this.socket.close !== undefined) {
    this.socket.close();
  }
  else {
    throw new Error('socket has no disconnect or close method');
  }
};

CompanionSocketClient.prototype.onDisconnect = function() {
  // Stub
};

CompanionSocketClient.prototype._error = function(errorType, messageString) {
  this._logger.error('CompanionSocketClient: _error', errorType, messageString);
  this.send('APIError', {
    errorType: errorType,
    reason: messageString
  });
};

CompanionSocketClient.prototype._criticalError = function(errorType, messageString) {
  this._logger.error('CompanionSocketClient: _criticalError', errorType, messageString);
  this.send('criticalAPIError', {
    errorType: errorType,
    reason: messageString
  });
  this.disconnect();
};

module.exports = CompanionSocketClient;
