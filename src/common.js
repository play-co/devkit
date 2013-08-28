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
var color = require('cli-color');
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
				console.error(color.red("ERROR:"), "Port 9200 already in use, exiting. (Are you serving elsewhere?)");
				break;
			default:
				console.error(color.red("Uncaught Exception:"), e.stack);
		}

		common.track("BasilCrash", {"code": e.code, "stack": e.stack});

		console.log("");
		console.error(color.red("  Terminating in 5 seconds..."));
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

		if (str instanceof Error) {
			return '\n' + exports.errorToString(str);
		}

		if (typeof str == 'object') {
			return str;
		}

		return ('' + str)

			// add colour to our build logs so that it's easier to see if and where things went wrong.
			.replace(/\d*(^|\s|[^a-zA-Z0-9-])error(s|\(s\))?/gi, function (res) { return color.redBright(res); })
			.replace(/\d*(^|\s|[^a-zA-Z0-9-])warn(ing)?(s|\(s\))?/gi, function (res) { return color.redBright(res); })
			.replace('BUILD SUCCESSFUL', color.greenBright('BUILD SUCCESSFUL'))
			.replace('BUILD FAILED', color.redBright('BUILD FAILED'))

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
		console.error.apply(console, [this._prefix, color.redBright('[warn] ')].concat(Array.prototype.map.call(arguments, this.format, this)));
	}

	this.error = function () {
		console.error.apply(console, [this._prefix, color.redBright('[error] ')].concat(Array.prototype.map.call(arguments, this.format, this)));
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
	return color.cyanBright(('               [' + tag + ']   ').substr(-15 - Math.max(0, tag.length - 10)));
}

var logger = new exports.Formatter('gcsdk');

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

exports.getEtagServer = function () {
	return require('./serve/etag');
}

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

// read the version data from the .version file
exports.readVersionFile = function () {
	var package = JSON.parse(fs.readFileSync(exports.paths.root("package.json")));
	exports.sdkVersion = Version.parse(package.channel + '-' + package.version);
	exports.buildVersion = package.basil['tealeaf-build-tools'];
};

// call it straight away
exports.readVersionFile();

exports.errorToString = function (error) {

	if (!error.stack) {
		return error;
	}

	var out = [];
	
	try {
		var errStr = error.stack;
		var lines = errStr.split('\n');
		var i = 0;
		var msg = [];
		while (lines[i] && !/^\s*at/.test(lines[i])) {
			msg.push(lines[i]);
			++i;
		}

		var parser = /^\s*at (.*?)\s+\((.*?)\)/;
		lines = lines.slice(i).reverse();
		var data = lines.map(function (line) {
			var match = line.match(parser);
			if (match) {
				var result = {
					func: match[1]
				};

				var details = match[2].match(/(.*?):(\d+):(\d+)/);
				if (details && details[1]) {
					var filename = path.relative(exports.paths.root(), match[2]);
					var dirname = path.dirname(filename);
					result.file = path.basename(filename);
					result.details = './' + (dirname == '.' ? '' : dirname);
					result.line = details[2];
				} else {
					result.details = match[2];
				}

				return result;
			} else {
				return line;
			}
		});

		var n = data.length;
		data.slice(0, n - 1).map(function (data, i) {
			if (typeof data == 'string') {
				out.push(data);
			} else {
				out.push(new Array(i + 1).join(' ') + '└ '
					+ color.green(data.file) + ':' + color.blueBright(data.line)
					+ ' ' + color.whiteBright(data.func)
					+ color.yellowBright(' (' + data.details + ')'));
			}
		});

		var lastLine = data[n - 1];
		if (lastLine) {
			var indent = new Array(n).join(' ');
			var msgLines = msg.join('\n').split('\n');
			var msgText = msgLines.join('\n   ' + indent);
			out.push(indent + '└ '
				+ color.redBright(
					msgText
					+ (msgLines.length > 1 ? '\n' + indent : '')
					+ color.white(' at ')
					+ color.green(lastLine.file) + ':' + color.blueBright(lastLine.line)
					+ ' ' + color.redBright(lastLine.func)
					+ color.yellowBright(' (' + lastLine.details + ')')
				));
		}
	} catch (e) {
		out.push(e.stack);
		out.push(error.stack);
	}

	return out.join('\n');
}

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
		//console.error(color.yellow("WARNING:"), "MixPanel anonymous event tracking disabled (config:optout).  Please consider opting-in to help improve the DevKit!");
	}
}

//// -- End of Analytics

//// -- load and parse config.json

var ConfigManager = require('./ConfigManager');
exports.config = new ConfigManager();

//// -- end config.json