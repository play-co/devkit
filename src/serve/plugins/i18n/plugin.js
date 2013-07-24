var fs = require('fs');
var path = require('path');
var etag = require('../../etag');
var projectManager = require('../../../ProjectManager');

var _app;

projectManager.on('AddProject', serveProject);

var _trans = {};

function serveProject (project) {
	var id = project.getID();
	var langPath = path.join(project.paths.root, 'resources', 'lang');

	if (_trans[id] || !fs.existsSync(langPath)) { return false; }
	
	var trans = _trans[id] = {};
	var langs = fs.readdirSync(langPath);

	for (var i = 0; i < langs.length; i++) {
		var fname = langs[i];
		var lparts = fname.split('.');
		if (lparts[0] != 'all' && lparts[1] == 'json') {
			var lang = lparts[0];
			trans[lang] = JSON.parse(fs.readFileSync(path.join(langPath, fname)));
		}
	}

	fs.writeFileSync(path.join(langPath, 'all.json'), JSON.stringify(trans));
	_app.use('/simulate/' + id + '/debug/resources/lang/', etag.static(langPath));
}

exports.load = function (app) {
	_app = app;
};