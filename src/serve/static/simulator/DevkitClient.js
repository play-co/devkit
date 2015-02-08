import lib.Callback;
import net.interfaces;

var _script;
var _scriptOnLoad = new lib.Callback();

function connect(namespace, cb) {
    if (typeof io != 'function' && typeof document != 'undefined') {
      _script = document.createElement('script');
      _script.onload = _script.onreadystatechange = function () {
        if (typeof io == 'function') {
          _script.onload = _script.onreadystatechange = null;
          _scriptOnLoad.fire(io);
        }
      };

      _script.src = '/socket.io/socket.io.js';
      document.getElementsByTagName('head')[0].appendChild(_script);
    } else if (!_scriptOnLoad.hasFired()) {
      _scriptOnLoad.fire(io);
    }

    _scriptOnLoad.run(function () {
      logger.debug('opening the connection');
      var socket = io(namespace, {multiplex: false});
      socket.on('connect', bind(null, cb, null, socket));
    });
}

exports = Class(function () {
  this.init = function (controller) {
    this._controller = controller;

    connect('/devkit-simulator/', bind(this, '_onSocket'));
  }

  this._onSocket = function (err, socket) {
    socket.emit('request:devices');
    socket.on('device', function (info) {
      this._controller.onDeviceConn({
        isLocal: false,
        deviceId: info.deviceId,
        type: info.deviceType,
        userAgent: info.userAgent,
        screen: info.screen,
        conn: new ConnectionWrapper(info.deviceId, socket),
      });
    });

    socket.on('liveedit', function (data) {
      console.log(data);
    });
  }
});

// multiplex TargetCuppa into a single socket.io connection
// all instances can share the same socket, split by deviceId
var ConnectionWrapper = Class(TargetCuppa, function () {
  this.init = function (deviceId, socket) {
    supr(this, 'init');

    // handle write calls
    this.transport = {
      write: function (data) {
        socket.emit('send', {
          deviceId: deviceId
        });
      },
      close: function () {}
    };

    // handle read calls
    socket.on('device:' + deviceId, bind(this, 'dataReceived'));

    // notify protocol of connection
    this.connectionMade();
  }
}
