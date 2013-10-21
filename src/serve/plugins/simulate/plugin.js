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

// Simulate plugin

var fs = require('graceful-fs');
var ff = require('ff');
var path = require('path');
var express = require('express');
var dgram = require('dgram');
var build = require('../../../build');

var etag = require('../../etag');
var common = require('../../../common');
var git = require('../../../git');
var addonManager = require('../../../AddonManager');
var projectManager = require('../../../ProjectManager');
var pho = require('../../../PackageManager');
var logger = new common.Formatter('packager');

var nativeInspector = require('./NativeInspector');

var _app;

projectManager.on('AddProject', serveProject);

var _routes = {};

var nativeInspectorServer;

var parse = require('url').parse;

function serveProject (project) {
	var id = project.getID();
	var root = '/simulate/';

	if (_routes[id]) { return false; }
	_routes[id] = true;

	_app.get(root, function (req, res, next) {
		// hacky way to not serve removed projects since we
		// can never remove these routes once they're registered
		// with the app without hacking express...
		common.getProjectList(function(projects) {
			if (!projects[id.toLowerCase()]) {
				res.send(404);
			} else {
				next();
			}
		});
	});

	// Static pages.
	_app.use(root + id, etag.static(path.join(__dirname, 'static')));

	// Compiled targets.
	_app.use(root + 'debug/' + id, etag.static(path.join(project.paths.root, 'build', 'debug'), {maxAge: 0}));
	_app.use(root + 'debug/' + id + '/resources/', etag.static(path.join(project.paths.root, 'resources')));

	_app.use(root + 'release/' + id, etag.static(path.join(project.paths.root, 'build', 'release'), {maxAge: 0}));

	// var route = etag.static(path.join(project.paths.root, 'sdk', 'gc', 'debugging'));
	_app.get(new RegExp('^' + root + '.*?/sdk/gc/debugging/.*?'), function (req, res) {
		var pieces = parse(req.url).pathname.split('/sdk/gc/debugging/');
		res.sendfile(path.join(project.paths.root, 'sdk', 'gc', 'debugging', pieces[1]));
	});
}

exports.serveProject = serveProject;

exports.load = function (app, argv) {
	_app = app;
	
	if (!nativeInspectorServer) {
		nativeInspectorServer = nativeInspector.createServer();
		nativeInspectorServer.listen('csp', {host: 'localhost', port: '9225'});
		nativeInspectorServer.listen('tcp', {host: 'localhost', port: '9226'});
	}

	_app.use('/simulate/static/', etag.static(path.join(__dirname, 'static')));

	// Rebuild on commit always
	app.get('/simulate/:debug/:shortName/:target/', function (req, res, next) {
		common.getProjectList(function (projects) {
			var project = projects[req.params.shortName.toLowerCase()];
			if (!project) {
				return next();
			}

			//check the availability of the build target
			//default to browser desktop
			var target = req.params.target;
			if (!build.isTargetAvailable(target)) {
				target = "browser-desktop";
			}

			common.getLocalIP(function (err, address) {
				build.build(project.paths.root, target, {
					stage: argv.production ? false : true,
					debug: req.params.debug == "debug" ? true : false,
					isSimulated: true,
					ip: address
				}, function () {
					next();
				});
			});

			// update the manifest if on a version
			if (project.manifest.sdkVersion !== common.sdkVersion.toString()) {

				project.manifest.sdkVersion = common.sdkVersion.toString();
				
				fs.writeFile(
					path.join(project.paths.root, "manifest.json"),
					JSON.stringify(project.manifest, null, '\t')
				);
			}
		});
	});

	function ServeSplash(req, res, next) {
		common.getProjectList(function (projects) {
			var project = projects[req.params.shortName.toLowerCase()];
			var splash = req.params.splash;

			var img = project && project.manifest.splash && project.manifest.splash[splash];
			if (img) {
				img = path.resolve(project.paths.root, img);
			}

			if (!img || !fs.existsSync(img)) {
				//if the key does not exist in the manifest we need to generate one
				var splashSizes = {  
					"portrait480": "320x480",
					"portrait960": "640x960",
					"portrait1024": "768x1024",
					"portrait1136": "640x1136",
					"portrait2048": "1536x2048",
					"landscape768": "1024x768",
					"landscape1536": "2048x1496"
				};
				var outSize = splashSizes[splash];
				var universalSplashPath;

				// If manifest specifies a splash image,
				if (project.manifest.splash && project.manifest.splash["universal"] && outSize) {
					universalSplashPath = path.resolve(project.paths.root, project.manifest.splash["universal"]);
					logger.log("Splash image mapped from universal key (" + universalSplashPath + ") ->", splash);
				} else {
					universalSplashPath = build.common.paths.lib('defsplash.png');
					logger.log("Splash image mapped from default placeholder (" + universalSplashPath + ") ->", splash);
				}

				//run the splasher to generate a splash of the desired size
				var outImg = path.join(project.paths.root,".tempsplash.png");
				build.jvmtools.exec('splasher', [
					"-i", universalSplashPath,
					"-o", outImg,
					"-resize", outSize,
					"-rotate", "auto"
				], function (splasher) {
					var formatter = new build.common.Formatter('splasher');
					splasher.on('out', formatter.out);
					splasher.on('err', formatter.err);
					splasher.on('end', function (data) {
						fs.exists(outImg, function(exists) {
							if (!exists) {
								next();
							} else {
								var stream = fs.createReadStream(outImg);
								stream.pipe(res)
								stream.on('end', function () {
									//remove out remporary file
									fs.unlinkSync(outImg);
								});
							}
						});
					})
				});
			} else {
				logger.log("Splash image mapped from", splash, "->", img);
				fs.createReadStream(img).pipe(res);
			}
		});
	}

	// Splash: Web Simulator version
	app.get('/simulate/:shortName/:target/splash/:splash', ServeSplash);

	// Splash: TestApp version
	app.get('/simulate/:debug/:shortName/:target/splash/:splash', ServeSplash);

	// "native.js" for testapp
	app.get('/simulate/:debug/:shortName/:target/native.js', function(req, res, next) {
		common.getProjectList(function (projects) {
			var project = projects[req.params.shortName.toLowerCase()];
			var target = req.params.target;

			common.getLocalIP(function (err, address) {
				build.build(project.paths.root, target, {
					stage: argv.production ? false : true,
					debug: true,
					isTestApp: true,
					ip: address
				}, next);
			});

			logger.log("Serving", req.params.shortName, "->", req.ip);

			var dm = new Buffer(
				JSON.stringify({
					"name": "connect",
					"addr": req.ip
				}));
			var s = new dgram.createSocket("udp4");
			s.send(dm, 0, dm.length, 9320, '127.0.0.1', function(err, bytes) { s.close(); });
		});
	});

	app.get('/simulate/remote/attachedDevices', function (req, res) {
		res.json(nativeInspectorServer.getRemoteConnections() || null);
	});

	app.post('/simulate/remote/enableDevice/', function (req, res) {
		nativeInspectorServer.activateRemoteConn(req.body.id);
		res.send(200);
	});

	var simulatorAddons = [];
	var allAddons = addonManager.getAddons();
	Object.keys(allAddons).forEach(function (addonName) {
		var addon = allAddons[addonName];
		if (addon.hasSimulatorPlugin()) {
			try {
				simulatorAddons.push(addon);

				var routesJS = addon.getPath('simulator', 'routes.js');
				if (fs.existsSync(routesJS)) {
					var routes = require(routesJS);
					if (routes.initApp) {
						var addonApp = express();
						routes.initApp(common, express, addonApp);
						app.use('/simulate/addons/' + addonName + '/', addonApp);
					}
				}
				
				var staticFiles = addon.getPath('simulator', 'static');
				if (fs.existsSync(staticFiles)) {
					app.use('/simulate/addons/' + addonName + '/static/', etag.static(staticFiles));
				}
			} catch (e) {
				logger.error("simulator addon", addonName, "failed to initialize", e);
			}
		}
	});

	app.get('/simulate/addons/', function (req, res) {
		res.json(simulatorAddons.map(function (addon) { return addon.getName(); }));
	});

	app.get('/simulate/addons/:addon/index.js', function (req, res) {
		var name = req.params.addon;
		var addonPath = common.paths.addons(name, 'simulator', 'static', 'index.js');
		if (fs.existsSync(addonPath)) {
			var JsioCompiler = require(common.paths.root('src', 'build', 'compile')).JsioCompiler;
			var compiler = new JsioCompiler();
			compiler.opts.includeJsio = false;
			compiler.opts.cwd = common.paths.root();

			var path = 'addons.' + name + '.simulator.static.index';
			compiler.inferOptsFromEnv('browser')
				.compile(path, function (err, code) {
					res.send(";(function () { var jsio = GLOBAL.jsio; " + code + "; exports = jsio('import " + path + "')})();");
			});
		}
	});
};
