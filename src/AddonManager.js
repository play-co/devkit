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

var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var ff = require('ff');
var path = require('path');
var common = require('./common');
var Version = require('./shared/Version');
var _git = require('./git');
var pho = require('./PackageManager');
var clc = require('cli-color');
var wrench = require('wrench');
var Repo = require('./Repo');

var logger = new common.Formatter('addons');

var addonPath = common.paths.root("addons");

var REGISTRY_PATH	= common.paths.lib('addon-registry');
var REGISTRY_URL	= "https://github.com/gameclosure/addon-registry";

var AddonManager = Class(EventEmitter, function () {

	var Registry = Class(EventEmitter, function () {
		this.init = function () {
			this._registry = null;
			
			this._client = _git.createClient(REGISTRY_PATH)
		};

		this.clone = function (cb) {
			//check if the registry exists
			if (!fs.existsSync(REGISTRY_PATH)) {
				//create the directory structure and clone it
				wrench.mkdirSyncRecursive(REGISTRY_PATH);

				this._client('clone', REGISTRY_URL, ".", cb);
			} else {
				cb();
			}
		}

		this.update = function (cb) {

			var f = ff(this, function() {
				this.clone(f.wait());
			}, function () {
				_git.pull(REGISTRY_PATH, 'origin', 'master', f());
			}).error(function (e) {
				logger.error('Error updating registry:', e);
			}).cb(cb);
		};

		this._read = function (cb) {
			if (this._isReading) {
				return this._isReading.cb(cb);
			}

			logger.log('reading addon registry');

			var f = this._isReading = ff(this, function () {
				this.update(f.wait());
			}, function() {
				fs.readdir(REGISTRY_PATH, f());
			}, function (files) {
				this._registry = {};
				files.forEach(function (filename) {
					var match = filename.match(/^(.*)\.json$/);
					if (match) {
						this._registry[match[1]] = true;
					}
				}, this);

				this.emit('RegistryUpdate');
			}).error(function (e) {
				logger.error('Error reading registry:', e);
			}).cb(function () {
				logger.log('Updated registry.');
				this._isReading = false;
			}).cb(cb);
		};

		// error codes:
		//    UNKNOWN_ADDON
		this.getVersion = function (addon, cb) {

			logger.log('getting registry version for', addon);

			var f = ff(this, function () {
				if (!this._registry) {
					this._read(f());
				}
			}, function () {
				if (!(addon in this._registry)) {
					//if not found, pretend a user addon
					return f.slot()(null, "{\"type\": \"user\"}")
				}

				fs.readFile(common.paths.lib('addon-registry/' + addon + '.json'), 'utf-8', f());
			}, function (contents) {
				var info = JSON.parse(contents);
				if (info.type == 'core') {
					if (common.sdkVersion.channel == 'dev') {
						f('dev', true);
					} else {
						logger.log("Using version from SDK:", common.sdkVersion.toString());
						f(common.sdkVersion, true);
					}
				} else {
					var vers = info.version ? info.version :
						common.paths.addons(addon).slice(-5) == "-priv" ? "develop" : "master";
					logger.log("Using version from registry:", vers.toString());
					f(vers, false);
				}
			}).cb(cb);
		};

		// returns an array of addon names
		this.getList = function (cb) {
			var f = ff(this, function () {
				if (!this._registry) {
					this._read(f());
				}
			}, function () {
				f(Object.keys(this._registry));
			}).cb(cb);
		};


	});

	this.init = function () {
		this._paths = [];
		this.registry = new Registry();
	};

	// install the requested addon at the requested version
	// @param addon (string)
	// @param opts {
	//     version: requested version, defaults to registry version
	// }
	// @param cb (function (err, cb) {})
	this.install = function (addon, opts, cb) {
		var addonPath = this.getPath(addon);
		var addonRepo = new Repo.create(addon, {
			path: addonPath
		});

		var f = ff(this, function () {
			fs.exists(path.join(addonPath, '.git'), f.slotPlain());
			this.registry.getVersion(addon, f());
		}, function (addonExists, version) {

			// install new addon if not exists, otherwise update
			if (!addonExists) {
				logger.log(addon, "not currently installed, installing now");
				if (version != "master" && version != "develop") {
					version = Version.parse(version);
				}
				this.clone(addon, version, opts, f.wait());
				f(false); // signal next function to NOT update
			} else {
				f("update"); // signal next function to update
				logger.log('checking', addon, 'for updates');
				addonRepo.getStatus(f.slotPlain(2));
				addonRepo.getCurrentBranch(f.slotPlain(2));
			}

		}, function (doUpdate, statusError, status, branchError, branch) {

			// if we are updating, make sure we are on master branch and there are no modified files
			// NOTE: this is a temporary solution until we rework addon system to work with versioning
			if (doUpdate) {
				var properBranch = addonPath.slice(-5) == "-priv" ? "develop" : "master";
				if (statusError || status.modified.length > 0) {
					logger.error("Cannot update", addon, "please stash or remove local changes first.");
				} else if (branchError || branch != properBranch) {
					logger.error("Cannot update", addon, "please checkout " + properBranch + " branch first.");
				} else {
					this.activateVersion(addon, properBranch, f.wait());
				}
			}
		}).error(function (err) {
			logger.error("Error installing addon", addon + ":");
			if (err.stack) {
				console.error(err.stack);
			} else {
				console.error(err);
			}
		}).cb(cb);
	};

	this.getPath = function (addon) {
		return common.paths.addons(addon);
	};

	this.clone = function (addon, version, opts, cb) {
		var addonData = addon.split("/");
		var addonPath = this.getPath(addon);
		var account, repo, target;

		if (addonData.length === 1) {
			account = "gameclosure";
			repo = addonData[0];
			target = addonData[0];
		} else {
			account = addonData[0];
			repo = target = addonData[1];
		}

		var url;
		if (opts.isSSH === true) {
			url = "git@github.com:" + account + "/" + repo + ".git";
		} else {
			url = "https://github.com/" + account + "/" + repo;
		}

		var addonGit = _git.createClient(addonPath);
		var baseGit = _git.createClient(common.paths.root());

		var f = ff(this, function() {
			fs.exists(addonPath, f.slotPlain());
		}, function (exists) {
			if (exists) {
				if (opts.force) {
					logger.error("moving old directory...");
					common.child("mv", [addonPath, '.' + Date.now()], f());
				} else {
					throw "Directory for " + addon + " already exist. Please remove first.";
				}
			}
		}, function () {
			logger.log("Downloading addon " + account + "/" + repo);

			// clone the add on
			logger.log("URL:", url);
			baseGit('clone', url, addonPath, f());
		}, function (err) {
			logger.log("Addon installed!");
			this.activateVersion(addon, version, f.wait());
		}).error(function (e) {
			logger.error("Error downloading addon " + account + "/" + repo + ":\n", e);
		}).success(cb);
	};

	this.startupPlugins = function (next) {
		var pluginsRoot = common.paths.root("sdk/plugins");
		var links;

		// Remove symlinks that point to invalid paths from devkit/plugins.
		// Add devkit/plugins to the js.io compile path.

		var f = ff(this, function () {
			// Make plugin root directory
			wrench.mkdirSyncRecursive(pluginsRoot, 511); // 0777

			fs.readdir(pluginsRoot, f.slot());
		}, function (contents) {
			var group = f.group();

			links = contents;
			if (links && links.length > 0) {
				for (var ii = 0, len = links.length; ii < len; ++ii) {
					var filePath = path.join(pluginsRoot, links[ii]);
					links[ii] = filePath;
					fs.readlink(filePath, group.slot());
				}
			} else {
				logger.log("No plugin JS currently installed");

				// Stop ff call chain here
				f.succeed();
			}
		}, function (targets) {
			var group = f.group();

			if (targets && targets.length > 0) {
				if (targets.length != links.length) {
					throw new Error("Array size mismatch");
				}

				for (var ii = 0, len = targets.length; ii < len; ++ii) {
					fs.exists(targets[ii], group.slotPlain());
				}
			} else {
				throw new Error("Unable to read plugin JS symlinks");
			}
		}, function (checks) {
			if (checks && checks.length > 0) {
				if (checks.length != links.length) {
					throw new Error("Array size mismatch");
				}

				for (var ii = 0, len = checks.length; ii < len; ++ii) {
					if (!checks[ii]) {
						logger.log("Removing plugin JS symlink for", links[ii], "since it no longer valid");

						fs.unlink(links[ii], f.wait());
					}
				}
			} else {
				throw new Error("Unable to read plugin JS exist");
			}
		}).error(function (e) {
			logger.error("Failure validating plugin JS:", e);
		}).cb(next);
	}

	this.activatePluginJS = function (addon, next) {
		var pluginRoot = path.normalize(path.join(__dirname, "../sdk/plugins"));
		var linkPath = path.normalize(path.join(pluginRoot, addon));

		if (!fs.existsSync(pluginRoot)) {
			wrench.mkdirSyncRecursive(pluginRoot);
		}

		// WARNING: Since Windows requires symlink source paths to be absolute,
		// the plugin path is based on the absolute path to this file.
		var jsPath = path.normalize(path.join(__dirname, "../addons", addon, "js"));

		var f = ff(this, function () {
			// Does the addon have a JS path?
			fs.exists(jsPath, f.slotPlain());
		}, function (jsPathExists) {
			if (jsPathExists) {
				//logger.log("Installing plugin JS path:", jsPath);

				// Remove old symlink if it exists
				if (fs.existsSync(linkPath)) {
					fs.unlinkSync(linkPath);
				}

				// Add new JS symlink
				fs.symlink(jsPath, linkPath, 'junction', f.wait());
			} else {
				// Stop ff call chain here
				f.succeed();
			}
		}).error(function (e) {
			logger.error("Failure activating plugin JS for", addon + ":", e);
		}).cb(next);
	}

	/**
	* Activating a version means to checkout the
	* compatible version of an addon
	*/
	this.activateVersion = function (addon, version, cb) {
		var addonGit = _git.createClient(this.getPath(addon));

		var f = ff(this, function () {
			addonGit('fetch', '--tags', f());
		}, function () {
			//checkout the correct version
			addonGit('checkout', version.toString(), '--force', f.slotPlain());
		}, function (code) {
			//exited with status other than 0
			if (code != 0) {
				logger.log("Could not find", version.toString(), ". Using master");
				addonGit('checkout', 'master', '--force', f.slot());
			}
		}, function () {
			// Activate plugin JS (if it exists) before running index.js
			this.activatePluginJS(addon, f.wait());
		}, function () {
			var currentPath = path.join(this.getPath(addon), "index.js");
			if (!fs.existsSync(currentPath)) {
				logger.warn("Couldn't find index.js! Your addon may break.",
					"Contact the addon's creator for more information.");
			} else {
				try {
					//try to include the file and execute init()
					var idx = require(currentPath);
					if (typeof idx.init === "function") {
						idx.init(common);
					}
				} catch (e) {
					logger.error("Error loading [" + currentPath + "] : init():");
					console.error(e);
					console.error(e.stack);
				}
			}
		}).error(function (e) {
			logger.error("could not activate version", version + ":", e);
		}).cb(cb);
	};

	this.uninstall = function (addon, cb) {
		var f = ff(this, function() {
			wrench.rmdirRecursive(common.paths.addons(addon), f());
		}, function(err) {
			logger.log("Addon removed");
		}).error(function(e) {
			logger.error("Error downloading addon", addon + ":", e);
		}).cb(cb);
	};

	/**
	 * Method will scan the addons directory and initialise
	 * every addon by loading an index file and executing a
	 * load method.
	 */
	this.scanAddons = function (cb) {
		var f = ff(this, function () {
			fs.readdir(addonPath, f());

			this.startupPlugins(f.waitPlain());
		}, function (files) {
			var addons = [];
			f(addons);

			files.forEach(function (file) {
				this.activatePluginJS(file, f.wait());

				var onLoad = f.waitPlain();
				var currentPath = path.join(addonPath, file, "index.js");
				fs.exists(currentPath, bind(this, function (exists) {
					if (exists) {
						try {
							var data = require(currentPath).load(common) || {};

							// merge the paths in
							this._paths = this._paths.concat(data.paths || []).filter(function (path) { return path; });

							addons.push(file);
						} catch (err) {
							logger.error("Could not load [" + file + "] : No index file with a load method");
							console.error(err.stack);
						}
					}

					onLoad();
				}));
			}, this);
		}, function (addons) {
			this._addons = addons;
		}).cb(cb);
	};

	this.getAddons = function () {
		return this._addons;
	}

	this.registerPath = function (path) {
		this._paths.push(path);
	};

	this.getPaths = function () {
		return this._paths;
	};
});

//singleton!
module.exports = new AddonManager();

