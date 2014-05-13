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

import sdkPlugin;

from util.browser import $;

exports = Class(sdkPlugin.SDKPlugin, function(supr) {
	this._def = {
		id: 'nativePane',
		children: [
			{
				tag: 'iframe',
				id: 'nativePaneFrame'
			}
		]
	};

	this.onBeforeShow = function() {
		document.getElementById("nativePaneFrame").src = "http://" + window.location.hostname + ":9220";
	};

	this.onBeforeHide = function() {
		document.getElementById("nativePaneFrame").src = "about:blank";
	};
});
