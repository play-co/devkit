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
var wrench = require('wrench');
var etag = require('../../etag');
var projectManager = require('../../../ProjectManager');

var _app;

projectManager.on('AddProject', serveProject);

var _trans = {};

function serveProject (project) {
	var id = project.getID();
	var langPath = path.join(project.paths.root, 'resources', 'lang');

	if (_trans[id] || !fs.existsSync(langPath)) { return false; }

	_trans[id] = {};
	var trans = _trans[id].translations = {};
	var keys = _trans[id].keys = {};
	var langs = fs.readdirSync(langPath);
	var shouldServe = false;

	// build translation objects
	for (var i = 0; i < langs.length; i++) {
		var fname = langs[i];
		var lparts = fname.split('.');
		if (lparts[0] != 'all' && lparts[1] == 'json') {
			shouldServe = true;
			var transObj = JSON.parse(fs.readFileSync(path.join(langPath, fname)));
			trans[lparts[0]] = transObj;
			for (var k in transObj) {
				keys[k] = [];
			}
		}
	}

	// build key locators
	var srcPath = path.join(project.paths.root, 'src');
	var files = wrench.readdirSyncRecursive(srcPath);
	for (var i = 0; i < files.length; i++) {
		var fname = files[i];
		var fpath = path.join(srcPath, fname);
		var f = new wrench.LineReader(fpath);
		var c = 1;
		while (f.hasNextLine()) {
			var line = f.getNextLine();
			for (var k in keys) {
				if (line.indexOf(k) != -1) {
					keys[k].push({
						id: fpath + '.' + c,
						file: fname,
						line: c
					});
				}
			}
			c += 1;
		}
		f.close();
	}

	if (shouldServe) {
		fs.writeFileSync(path.join(langPath, 'all.json'), JSON.stringify(_trans[id]));
		_app.use('/simulate/' + id + '/lang/', etag.static(langPath));
	}
}

exports.load = function (app) {
	_app = app;
};