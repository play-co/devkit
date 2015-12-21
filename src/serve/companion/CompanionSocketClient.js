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
util.inherits(CompanionSocketClient, EventEmitter);

/** Accepts either socket.io or wss client sockets */
CompanionSocketClient.prototype.setSocket = function(socket) {
  this.socket = socket;

  this._requestCallbacks = {};
  this._cbID = 0;

  if (this.socket) {
    this.socket.on('message', function message(dataStr) {
      var data;
      try {
        data = JSON.parse(dataStr);
      }
      catch (err) {
        this._error('bad_json', 'client must send messages as json ->' + dataStr + '<-');
        return;
      }
      if (!data.message) {
        this._error('missing_message', 'client must send message field');
        return;
      }

      var handler;
      var respond = null;
      if (data._requestCallbackID) {
        this._logger.debug('message requesting response', data.message, data._requestCallbackID);
        // This message is requesting a response
        var _responseCallbackID = data._requestCallbackID;
        respond = function(data, responseCb) {
          this.send('_response', data, responseCb, _responseCallbackID);
        }.bind(this);
      } else {
        respond = function() {
          this._logger.error('Message is not expecting response', data.message);
        }.bind(this);
      }

      if (data.message === '_response') {
        handler = this._requestCallbacks[data._responseCallbackID];
        delete this._requestCallbacks[data._responseCallbackID];

        if (!handler) {
          var msg = 'Could not find responseCallback';
          console.error(msg, data);
          throw new Error(msg);
        }

        handler(data.data, respond);
      }
      else {
        this.emit(data.message, data.data, respond);
      }
    }.bind(this));

    this.socket.on('disconnect', this.onDisconnect.bind(this));
    this.socket.on('close',      this.onDisconnect.bind(this));
  }
};

CompanionSocketClient.prototype.send = function(message, data, responseCb, _responseCallbackID) {
  if(!this.isReady()) {
    throw new Error('socket not ready or init');
  }

  var cbID = null;
  // We are requesting a response
  if (responseCb) {
    this._cbID++;
    cbID = this._cbID;
    this._requestCallbacks[cbID] = responseCb;
  }

  var messageData = {
    message: message,
    data: data
  };
  if (cbID) {
    messageData._requestCallbackID = cbID;
  }
  // We are responding to a request
  if (_responseCallbackID) {
    messageData._responseCallbackID = _responseCallbackID;
  }

  this.socket.send(JSON.stringify(messageData));
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

CompanionSocketClient.prototype.isReady = function() {
  return !!this.socket;
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
