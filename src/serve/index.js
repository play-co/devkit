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
var dgram = require('dgram');

var packageManager = require('../PackageManager');
var build = require('tealeaf-build');

var common = require('../common');
var logger = new common.Formatter("basil");

var git = require('../git');
var projectManager = require('../ProjectManager');
var etag = require('./etag');

var STATIC_SIMULATE_DIR = path.join(__dirname, 'plugins', 'simulate', 'static');



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
		var jvmtools = require('../../lib/tealeaf-build/src/jvmtools');
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
	app.use(root + 'api', express.static(common.paths.lib('js-api', 'src', 'api')));

	// Load plugins.
	// Serve plugins at their directories, as defined by their manifest files.
	var plugins = {};
	fs.readdirSync(path.join(__dirname, 'plugins')).forEach(function (name) {
		// Read the manifest.
		plugins[name] = JSON.parse(fs.readFileSync(path.join(__dirname, 'plugins', name, 'manifest.json')));

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
	serveRemoteNative(app, basePort);

	// Serve
	app.listen(basePort, function () {
		logger.log('Server launched at http://localhost:' + basePort+ '/\n');
		for (var port = basePort + 1; port < basePort + 20; port++) {
			var server = http.createServer(app);

			server.listen(port);

			server.on('error', function (e) {
				logger.error(e);
			});
		}
	});

	common.config.startWatch();

	return app;
}

function serveRemoteNative (app, basePort) {
	var root = '/code/__cmd__/';

	try {
		var project = packageManager.load('.');
	} catch (e) {
		return false;
	}

	app.get(root + 'loading.png', function (req, res, next) {
		if (project.manifest.preload && project.manifest.preload.img) {
			fs.createReadStream(project.manifest.preload && project.manifest.preload.img).pipe(res);
		} else {
			res.send('', 404);
		}
	});

	app.get(root + 'native.js.mp3', function (req, res, next) {
		var dm = new Buffer(
			JSON.stringify({
				"name": "connect",
				"addr": req.ip
			}));
		var s = new dgram.createSocket("udp4");
		s.send(dm, 0, dm.length, 9320, '127.0.0.1', function(err, bytes) { s.close(); });

		common.getLocalIP(function (err, address) {
			build.build(project.paths.root, 'native-android', {
				debug: true,
				stage: true,
				isTestApp: true,
				isSimulated: true,
				ip: address
			}, function () {
				fs.createReadStream(path.join(project.paths.root, 'build/debug/native-android/native.js.mp3')).pipe(res);
			});
		});
	});

	app.get(root + 'manifest.json', function (req, res, next) {
		fs.createReadStream(path.join(project.paths.root, 'manifest.json')).pipe(res);
	});

	app.use(root + 'build', express.static('./build', {maxAge: 0}));
	app.use(root + 'resources', express.static('./build/debug/native-android/resources', {maxAge: 0}));
	app.use(root + 'spritesheets', express.static('./build/debug/native-android/spritesheets', {maxAge: 0}));
	app.use(root + 'sdk', express.static(common.paths.sdk(), {maxAge: 0}));

	// Launch multicast server (only on OS X for now)
	common.getLocalIP(function (err, address) {
		address = address[0];

		spawn("dns-sd", [
			"-P", "basil", "_tealeaf._tcp", "local",
			basePort, String(address), String(address), "basil"
		]).on('exit', function (code) {
			if (code) {
				logger.error('(dns-sd exited with code ' + code + ")");
			}
		});
	});
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
		require('../register').register('.', launchServer);
	} 
	launchServer();
};
