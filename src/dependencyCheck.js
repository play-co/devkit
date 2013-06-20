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

/**
* Download basil dependencies including tealeaf-build-tools
* and required addons.
*/
var ff = require('ff');
var fs = require('fs');
var http = require('http');
var filesize = require('filesize');
var wrench = require('wrench');

var common = require('./common');
var installer = require('./install');
var Version = require('./shared/Version');

var logger = new common.Formatter('checkVersions');

var BUILD_TOOLS_JAR = common.paths.root('lib/tealeaf-build-tools.jar');
var BUILD_TOOLS_SRC = common.paths.root('lib/tealeaf-build-tools-{version}.jar');
var addonManager = require('./AddonManager');

var isWindows = require('os').platform() == 'win32';

function checkTealeafBuildTools (version, cb) {
	logger.log("checking for tealeaf-build-tools", version.toString());

	var f = ff(function () {
		fs.exists(getBuildToolsPath(version), f.slotPlain());
	}, function (exists) {
		if (!exists) {
			fetchTealeafBuildTools(version, f());
		}
	}, function () {
		checkTealeafBuildToolsLink(version, f());
	}).error(function (err) {
		logger.error("Error checking tealeaf build tools:");
		logger.error(err);
	}).success(cb);
}

function checkTealeafBuildToolsLink (version, cb) {
    //if we are windows dont bother symlinking the file just create
    //a hard link to the newest version
    if (isWindows) {
        var f = ff(function () {
            fs.unlink(BUILD_TOOLS_JAR, f.slotPlain());
        }, function(err) {
            fs.link(getBuildToolsPath(version), BUILD_TOOLS_JAR, f());
        }).error(function (err) {
            logger.error("error failed to create hard link:");
            logger.error(err);
        }).success(cb);
    } else {
        var f = ff(function () {
            fs.exists(BUILD_TOOLS_JAR, f.slotPlain());
        }, function (exists) {
            if (exists) {
                var next = f();
                var f2 = ff(function () {
                    fs.readlink(BUILD_TOOLS_JAR, f2());
                }, function (link) {
                    var fileVersion = link.match(/tealeaf-build-tools-(.*?)\.jar/);
                    if (!fileVersion || !version.eq(fileVersion[1])) {
                        logger.log("tealeaf-build-tools", version, "does not exist");
                        next();
                    } else {
                        logger.log("tealeaf-build-tools", version, "present");
                        f.done();
                    }
                });
            }
        }, function () {
            logger.log("tealeaf-build-tools creating link...");
            createLink(version, f());
        }, function () {
            logger.log("tealeaf-build-tools link created!");
        }).error(function (err) {
            logger.error("error checking link:");
            logger.error(err);
        }).success(cb);
    }
}

function createLink(version, cb) {
	var f = ff(function () {
		fs.unlink(BUILD_TOOLS_JAR, f.slotPlain());
	}, function (err) {
		if (err && !err.code == 'ENOENT') { // not found error is ok to ignore
			logger.error("Link not found", err);
		}

		fs.symlink(getBuildToolsPath(version), BUILD_TOOLS_JAR, f())
	}).error(function (err) {
		logger.error("Error creating link:");
		logger.error(err);
	}).success(cb);
}

function getBuildToolsPath (version) {
	return BUILD_TOOLS_SRC.replace('{version}', version);
}

function fetchTealeafBuildTools (version, cb) {

	var dest = getBuildToolsPath(version);
	var tmp = dest + '.tmp';
	var stream = fs.createWriteStream(tmp);

	var req = http.request({
		host: 'dev.gameclosure.com',
		path: '/static/tealeaf-build-tools-' + version + '.jar',
	});

	logger.log("fetching tealeaf-build-tools");

	req.on('response', function (response) {

		var size = response.headers['content-length'];
		logger.log("downloading tealeaf-build-tools (" + filesize(size) + ")...");

		response.pipe(stream);

		var downloaded = 0;
		var percent = 0;

		process.stderr.write(logger.getPrefix() + '|');

		response.on('data', function (chunk) {
			downloaded += chunk.length;
			var p = downloaded / size * 100;
			while (p > percent + 1) {
				++percent;
				if (percent % 10 == 0) {
					process.stderr.write('' + percent);
				} else if (percent % 2 == 0) {
					process.stderr.write('-');
				}
			}
		});

		response.on('end', function () {
			process.stderr.write('100|\n');
			fs.rename(tmp, dest, cb);
		});
	});

	req.end();
}

function getPackage(cb) {
	var f = ff(function () {
		fs.readFile(common.paths.root('package.json'), 'utf-8', f());
	}, function (contents) {
		f(JSON.parse(contents));
	}).error(function (err) {
		logger.error("Error reading package.json:");
		logger.error(err);
	}).success(cb);
}

function run() {
	var f = ff(function () {
		getPackage(f.slotPlain());
	}, function (package) {
		f(package);
		var buildToolsVersion = Version.parse(package['basil']['tealeaf-build-tools']);
		if (buildToolsVersion) {
			checkTealeafBuildTools(buildToolsVersion, f());
		} else {
			logger.warn("no version of tealeaf-build-tools was required");
		}
	}, function (package) {
		//make sure the addons directory exists	
		wrench.mkdirSyncRecursive(common.paths.addons());

		// install/check version for all required addons
		var addons = package['basil'][
			fs.readFileSync('.git/config', {encoding: 'utf8'}).indexOf('devkit-priv') == -1
			? 'addons' : 'addons-priv'];

		addons.forEach(function (addon) {
			installer.install(addon, null, f.wait());
		});

		f(package);
		fs.readdir(common.paths.root('addons'), f());
	}, function (package, addons) {
		// check version for all optional addons if they're installed
		addons.forEach(function (addon) {
			if (addon.charAt(0) != '.') {
				console.log("Updating addon", addon);
				var onFinish = f();
				addonManager.install(addon, {}, function (err, res) {
					if (err && (err.NOT_INSTALLED || err.UNKNOWN_ADDON)) {
						onFinish(); // don't worry about these errors
					} else {
						onFinish(err); // forward unexpected errors
					}
				});
			}
		});
	}).error(function (err) {
		logger.error("Error:");
		console.log(err);
	});
}

//run the check!
run();

