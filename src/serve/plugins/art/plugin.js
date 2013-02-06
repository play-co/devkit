/** @license
 * This file is part of the Game Closure SDK.
 *
 * The Game Closure SDK is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * The Game Closure SDK is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with the Game Closure SDK.  If not, see <http://www.gnu.org/licenses/>.
 */

var path = require("path");
var wrench = require("wrench");
var common = require("../../../common");
var git = require("../../../git");
var fs = require("fs");
var ff = require("ff");

var extensions = {
	"png": true, 
	"jpg": true, 
	"jpeg": true, 
	"gif": true
};

var METADATA = {
	"iPhone.json": true, 
	"iPad.json": true, 
	"Android.json": true,
	"Mobile-Browser.json": true,
	"Desktop-Browser.json": true
};

exports.load = function(app) {
	app.get("/art/getResources/:appID", function (req, res) {
		var currentProject = common.getProjectList()[req.params.appID];
		if (!currentProject) {
			return res.send(404);
		}

		var projPath = path.join(currentProject.paths.root, "resources");
		
		var data = wrench.readdirSyncRecursive(projPath);
		var assetList = [];

		var metadata = {
			"iPhone": [],
			"iPad": [],
			"Android": [],
			"Mobile Browser": [],
			"Desktop Browser": []
		};

		for(var i = 0; i < data.length; ++i) {
			var fileName = data[i];
			var dirName = "/";

			//root directory
			if (fileName.lastIndexOf("/") !== -1) {
				
				dirName = "/" + fileName.substring(
					0,
					fileName.lastIndexOf("/")
				);
			}

			if(fileName.substr(fileName.lastIndexOf(".") + 1) in extensions) {
				assetList.push({
					id: i,
					path: fileName,
					dir: dirName
				});
			} else if (fileName.substr(fileName.lastIndexOf("/") + 1) in METADATA) {
				//generate the metadata structure
				var target = fileName.substr(fileName.lastIndexOf("/") + 1);
				target = target.replace(/\-|(\.json)/g, ' ').trim();

				var item = JSON.parse(fs.readFileSync(
					path.join(projPath, fileName)
				).toString());

				item.url = dirName;

				metadata[target].push(item);
			}

			console.log(
				fileName.substr(fileName.lastIndexOf("/") + 1),
				fileName.substr(fileName.lastIndexOf("/") + 1) in METADATA
			);
		}

		res.json({
			all: assetList,
			metadata: metadata
		});
	});

	app.post("/art/replaceImage/:appID/:name", function (req, res) {
		var currentProject = common.getProjectList()[req.params.appID];

		var imagePath = path.resolve(
			currentProject.paths.root, 
			"resources", 
			req.params.name
		);

		//git client
		var isGIT;

		ff(function () {
			fs.exists(path.join(currentProject.paths.root, ".git"), this.slotPlain());
		}, function (exists) {
			//not a git repo, don't worry about git stuff
			if (!exists) {
				return this.succeed();
			}

			isGIT = true;

			//grab the author name
			git.getAuthor(currentProject.paths.root, this.slot());
		}, function (author) {
			author = String(author).replace(/[^a-zA-Z0-9]/g, '');

			//create a branch or check it out
			git.branchIfNeeded(
				currentProject.paths.root,
				"art-replace-" + author, 
				this.slot()
			);
		}).error(function (e) {
			console.error("ERROR replacing image");
			console.log(e);
		}).cb(function () {
			var imgData = req.body.data.replace(/^data:image\/\w+;base64,/, "");
			var buff = new Buffer(imgData, 'base64');

			fs.writeFile(imagePath, buff, function() {
				res.send(200);
			});

			//add the change to stage for commit
			if (isGIT) {
				git.add(currentProject.paths.root, imagePath, function(){});
			}
		});
		
	});

	app.post("/art/commit/:appID", function (req, res) {
		var currentProject = common.getProjectList()[req.params.appID];
		var message = req.body.message;

		git.commitPush(currentProject.paths.root, message, function (err, resp) {
			
			if (err) res.json({errorCode:err, message: String(resp[1])});
			else res.send(200);
		});
	});

	app.post("/art/revert/:appID", function (req, res) {
		var currentProject = common.getProjectList()[req.params.appID];

		git.revert(currentProject.paths.root, function (err, resp) {
			if (err) res.json({errorCode: err, message: String(resp)});
			else res.send(200);
		});
	});

	app.post("/art/saveRules/:appID", function (req, res) {
		var currentProject = common.getProjectList()[req.params.appID];
		var data = req.body;

		var resourcePath = path.resolve(
			currentProject.paths.root, 
			"resources"
		);

		// //loop over each target
		var urls;
		for (var target in data) {
			urls = data[target];
			
			var name = target.replace(/\s+/g, '-');

			//loop over each url in the mix
			for (var i = 0; i < urls.length; ++i) {
				var opts = urls[i];

				var content =  {};
				if (opts.scale) content["scale"] = Number((+opts.scale / 100).toFixed(2));
				if (opts.convert) content["png8"] = true;
				if (opts.width) content["w"] = opts.width;
				if (opts.height) content["h"] = opts.height;

				console.log(path.join(resourcePath, opts.url, name + ".json"), JSON.stringify(content));
				fs.writeFile(
					path.join(resourcePath, opts.url, name + ".json"),
					JSON.stringify(content)
				);
			}
		}

		res.send(200);
	});

	app.get("/art/isGitRepo/:appID", function (req, res) {
		var currentProject = common.getProjectList()[req.params.appID];

		fs.exists(path.join(currentProject.paths.root, ".git"), function (exists) {
			res.send({exists: exists});
		});
	});
}
