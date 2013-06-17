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

var path = require('path');
var fs = require('fs');
var ff = require('ff');
var packageManager = require('../PackageManager');
var clc = require('cli-color');

var common = require('../common');
var logger = new common.Formatter('register');

/* Adds a reference of the project to the config, so that it can be loaded.
 * @param {string|array} directories Directory path, or collection of directory paths to register.
 * @param {function} callback --Optional.
 */
exports.register = function (directories, warn, cb) {
	if (!Array.isArray(directories)) {
		directories = [directories];
	}

	var projects = common.config.get('projects');
	if (!Array.isArray(projects)) {
		projects = [];
	}

	// don't want to modify projects directly in case something is unregistering
	// simulataneously, so keep track in an array and do the add synchronously
	var toAdd = [];

	async_forEach(directories, function (projectPath, next) {
		var f = ff(function () {
			fs.realpath(projectPath, f());
		}, function (projectPath) {
			f(projectPath);
			packageManager.getProject(projectPath, f());
		}, function (projectPath, project) {
			if (project) {
				if (projects.indexOf(projectPath) == -1) {
					toAdd.push(projectPath);
					project.populateManifest({
						shortName: path.basename(projectPath)
					}, f());

					logger.log('adding', project.getID());
				} else {
					if (project && warn) {
						logger.log(project.getID(), 'is already registered');
					}
				}
			} else {
				logger.error(projectPath, 'is not a valid project');
			}
		}).cb(function (err) {
			if (err) {
				logger.error("Could not register project at", projectPath);
				logger.error(err);
			}

			next();
		});
	}, function () {
		// run after forEach is done

		// synchronous add to in-memory projects object
		if (toAdd.length) {
			var projects = common.config.get('projects') || [];
			common.config.set('projects', projects.concat(toAdd), cb);
		}
	});
};

// removes a reference 
exports.unregister = function (dirtounreg, next) {
	// Normalize the path.
	dirtounreg = fs.realpathSync(dirtounreg);
	
	var shortname = "";
	//if there's no manifest, this isn't a project folder
	if (!fs.existsSync(path.join(dirtounreg, './manifest.json'))) {
		logger.log("This isn't the root directory of a Game Closure SDK project!");
		return;
	} else {
		shortname = JSON.parse(fs.readFileSync(path.join(dirtounreg, './manifest.json'))).shortName;
	}

	// synchronous remove project
	var register = common.config.get('projects');
	if (!Array.isArray(register)) {
		register = [];
	}

	register = register.filter(function (dir) {
		return dir != dirtounreg;
	});

	common.config.set('projects', register, function () {
		logger.log('unregistered', dirtounreg + '.');
		next && next();
	});
};

// removes incorrect projects from the register.
exports.clean = function(next){
	var register = common.config.get('projects') || [];
	var cleanCount = 0;
	for (var ii = 0; ii < register.length; ++ii) {
		if (!fs.existsSync(path.join(register[ii], './manifest.json'))){
			register.splice(ii, 1);
			++cleanCount;
			--ii;
		}
	}
	if (cleanCount > 0) {
		common.config.set('projects', register, function () {
			console.log('Cleaned out', cleanCount, 'projects that were invalid from the register.');
			next && next();
		});
	} else {
		next && next();
	}
};

/*
 * From async.js <https://github.com/caolan/async>
 */
var async_forEach = function (arr, iterator, callback) {
  callback = callback || function () {};
  if (!arr.length) {
    return callback();
  }
  var completed = 0;
  _forEach(arr, function (x) {
    iterator(x, function (err) {
      if (err) {
        callback(err);
        callback = function () {};
      }
      else {
        completed += 1;
        if (completed === arr.length) {
          callback(null);
        }
      }
    });
  });
};

var _forEach = function (arr, iterator) {
  if (arr.forEach) {
    return arr.forEach(iterator);
  }
  for (var i = 0; i < arr.length; i += 1) {
    iterator(arr[i], i, arr);
  }
};
