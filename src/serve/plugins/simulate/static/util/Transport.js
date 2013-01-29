"use import";

import net.interfaces;

var Transport = exports = Class(net.interfaces.Transport, function() {
	this.init = function(win, prefix, clientID) {
		this._win = win;
		this._prefix = prefix + (clientID ? clientID + '<' : '');
		this._clientID = clientID;
	};
	
	this.makeConnection = function(protocol) {
		this._protocol = protocol;
	};
	
	this.write = function(data, encoding) {
		if (this.encoding == 'utf8') {
			this._win.postMessage(this._prefix + JSON.stringify({type: 'data', payload: utf8.encode(data)}), '*');
		} else {
			this._win.postMessage(this._prefix + JSON.stringify({type: 'data', payload: data}), '*');
		}
	};
	
	this.loseConnection = function(protocol) {
		this._win.postMessage(JSON.stringify({type: 'close', code: 301}), '*');
	};
	
	this.onData = function() {
		this._protocol.dataReceived.apply(this._protocol, arguments);
	};
	
	this.onClose = function() { this._protocol.connectionLost.apply(this._protocol, arguments); };
});

