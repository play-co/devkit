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

import util.ajax;

/**
 * Load apps.
 */

window.onload = function () {
	var background = document.body.appendChild(document.createElement('div'));
	var content = document.body.appendChild(document.createElement('div'));

	background.style.cssText = "position: fixed; z-index: -1; width: 100%; background: -webkit-linear-gradient(rgb(53, 82, 113), rgb(19, 29, 57)); top: 0px; bottom: -120px;";
	document.body.style.cssText = "height: 100%; font: 30px Helvetica; color: white; height: 100%";

	util.ajax.get({
		url: '/apps',
		type: 'json',
		data: {extended: true}
	}, function (err, response) {
		if (err) {
			return alert('could not list apps:\n' + err);
		}

		var apps = [];
		var groups = {};
		for (var appId in response) {
			var group = response[appId].manifest.group;
			if (group) {
				if (!groups[group]) {
					groups[group] = [];
				}
				groups[group].push(appId);
			} else {
				apps.push(appId);
			}
		}

		createHeader("Apps");

		apps.forEach(function (appId) {
			createLink(appId);
		});

		Object.keys(groups).forEach(function (group) {
			createHeader(group);
			groups[group].forEach(function (appId) {
				createLink(appId);
			});
		});

		function createHeader(text) {
			var node = document.body.appendChild(document.createElement("h3"));
			node.innerText = text;
			node.style.cssText = 'margin: 0px 0px 5px 0px; font-size: 16px; padding: 5px 0px 5px 10px; background: rgba(0, 0, 0, 0.2)';
		}

		function createLink(appId) {
			var link = document.createElement('a');
			link.setAttribute('style', 'font-size: 12px; white-space: nowrap; text-overflow: ellipsis; color: white; width: 60px; overflow: hidden; text-decoration: none; display: inline-block; margin: 10px; text-align: center;');
			link.innerHTML = "<br>" + appId;
			link.href = '/simulate/debug/' + appId + '/browser-mobile/';

			var icon = new Image();
			var src = getIcon(response[appId].manifest);
			icon.src = '/apps/' + appId + '/files/' + src;
			var dim = 60;
			icon.width = dim;
			icon.height = dim;
			icon.style.borderRadius = dim/5.7 + "px";
			link.insertBefore(icon, link.firstChild);
			document.body.appendChild(link);
		}
	});

	function getIcon(manifest) {
		var icon;
		if (manifest) {
			if (manifest.icon) {
				icon = manifest.icon;
			}

			if (!icon && manifest.icons) {
				if (512 in manifest.icons) {
					icon = manifest.icons[512];
				} else {
					var max = 0;
					Object.keys(manifest.icons).forEach(function (size) {
						size = parseInt(size);
						if (size > max) {
							max = size;
						}
					});
					icon = manifest.icons[max];
				}
			}
		}

		return icon
			|| manifest.android && getIcon(manifest.android)
			|| manifest.ios && getIcon(manifest.ios) || '../../../images/defaultIcon.png';
	}
}
