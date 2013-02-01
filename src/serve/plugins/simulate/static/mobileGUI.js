/* @license
 * This file is part of the Game Closure SDK.
 *
 * The Game Closure SDK is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * The Game Closure SDK is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with the Game Closure SDK.  If not, see <http://www.gnu.org/licenses/>.
 */

"use import";

from util.browser import $;

exports.start = function() {
	var select = $({
		tag: 'select',
		parent: document.body,
		children: [
			$({tag: 'option', attrs: {value: 'single'}, text: 'single'}),
			$({tag: 'option', attrs: {value: 'multi'}, text: 'multi'}),
			$({tag: 'option', attrs: {value: 'intro'}, text: 'intro'})
		]
	});

	$.onEvent($({
		tag: 'button',
		parent: document.body,
		text: 'launch!'
	}), 'click', function() {
		
		// figure out the device type
		var ua = navigator.userAgent;
		var isIOS = /(iPod|iPhone|iPad)/i.test(ua);
		var isAndroid = !isIOS && /Mobile Safari/.test(ua);
		
		window.location = 'browser-mobile/?device&entry=' + select.value;
	});
};
