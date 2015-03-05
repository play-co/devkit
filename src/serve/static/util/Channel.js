import lib.PubSub;

exports = Class(lib.PubSub, function (supr) {

  var reqId = 0;

  this.init = function (name) {
    this._name = name;
    this._requests = {};

    this._onTransportConnect = this._onTransportConnect.bind(this);
    this._onTransportDisconnect = this._onTransportDisconnect.bind(this);
    this._onTransportMessage = this._onTransportMessage.bind(this);
  }

  /**
   * returns a Promise that resolves once the channel is connected to another channel
   */
  this.connect = function () {
    return new Promise(function (resolve, reject) {
      if (this._isConnected) {
        resolve();
      } else {
        this.once('connect', resolve);
      }
    }.bind(this));
  }

  this._isConnected = false;

  // is someone on the other end of this channel listening
  this.isConnected = function () { return this._isConnected; }

  this.disconnect =
  this.close = function () {
    this._sendInternalMessage('disconnect');
  }

  // internal: set an underlying transport
  this.setTransport = function (transport) {

    if (this._transport && this._transport != transport) {
      // tear-down an old transport
      this._transport
        .removeListener('disconnect', this._onTransportDisconnect)
        .removeListener('connect', this._onTransportConnect)
        .removeListener(this._name, this._onTransportMessage);
    }

    this._transport = transport;
    if (transport) {
      transport.on('disconnect', this._onTransportDisconnect)
        .on('connect', this._onTransportConnect)
        .on(this._name, this._onTransportMessage);

      // start connect handshake
      this._onTransportConnect();
    }
  }

  this._onTransportConnect = function () {
    // transport connected, start a connect handshake (see if anyone is listening)
    this._sendInternalMessage('connect');
  }

  this._onTransportDisconnect = function () {
    this._isConnected = false;
  }

  this._onTransportMessage = function (msg) {
    if (msg.internal) {
      this._onInternalMessage(msg.internal);
    } else if (msg.res) {
      if (msg.error) {
        this._requests[msg.res].reject(msg.error);
      } else {
        this._requests[msg.res].resolve(msg.data);
      }
    } else if (msg.id) {
      supr(this, 'emit', [msg.name, new Response(this, msg)]);
    } else {
      supr(this, 'emit', [msg.name, msg.data]);
    }
  }

  this._sendInternalMessage = function (name) {
    if (this._transport) {
      this._transport.emit(this._name, {internal: name});
    }
  }

  this._onInternalMessage = function (msg) {
    // handle internal message protocol, used to determine if the receiver channel is listening to events
    switch (msg) {
      case 'connect':
        // complete the channel connection
        this._sendInternalMessage('connectConfirmed');

        // fall-through
      case 'connectConfirmed':
        this._isConnected = true;
        this._emit('connect');
        break;
      case 'disconnect':
        this._isConnected = false;
        this._emit('disconnect');
        break;
    }
  }

  var Response = Class(function () {
    this.init = function (channel, req) {
      this.channel = channel;
      this.req = req;
      this.responded = false;
    }

    this.error = function (err) {
      if (this.responded) { return; }
      this.responded = true;
      this.channel._send({error: err, res: this.req.id});
    }

    this.send = function (data) {
      if (this.responded) { return; }
      this.responded = true;
      this.channel._send({data: data, res: this.req.id});
    }
  });

  this._send = function (data) {
    if (this._transport) {
      this._transport.emit(this._name, data);
    } else {
      logger.warn(this._name, 'failed to send', data);
    }
  }

  // emit an event locally on the channel object
  this._emit = function (name, data) {
    supr(this, 'emit', arguments);
  }

  // emit an event remotely on the receiver channel object
  this.emit = function (name, data) {
    this._send({name: name, data: data});
  }

  /**
   * emits
   */
  this.request = function (name, data) {
    return this.connect().bind(this).then(function () {
      var id = ++reqId;
      this._send({name: name, data: data, id: id});
      return new Promise(function (resolve, reject) {
        this._requests[id] = {resolve: resolve, reject: reject};
      }.bind(this));
    });
  }
});
