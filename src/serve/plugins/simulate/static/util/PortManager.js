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

var PortManager = exports = Class(function(){
	var hash = {}

	this.init = function (opts) {
		if (opts.range) {
			// string like '9200 - 9220 exclusive'
			var match = opts.range.match(/(\d+)\s*-\s*(\d+)\s*(\w*)/);
			this.rangeStart = Number(match[1]);
			this.rangeEnd = Number(match[2]);
			if (match.length === 4) {
				if (match[3].toLowerCase() === 'exclusive') {
					this.type = 'exclusive';
				} else if (match[3].toLowerCase() === 'inclusive') {
					this.type = 'inclusive';
				}
			}
			if (!this.type) this.type = 'exclusive';

		} else if (opts.rangeStart && opts.rangeEnd) {
			this.rangeStart = opts.rangeStart;
			this.rangeEnd = opts.rangeEnd;
		}

		if (this.type === 'exclusive') {
			this.rangeStart = this.rangeStart+1;
			this.rangeEnd = this.rangeEnd-1;
		}

		var i;
		for (i = this.rangeStart; i < this.rangeEnd; i++) {
			hash[i] = false;
		};
	}

	this.isEmpty = function (port) {
		return hash[port];
	}

	this.useEmptyPort = function () {
		var i;
		for (i in hash) {
			if (hash[i] === false) {
				hash[i] = true;
				return i;
			}
		}
	}

	this.clearPort = function (port) {
		if (port in hash) {
			hash[port] = false;
		}
	}
});
