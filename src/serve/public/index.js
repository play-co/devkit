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

import squill.cssLoad;
import squill.models.DataSource as DataSource;
import util.ajax;

import .Project;
from util.browser import $;
import ff;

/**
 * Create a Projects datasource.
 */
var projects = new DataSource({
	key: 'id',
	ctor: Project,
	sorter: function (item) {
		return [
			item.category == 'tmp' ? 0 : item.category == 'user' ? 1 : 2,
			item.manifest.title || item.manifest.name || item.id,
			item.id
		].join('|').toLowerCase();
	}
});

var f = ff(function () {

	var onCSS = f.wait();
	squill.cssLoad.get('main.css', function (err, el) {
		if (!err) {
			onCSS();
		} else {
			$({
				parent: document.body,
				children: [
					{tag: 'h3', text: 'CSS Error'},
					{tag: 'h4', text: 'Status: ' + err.status},
					{tag: 'pre', text: err.response}
				]
			});
		}
	});

	/**
	 * Load projects.
	 */
	var onProjects = f.wait();
	util.ajax.get({
		url: '/projects',
		type: 'json',
		data: {extended: true}
	}, function (err, response) {
		if (err) {
			$({
				parent: document.body,
				children: [
					{tag: 'h3', text: 'Projects Error'},
					{tag: 'h4', text: 'Status: ' + err.status},
					{tag: 'pre', text: 'Could not list projects\n\n' + JSON.stringify(err, null, '\t')}
				]
			});
		} else {
			for (var appID in response) {
				projects.add(response[appID]);
			}

			onProjects();
		}
	});
}, function () {
	/**
	 * Load initial Overview pane.
	 */
	var Overview = jsio('import .Overview');
	GLOBAL.overview = new Overview({
		parent: document.body,
		dataSource: projects
	});
});

/**
 * Error reporting.
 */
window.handleError = function (err, msg) {
	alert(msg + ':\n' + JSON.stringify(err));
};
