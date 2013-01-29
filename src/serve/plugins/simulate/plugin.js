// Simulate plugin

var fs = require('fs');
var ff = require('ff');
var path = require('path');
var build = require('tealeaf-build');

var etag = require('../../etag');
var common = require('../../../common');
var git = require('../../../git');
var projectManager = require('../../../ProjectManager');
var pho = require('../../../PackageManager');

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
		var projects = common.getProjectList();
		if (!projects[id]) {
			res.send(404);
			return;
		}

		next();
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
		var projects = common.getProjectList();
		var project = projects[req.params.shortName];
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

	app.get('/simulate/:shortName/:target/loading.png', function (req, res, next) {
		var projects = common.getProjectList();
		var project = projects[req.params.shortName];

		var img = project && project.manifest.preload && project.manifest.preload.img;
		if (!img) {
			return next();
		} else {
			img = path.resolve(project.paths.root, img);
			var f = ff(function () {
				fs.exists(img, f.slotPlain());
			}, function (exists) {
				if (!exists) {
					next();
				} else {
					fs.createReadStream(img).pipe(res);
				}
			}).error(next);
		}
	});

	// "native.js.mp3" for testapp
	app.get('/simulate/:shortName/:target/native.js.mp3', function(req, res, next) {
		var projects = common.getProjectList();
		var project = projects[req.params.shortName];
		var target = req.params.target;

		common.getLocalIP(function (err, address) {
			build.build(project.paths.root, target, {
				stage: argv.production ? false : true,
				debug: true,
				isTestApp: true,
				ip: address
			}, next);
		});
	});

	app.get('/simulate/remote/attachedDevices', function (req, res) {
		res.json(nativeInspectorServer.getRemoteConnections() || null);
	});

	app.post('/simulate/remote/enableDevice/', function (req, res) {
		nativeInspectorServer.activateRemoteConn(req.body.id);
		res.send(200);
	});
};
