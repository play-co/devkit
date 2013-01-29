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

var logger = new common.Formatter('addons');

var addonPath = common.paths.root("addons");

var REGISTRY_PATH	= common.paths.lib('addon-registry');
var REGISTRY_URL	= "git@github.com:gameclosure/addon-registry.git";

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
					console.log(this._registry);
					throw {code: "UNKNOWN_ADDON", message: "not a known addon "+addon};
				}

				fs.readFile(common.paths.lib('addon-registry/' + addon + '.json'), 'utf-8', f());
			}, function (contents) {
				var info = JSON.parse(contents);
				if (info.type == 'core') {
					if (common.sdkVersion.channel == 'dev') {
						f('dev', true);
					} else {
						logger.log("Using version from SDK", common.sdkVersion);
						f(common.sdkVersion, true);
					}
				} else {
					logger.log("Using version from registry", info.version);
					f(info.version || "master", false);
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
		logger.log('checking addon', addon + '...');
		var f = ff(this, function () {
			// get target version
			
			if (opts.version) {
				f(opts.version);
			} else {
				this.registry.getVersion(addon, f());
			}
		}, function (targetVersion) {
			if (targetVersion == 'dev') {
				logger.log('note: you are currently in dev mode.  Please use git submodules to manage core addons.');
				return f.succeed();
			}

			var version;
			//if the target version is master
			if (targetVersion == 'master') {
				version = "master";
			} else {
				//else try and parse the version
				version = Version.parse(targetVersion);
				if (!version) {
					throw targetVersion + " is not a valid version";
				}
			}

			logger.log('installing', addon, 'at', version);

			// get current version
			f(version);
			this.getVersion(addon, f.slotPlain(2));
		}, function (version, err, currentVersion) {
			if (err) {
				if (err.code == 'NOT_INSTALLED') {
					logger.log(addon, "not currently installed");
					this.clone(addon, version, opts, f.wait());
				} else {
					throw err;
				}
			} else {
				currentVersion = Version.parse(currentVersion);
				var wrongVersion = !currentVersion || !currentVersion.eq(version);
				if (wrongVersion) {
					logger.log("version", currentVersion || "unknown", "is currently active, activating version", version);
					this.activateVersion(addon, version, f.wait());
				} else {
					logger.log("version", currentVersion, "is currently active.");
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
			repo = "addon-" + addonData[0];
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
			addonGit('submodule', 'update', '--init', f());
		}, function () {
			logger.log("Addon installed!");
			this.activateVersion(addon, version, f.wait());
		}).error(function (e) {
			logger.error("Error downloading addon " + account + "/" + repo + ":\n", e);
		}).success(cb);
	};

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
			addonGit('checkout', version.toString(), f());
		}, function () {
			//submodule update init just incase
			addonGit('submodule', 'update', '--init', '--recursive', f());
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

	this.getVersion = function (addon, cb) {
		var f = ff(this, function () {
			fs.readFile(path.join(this.getPath(addon), 'addon.json'), 'utf-8', f.slotPlain(2));
		}, function (err, contents) {
			if (err && err.code == 'ENOENT') {
				throw {code: "NOT_INSTALLED", message: "addon not installed"};
			} else if (err) {
				throw err;
			} else {
				f.succeed(Version.parse(JSON.parse(contents).version));
			}
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
		}, function (files) {
			var addons = [];
			f(addons);
			
			files.forEach(function (file) {
				var onLoad = f.waitPlain();
				var currentPath = path.join(addonPath, file, "index.js");
				fs.exists(currentPath, bind(this, function (exists) {
					if (exists) {
						try {
							var data = require(currentPath).load() || {};
							
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
