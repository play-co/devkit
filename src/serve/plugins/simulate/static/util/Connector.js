"use import";

import net.interfaces;
from util.browser import $;
import .Transport;

function findTarget(target) {
	try {
		var path = target.split('-'),
			target = top;
		for (var i = 0, j; j = path[i]; ++i) { target = target[j]; }
		return target && target.postMessage ? target : null;
	} catch(e) {
		logger.error(e, 'Could not find iframe target:', target, '(possibly a security error)');
		return null;
	}
}

var Connector = exports = Class(net.interfaces.Connector, function() {
	this.connect = function() {
		var target;
		if (this._opts.target) {
			target = findTarget(this._opts.target);
		} else {
			target = top;
		}
		
		$.onEvent(window, 'message', bind(this, '_onMessage'));
		target.postMessage('iS>{"type":"open"}', '*');
	};
	
	this._onMessage = function(evt) {
		var data = evt.data;
		if (!/^iC</.test(data)) { return; }
		
		data = eval('(' + data.substring(3) + ')');
		switch(data.type) {
			case 'open':
				this._transport = new Transport(evt.source, 'iS>', data.clientID);
				this.onConnect(this._transport);
				break;
			case 'close':
				this._transport.onClose();
				break;
			case 'data':
				this._transport.onData(data.payload);
				break;
		}
	};
});
