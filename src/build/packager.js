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
var fs = require("fs");
var ff = require("ff");
var wrench = require("wrench");
var util = require("util");
var request = require("request");
var crypto = require("crypto");
var spawn = require("child_process").spawn;
var clc = require("cli-color");
var read = require("read");
var spritesheetMap = require("./spritesheetMap");
var fontsheetMap = require("./fontsheetMap");

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

// Return a JSON object for the global CONFIG object.
function getConfigObject (project, opts, target) {
	var manifest = project.manifest;
	var config = JSON.parse(JSON.stringify(CONFIG_GLOBAL_TEMPLATE));
	
	// Augment config object with manifest properties.
	config.appID = manifest.appID;
	config.handshakeEnabled = manifest.handshakeEnabled;
	config.shortName = manifest.shortName;
	config.title = manifest.title;
	config.fonts = manifest.fonts;
	config.disableNativeViews = manifest.disableNativeViews || false;
	config.unlockViewport = manifest.unlockViewport;
	
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
function getJSConfig (project, opts, target) {
	logger.log("Building JS config... " + opts.version);
	
	var defines = exports.getDefines(opts);
	var src = [";(function() {\n"];
	for (var key in defines) {
		src.push("window." + key + "=" + JSON.stringify(defines[key]) + ";\n");
	}
	return src.concat([
				"window.CONFIG=", JSON.stringify(getConfigObject(project, opts, target)), ";\n",
				"window.CONFIG.baseURL = window.location.toString().match(/(.*\\/).*$/)[1];\n",
			"})();"
		]).join("");
}

// Package all JavaScript into a single file that can be included with the build.
// runs jsio against all user code.
function packageJS (opts, initialImport, appendImport, cb) {
	var compiler = createCompiler(opts);
	
	compiler.inferOptsFromEntry(initialImport);

	if (!/^native/.test(opts.target)) {
		compiler.opts.includeJsio = false;
	}

	merge(compiler.opts, {
		appendImport: appendImport
	});
	
	compiler.compile(initialImport, cb);
}

function createCompiler (opts) {
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
		printOutput: opts.printJSIOCompileOutput
	});

	compiler.opts.defines = exports.getDefines(opts);
	return compiler;
}

// returns a dictionary of constants for JS
exports.getDefines = function (opts) {
	var defines = {
			BUILD_TARGET: opts.target,
			BUILD_ENV: opts.target.split("-")[0], // env is browser or mobile (e.g. parses "browser-mobile" or "native-ios")
			DEBUG: !!opts.debug,
			DEV_MODE: !!opts.debug,
		};

	var addonManager = require("../AddonManager");
	if (addonManager) {
		addonManager.getAddons().forEach(function (addon) {
			var safeName = addon.toUpperCase().replace(/-/g, "_");
			defines["ADDON_" + safeName] = true;
		});
	}

	return defines;
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

/**
 * Create spritesheetSizeMap.json
 * Basically a mapping of saved spritesheet names -> sheet size
 */
function createSpritesheetSizeMap (spriteMap, appDir, target, cb) {
	var spriteDir = path.join(appDir, target, "spritesheets");
	var fontsDir = path.join(appDir, "resources", "fonts");
	var f = ff(function () {
		fs.exists(fontsDir, f.slotPlain());
	}, function (exists) {
		fontsheetMap.create(fontsDir, "resources/fonts", "fontsheetSizeMap");
		spritesheetMap.create(spriteMap, spriteDir, "spritesheetSizeMap", f());
	}).cb(cb)
	.error(function (e) {
		logger.log("unexpected error writing spritesheet map");
		console.error(e);
	});
}

// utility function to replace any windows path separators for paths that will be used for URLs
var regexSlash = /\\/g;
function useURISlashes (str) { return str.replace(regexSlash, "/"); }

// The spriter sprites images, but also returns a list of resources. It is a
// tool of many faces.
function getResources(manifest, target, appDir, output, mapMutator, cb) {
	// object on success to pass to cb(err, res);
	var result = {};

	// sprite directory
	var relativeSpriteDir = "spritesheets";
	var fullSpriteDir = path.join(appDir, output, relativeSpriteDir);

	// get the resources from the spriter and reformat the output
	var f = ff(function () {
		// array to store spriter output
		var out = [];
		var formatter = new common.Formatter("spriter", true, out);
		var onEnd = f(); // continue to next callback once onEnd is called

		jvmtools.exec("spriter", [
			"--scale", 1,
			"--dir", appDir + "/",
			"--output", fullSpriteDir,
			"--target", target,
			"--binaries", common.paths.lib()
		], function (spriter) {
			spriter.on("out", formatter.out);
			spriter.on("err", formatter.err);
			spriter.on("end", function () { onEnd(!out.length, out.join("")); });
		});
	}, function (spriterOutput) {
		var resources = JSON.parse(spriterOutput);
		
		// add the spritesheetSizeMap to sprites list so that it gets 
		// copied to the build directories properly as well.
		resources.sprites.push("spritesheetSizeMap.json");
		resources.other.push("resources/fonts/fontsheetSizeMap.json");

		result.sprites = resources.sprites.map(function (filename) {
			var ext = path.extname(filename);
			return {
				basename: path.basename(filename, ext),
				ext: ext,
				fullPath: path.resolve(fullSpriteDir, filename),
				relative: useURISlashes(path.join(relativeSpriteDir, filename))
			};
		});

		var filteredPaths = [];

		result.resources = resources.other.map(function (filename) {
			if (path.basename(filename) === "metadata.json") {
				try {
					var filedata = fs.readFileSync(path.resolve(appDir, filename), "utf8");
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

			var ext = path.extname(filename);
			return {
				basename: path.basename(filename, ext),
				ext: ext,
				fullPath: path.resolve(appDir, filename),
				relative: useURISlashes(filename)
			};
		});

		// remove paths that have metadata package:false
		for (var ii = 0; ii < result.resources.length; ++ii) {
			var filespec = result.resources[ii];
			var filename = filespec.relative;

			if (path.basename(filename) === "metadata.json") {
				logger.log("Did not package the metadata file", filename);
				result.resources.splice(ii--, 1);
				continue;
			}

			for (var fp in filteredPaths) {
				if (filename.indexOf(filteredPaths[fp]) === 0) {
					logger.log("Did not package resource", filename);
					result.resources.splice(ii--, 1);
					continue;
				}
			}
		}

		var mapPath = path.resolve(fullSpriteDir, resources.map);
		f(mapPath);
		fs.readFile(mapPath, "utf8", f());

	}, function (mapPath, data) {
		// rewrite JSON data, fixing slashes and appending the spritesheet directory
		var rawMap = JSON.parse(data);
		var imageMap = {};
		Object.keys(rawMap).forEach(function (key) {
			if (rawMap[key].sheet) {
				rawMap[key].sheet = useURISlashes(path.join(relativeSpriteDir, rawMap[key].sheet));
			}

			imageMap[useURISlashes(key)] = rawMap[key];
		});

		if (typeof mapMutator === "function") {
			mapMutator(imageMap);
		}

		// add to resources
		var mapExt = path.extname(mapPath);
		result.resources.push({
			basename: path.basename(mapPath, mapExt),
			ext: mapExt,
			relative: useURISlashes(path.relative(path.resolve(appDir, output), mapPath)),
			fullPath: mapPath
		});

		// pass the cb the result!
		f(result);

		// write spritesheet sizes and fontsheet sizes to json files
		createSpritesheetSizeMap(imageMap, appDir, output, f.wait());

		// write out the new image map
		fs.writeFile(mapPath, JSON.stringify(imageMap), "utf8", f.wait());
	})
	.cb(cb)
	.error(function (e) {
		logger.error("Unexpected exception handling spriter output");
		console.error(e);
	});
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
function compileResources (project, opts, target, initialImport, cb) {
	logger.log("Packaging resources...");

	// Font sheets cannot be sprited; add a metadata.json file for fonts (for compatibility)
	writeMetadata(opts, "resources/fonts", "{\"sprite\": false}");
	writeMetadata(opts, "resources/icons", "{\"sprite\": false, \"package\": false}");
	writeMetadata(opts, "resources/splash", "{\"sprite\": false, \"package\": false}");

	var f = ff(function () {
		getResources(project.manifest, target, opts.fullPath, opts.localBuildPath, opts.mapMutator, f());
		packageJS(opts, initialImport, false, f());
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
exports.getJSConfig = getJSConfig;
exports.getSDKHash = getSDKHash;
exports.getGameHash = getGameHash;
exports.packageJS = packageJS;
exports.createCompiler = createCompiler;
exports.compressCSS = compressCSS;
