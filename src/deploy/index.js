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

var packageManager = require('../PackageManager');
var http = require('http');
var clc = require('cli-color');
var ff = require('ff');
var common = require('../common');
var git = require('../git');

var argv = require("optimist")
	.default("host", "dev.gameclosure.com")
	.default("port", 80)
	.argv;

/*
 * deploy:
 *   sends some metadata and the manifest to the dev portal.
 */
exports.deploy = function () {
	//we know we're in a project folder
	var proj = packageManager.load(process.cwd());
	var manifest = proj.manifest;
	var deploy_auth = manifest.deployAuth || common.config.get('deploy_auth');

	if (!deploy_auth) {
			console.log(clc.red("ERROR")+" No auth key.\n Please make sure you have set the 'deploy_auth' key in config.json.");
			return;
	}

	if (!common.isValidShortname(manifest.shortName)) {
			console.log(clc.red("ERROR") + " Game shortnames can only be alphanumeric. You must change this before you can deploy.");
			return;
	}

	var f = ff(this, function () {
		git.getGithubRepo(process.cwd(), f());
		git.getGithubBranch(process.cwd(), f());
	}, function (repo, branch) {
		var metadata = {
			version: 0, //0th version means no build attached
			repoURL: repo.trim(),
			branch: branch.trim()
		};

		console.log("======================================================\n",
					"   Application Title: "+manifest.title+"\n",
					"      App Short Name: "+manifest.shortName+"\n",
					"               appID: "+manifest.appID+"\n",
					"------------------------------------------------------\n");

		var data = JSON.stringify({
			manifest: manifest,
			metadata: metadata
		});

		//send the post
		var options = {
			host: argv.host,
			port: argv.port,
			path: '/api/apps/'+manifest.appID+"/?auth="+deploy_auth,
			method: 'POST',
			headers: {
					'Content-Type': 'application/json',
					'Content-Length': data.length
			}
		};

		var req = http.request(options, function(res) {
			res.setEncoding('utf8');
			var chunks = [];

			res.on('data', function (chunk) {
				chunks.push(chunk);
			});

			res.on('end', function () {
				var stitch = chunks.join("");
				var response = JSON.parse(stitch);
				if (response.error) {
					console.log(clc.red("ERROR"), response.error); 
				} else if (response.status === "OK") {
					console.log(clc.green("SUCCESS") +" Deploy successful");
				}
			});
		});

		req.on('error', function(e) {
			throw e.message;
		});

		req.write(data);

		req.end();

	}).error(function (err) { 
		console.log(clc.red("ERROR"), err); 
	});
};

function getAndroidVersion(next){
	if (common.config.get('android:root')){
		git.currentTag(common.config.get('android:root'), next);
	} else {
		next(0, null);
	}
}
