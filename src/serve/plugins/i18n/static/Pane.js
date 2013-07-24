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
import util.ajax;

exports = Class(sdkPlugin.SDKPlugin, function(supr) {
	this._def = {
		id: 'i18nPane',
		children: [
			{
				id: 'i18nPaneFrame',
				tag: 'table'
			}
		]
	};

	this.buildTable = function(err, trans) {
		var t = document.getElementById('i18nPaneFrame');

		if (err) {
			t.innerHTML = 'no translations';
		} else {
			t.innerHTML = '';

			var phrases = trans.en;
			var row = document.createElement('tr');
			var keyCell = document.createElement('td');
			keyCell.innerHTML = 'key';
			row.appendChild(keyCell);
			for (var k in trans) {
				var langCell = document.createElement('td');
				langCell.innerHTML = '<b>' + k + '</b>';
				row.appendChild(langCell);
				phrases = phrases || trans[k];
			}
			t.appendChild(row);

			for (var k in phrases) {
				var row = document.createElement('tr');
				var keyCell = document.createElement('td');
				keyCell.innerHTML = '<b>' + k + '</b>';
				row.appendChild(keyCell);
				for (var lang in trans) {
					var valCell = document.createElement('td');
					valCell.innerHTML = trans[lang][k];
					row.appendChild(valCell);
				}
				t.appendChild(row);
			}
		}
	};

	this.onBeforeShow = function() {
		util.ajax.get({
			url: this._project.url + 'debug/resources/lang/all.json',
			type: 'json'
		}, bind(this, 'buildTable'));
	};
});
