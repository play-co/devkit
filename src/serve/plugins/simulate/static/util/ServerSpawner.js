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

"use import";

import net;
import net.protocols.Cuppa as CuppaProtocol;
import lib.PubSub;
import std.js;
import std.uuid;

var ServerShim = Class(CuppaProtocol, function(supr) {
	this.init = function(id, parentConn) {
		this._parentTargetPrefix = '__target_' + id + '_';
		this._parentConn = parentConn;
		
		supr(this, 'init', []);
		
		this.connectionMade();
	};
	
	this.sendFrame = function(name, args) {
		args.target = this._parentTargetPrefix + (args.target || '');
		var id = this._parentConn.sendFrame(name, args);
		return id;
	};
	
	this.sendRequest = function(name, args, target, cb) {
		var req = supr(this, 'sendRequest', arguments);
		this._parentConn.addReqServer(req.id, this);
		return req;
	};
});

var ServerSpawner = Class([CuppaProtocol, lib.PubSub], function(supr) {
	this.init = function(transport, transportOpts, appID) {
		supr(this, 'init');
		
		this._transport = transport;
		this._transportOpts = transportOpts;
		this._appID = appID;
		this._reqServers = {};
		this._servers = {};
	};
	
	this.addReqServer = function(id, conn) {
		this._reqServers[id] = conn;
	};
	
	this.connectionMade = function() {
		var loseConn = this.transport.loseConnection;
		this.transport.loseConnection = function() {

			loseConn.apply(this, arguments);
		};
		logger.log('Connecting to Portal...');
		
		this.sendRequest('AUTH', {}, null, bind(this, 'onAuth'));
		this.onRequest.subscribe('CREATE_SERVER', this, 'onCreateServerReq');
//		this.onRequest.subscribe('__any', this, 'onRequest')
	};
	
	this.frameReceived = function(id, name, args) {
		if ((name == 'RESPONSE' || name == 'ERROR') && this._reqServers[args.id]) {
			this._reqServers[args.id].frameReceived(id, name, args);
			delete this._reqServers[args.id];
			return;
		}
		
		if (args && args.target) {
			var result = args.target.match(/^__target_(.*?)_(.*)$/);
			if (result) {
				args.target = result[2];
				this._servers[result[1]].frameReceived(id, name, args);
				return;
			}
		}
		
		supr(this, 'frameReceived', arguments);
	};
	
	this.onAuth = function(err, response) {
		if (err) {
			logger.error('Failed:', JSON.stringify(err));
		} else {
			logger.log('Connected:', response);
		}
		
		this.publish('Connected');
	};
	
	this.onCreateServerReq = function(req) {
		logger.log('Creating a server');
		
		var appID = this._appID || req.args.appID,
			roomID = req.args.roomID,
			opts = req.args.options;
		
		this.createServer(appID, roomID, opts);
		req.respond('ok');
		//setTimeout(bind(this, 'createServer', uid, appID, roomID), 50);
	};
	
	var thisJsio = jsio;
	this.createServer = function(appID, roomID, opts) {
		var serverConn = new ServerShim(roomID, this);
		this._servers[roomID] = serverConn;
		
		// note: use the variable name jsio here so that the compiler does the proper imports
		var jsio = thisJsio.__jsio.clone();
		jsio.path.set(thisJsio.path.get());
		
		// TODO: make this a frame
		//jsio -- 'import _api.server.init';
		var GC = jsio('import GC');
		GC.buildServer({
			appID: appID, 
			roomID: roomID,
			opts: opts,
			conn: serverConn
		});
		
		// for hooking in server monitoring UI -- pass the ServerAPI instance to listeners
		this.publish('CreateServer', GC);
	};
	
	this.connectionLost = function() {
		logger.log('CONNECTION lost :-(');
		logger.log('CONNECTION lost :-(');
		logger.log('CONNECTION lost :-(');
		logger.log('CONNECTION lost :-(');
	};
	
});

exports.create = function(transport, transportOpts, appID) {
	// TODO: perhaps the servers should connect to a different server than the spawner?
	// do a shallow copy since we can't rely on net.connect to not modify the opts
	var spawner = new ServerSpawner(transport, std.js.shallowCopy(transportOpts), appID);
	net.connect(spawner, transport, transportOpts);
	return spawner;
};
