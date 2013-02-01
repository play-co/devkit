/* @license
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

var path = require('path');
var fs = require('fs');
var ff = require('ff');
var wrench = require('wrench');
var util = require('util');
var request = require('request');
var crypto = require('crypto');
var spawn = require('child_process').spawn;
var clc = require('cli-color');
var read = require('read');
var spritesheetMap = require('./spritesheetMap');
var fontsheetMap = require('./fontsheetMap');

var compile = require('./compile');
var common = require('../common');
var logger = new common.Formatter('packager');

var git = require('./git');
var jvmtools = require('./jvmtools');

/**
 * Packager utilities
 */
function getSDKHash (next) {
	git.currentTag(common.paths.root(), function (hash) {
		next(hash || 'unknown');
	});
}

function getGameHash (project, next) {
	git.currentTag(project.paths.root, function (hash) {
		next(hash || 'unknown');
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
	preload: {} // Map<String, String> 
};

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
		var basilConfig = fs.readFileSync(common.paths.root('.version')).toString().split(";");
		config.sdkVersion = basilConfig[0];
	} catch (e) {
		config.sdkVersion = 'unknown';
	}
	
	// Staging URL.
	config.servicesURL = opts.servicesURL;
	config.noRedirect = opts.isSimulated || opts.noRedirect;
	
	logger.log("Using services URL " + config.servicesURL);
	
	if (manifest.preload != null) {
		config.preload = JSON.parse(JSON.stringify(manifest.preload));
	}
	
	var urlOpts = {
		"short_name": config['shortName'],
		"domain": (manifest.studio || {})['domain'],
		"staging_domain": (manifest.studio || {})['stagingDomain']
	};

	if (process.opts.inviteURLTemplate) {
		config['inviteURLTemplate'] = process.opts.inviteURLTemplate;
	} else if (manifest.inviteURLTemplate) {
		config['inviteURLTemplate'] = manifest.inviteURLTemplate;
	} else if (opts.isSimulated) {
		config['inviteURLTemplate'] = 'http://' + common.getLocalIP()[0] + ':9200/simulate/' + manifest.shortName + '/browser-desktop/?i={code}';
	} else if (opts.stage) {
		config['inviteURLTemplate'] = 'http://' + urlOpts.short_name + '.' + urlOpts.staging_domain + '/?i={code}';
	} else {
		config['inviteURLTemplate'] = 'http://' + urlOpts.short_name + '.'  + urlOpts.domain + '/?i={code}';
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
		]).join('');
}

// Package all JavaScript into a single file that can be included with the build.
// runs jsio against all user code.
function packageJS (opts, initialImport, appendImport, cb) {
	var compiler = createCompiler(opts);
	
	compiler.inferOptsFromEntry(initialImport);

	logger.log(opts.target, opts);

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
			BUILD_ENV: opts.target.split('-')[0], // env is browser or mobile (e.g. parses 'browser-mobile' or 'native-ios')
			DEBUG: !!opts.debug,
			DEV_MODE: !!opts.debug,
		};

	var addonManager = require('../AddonManager');
	if (addonManager) {
		addonManager.getAddons().forEach(function (addon) {
			var safeName = addon.toUpperCase().replace(/-/g, '_');
			defines['ADDON_' + safeName] = true;
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
function useURISlashes (str) { return str.replace(regexSlash, '/'); }

// The spriter sprites images, but also returns a list of resources. It is a
// tool of many faces.
function getResources(manifest, target, appDir, output, cb) {

	// object on success to pass to cb(err, res);
	var result = {};

	// sprite directory
	var relativeSpriteDir = "spritesheets";
	var fullSpriteDir = path.join(appDir, output, relativeSpriteDir);

	// get the resources from the spriter and reformat the output
	var f = ff(function () {
		// array to store spriter output
		var out = [];
		var formatter = new common.Formatter('spriter', true, out);
		var onEnd = f(); // continue to next callback once onEnd is called

		jvmtools.exec('spriter', [
			"--scale", 1,
			"--dir", appDir + '/',
			"--output", fullSpriteDir,
			"--target", target,
			"--binaries", common.paths.lib()
		], function (spriter) {
			spriter.on('out', formatter.out);
			spriter.on('err', formatter.err);
			spriter.on('end', function () { onEnd(!out.length, out.join('')); });
		});
	}, function (spriterOutput) {
		var resources = JSON.parse(spriterOutput);
		
		// add the spritesheetSizeMap to sprites list so that it gets 
		// copied to the build directories properly as well.
		resources.sprites.push('spritesheetSizeMap.json');
		resources.other.push('resources/fonts/fontsheetSizeMap.json');

		result.sprites = resources.sprites.map(function (filename) {
			var ext = path.extname(filename);
			return {
				basename: path.basename(filename, ext),
				ext: ext,
				fullPath: path.resolve(fullSpriteDir, filename),
				relative: useURISlashes(path.join(relativeSpriteDir, filename))
			};
		});

		result.resources = resources.other.map(function (filename) {
			var ext = path.extname(filename);
			return {
				basename: path.basename(filename, ext),
				ext: ext,
				fullPath: path.resolve(appDir, filename),
				relative: useURISlashes(filename)
			};
		});

		var mapPath = path.resolve(fullSpriteDir, resources.map);
		f(mapPath);
		fs.readFile(mapPath, 'utf8', f());

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

		// add to resources
		var mapExt = path.extname(mapPath);
		result.resources.push({
			basename: path.basename(mapPath, mapExt),
			ext: mapExt,
			relative: path.relative(path.resolve(appDir, output), mapPath),
			fullPath: mapPath
		});

		// pass the cb the result!
		f(result);

		// write spritesheet sizes and fontsheet sizes to json files
		createSpritesheetSizeMap(imageMap, appDir, output, f.wait());

		// write out the new image map
		fs.writeFile(mapPath, JSON.stringify(imageMap), 'utf8', f.wait());
	})
	.cb(cb)
	.error(function (e) {
		logger.error("Unexpected exception handling spriter output");
		console.error(e);
	});
}

// Compile resources together and pass a cache object to the next function.
// runs the spriter and compiles the build code.
function compileResources (project, opts, target, initialImport, cb) {
	// Font sheets cannot be sprited; add a metadata.json file for fonts (for compatibility)
	var fontsDir = path.join(opts.fullPath, "resources/fonts");
	var fontsMetadata = path.join(fontsDir, "metadata.json");
	if (fs.existsSync(fontsDir) && fs.lstatSync(fontsDir).isDirectory() && !fs.existsSync(fontsMetadata)) {
		fs.writeFileSync(fontsMetadata, JSON.stringify({"sprite": false}));
	}

	var f = ff(function () {
		getResources(project.manifest, target, opts.fullPath, opts.localBuildPath, f());
		packageJS(opts, initialImport, false, f());
	}, function (files, jsSrc) {
		logger.log("finished packaging resources");

		// merge results into a single object
		f({
			files: files,
			jsSrc: jsSrc
		})
	})
		.cb(cb)
		.error(function (e) {
			logger.error("unexpected error when packaging resources");
			console.error(e);
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
