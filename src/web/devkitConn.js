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

exports.getTransport = function (namespace) {
  return connect(namespace);
}
