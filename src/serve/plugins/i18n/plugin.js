var path = require('path');
var etag = require('../../etag');
var projectManager = require('../../../ProjectManager');

var _app;

projectManager.on('AddProject', serveProject);

var _routes = {};

function serveProject (project) {
	var id = project.getID();
	var root = '/simulate/' + id + '/debug/';
	
	if (_routes[id]) { return false; }
	_routes[id] = true;
	
	_app.use(root + 'resources/lang/',
		etag.static(path.join(project.paths.root, 'resources', 'lang')));
}

exports.load = function (app) {
	_app = app;
};