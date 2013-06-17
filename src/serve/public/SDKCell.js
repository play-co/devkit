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

import squill.Cell as Cell;

exports = SDKCell = Class(Cell, function(supr) {
	this.buildWidget = function() {
		this.initMouseEvents();
	};

	this.toLength = function(s, maxLength, minLength, moreStr, right) {
		if (s.length <= maxLength) {
			return s;
		}

		var i = maxLength;
		var chr;
		var cutof = '/_.,- ';

		minLength = minLength || 8;
		moreStr = moreStr || '...';

		if (right) {
			while (i > minLength) {
				i++;
				chr = s[s.length - 1 - i];
				if (cutof.indexOf(chr) !== -1) {
					return '...' + s.substr(-i);
				}
			}

			return '...' + s.substr(-maxLength);
		} else {
			while (i > minLength) {
				i--;
				chr = s[i];
				if (cutof.indexOf(chr) !== -1) {
					return s.substr(0, i) + '...';
				}
			}

			return s.substr(0, maxLength) + '...';
		}
	};
});
