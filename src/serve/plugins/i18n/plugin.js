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

// Internationalization plugin

var fs = require('fs');
var path = require('path');
var etag = require('../../etag');
var projectManager = require('../../../ProjectManager');

var _app;

projectManager.on('AddProject', serveProject);

var _trans = {};

function serveProject (project) {
	var id = project.getID();
	var langPath = path.join(project.paths.root, 'resources', 'lang');

	if (_trans[id] || !fs.existsSync(langPath)) { return false; }
	
	var trans = _trans[id] = {};
	var langs = fs.readdirSync(langPath);

	for (var i = 0; i < langs.length; i++) {
		var fname = langs[i];
		var lparts = fname.split('.');
		if (lparts[0] != 'all' && lparts[1] == 'json') {
			var lang = lparts[0];
			trans[lang] = JSON.parse(fs.readFileSync(path.join(langPath, fname)));
		}
	}

	fs.writeFileSync(path.join(langPath, 'all.json'), JSON.stringify(trans));
	_app.use('/simulate/' + id + '/debug/resources/lang/', etag.static(langPath));
}

exports.load = function (app) {
	_app = app;
};