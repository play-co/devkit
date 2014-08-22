import lib.Callback;
import lib.PubSub;

from net.protocols.rtjp import RTJPProtocol;

var Error = Class(function() {
  this.init = function(protocol, id, msg, details, requestId) {
    this.id = id;
    this.msg = msg;
    this.details = details;
    this.requestId = requestId;
  }
});

var RPCRequest = Class(function() {
  this.init = function(protocol, id) {
    this.protocol = protocol;
    this.id = id;
    this._onError = new lib.Callback();
    this._onSuccess = new lib.Callback();
  }

  this.onError = function() { this._onError.forward(arguments); }
  this.onSuccess = function() { this._onSuccess.forward(arguments); }

  this.bindLater = function(l) {
    var args = [].slice(arguments, 1);
    this._onError.forward([l, l.fail].concat(args));
    this._onSuccess.forward([l, l.succed].concat(args));
    return l;
  }
});

var ReceivedRequest = Class(function() {
  this.type = "request"

  this.init = function(protocol, id, name, args, target) {
    this.protocol = protocol
    this.id = id;
    this.name = name
    this.responded = false;
    this.args = args;
    this.target = target;
  }

  this.error = function(msg, details) {
    if (this.responded) { throw new Error("already responded"); }
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    args = {
      id: this.id,
      msg: msg + ""
    }
    if (details !== undefined) { args.details = details }
    this.responded = true;
    this.protocol.sendFrame('ERROR', args);
  }

  this.respond = function(args) {
    if (this.responded) { throw new Error("already responded"); }
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    this.responded = true;
    this.protocol.sendFrame('RESPONSE', {
      id: this.id,
      args: args == undefined ? {} : args // python cuppa ignores responses with undefined args
    });
  }

  this.timeoutAfter = function(duration, msg) {
    if (this.responded) { return; }
    if (this._timer) { clearTimeout(this._timer); }
    this._timer = setTimeout(bind(this, '_timeout', msg), duration);
  }

  this._timeout = function(msg) {
    if (!this.responded) {
      this.error(msg);
    }
  }

});

var ReceivedEvent = Class(function() {
  this.init = function(protocol, id, name, args, target) {
    this.id = id;
    this.name = name;
    this.args = args;
    this.target = target;
  }
});

/**
 * @extends net.protocols.rtjp.RTJPProtocol;
 */
exports = Class(RTJPProtocol, function(supr) {

  var DEFAULT_TARGET = '___';

  this.init = function() {
    supr(this, 'init', arguments);

    this._onConnect = new lib.Callback();
    this._onDisconnect = new lib.Callback();

    this._clients = {};
    this._requests = {};
    this._subs = {};

    this._eventListeners = {};
    this._requestListeners = {};
  }

  this.end =
  this.disconnect = function() { this.transport.loseConnection(); }

  // pass something to call (ctx, method, args...) when connected
  this.onConnect = function() { this._onConnect.forward(arguments); }
  this.onDisconnect = function() { this._onDisconnect.forward(arguments); }

  this.reset = function() {
    this._onConnect.reset();
    this._onDisconnect.reset();
  }

  // called when we're connected
  this.connectionMade = function() {
    this._isConnected = true;
    this._onConnect.fire();
  }

  this.connectionLost = function(err) {
    for (var i in this._requests) {
      var req = this._requests[i];
      delete this._requests[i];
      req._onError.fire(err);
    }

    this._isConnected = false;
    this._onDisconnect.fire(err);
  }

  this.sendRequest = function(name, args, target, cb) {
    if (arguments.length > 4) { // allow bound functions (e.g. [this, 'onResponse', 123])
      cb = bind.apply(GLOBAL, Array.prototype.slice.call(arguments, 3));
    }

    var frameArgs = {
      name: name,
      args: args
    };

    if (target) { frameArgs.target = target; }

    var id = this.sendFrame('RPC', frameArgs),
      req = this._requests[id] = new RPCRequest(this, id);

    if (cb) {
      req.onSuccess(GLOBAL, cb, false); // will call cb(false, args...)
      req.onError(GLOBAL, cb); // will call cb(err)
    }

    return req;
  }

  this.sendEvent = function(name, args, target) {
    this.sendFrame('EVENT', {name: name, args: args, target: target || null});
  }

  this.frameReceived = function(id, name, args) {
    logger.debug('RECEIVED', id, name, args);
    switch(name.toUpperCase()) {
      case 'RESPONSE':
        var req = this._requests[args.id];
        if (!req) { return; }
        delete this._requests[args.id];
        req._onSuccess.fire(args.args);
        break;
      case 'ERROR':
        var msg = args.msg || 'unknown',
          requestId = args.id,
          req = this._requests[requestId],
          err = new Error(this, id, msg, args.details, requestId);

        if (!req) {
          return this.errorReceived && this.errorReceived(err);
        } else {
          delete this._requests[requestId];
          req._onError.fire(err);
        }
        break;
      case 'RPC':
      case 'EVENT':
        if (!args.name) {
          return self.sendFrame('ERROR', { 'id': args.id || id, 'msg': 'missing "name"' });
        }
        var frameArgs = args.args || {};
        var target = args.target || DEFAULT_TARGET;
        var isRPC = name.toUpperCase() == 'RPC';
        var reqCtor = isRPC ? ReceivedRequest : ReceivedEvent;
        var listeners = isRPC ? this._requestListeners : this._eventListeners;
        var req = new reqCtor(this, args.id || id, args.name, frameArgs, target);

        if (target && listeners[target]) {
          var cbs = listeners[target][req.name];
          if (cbs) {
            cbs.slice(0).forEach(function (cb) { cb(req); });
          }
        }
        break;
      default:
        break;
    }
  }

  this.removeTarget = function (target) {
    delete this._eventListeners[target];
    delete this._requestListeners[target];
  }

  this.onRequest = function (name, target, cb) {
    addCb(this._requestListeners, name, target, cb);
  }

  this.onEvent = function (name, target, cb) {
    addCb(this._eventListeners, name, target, cb);
  }

  function addCb(listeners, name, target, cb) {
    target = target || DEFAULT_TARGET;

    if (!listeners[target]) {
      listeners[target] = {};
    }

    if (!listeners[target][name]) {
      listeners[target][name] = [];
    }

    listeners[target][name].push(cb);
  }

  this.getClient = function (target) {
    if (!this._clients[target]) {
      this._clients[target] = new TargetClient(this, target);
    }

    return this._clients[target];
  }

  var TargetClient = Class(lib.PubSub, function () {
    this.init = function (conn, target) {
      this._conn = conn;
      this._target = target;

      this._onConnect = [];
      this._onEvent = [];
      this._onRequest = [];

      this._conn.onConnect(bind(this, '_onConnectionMade'));
    }

    this.setConn = function (conn) {
      if (this._conn) { this._removeListeners(); }
      this._conn = conn;
    }

    this._onConnectionMade = function (conn) {
      if (conn == this._conn) {
        this._onConnect.forEach(function (cb) { cb && cb(); });
      }
    }

    this.isConnected = function () { return this._conn.isConnected(); }

    this.onConnect = function (cb) {
      if (!cb) { return; }

      if (this._conn.isConnected()) {
        cb();
      } else {
        this._onConnect.push(cb);
      }
    }

    this.onRequest = function (name, cb) {
      this._conn.onRequest(name, this._target, cb);
    }

    this.onEvent = function (name, cb) {
      this._conn.onEvent(name, this._target, cb);
    }

    this.end = function () {
      this._removeListeners();
    }

    this._removeListeners = function () {
      this._conn.removeTarget(this._target);
    }

    this.sendEvent = function (name, opts) {
      this._conn.sendEvent(name, opts, this._target);
    }

    this.sendRequest = function (name, opts, cb) {
      if (typeof opts == 'function') {
        cb = opts;
        opts = null;
      }

      this._conn.sendRequest(name, opts, this._target, cb);
    }
  });
});
