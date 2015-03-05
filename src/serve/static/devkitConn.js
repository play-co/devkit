import net.interfaces;

import .util.bluebird as Promise;

var _script;
var _pending = [];

function getIO() {
  return new Promise(function (resolve, reject) {
    if (typeof io == 'function') {
      resolve(io);
    } else if (typeof document == 'undefined') {
      reject(new Error("No DOM document found"));
    } else {
      _pending.push(resolve);

      if (!_script) {
        _script = document.createElement('script');
        _script.onload = _script.onreadystatechange = function () {
          if (typeof io == 'function') {
            _script.onload = _script.onreadystatechange = null;
            var cbs = [];
            _pending = [];
            cbs.forEach(function (resolve) {
              resolve(io);
            });
          }
        };

        _script.src = '/socket.io/socket.io.js';
        document.getElementsByTagName('head')[0].appendChild(_script);
      }
    }
  });
}

function connect(namespace) {
  return getIO().then(function (io) {
    var socket = io(namespace, {multiplex: false});
    return new Promise(function (resolve, reject) {
      socket.once('connect', resolve.bind(null, socket));
      socket.once('error', reject);
    });
  });
}

/*
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
*/

exports.getTransport = function (namespace) {
  return connect(namespace);
}

// multiplex TargetCuppa into a single socket.io connection
// all instances can share the same socket, split by deviceId
// var ConnectionWrapper = Class(TargetCuppa, function () {
//   this.init = function (deviceId, socket) {
//     supr(this, 'init');

//     // handle write calls
//     this.transport = {
//       write: function (data) {
//         socket.emit('send', {
//           deviceId: deviceId
//         });
//       },
//       close: function () {}
//     };

//     // handle read calls
//     socket.on('device:' + deviceId, bind(this, 'dataReceived'));

//     // notify protocol of connection
//     this.connectionMade();
//   }
// });
