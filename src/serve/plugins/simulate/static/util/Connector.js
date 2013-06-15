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
