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

var fs = require('fs');
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
	var root = '/simulate/' + id + '/';

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
	_app.use(root, etag.static(path.join(__dirname, 'static')));

	// Compiled targets.
	_app.use(root, etag.static(path.join(project.paths.root, 'build', 'debug'), {maxAge: 0}));
	_app.use(root + "resources/", etag.static(path.join(project.paths.root, 'resources')));

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

	// Rebuild on commit always
	app.get('/simulate/:shortName/:target/', function (req, res, next) {
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
					debug: true,
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

	app.get('/simulate/:shortName/:target/splash/:splash', function (req, res, next) {
		common.getProjectList(function (projects) {
			var project = projects[req.params.shortName.toLowerCase()];
			var splash = req.params.splash;

			var img = project && project.manifest.splash && project.manifest.splash[splash];
			if (!img) {
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
				if (project.manifest.splash && project.manifest.splash["universal"] && outSize) {
					//run the splasher to generate a splash of the desired size
					logger.log("Splash image mapped from universal ->", splash);
					var outImg = path.join(project.paths.root,".tempsplash.png");
					build.jvmtools.exec('splasher', [
						"-i", path.resolve(project.paths.root, project.manifest.splash["universal"]),
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
					return next();
				}
			} else {
				img = path.resolve(project.paths.root, img);
				var f = ff(function () {
					fs.exists(img, f.slotPlain());
				}, function (exists) {
					if (!exists) {
						next();
					} else {
						logger.log("Splash image mapped from", splash, "->", img);
						fs.createReadStream(img).pipe(res);
					}
				}).error(next);
			}
		});
	});

	// "native.js.mp3" for testapp
	app.get('/simulate/:shortName/:target/native.js.mp3', function(req, res, next) {
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
	addonManager.getAddons().forEach(function (addon) {
		try {
			if (fs.existsSync(common.paths.addons(addon, 'simulator'))) {
				simulatorAddons.push(addon);

				if (fs.existsSync(common.paths.addons(addon, 'simulator', 'routes.js'))) {
					var routes = require(common.paths.addons(addon, 'simulator', 'routes.js'));
					if (routes.initApp) {
						var addonApp = express();
						routes.initApp(common, express, addonApp);
						app.use('/simulate/addons/' + addon + '/', addonApp);
					}
				}
				
				app.use('/simulate/addons/' + addon + '/static/', etag.static(common.paths.addons(addon, 'simulator', 'static')));
			}
		} catch (e) {
			logger.error("simulator addon", addon, "failed to initialize", e);
		}
	});

	app.get('/simulate/addons/', function (req, res) {
		res.json(simulatorAddons);
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
