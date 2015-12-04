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

  /**
   * @param  {String} remoteApiUrl ws or wss link
   * @param  {Object} [opts]
   * @param  {Object} [opts.io] - socketio instance
   */
  this.init = function (socketUrl, opts) {
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
    _socket.send(JSON.stringify({
      message: message,
      data: data
    }));
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
