/** @license
 * This file is part of the Game Closure SDK.
 *
 * The Game Closure SDK is free software: you can redistribute it and/or modify
 * it under the terms of the Mozilla Public License v. 2.0 as published by Mozilla.

 * The Game Closure SDK is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * Mozilla Public License v. 2.0 for more details.

 * You should have received a copy of the Mozilla Public License v. 2.0
 * along with the Game Closure SDK.  If not, see <http://mozilla.org/MPL/2.0/>.
 */

var jsio = require('../../../common').jsio;

jsio("import net;");
jsio("import net.interfaces;");
jsio("import net.protocols.Cuppa;");
jsio("from util.underscore import _;");

/*
 * This is a server for the native timestep inspector - NOT the native debugger.
 */

var Server = Class(net.interfaces.Server, function () {
	this.init = function () {
		this._conns = {};
		this._connsHash = {};
		this._activeRemoteConn = null;
	}

	this.buildProtocol = function () {
		var conn = new net.protocols.Cuppa();
		conn.onEvent.subscribe('HANDSHAKE', this, function (evt) {
			if (evt.args.type === 'ios' || evt.args.type === 'android') {
				this.setupRemoteConn(conn, evt.args);
			} else if (evt.args.type === 'inspector') {
				this.setupInspectorConn(conn, evt.args);
			}
		});
		return conn;
	};

	this.getRemoteConnections = function () {
		return this._connsHash;
	};

	this.setupRemoteConn = function (conn, args) {
		console.log('SETUP REMOTE CONN', args.device.globalID, args.device.info.model)
		this._connsHash[args.device.globalID] = args.device.info.model;
		this._conns[args.device.globalID] = conn;
		conn.onDisconnect = bind(this, function () { 
			conn.onEvent.removeAllListeners();
			conn.onRequest.removeAllListeners();
			if (conn === this._activeRemoteConn) {
				this._activeRemoteConn = null;
			}
		});

		this.activateRemoteConn(args.device.globalID);
	};

	this.activateRemoteConn = function (id) {
		if (!this._conns[id]) {
			console.log("device " + id + " isn't connected");
			return false;
		}  else {
			console.log("ACTIVATE ", id);
			this.unproxyConnections();
			this._activeRemoteConn = this._conns[id];
			this.proxyConnections();
			return true;
		}
	};

	this.setupInspectorConn = function (conn, args) {
		if (this._inspectorConn != conn && this._inspectorConn) {
			this.unproxyConnections();
		}
		this._inspectorConn = conn;
		this.proxyConnections();
	};

	this.proxyConnections = function () {
		if (!this._inspectorConn || !this._activeRemoteConn) return;
		this.unproxyConnections();

		this._inspectorConn.onRequest.subscribe('__any', this, function (name, req) {
			this._activeRemoteConn.sendRequest(name, req.args, null, function (err, res) {
				req.respond(res);
			})
		});
		this._activeRemoteConn.onRequest.subscribe('__any', this, function (name, req) {
			this._inspectorConn.sendRequest(name, req.args, null, function (err, res) {
				req.respond(res);
			})
		});
		
		this._inspectorConn.onEvent.subscribe('__any', this, function (name, evt) {
			this._activeRemoteConn.sendEvent(name, evt.args);
		});
		this._activeRemoteConn.onEvent.subscribe('__any', this, function (name, evt) {
			this._inspectorConn.sendEvent(name, evt.args);
		});
	};

	this.unproxyConnections = function () {
		if (this._inspectorConn) {
			this._inspectorConn.onRequest.removeAllListeners();
			this._inspectorConn.onEvent.removeAllListeners();
		}

		if (this._activeRemoteConn) {
			this._activeRemoteConn.onRequest.removeAllListeners();
			this._activeRemoteConn.onEvent.removeAllListeners();
		}
	};
});

exports.createServer = function () {
	return new Server();
};
