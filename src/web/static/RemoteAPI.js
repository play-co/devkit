/**
 * This is an embeddable file which will give you access to the devkit Remote Run API
 * Available by using GC.RemoteAPI.xyz(...)
 * Steps:
 * - Embedd in page
 * - Register message handlers
 * - Connect to a devkit remote API websocket
 *
 * Note: Assumes socket.io is available
 */

(function () {

  var _socket = null;

  var _requestCallbacks = {};
  var _cbID = 0;
  var _handlers = [];
  var _sendQueue = [];

  /**
   * @param  {String} remoteApiUrl ws or wss link
   * @param  {Object} [opts]
   * @param  {Object} [opts.io] - socketio instance
   */
  this.init = function (socketUrl, opts) {
    if (_socket) {
      throw new Error('socket already initilized');
    }

    opts = opts || {};
    opts.io = opts.io || window.io;

    _socket = opts.io.connect(socketUrl);

    _socket.on('connect', this._onConnected.bind(this));
    // Maybe dont need - connect is also fired on reconnect
    // _socket.on('reconnect', this._onConnected.bind(this));
    _socket.on('disconnect', function () {
      this._emit('connectionStatus', { connected: false });
    }.bind(this));

    _socket.on('message', function (dataStr) {
      var data;
      try {
        data = JSON.parse(dataStr);
      }
      catch (err) {
        console.error('bad_json', 'server must send messages as json', dataStr);
        return;
      }
      if (!data.message) {
        console.error('missing_message', 'server must send message field', dataStr);
        return;
      }

      var handler;
      var respond = null;
      if (data._requestCallbackID) {
        // This message is requesting a response
        var _responseCallbackID = data._requestCallbackID;
        respond = function(data, responseCb) {
          this.send('_response', data, responseCb, _responseCallbackID);
        }.bind(this);
      } else {
        respond = function() {
          console.error('Message is not expecting response', data.message);
        };
      }

      if (data.message === '_response') {
        handler = _requestCallbacks[data._responseCallbackID];
        delete _requestCallbacks[data._responseCallbackID];

        if (!handler) {
          var msg = 'Could not find responseCallback';
          console.error(msg, data);
          throw new Error(msg);
        }

        handler(data.data, respond);
      }
      else {
        this._emit(data.message, data.data, respond);
      }
    }.bind(this));
  };

  this._onConnected = function () {
    this._emit('connectionStatus', { connected: true });

    if (_sendQueue.length) {
      console.log('Draining send queue');
      _sendQueue.forEach(function(formattedMessage) {
        _socket.send(formattedMessage);
      });
    }
    _sendQueue = [];
  };

  this._emit = function (message, data, respond) {
    var messageHandlers = _handlers[message];
    if (messageHandlers) {
      messageHandlers.forEach(function(cb) {
        cb(data, respond);
      });
    }
  };

  this.isConnected = function() {
    return _socket && _socket.connected;
  };

  this.on = function (message, cb) {
    if (!_handlers[message]) {
      _handlers[message] = [];
    }
    _handlers[message].push(cb);
  };

  this.send = function (message, data, responseCb, _responseCallbackID) {
    var cbID = null;
    // We are requesting a response
    if (responseCb) {
      _cbID++;
      cbID = _cbID;
      _requestCallbacks[cbID] = responseCb;
    }

    var messageData = {
      message: message,
      data: data,
    };
    if (cbID) {
      messageData._requestCallbackID = cbID;
    }
    // We are responding to their request
    if (_responseCallbackID) {
      messageData._responseCallbackID = _responseCallbackID;
    }

    var formattedMessage = JSON.stringify(messageData);
    if (_socket) {
      _socket.send(formattedMessage);
    } else {
      console.log('Socket not yet initilized, adding message to queue');
      _sendQueue.push(formattedMessage);
    }
  };

  // Attach to the global GC object
  window.GC = window.GC || {};
  var API_NAME = 'RemoteAPI';
  if (window.GC[API_NAME]) {
    console.error('GC.' +  API_NAME + ' Already taken... forfeiting');
    return;
  }
  window.GC[API_NAME] = this;
})();
