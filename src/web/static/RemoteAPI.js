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
  var _connected = false;

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
      return;
    }

    opts = opts || {};
    opts.io = opts.io || window.io;

    _socket = opts.io.connect(socketUrl);

    _socket.on('connect', this._onConnected.bind(this));
    _socket.on('reconnect', this._onConnected.bind(this));
    _socket.on('disconnect', function () {
      this._connected = false;
      this._emit('connectionStatus', { connected: false });
    }.bind(this));

    _socket.on('message', function (dataStr) {
      try {
        var data = JSON.parse(dataStr);
      }
      catch (err) {
        console.error('bad_json', 'server must send messages as json', dataStr);
        return;
      }
      if (!data.message) {
        console.error('missing_message', 'server must send message field', dataStr);
        return;
      }

      this._emit(data.message, data.data);
    }.bind(this));
  };

  this._onConnected = function () {
    this._connected = true;
    this._emit('connectionStatus', { connected: true });

    if (_sendQueue.length) {
      console.log('Draining send queue');
      _sendQueue.forEach(function(formattedMessage) {
        _socket.send(formattedMessage);
      });
    }
    _sendQueue = [];
  };

  this._emit = function (message, data) {
    var messageHandlers = _handlers[message];
    if (messageHandlers) {
      messageHandlers.forEach(function(cb) {
        cb(data);
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

  this.send = function (message, data) {
    var formattedMessage = JSON.stringify({
      message: message,
      data: data
    });
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
  if (GC[API_NAME]) {
    console.error('GC.' +  API_NAME + ' Already taken... forfeiting');
    return;
  }
  GC[API_NAME] = this;
})();
