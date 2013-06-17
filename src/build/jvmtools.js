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

// Support for a long-running Java process to run Java tools.

var net = require('net');
var EventEmitter = require('events').EventEmitter;
var spawn = require('child_process').spawn;
var path = require('path');

var common = require('../common');

var Callback = common.jsio("import lib.Callback");

// JVMTools Module
// ===============

var jvmtools = exports;

var _onClient = new Callback();

jvmtools.client = null;
jvmtools.handler = {};
jvmtools.proc = null;

var CMD = 'java';
var ARGS = ['-jar', common.paths.lib('tealeaf-build-tools.jar')];

var logger = new common.Formatter('jvmtools');

function getJavaProcess () {
	if (!jvmtools.proc) {
		var proc = jvmtools.proc = spawn(CMD, ARGS);
		proc.stdout.once('data', function (data) {
			// Read hostname:port
			var parts = String(data).split(':');
			var ip = parts[0];
			//check if the ip is returned as all zeros
			if (parts[0] == '0.0.0.0') {
				//just use localhost instead since connecting to 0.0.0.0
				//does not work on windows
				ip = 'localhost';
			}
			connectClient(ip, parts[1]);
		});
		proc.stderr.on('data', function (data) {
			// process.stderr.write('TealeafBuildTools: ' + data);
		});
		proc.on('exit', function (code) {
			if (code !== 0) {
				logger.error('exited with code ' + code + ' so we can\'t continue.');
				process.exit(1);
			}
			proc.stdin.end();
		});
	}

	return _onClient;
}

function connectClient (hostname, port) {
	var client = jvmtools.client = net.connect(port, hostname, function () {
		logger.log('Connected to daemon on ' + hostname + ':' + port);
		process.nextTick(function () {
			_onClient.fire();
		});
	});

	var out = [];
	client.on('data', function (data) {
		out.push(data);
		data = data.toString();
		if (data.match(/\n/)) {
			var lines = out.join('').split(/\n/);
			out = [lines.pop()];
			lines.forEach(function (line) {
				var data = JSON.parse(line);
				if (jvmtools.handler[data.name]) {
					if (data.tag == 'exit') {
						var handler = jvmtools.handler[data.name];
						jvmtools.handler[data.name] = null;
						handler.emit('end', data.body);
						out = [];
						return false;
					} else if (data.tag == 'process' && data.body == 'start') {
						jvmtools.handler[data.name].emit('start');
					} else {
						jvmtools.handler[data.name].emit(data.tag, data.body);
					}
				}
			});
		}
	});
}

jvmtools.stop = function (next) {
	if (jvmtools.client) {
		jvmtools.client.write(JSON.stringify({tool: 'shutdown'}));
		jvmtools.client.write("\n");
		
		//and because we don't really trust that to actually work
		//let's kill all the processes ourselves.
		jvmtools.proc.kill("SIGTERM");

		_onClient.reset();
		jvmtools.proc = null;
		jvmtools.client = null;
	}
	process.nextTick(next);
};

jvmtools.exec = function (tool, args, stdin, next) {
	if (typeof stdin === "function") {
		next = stdin;
		stdin = "";
	}

	var proc = getJavaProcess();
	proc.run(function () {
		var line = JSON.stringify({tool: tool, args: args, stdin: "\n" + stdin});
		jvmtools.client.write(line);
		jvmtools.client.write("\n");
		next(jvmtools.handler[tool] = new EventEmitter());
	});
};

process.on('exit', function () {
	jvmtools.stop();
});
