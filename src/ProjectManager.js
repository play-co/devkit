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

var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var path = require('path');
var ff = require('ff');
var common = require('./common');
var packageManager = require('./PackageManager');

var logger = new common.Formatter('games');

var ProjectManager = Class(EventEmitter, function () {
	this.init = function () {
		this._projectDirs = [];
		this._projects = {};

		this.loadConfig();
		common.config.on('change', bind(this, 'loadConfig', true));
	};

	this.loadConfig = function (reload) {
		if (this._reloading) { return; }
		this._reloading = true;

		var localProjectsPath = common.paths.root('./projects');
		var localProjects = fs.readdirSync(localProjectsPath).map(common.paths.projects);
		var configProjects = common.config.get('projects') || [];
		this._projectDirs = configProjects.concat(localProjects);

		var projects = {};
		var added = [];
		var removed = merge({}, this._projects);
		var f = ff(this, function () {
			this._projectDirs.forEach(function (dir) {
				var onProjectLoad = f.wait();
				
				packageManager.getProject(dir, bind(this, function (err, project) {
					if (err) {
						logger.error('Error loading game: at path ' + dir);
						logger.error(err);

					} else {
						var id = project.getID();
						projects[id] = project;
					}

					// track added and removed projects
					if (!(id in this._projects)) {
						if (projects[id]) added.push(projects[id]);
					} else {
						delete removed[id];
					}

					onProjectLoad();
				}));
			}, this);
		}, function () {
			// override this._projects with new dictionary
			this._projects = projects;

			// emit add/remove events!
			added.forEach(function (project) {
				if (reload) {
					logger.log('added', project.getID());
				}

				this.emit('AddProject', project);
			}, this);
			
			Object.keys(removed).forEach(function (id) {
				if (reload) {
					logger.log('removed', removed[id].getID());
				}
				
				this.emit('RemoveProject', removed[id]);
			}, this);

			this._reloading = false;
		});
	};

	this.getProjectDirs = function () {
		return this._projectDirs;
	};

	this.getProjects = function () {
		return this._projects;
	};
});

module.exports = new ProjectManager();
