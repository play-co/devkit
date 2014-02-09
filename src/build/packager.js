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

var path = require("path");
var fs = require("graceful-fs");
var ff = require("ff");
var crypto = require('crypto');
var wrench = require("wrench");
var util = require("util");
var request = require("request");
var crypto = require("crypto");
var spawn = require("child_process").spawn;
var clc = require("cli-color");
var read = require("read");
var spritesheetMap = require("./spritesheetMap");
var fontsheetMap = require("./fontsheetMap");
var addonManager = require("../AddonManager");

var compile = require("./compile");
var common = require("../common");
var logger = new common.Formatter("packager");

var git = require("./git");
var jvmtools = require("./jvmtools");

/**
 * Packager utilities
 */
function getSDKHash (next) {
	git.currentTag(common.paths.root(), function (hash) {
		next(hash || "unknown");
	});
}

function getGameHash (project, next) {
	git.currentTag(project.paths.root, function (hash) {
		next(hash || "unknown");
	});
}

// Compress CSS
function compressCSS (css, next) {
	// TODO TODO TODO
	next(null, css);
}

function compressJSON (str) {
	return JSON.stringify(JSON.parse(str));
}

// Build options. Gets a default list of options.
function getBuildOptions (combineOpts) {
	var opts = {
		// Package info.
		appID: "", // Application ID.
		version: "1", // Version number.

		fullPath: null, // DEPRECATED The path of the current project.

		compress: true, // Compress JavaScript flag.

		debug: false, // Development version or release.
		release: true, // Release build.

		servicesURL: null //String servicesURL = null;
	};

	// Return combine options.
	for (var key in combineOpts) {
		opts[key] = combineOpts[key];
	}
	return opts;
}

/**
 * JavaScript compilation.
 */
var CONFIG_GLOBAL_TEMPLATE = {
	appID: null, // String
	handshakeEnabled: false, // boolean
	shortName: "", // String
	// gifts
	// achievements
	title: null, // String
	// groups
	// scaleDPR
	fonts: [], // ManifestFont
	disableNativeViews: false, // boolean
	unlockViewport: false, // boolean
	scaleDPR: false,

	target: null, // String
	version: null, // String
	servicesURL: null, // String
	noRedirect: false, // boolean
	inviteURLTemplate: null, // String
	splash: {} // Map<String, String>
};

function copyFile (from, to) {
	if (!fs.existsSync(to)) {
		if (fs.existsSync(from)) {
			try {
				fs.writeFileSync(to, fs.readFileSync(from));
			} catch (e) {
				console.error("Failed to copy file:", from);
			}
		} else {
			console.error("Warning can't find:", from);
		}
	}
}

function updateSplash (templatePath, projectPath) {
	var splash = {
			portrait480: "resources/splash/portrait480.png",
			portrait960: "resources/splash/portrait960.png",
			portrait1024: "resources/splash/portrait1024.png",
			portrait1136: "resources/splash/portrait1136.png",
			portrait2048: "resources/splash/portrait2048.png",
			landscape768: "resources/splash/landscape768.png",
			landscape1536: "resources/splash/landscape1536.png"
		};

	for (var i in splash) {
		var image = splash[i];
		copyFile(path.join(templatePath, image), path.join(projectPath, image));
	}

	splash.autoHide = true;
	return splash;
}

function updateIcons (templatePath, projectPath, icons) {
	for (var i in icons) {
		var image = icons[i];
		copyFile(path.join(templatePath, image), path.join(projectPath, image));
	}

	return icons;
}

function getPackageName(manifest) {
	var packageName = "";
	if (manifest.studio && manifest.studio.domain && manifest.shortName) {
		var names = manifest.studio.domain.split(/\./g).reverse();
		var studio = names.join('.');
		var shortName = manifest.shortName;
		packageName = studio + "." + shortName;
	}
	return packageName;
}

// Return a JSON object for the global CONFIG object.
function getConfigObject (project, opts, target) {
	var manifest = project.manifest;
	var config = JSON.parse(JSON.stringify(CONFIG_GLOBAL_TEMPLATE));

	var packageName = getPackageName(manifest);

// Augment config object with manifest properties.
	config.appID = manifest.appID;
	config.supportedOrientations = manifest.supportedOrientations;
	config.handshakeEnabled = manifest.handshakeEnabled;
	config.shortName = manifest.shortName;
	config.title = manifest.title;
	config.titles = manifest.titles;
	config.fonts = manifest.fonts;
	config.addons = manifest.addons;
	config.disableNativeViews = manifest.disableNativeViews || false;
	config.unlockViewport = manifest.unlockViewport;
	config.useDOM = !!manifest.useDOM;
	config.packageName = packageName;
	config.embeddedFonts = opts.embeddedFonts;
	config.bundleID = manifest.ios.bundleID || "example.bundle"

	config.browser = manifest.browser || {};
	// for noodletown invites
	config.mpMetricsKey = manifest.mpMetricsKey;

	config.scaleDPR = manifest.scaleDPR;

	// Disable native views.
	logger.log("Native views enabled:", manifest.disableNativeViews);

	// Configuration.
	config.target = target;
	config.version = opts.version;

	// Get SDK version from reading Basil config.
	try {
		var basilConfig = fs.readFileSync(common.paths.root(".version")).toString().split(";");
		config.sdkVersion = basilConfig[0];
	} catch (e) {
		config.sdkVersion = "unknown";
	}

	// Staging URL.
	config.servicesURL = opts.servicesURL;
	config.noRedirect = opts.isSimulated || opts.noRedirect;

	logger.log("Using services URL " + config.servicesURL);

	if (!manifest.splash || !Object.keys(manifest.splash).length) {
		wrench.mkdirSyncRecursive(path.join(opts.fullPath, "resources/splash"));
		config.splash = updateSplash(common.paths.root("/src/init/templates/empty/"), opts.fullPath);
		manifest.splash = JSON.parse(JSON.stringify(config.splash));
	} else {
		config.splash = JSON.parse(JSON.stringify(manifest.splash));
	}

	if (manifest.android && (!manifest.android.icons || !Object.keys(manifest.android.icons).length)) {
		wrench.mkdirSyncRecursive(path.join(opts.fullPath, "resources/icons"));
		manifest.android.icons = updateIcons(
			common.paths.root("/src/init/templates/empty/"),
			opts.fullPath,
			{
				36: "resources/icons/android36.png",
				48: "resources/icons/android48.png",
				72: "resources/icons/android72.png",
				96: "resources/icons/android96.png"
			}
		);
	}

	if (manifest.ios && (!manifest.ios.icons || !Object.keys(manifest.ios.icons).length)) {
		wrench.mkdirSyncRecursive(path.join(opts.fullPath, "resources/icons"));
		manifest.ios.icons = updateIcons(
			common.paths.root("/src/init/templates/empty/"),
			opts.fullPath,
			{
				57: "resources/icons/ios57.png",
				72: "resources/icons/ios72.png",
				114: "resources/icons/ios114.png",
				144: "resources/icons/ios144.png",
			}
		);
		manifest.ios.icons.renderGloss = true;
	}

	var urlOpts = {
		"short_name": config["shortName"],
		"domain": (manifest.studio || {})["domain"],
		"staging_domain": (manifest.studio || {})["stagingDomain"]
	};

	if (process.opts.inviteURLTemplate) {
		config["inviteURLTemplate"] = process.opts.inviteURLTemplate;
	} else if (manifest.inviteURLTemplate) {
		config["inviteURLTemplate"] = manifest.inviteURLTemplate;
	} else if (opts.isSimulated) {
		config["inviteURLTemplate"] = "http://" + common.getLocalIP()[0] + ":9200/simulate/" + manifest.shortName + "/browser-desktop/?i={code}";
	} else if (opts.stage) {
		config["inviteURLTemplate"] = "http://" + urlOpts.short_name + "." + urlOpts.staging_domain + "/?i={code}";
	} else {
		config["inviteURLTemplate"] = "http://" + urlOpts.short_name + "."  + urlOpts.domain + "/?i={code}";
	}

	return config;
}

// Return the JavaScript string that creates the global CONFIG object.
function getJSConfig (project, opts, target, cb) {

	logger.log("Building JS config... " + opts.version);

	exports.getDefines(project, opts, function(defines) {
		var src = [";(function() {\n"];
		for (var key in defines) {
			src.push("window." + key + "=" + JSON.stringify(defines[key]) + ";\n");
		}
		cb(src.concat([
				"window.CONFIG=", JSON.stringify(getConfigObject(project, opts, target)), ";\n",
				"window.CONFIG.baseURL = window.location.toString().match(/(.*\\/).*$/)[1];\n",
				"})();"
		]).join(""));

	});
}

// Package all JavaScript into a single file that can be included with the build.
// runs jsio against all user code.
function packageJS (project, opts, initialImport, appendImport, cb) {
	var f = ff(this, function() {
		createCompiler(project, opts, f.slotPlain());
	}, function(compiler) {
		compiler.inferOptsFromEntry(initialImport);

		compiler.opts.includeJsio = !opts.excludeJsio;

		merge(compiler.opts, {
				appendImport: appendImport
		});

		compiler.compile(initialImport, cb);
	});
}

function createCompiler (project, opts, cb) {

	var jsCachePath = opts.jsCachePath;
	if (!jsCachePath) {
		jsCachePath = path.join(opts.fullPath, "build/.cache");
	}

	wrench.mkdirSyncRecursive(jsCachePath);

	var compiler = new compile.JsioCompiler();
	compiler.setCwd(opts.fullPath);
	compiler.setCompressEnabled(opts.compress);

	merge(compiler.opts, {
		compressorCachePath: jsCachePath,
		printOutput: opts.printJSIOCompileOutput,
		gcManifest: path.join(project.paths.root, 'manifest.json'),
		gcDebug: opts.debug
	});

	exports.getDefines(project, opts, function(defines) {
		compiler.opts.defines = defines;
		cb(compiler);
	});

	return compiler;
}

exports.getAddonsForApp = function (project, cb) {

	var result = {};
	var processedAddons = {};
	var f = ff(exports, function() {
		var addonConfig = project.getAddonConfig();
		var addons = addonManager.getAddons();

		var installAddon = function(addonName) {
			if (!processedAddons[addonName]) {
				processedAddons[addonName] = true;
				var addonsPath = addonManager.getAddonsPath();

				var wait = f.wait();
				if (!fs.existsSync(path.join(addonsPath, addonName))) {
					//install
					addonManager.install(addonName, {}, function (err, res) {
						if (!err) {
							var deps = addonManager.getAddonDependencies(addonName);
							for (var d in deps) {
								installAddon(deps[d]);
							}

							addons = addonManager.getAddons();
							if (addons[addonName]) {
								result[addonName] = addons[addonName];
							}
						}
						wait();
					});

				} else {
					var deps = addonManager.getAddonDependencies(addonName);
					for (var d in deps) {
						installAddon(deps[d]);
					}

					result[addonName] = addons[addonName];
					wait();
				}

			}
		}

		if (!Array.isArray(addonConfig)) {
			addonConfig = Object.keys(addonConfig);
		}
		addonConfig.forEach(installAddon);

	}, function() {
		cb(result);
	});

}

// returns a dictionary of constants for JS
exports.getDefines = function (project, opts, cb) {

	var defines = {
			BUILD_TARGET: opts.target,
			BUILD_ENV: opts.target.split("-")[0], // env is browser or mobile (e.g. parses "browser-mobile" or "native-ios")
			DEBUG: !!opts.debug,
			DEV_MODE: !!opts.debug,
		};

		exports.getAddonsForApp(project, function(addons) {
			Object.keys(addons).forEach(function (addonName) {
				var safeName = addonName.toUpperCase().replace(/-/g, "_");
				defines["ADDON_" + safeName] = true;
			});

			cb(defines);
		});
}

//runs the closure compiler, checks that you have valid code, and if not, yells at you
function validateJS (src, next) {
	jvmtools.exec("closure", ["--js", src], function(compiler) {
		var out = [];
		compiler.on("out", function (data) {
			out.push(data);
		});

		compiler.on("err", function (data) {
			process.stderr.write("	[validate]	" + data);
		});

		compiler.on("end", function (data) {
			next(null, out.join(""));
		});
	});
}

// utility function to replace any windows path separators for paths that will be used for URLs
var regexSlash = /\\/g;
function useURISlashes (str) { return str.replace(regexSlash, "/"); }

var Resource = Class(function () {
	this.init = function (opts) {
		this.ext = path.extname(opts.fullPath);
		this.basename = path.basename(opts.fullPath, this.ext);
		this.fullPath = opts.fullPath;
		this.relative = useURISlashes(opts.relative);
	}
});

// Gather the resources for a specified project, building spritesheets as we go
//   - calls cb(err, res)
//     where res contains:
//       - images: a list of spritesheets
//       - imageMap: JSON map of original image filenames to their location in the spritesheets
//       - other: a list of other resources (json/audio/etc)
// target : string - the build target, e.g. native-ios
// output : string - usually something like "build/debug/native-ios/"
function getResources(project, buildOpts, cb) {
	var appDir = buildOpts.fullPath;

	var resourceDirectories = [
			{src: path.join(appDir, 'resources'), target: 'resources'}
		];

	// sprite any localized resources
	var allFiles = fs.readdirSync(appDir);
	for (var i = 0; i < allFiles.length; i++) {
		try {
			var fileName = allFiles[i];
			var filePath = path.join(appDir, fileName);
			var statInfo = fs.statSync(filePath);
			var localLoc = fileName.indexOf('resources-');
			if (statInfo.isDirectory() && localLoc == 0) {
				resourceDirectories.push({src: filePath, target: fileName});
			}
		} catch (exception) {
			//do nothing if the file stat fails
		}
	}

	// final resources dictionary
	var resources = {
			images: [],
			imageMap: {},
			other: []
		};

	// sprite directory
	var relativeSpritesheetsDirectory = "spritesheets";
	var spritesheetsDirectory = path.join(appDir, buildOpts.localBuildPath, relativeSpritesheetsDirectory);

	var buildAddons = {};

	var f = ff(this, function() {
		// get list of build addons
		// for each build addon:
		//  - call onBeforeBuild
		//  - get list of resource directories

		exports.getAddonsForApp(project, f.slotPlain());

	}, function (addons) {
		Object.keys(addons).forEach(function (addonName) {
			var addon = addons[addonName];
			try {
				if (addon && addon.hasBuildPlugin()) {
					var buildAddon = require(addon.getPath('build'));
					buildAddons[addonName] = buildAddon;

					var addonConfig = project.getAddonConfig();
					var directories = buildAddon.getResourceDirectories && buildAddon.getResourceDirectories(addonConfig[addonName]);
					if (isArray(directories)) {
						directories.forEach(function (directory) {
							resourceDirectories.push({
									src: directory.src,
									target: path.join('addons', addonName, directory.target)
							});
						});
					}
				}
			} catch (e) {
				logger.error("Error initializing build addon", addonName, e);
			}
		}, this);

		for (var addonName in buildAddons) {
			var onFinish = f.wait();
			try {
				if (buildAddons[addonName].onBeforeBuild) {
					buildAddons[addonName].onBeforeBuild(common, project, buildOpts, onFinish);
				}
			} catch (e) {
				onFinish();
				logger.error("Error executing onBeforeBuild for addon", addonName, e);
			}
		}
	}, function () {
		var onFinish = f.wait();

		// which directory are we on (for async loop)
		var currentIndex = 0;

		// sprite all directories and merge results (serially)
		spriteNextDirectory();

		// async loop over all resource directories
		function spriteNextDirectory() {
			var directory = resourceDirectories[currentIndex];
			if (directory) {
				spriteDirectory(directory.src, directory.target, function (err, res) {
					if (!err) {
						// merge results
						resources.images = resources.images.concat(res.spritesheets);
						if (resources.other) {
							resources.other = resources.other.concat(res.other);
						}
						Object.keys(res.imageMap).forEach(function (key) {
							if (resources.imageMap[key]) {
								logger.log("WARNING: Resource aliasing.  A resource (", key, ") overwrote its key in map.json.  This is probably NOT what you want.");
							}
							resources.imageMap[key] = res.imageMap[key];
						});
					}

					// next directory
					++currentIndex;
					spriteNextDirectory();
				});
			} else {
				onFinish();
			}
		}
	}, function () {
		var fontsDir = path.join(appDir, "resources", "fonts");
		f(fontsDir);
		fs.exists(fontsDir, f.slotPlain());
	}, function (fontsDir, fontsDirExists) {
		// relative paths for the output (uses forward slashes)
		var relativeFontsDir = "resources/fonts";
		var relativeFontsheetSizeMap = "resources/fonts/fontsheetSizeMap.json";

		// absolute paths for font size output
		var fontsheetSizeMapFilename = path.join(appDir, buildOpts.localBuildPath, "resources", "fonts", "fontsheetSizeMap.json");

		resources.other.push(new Resource({
					fullPath: fontsheetSizeMapFilename,
					relative: relativeFontsheetSizeMap
		}));

		// Create spritesheetSizeMap.json
		// Basically a mapping of saved spritesheet names -> sheet size
		wrench.mkdirSyncRecursive(path.dirname(fontsheetSizeMapFilename));

		if (!fontsDirExists) {
			fs.writeFile(fontsheetSizeMapFilename, "{}", f.wait());
		} else {
			fontsheetMap.create(fontsDir, "resources/fonts", fontsheetSizeMapFilename, f.wait());
		}

		spritesheetMap.create(resources.imageMap, spritesheetsDirectory, "spritesheetSizeMap", f());
	}, function (spritesheetMapPath) {
		resources.other.push(new Resource({
					fullPath: spritesheetMapPath,
					relative: path.relative(path.resolve(appDir, buildOpts.localBuildPath), spritesheetMapPath)
		}));

		var mapPath = path.join(spritesheetsDirectory, 'map.json');

		// write out the new image map
		fs.writeFile(mapPath, JSON.stringify(resources.imageMap), "utf8", f.wait());

		// add to resources
		var mapExt = path.extname(mapPath);
		resources.other.push(new Resource({
					relative: path.relative(path.resolve(appDir, buildOpts.localBuildPath), mapPath),
					fullPath: mapPath
		}));

		f(resources);
	}).cb(cb);

	// sprite a single directory
	function spriteDirectory(srcDir, targetDir, cb) {
		// get the resources from the spriter and reformat the output
		var f = ff(function () {
			// array to store spriter output
			var out = [];
			var formatter = new common.Formatter("spriter", true, out);
			var onEnd = f(); // continue to next callback once onEnd is called

			var md5sum = crypto.createHash('md5');
			md5sum.update(srcDir);
			var hash = md5sum.digest('hex');

			var spriterOpts = [
				"--no-clean", // don't remove unused spritesheets, since we might be spriting multiple source directories into the same target
				"--cache-file", "spritercache-" + hash,
				"--scale", 1,
				"--dir", srcDir + "/",
				"--output", spritesheetsDirectory,
				"--target", buildOpts.target,
				"--binaries", common.paths.lib()
			];

			logger.log("spriter", spriterOpts
					.map(function (arg) { return /^--/.test(arg) ? arg : '"' + arg + '"'; })
					.join(' '));

			jvmtools.exec("spriter", spriterOpts, function (spriter) {
				spriter.on("out", formatter.out);
				spriter.on("err", formatter.err);
				spriter.on("end", function () { onEnd(!out.length, out.join("")); });
			});
		}, function (rawSpriterOutput) {
			try {
				var spriterOutput = JSON.parse(rawSpriterOutput);
			} catch (e) {
				logger.error(rawSpriterOutput);
				throw e;
			}

			var resources = {};

			resources.spritesheets = spriterOutput.sprites.map(function (filename) {
				var ext = path.extname(filename);
				return new Resource({
					fullPath: path.resolve(spritesheetsDirectory, filename),
					relative: path.join(relativeSpritesheetsDirectory, filename)
				});
			});

			var filteredPaths = [];

			resources.other = spriterOutput.other.map(function (filename) {
				if (path.basename(filename) === "metadata.json") {
					try {
						var filedata = fs.readFileSync(path.resolve(srcDir, filename), "utf8");
						var fileobj = JSON.parse(filedata);
						if (fileobj.package === false) {
							var filterPath = path.dirname(filename);
							logger.log("Not packaging resources from", filterPath);
							filteredPaths.push(filterPath);
						}
					} catch (ex) {
						logger.error("WARNING:", filename, "format is not valid JSON so cannot parse it.");
					}
				}

				return new Resource({
					fullPath: path.resolve(srcDir, filename),
					relative: path.join(targetDir, filename)
				});
			});

			// remove paths that have metadata package:false
			for (var ii = 0; ii < resources.other.length; ++ii) {
				var filespec = resources.other[ii];
				var filename = filespec.relative;

				if (path.basename(filename) === "metadata.json") {
					logger.log("Did not package the metadata file", filename);
					resources.other.splice(ii--, 1);
					continue;
				}

				for (var fp in filteredPaths) {
					if (filename.indexOf(fp) !== -1) {
						logger.log("Did not package resource", filename);
						resources.other.splice(ii--, 1);
						break;
					}
				}
			}

			f(resources);
			var mapPath = path.resolve(spritesheetsDirectory, spriterOutput.map);
			fs.readFile(mapPath, "utf8", f());

		}, function (resources, mapContents) {
			// rewrite JSON data, fixing slashes and appending the spritesheet directory
			var rawMap = JSON.parse(mapContents);
			var imageMap = {};
			Object.keys(resources.other).forEach(function (key) {
				var relPath = resources.other[key].relative;

				if (relPath) {
					imageMap[relPath] = {};
				}
			});
			Object.keys(rawMap).forEach(function (key) {
				if (rawMap[key].sheet) {
					rawMap[key].sheet = useURISlashes(path.join(relativeSpritesheetsDirectory, rawMap[key].sheet));
				}

				imageMap[useURISlashes(path.join(targetDir, key))] = rawMap[key];
			});

			if (typeof buildOpts.mapMutator === "function") {
				buildOpts.mapMutator(imageMap);
			}

			resources.imageMap = imageMap;

			// pass the cb the resources!
			f(resources);
		})
		.cb(cb)
		.error(function (e) {
			logger.error("Unexpected exception handling spriter output", e);
			console.log(e);
		});
	}
}

function writeMetadata(opts, dir, json) {
	var fontsDir = path.join(opts.fullPath, dir);
	var fontsMetadata = path.join(fontsDir, "metadata.json");
	if (fs.existsSync(fontsDir) && fs.lstatSync(fontsDir).isDirectory() && !fs.existsSync(fontsMetadata)) {
		fs.writeFileSync(fontsMetadata, json);
	}
}

// Compile resources together and pass a cache object to the next function.
// runs the spriter and compiles the build code.
function compileResources (project, buildOpts, initialImport, cb) {
	logger.log("Packaging resources...");

	// Font sheets cannot be sprited; add a metadata.json file for fonts (for compatibility)
	writeMetadata(buildOpts, "resources/fonts", "{\"sprite\": false}");
	writeMetadata(buildOpts, "resources/icons", "{\"sprite\": false, \"package\": false}");
	writeMetadata(buildOpts, "resources/splash", "{\"sprite\": false, \"package\": false}");

	var f = ff(function () {
		getResources(project, buildOpts, f());
		packageJS(project, buildOpts, initialImport, false, f());
	}, function (files, jsSrc) {
		logger.log("Finished packaging resources");

		// merge results into a single object
		f({
			files: files,
			jsSrc: jsSrc
		})
	})
	.cb(cb)
	.error(function (e) {
		logger.error("ERROR: While packaging resources:", e);
	});
};

/**
 * Module API.
 */

exports.getBuildOptions = getBuildOptions;
exports.compileResources = compileResources;
exports.getPackageName = getPackageName;
exports.getJSConfig = getJSConfig;
exports.getSDKHash = getSDKHash;
exports.getGameHash = getGameHash;
exports.createCompiler = createCompiler;
exports.compressCSS = compressCSS;
