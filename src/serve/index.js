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

var path = require('path');
var fs = require('fs');
var ff = require('ff');
var express = require('express');
var EventEmitter = require('events').EventEmitter;
var querystring = require('querystring');
var request = require('request');
var spawn = require('child_process').spawn;
var clc = require('cli-color');
var util = require('util');
var http = require('http');

var packageManager = require('../PackageManager');
var build = require('../build');

var common = require('../common');
var logger = new common.Formatter("basil");

var git = require('../git');
var projectManager = require('../ProjectManager');
var etag = require('./etag');

var STATIC_SIMULATE_DIR = path.join('src', 'serve', 'plugins', 'simulate', 'static');


/**
 * Arguments.
 */

var argv = require('optimist')
	.alias('port', 'p').describe('port', 'Port on which to run the basil server.').default('port', 9200)
	.alias('production').describe('production', 'hit the production servers instead of the staging servers').default(false)
	.argv;

/**
 * Server API.
 */

//`app` is the express server which you attach routes to
// TODO: clean this up. attaches all sorts of things that could be elsewhere.
function serveAPI (app) {
	//endpoint to send jsio to be compiled.
	//we may not want this in future
	//may not be used
	//TODO: stage for deletion
	app.get('/compiled/*', function (req, res) {
		var compiler = new build.JsioCompiler();
		compiler.inferOptsFromEnv('browser');
		compiler.setCwd(common.paths.root());
		compiler.opts.path.push(STATIC_SIMULATE_DIR);
		compiler.compile('import ' + [req.params[0], 'preprocessors.import', 'preprocessors.cls'].join(','), function (err, src) {
			if (err) {
				res.send(err);
			} else {
				res.send(src);
			}
		});
	});

	//gets the ip of the server.
	//usage: make a GET request to /api/ip
	app.get('/api/ip', function (req, res) {
		common.getLocalIP(function (err, address) {
			res.json({ip: [address]});
		});
	});

	//syntax checker.
	//TODO: figure out usage
	app.post('/.syntax', function(req, res) {
		var jvmtools = require('../build/jvmtools');
		jvmtools.exec("closure", [
			"--compilation_level", "WHITESPACE_ONLY",
			"--jscomp_off", "internetExplorerChecks",
			"--warning_level", "VERBOSE",
			"--js", "-"
		], req.body.javascript, function (compiler) {
			var out = [];
			
			compiler.on("err", function (data) {
				logger.error("[CLOSURE ERR]", data);
				out.push(data);
			}); 
		
			compiler.on("end", function (data) {
				res.json([true, {"stderr": out.join("")}]);
			});
		});
	});
}

/**
 * Squill tools.
 */
// Squill's composed of a bunch of javascript files at the root static dir
// Wouldn't work if you didn't serve jsio and squill to the frontend, which is what we do here.
function serveFrontend (app) {
	var root = '/';

	// serve jsio and squill
	app.use(root + 'jsio', express.static(common.paths.lib('js.io', 'packages')));
	app.use(root + 'squill', express.static(common.paths.lib('squill')));
	app.use(root + 'shared', express.static(path.join(__dirname, '../shared')));
	app.use(root + 'api', express.static(common.paths.lib('gcapi', 'src', 'api')));

	// Load plugins.
	// Serve plugins at their directories, as defined by their manifest files.
	var plugins = {};
	fs.readdirSync(path.join(__dirname, 'plugins')).forEach(function (name) {
		// Read the manifest.
		try {
			var manifest = path.join(__dirname, 'plugins', name, 'manifest.json');
			if (fs.existsSync(manifest)) {
				plugins[name] = JSON.parse(fs.readFileSync(manifest));
			} else {
				return;
			}
		} catch (e) {
			logger.warn('Could not load plugin', name);
			console.error(e);
			return;
		}

		// Serve static files.
		app.use(root + 'plugins/' + name, express.static(path.join(__dirname, 'plugins', name, 'static')));

		// Require a optional JS file under plugin dir to execute dynamic requests.
		var pluginjs = path.join(__dirname, 'plugins', name, 'plugin.js');
		if (fs.existsSync(pluginjs)) {
			var plugin = plugins[name].module = require(pluginjs);
			plugin.load(app, argv);
		}
	});

	// returns a json array of plugins
	app.get('/plugins/', function (req, res) {
		res.json(plugins);
	});
}

/**
 * Web server.
 */

//creates and configures an express server
function launchServer () {
	common.track("BasilServe");

	//var app = require('express').createServer();
	var express = require('express');
	var app = express();

	app.use(express.bodyParser());

	var basePort = argv.port;

	// Serve functionality
	try {
		var stylus = require('stylus');
		var nib = require('nib');

		app.use(stylus.middleware({
			src: common.paths.root("src/serve/stylesheets/"),
			dest: common.paths.root("src/serve/public/"),
			compile: function (str, path) {
				return stylus(str)
					.set('paths', [common.paths.root("src/serve/plugins/")])
					.set('filename', path)
					.set('compress', false)
					.use(nib());
			}
		}));
	} catch (e) {
		logger.warn(e);
	}

	app.use('/', express.static(path.join(__dirname, './public/')));
	
	serveAPI(app);
	serveFrontend(app);

	// Launch multicast server (only on OS X for now)
	common.getLocalIP(function (err, address) {
		address = address[0];

		build.jvmtools.exec('jmdns', [
			'-rs', 'basil', '_tealeaf._tcp', 'local', basePort
			], function (jmdns) {
				var formatter = new build.common.Formatter('jmdns');
				jmdns.on('out', formatter.out);
				jmdns.on('err', formatter.err);
				jmdns.on('end', function (data) {})
			});
	});

	// Serve
	app.listen(basePort, function () {
		logger.log('Server launched at http://localhost:' + basePort+ '/\n');
		common.getLocalIP(function (err, ip) {
			logger.log('Your local IP is', ip);
		});

		for (var port = basePort + 1; port < basePort + 20; port++) {
			var server = http.createServer(app);

			server.listen(port);

			server.on('error', function (e) {
				logger.error(e);
			});
			
			common.config.startWatch();
		}
	});

	return app;
}

/**
 * Module API
 */

exports.launch = launchServer;

//launches the server, and if it's in a project folder, registers it.
exports.cli = function () {
	// If current project is a game, try to automatically register it.
	if (fs.existsSync('./manifest.json')) {
		logger.log('Serving from project directory, attempting to automatically register..');
		require('../register').register('.', false, launchServer);
	} 
	launchServer();
};
