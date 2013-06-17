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

var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var clc = require('cli-color');
var _uglify = require('uglify-js');
var parser = _uglify.parser;
var uglify = _uglify.uglify;

var common = require("../common");
var addonManager = require("../AddonManager");

var jvmtools = require("./jvmtools");

// Import the external js.io compiler.
var jsio = require(common.paths.sdk('jsio/jsio'));
jsio.path.add(common.paths.lib("js.io/compilers/"));
jsio('import jsio_compile.compiler');

var compile = this;

/**
 * Arguments.
 */

var argv = require('optimist')
	.alias('verbose', 'v').describe('verbose', 'Verbose mode.').boolean('verbose')
	.argv;

/**
 * Default path for game js.io compilation.
 */

compile.JSIO_SDK_PATHS = [
	'sdk/jsio',
	'sdk/gc/api/',
	'sdk/',
	'sdk/timestep/',
];

var logger = new common.Formatter('jsio');
var compressLog = new common.Formatter('compressor');

/**
 * Compile an entry with a set of js.io options.
 */

var BuildQueue = compile.BuildQueue = common.BuildQueue;

/**
 * Interface to compile js.io
 */

var BasilJsioInterface = Class(function () {

	this.logger = logging.get('jsioCompile');

	this.setNext = function (next) {
		this._next = next;
	}

	// interface methods for jsioCompile hooks

	this.setCompiler = function (compiler) {
		this._compiler = compiler;
	}

	this.run = function (args, opts) {
		this._compiler.run(args, opts);
	}

	this.onError = function (opts, msg) {
		this.logger.error(msg);

		if (this._next) {
			this._next(msg, null);
		}
	}

	this.onFinish = function (opts, src) {
		if (this._next) {
			this._next(null, src);
		}
	}

	/**
	 * Create a custom compression option.
	 */
	this.compress = function (filename, src, opts, cb) {
		compressLog.log("compressing", filename);
		var cachePath;
		if (opts.compressorCachePath && filename) {
			try {
				var cacheFilename = (/^\.\//.test(filename) ? 'R-' + filename.substring(2) : 'A-' + filename)
					.replace(/\.\.\//g, '--U--')
					.replace(/\//g, '---');

				cachePath = path.join(opts.compressorCachePath, cacheFilename);

				if (crypto) {
					var hash = crypto.createHash('md5');
					hash.update(src);
					var checksum = hash.digest('hex');
				} else {
					var stat = fs.statSync(filename);
					var checksum = '' + stat.mtime;
				}

				if (fs.existsSync(cachePath)) {

					var cachedContents = fs.readFileSync(cachePath, 'utf8');
					var i = cachedContents.indexOf('\n');
					var cachedChecksum = cachedContents.substring(0, i);
					if (checksum == cachedChecksum) {
						onCompress(null, cachedContents.substring(i + 1));
						return;
					} else {
						compressLog.log('current:', checksum, 'cached:', cachedChecksum);
					}
				}
			} catch (e) {
				onCompress(e, src);
			}
		}

		exports.compress(filename, src, opts, onCompress);

		function onCompress(err, src) {
			if (err) {
				compressLog.error(err);
			} else {
				try {
					if (cachePath) {
						fs.writeFile(cachePath, checksum + '\n' + src);
					}
				} catch(e) {
					compressLog.error(e);
				}
			}
			
			exports.strip(src, opts, function (err, src) {
				cb(src);
			});
		}
	}
});

exports.compress = function (filename, src, opts, cb) {

	var closureOpts = [
		'--compilation_level', 'SIMPLE_OPTIMIZATIONS',
	];

	if (opts.noIE) {
		closureOpts.push('--jscomp_off', 'internetExplorerChecks');
	}

	jvmtools.exec("closure", closureOpts, src, function (compiler) {

		var out = [];
		var err = [];
		compiler.on("out", function (data) { out.push(data); });

		compiler.on("err", function (data) {
			err.push(data);
		});
			 // err.push(data); });

		compiler.on("end", function (code) {
			err = err.join('').replace(/^stdin:(\d+):/mg, 'Line $1:');
			if (err.length) {
				compressLog.log(clc.green.bright(filename + ':\n') + err);
			}

			if (code == 0) {
				var compressedSrc = out.join('');
				cb(null, compressedSrc);
			} else {
				compressLog.error("exited with code", code);
				cb({'code': code}, src);
			}
		});
	});
}

exports.strip = function (src, opts, cb) {
	var ast = parser.parse(src);

	var defines = {};
	for (var key in opts.defines) {

		var type = 'string';
		if (typeof opts.defines[key] == 'boolean') {
			type = 'name';
		} else if (typeof opts.defines[key] == 'number') {
			type = 'number';
		}
		
		defines[key] = [type, JSON.stringify(opts.defines[key])];
	}

	ast = uglify.ast_mangle(ast, {
		defines: defines
	});

	ast = uglify.ast_squeeze(ast);
	ast = uglify.ast_lift_variables(ast);

	var src = uglify.gen_code(ast);
	cb(null, src);
}

/**
 * js.io compiler
 */

compile.JsioCompiler = Class(function () {

	var _queue = new BuildQueue();

	this.init = function () {
		this.opts = {};
	}

	this.compile = function (entry, next) {
		// jsio_compile doesn't yet support multiple simultaneous builds, so use a build queue
		var task = bind(this, function (next) {
			logger.log('Compiling Source code.')

			// for debugging purposes, build the equivalent command that can be executed
			// from the command-line (not used for anything other than logging to the screen)
			var cmd = ["jsio_compile", JSON.stringify(entry)];
			for (var key in this.opts) {
				cmd.push('--' + key);

				var value = JSON.stringify(this.opts[key]);
				if (typeof this.opts[key] != 'string') {
					value = JSON.stringify(value);
				}
				cmd.push(value);
			}

			logger.log(cmd.join(' '));

			// The BasilJsioInterface implements platform-specific functions that the js.io
			// compiler needs like basic control flow and compression.  It's really more
			// like a controller that conforms to the js.io-compiler's (controller) interface.
			this.opts['interface'] = new BasilJsioInterface();
			this.opts['interface'].setNext(next);
			this.opts['preCompress'] = bind(this, 'preCompress');

			// start the compile by passing something equivalent to argv (first argument is
			// ignored, but traditionally should be the name of the executable?)
			jsio_compile.compiler.start(['jsio_compile', this.opts.cwd || '.', entry], this.opts);
		});

		_queue.add(task, next);
	}

	 this.setCwd = function (cwd) {
	 	this.opts.cwd = cwd;
	 }

	/**
	 * Infer js.io options from a (runtime.mode) tuple.
	 */
	this.inferOptsFromEntry = function (entry) {
		var match = entry.match(/^gc.(.*).launchClient$/);
		if (!match) {
			throw new Error("unknown platform: " + entry);
		}

		var platform = match[1];

		logger.log("Inferring opts from platform: " + platform);

		var env;
		switch (platform) {
			case "browser":
			case "overlay":
				env = "browser";
				break;
			case "native":
				env = "native";
				break;
		}
		
		return this.inferOptsFromEnv(env);
	}

	this.preCompress = function (srcTable) {}

	/**
	 * Return default options.
	 */

	this.inferOptsFromEnv = function (env) {
		
		var paths = ['.'].concat(exports.JSIO_SDK_PATHS);

		// if the addon manager is found, pull in the paths
		if (addonManager) {
			paths = paths.concat(addonManager.getPaths());
		}

		merge(this.opts, {
			jsioPath: 'sdk/jsio',
			noIE: true,
			environment: env,
			path: paths,
			includeJsio: true,
			appendImport: false,
			debug: argv.verbose ? 2 : 4
		});
	}

	/**
	 * Return optins for enabling compression.
	 */

	 this.setCompressEnabled = function (isEnabled) {
	 	if (isEnabled) {
	 		this.opts.compressSources = true;
	 		this.opts.compressResult = true;
	 	} else {
	 		delete this.opts.compressSources;
	 		delete this.opts.compressResult;
	 	}
	 }

	 /**
	  * use the class opts to compress source code directly
	  */

	this.compress = function (tag, src, cb) {
		exports.compress(tag, src, this.opts, cb);
	}

	this.strip = function (src, cb) {
		exports.strip(src, this.opts, cb);
	}
});

