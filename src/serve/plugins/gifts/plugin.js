/**
 * This is a small plugin to add gifts to the manifest.
 */

var fs = require('fs');
var path = require('path');

var common = require('../../../common');

exports.load = function(app) {
	/**
	 * Get the gifts for the project
	 */
	app.get('/plugins/gifts/get/:project', function (req, res) {
		res.json(common.getProjectList()[req.params.project].manifest.gifts || {});
	});
	
	/**
	 * Write the gifts for the project with the new gift JSON
	 */
	app.post('/plugins/gifts/set/:project', function (req, res) {
		var project = common.getProjectList()[req.params.project];
		var manifest = project.manifest;
		var newGift = req.body;

		if (!manifest.gifts) manifest.gifts = {};

		manifest.gifts[newGift.id] = newGift;

		fs.writeFileSync(path.join(project.paths.root, 'manifest.json'), JSON.stringify(manifest, null, '\t'));

		res.send(200);
	});

	app.post('/plugins/gifts/delete/:project', function (req, res) {
		var project = common.getProjectList()[req.params.project];

		if (project.manifest.gifts && project.manifest.gifts[req.body.id]) {
			delete project.manifest.gifts[req.body.id];
		}

		fs.writeFileSync(path.join(project.paths.root, 'manifest.json'), JSON.stringify(project.manifest, null, '\t'));

		res.send(200);
	});
};
