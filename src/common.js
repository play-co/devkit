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
var request = require('request');
var querystring = require('querystring');
var child_process = require('child_process');
var clc = require('cli-color');
var mixpanel = require('mixpanel');

var common = exports;

var isWindows = require('os').platform() == 'win32';

function pathGetter () {
	var base = [__dirname, '..'].concat(Array.prototype.slice.call(arguments));
	return function () {
		return path.join.apply(path, base.concat(Array.prototype.slice.call(arguments)));
	};
}

// Important paths used by the SDK.
exports.paths = {
			root: pathGetter(),
			addons: pathGetter('addons'),
			lib: pathGetter('lib'),
			sdk: pathGetter('sdk'),
			build: pathGetter('lib', 'timestep', 'build'),
			nativeBuild: pathGetter('lib', 'timestep', 'build', 'native'),
			timestepAddons: pathGetter('lib', 'timestep', 'src', 'platforms', 'native', 'addons'),
			projects: pathGetter('projects'),
		};

exports.loadJsio = function () {
	var jsio = require(exports.paths.sdk('jsio/jsio'));
	jsio('from base import *');
	exports.jsio = jsio;
}

exports.loadJsio();

var Version = require('./shared/Version');

var seenException;
process.on('uncaughtException', function (e) {
	if (!seenException) {
		seenException = true;

		console.log("");
		switch (e.code) {
			case 'EADDRINUSE':
				console.error(clc.red("ERROR:"), "Port 9200 already in use, exiting. (Are you serving elsewhere?)");
				break;
			default:
				console.error(clc.red("Uncaught Exception:"), e.stack);
		}

		common.track("BasilCrash", {"code": e.code, "stack": e.stack});

		console.log("");
		console.error(clc.red("  Terminating in 5 seconds..."));
		console.log("");

		// Give it time to post
		setTimeout(function() {
			process.exit(1);
		}, 5000);
	}
});

process.on('SIGINT', function () {
	process.exit(2);
});

process.on('exit', function () {
	exports.config.stopWatch();
});

// Run a child process inline.
exports.child = function (prog, args, opts, cont) {
	var tool;
	try {
		//If we are on windows commands need to be sent through cmd so
		//bat scripts can be executed
		if (isWindows) {
			var cmdArgs = ['/c', prog].concat(args);
			tool = child_process.execFile('cmd', cmdArgs, opts);
		} else {
			tool = child_process.execFile(prog, args, opts);
		}
	} catch (err) {
		console.error('(' + prog + ' could not be executed: ' + err + ')');
		cont(err);
	}
	var out = [];
	var err = [];
	var formatter = new exports.Formatter(opts.tag || prog, opts.silent, out, err);
	tool.stdout.on('data', formatter.out.bind(formatter));
	tool.stderr.setEncoding('utf8');
	tool.stderr.on('data', formatter.warn.bind(formatter));
	tool.on('close', function (code) {
		if (code !== 0 && !opts.silent) {
			if (code === -1 || code === 127) {
				formatter.error('Unable to spawn ' + prog + '.  Please make sure that you have installed all of the prerequisites.');
			} else {
				formatter.error('(' + prog + ' exited with code ' + code + ')');
			}
		}

		tool.stdin.end();
		cont(code, out.join(''), err.join(''));
	});
};

/*
 * The formatter takes a tag and stdout/err streams and prints them nicely. used by things that log.
 * note: always print to stderr. stdout is for passing stuff between our processes.
 */
exports.Formatter = Class(function () {
	this._outHadNewLine = true;
	this._errHadNewLine = true;

	this.init = function (tag, isSilent, outBuffer, errBuffer) {
		this._prefix = exports.Formatter.getPrefix(tag);
		this._isSilent = isSilent || false;
	
		this._outBuffer = outBuffer;
		this._errBuffer = errBuffer;

		this.out = this.out.bind(this);
		this.err = this.err.bind(this);
	}

	this.format = function (str) {
		if (typeof str == 'object') {
			return str;
		}

		return ('' + str)

			// add colour to our build logs so that it's easier to see if and where things went wrong.
			.replace(/\d* ?error(s|\(s\))?/gi, function (res) { return clc.bright.red(res); })
			.replace(/\d* ?warn(ing)?(s|\(s\))?/gi, function (res) { return clc.bright.red(res); })
			.replace('BUILD SUCCESSFUL', clc.bright.green('BUILD SUCCESSFUL'))
			.replace('BUILD FAILED', clc.bright.red('BUILD FAILED'))

			// fix new lines
			.replace(/\r?\n(?!$)/g, '\n' + this._prefix);
	}

	// call these for formatted logging from code
	this.debug = 
	this.info = 
	this.log = function () {
		console.error.apply(console, [this._prefix].concat(Array.prototype.map.call(arguments, this.format, this)));
	}

	this.warn = function () {
		console.error.apply(console, [this._prefix, clc.bright.red('[warn] ')].concat(Array.prototype.map.call(arguments, this.format, this)));
	}

	this.error = function () {
		console.error.apply(console, [this._prefix, clc.bright.red('[error] ')].concat(Array.prototype.map.call(arguments, this.format, this)));
	}

	// hook these up to streaming logs (stdout and stderr)
	this.out = function (data) {
		if (this._outBuffer) { this._outBuffer.push(data); }
		if (!this._isSilent) {
			if (this._outHadNewLine) {
				process.stderr.write(this._prefix);
			}

			process.stderr.write(this.format(data));
			this._outHadNewLine = /\n$/.test(data);
		}
	}

	this.toString = function() {
		return this._buffer.join("\n");
	}

	this.err = function (data) {
		if (this._errBuffer) { this._errBuffer.push(data); }
		if (!this._isSilent) {
			if (this._errHadNewLine) {
				process.stderr.write(this._prefix);
			}

			data = String(data);
			
			process.stderr.write(data.replace(/\r?\n(?!$)/g, '\n' + this._prefix));
			this._errHadNewLine = /\n$/.test(data);
		}
	}

	this.getPrefix = function () { return this._prefix; }
});

exports.Formatter.getPrefix = function (tag) {
	return clc.cyan.bright(('               [' + tag + ']   ').substr(-15 - Math.max(0, tag.length - 10)));
}

var logger = new exports.Formatter('gcsdk');

var CONFIG_PATH = exports.paths.root('config.json');

// initial reading of config.json can happen synchronously using require
var _config;
try {
	_config = require(CONFIG_PATH);
} catch (e) {
	if (e.code != 'MODULE_NOT_FOUND') {
		logger.error("Error loading", CONFIG_PATH);
		if (e instanceof SyntaxError) {
			if (fs.readFileSync(CONFIG_PATH) == "") {
				logger.warn("Your config.json was an empty file! Writing a new one...")
			} else {
				logger.error("Syntax error parsing JSON.");
				process.exit(1);
			}
		} else {
			logger.error(e);
		}
	}

	_config = {};
}

// create a singleton object for the config
//   emits 'change' events when listening for config.json file changes
exports.config = new (require('events').EventEmitter);

// called to re-read the config.json file
exports.config.reload = function () {
	fs.readFile(CONFIG_PATH, 'utf8', bind(this, function (err, data) {
		if (data) {
			try {
				_config = JSON.parse(data);
			} catch (e) {
				logger.error('unable to parse config.json', e);
			}

			this.emit('change');
		}
	}));
}

// get a property from the config file
//
// Note: nested keys can be accessed using dots or colons,
//       e.g. get('foo.bar') or get('foo:bar')
exports.config.get = function (key) {
	var pieces = (key || '').split(/[.:]/);
	var data = _config;
	var i = 0;
	while (pieces[i]) {
		if (!data) { return undefined; }

		data = data[pieces[i]];
		++i;
	}
	return data;
};

// set a property in the config file
// see note in `get()`
exports.config.set = function (key, value, cb) {
	var pieces = (key || '').split(/[.:]/);
	var data = _config;
	var i = 0;
	while (pieces[i + 1]) {
		if (!data[pieces[i]]) {
			data[pieces[i]] = {};
		}

		data = data[pieces[i]];
		++i;
	}

	data[pieces[i]] = value;
	this.write(cb);
}

// async-safe write using a callback queue
// callbacks will not fire until all pending writes complete
exports.config._onWrite = [];
exports.config.write = function (cb) {
	// schedule the callback
	fs.writeFileSync(CONFIG_PATH, JSON.stringify(_config, null, '\t'), 'utf8');
	if (cb) { 
		cb();
	}
}

// note that gcsdk won't exit after running this unless stopWatch is called
exports.config.startWatch = function () {
	if (!this._watcher) {
		// make sure the file exists
		this.write(bind(this, function () {
			// need to check again here
			if (!this._watcher) {
				this._watcher = fs.watch(CONFIG_PATH);
				this._watcher.on('change', bind(this, 'reload'));
			}
		}));
	}
}

// stop watching config.json
exports.config.stopWatch = function () {
	if (this._watcher) {
		this._watcher.close();
	}
}

// write config.json if it doesn't exist the first time
fs.exists(CONFIG_PATH, function (exists) {
	if (!exists) {
		exports.config.write();
	}
});

// Get local IP address.
exports.getLocalIP = function (next) {
	var interfaces = require('os').networkInterfaces();
	var ips = [];

	for (var name in interfaces) {
		if (/e(n|th)\d+/.test(name) || isWindows) {
			for (var i = 0, item; item = interfaces[name][i]; ++i) {
				// ignore IPv6 and local IPs
				if (item.family == 'IPv4' && !item.internal) {
					ips.push(item.address);
				}
			}
		}
	}

	var err = ips.length ? null : {};
	next && next(err, ips);

	return ips;
};

exports.BuildQueue = Class(function () {

	this.init = function () {
		this._queue = [];
	}

	this.add = function (builder, next) {
		var isEmpty = !this._queue[0];
		this._queue.push({
			building: false,
			builder: builder,
			next: next
		});

		if (isEmpty) {
			this.runNext();
		}
	}

	this.runNext = function () {
		var item = this._queue[0];
		if (!item || item.building) {
			return;
		}
		item.building = true;

		item.builder(function () {
			this._queue.shift();
			item.next.apply(item, arguments);
			this.runNext();
		}.bind(this));
	}
});

/**
 * Polyfills for JavaScript/node.js versions.
 */
exports.polyfill = function () {
	String.prototype.startsWith = function (str){
		return this.slice(0, str.length) == str;
	};

	String.prototype.endsWith = function (str){
		return this.slice(-str.length) == str;
	};
};

// Copy a file synchronously.
exports.copyFileSync = function (from, to) {
	return fs.writeFileSync(to, fs.readFileSync(from));
}

exports.getProjectList = function (next) {
	var projectManager = require('./ProjectManager');
	projectManager.getProjects(next);
};

//perhaps this should be in pho?
exports.isValidShortname = function(shortname){
	return shortname.search(/([^[a-zA-Z0-9])/) === -1;
};

// Log execution time.
var times = {};
exports.startTime = function (key) {
	times[key] = new Date();
}

exports.endTime = function (key) {
	var start = times[key], end = new Date();
	console.log('[' + key + ' time: ' + (end - start)/1000 + ' seconds]');
	delete times[key];
};

//read the version data from the .version file
exports.readVersionFile = function () {
	var package = JSON.parse(fs.readFileSync(exports.paths.root("package.json")));
	exports.sdkVersion = Version.parse(package.channel + '-' + package.version);
	exports.buildVersion = package.basil['tealeaf-build-tools'];
};

//call it straight away
exports.readVersionFile();


//// -- MixPanel Analytics: Improve DevKit by sharing anonymous statistics!

// Singleton MixPanel object instance
var myMixPanel = null;
function getMixPanel() {
	if (!myMixPanel) {
		myMixPanel = mixpanel.init("08144f9200265117af1ba86e226c352a");
	}
	return myMixPanel;
}

exports.track = function(key, opts) {
	if (!common.config.get("optout")) {
		// Grab MixPanel singleton instance
		var mp_tracker = getMixPanel();

		// Definte common options
		var commonOpts = {
			version: common.sdkVersion.src
		};

		// Combine options:
		opts = opts || {};
		for (var ii in commonOpts) {
			if (!opts[ii]) {
				opts[ii] = commonOpts[ii];
			}
		}

		// Launch!
		mp_tracker && mp_tracker.track(key, opts);
	} else {
		//console.error(clc.yellow("WARNING:"), "MixPanel anonymous event tracking disabled (config:optout).  Please consider opting-in to help improve the DevKit!");
	}
}

//// -- End of Analytics

