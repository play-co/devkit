/** @license
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

// Projects plugin

var fs = require('fs');
var express = require('express');
var path = require('path');

var common = require('../../../common');
var git = require('../../../git');
var projectManager = require('../../../ProjectManager');
var build = require('../../../build');
var pho = require("../../../PackageManager");

/**
 * Module API.
 */

var _app;

projectManager.on('AddProject', serveProject);

function serveProject (project) {
	var id = project.getID();

	// Serve project files and folders.
	_app.use('/projects/' + id + '/files', express.static(project.paths.root));
	_app.get(new RegExp("^/projects/" + id + "/files/(.*/|)$"), function (req, res) {
		var dir = path.join(project.paths.root, '/', req.params[0]);
		if (fs.existsSync(dir)) {
			git.listVersionedFiles(dir, function (files) {
				res.json(files);
			});
		} else {
			res.json({error: 'No folder by that name exists.', files: []}, 404);
		}
	});
}

// Attach API handlers.  Only call once.
exports.load = function (app) {
	_app = app; //save the express app for reloading

	// JSON project list for the test app and front-end
	app.get('/projects', function (req, res) {
		var projects = projectManager.getProjects();
		res.json(projects);
	});

	// Manifest saving.
	// TODO this is a bad API, should be changed later on.
	app.post("/projects/manifest/save/:shortName", function(req, res) {
		var projects = projectManager.getProjects();
		if (projects) {
			var project = projects.filter(function (project) {
				return project.manifest.shortName == req.params.shortName || project.manifest.appID == req.params.shortName;
			})[0];
			
			if (!project) {
				res.json({ok: false, error: 'Manifest for project not found'}, 404);
				return;
			}
			
			// Duplicate manifest, copy files from the request into manifest.
			var currentManifest = project.manifest;
			for(var key in req.body) {
				currentManifest[key] = req.body[key];
			}
			
			project.saveManifest(currentManifest, function() {
				res.json({"ok": true});
			});
		}
	});
}

exports.serveProject = serveProject;
