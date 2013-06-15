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

/**
* This file is called when the SDK interface 
* wants to checkout a new version
*/
var ff = require("ff");
var path = require("path");

var update = require("../../../update/update"); 
var list = require("../../../update/list");
var common = require("../../../common");
var cwd = path.join(__dirname, "../../../../");

/*
* create an array of tags
* @param checkServer - If true, ping the server for any updates
*/
function buildTags(checkServer, next) {
	list.listAll(checkServer, function(tags) {
		tags = tags.split("\n");
		var tagData = {};

		for(var i = 0; i < tags.length; ++i) {
			tagData[tags[i]] = {
				date: Date.now() * 1000,
				msg: tags[i]
			};
		}
		//do something with tagData
		next(tagData);
	});
}

function findVersion(next) {
	var version = common.sdkVersion;
	next(version || "unknown");
}

exports.load = function (app) {
	app.get('/plugins/about/update/', function (req, res) {
		console.log("UPDATE TO VERSION", req.query.version);
		update.update(req.query.version, function () {
			console.log("Restarting");
			res.send("restarting");
			process.exit(42);
		});
	});

	var lastChecked = Date.now();
	app.get(/\/plugins\/about\/(version|check_now)/, function (req, res) {
		var f = ff(this, function () {
			if (req.url === "/plugins/about/version/") {
				buildTags(false, f.slotPlain());
			} else {
				console.log("check_now");
				buildTags(true, f.slotPlain());
			}
			findVersion(f.slotPlain());
		}, function (tagData, version) {
			res.json({
				info: {
					lastChecked: lastChecked,
					version: version
				},
				tags: tagData
			});

			lastChecked = Date.now();
		}).error(function(e) { console.log("ERR", e); });
	});
};
