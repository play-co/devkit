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

import util.ajax;

/**
 * Load projects.
 */

util.ajax.get({
	url: '/projects',
	type: 'json',
	data: {extended: true}
}, function (err, response) {
	if (err) {
		return handleError(err, 'could not list projects');
	}

	for (var app_id in response) {
		var link = document.createElement('a');
		link.setAttribute('style', 'display: block; padding: 10px 15px; background: #eee; border-bottom: 1px solid black;');
		link.appendChild(document.createTextNode(app_id));
		document.body.appendChild(link);
		link.href = '/simulate/' + app_id + '/browser-mobile/';
	}
});