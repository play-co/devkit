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

import ff;
import squill.cssLoad;
import util.ajax;
from util.browser import $;

import .Overview;

var f = ff(function () {
	util.ajax.get('/api/home', f());

	var onCSS = f.wait();
	squill.cssLoad.get('stylesheets/home.styl', function (err, el) {
		if (!err) {
			onCSS();
		} else {
			$({
				parent: document.body,
				children: [
					{tag: 'h3', text: 'CSS Error'},
					{tag: 'pre', text: err.target.innerText}
				]
			});
			console.log(err);
		}
	});
}, function (homeDirectory) {
	GLOBAL.overview = new Overview({
		parent: document.body,
		homeDirectory: homeDirectory.path
	});
});
