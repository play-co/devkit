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

var $ = require('jash');
var fs = require('graceful-fs');
var ff = require('ff');
var common = require('../common');
var logger = new common.Formatter('spritesheetMap');

exports.create = function(path, prependDir, targetFilename, cb) {
	var f = ff(function () {
		fs.readdir(path, f());
	}, function (files) {
		var fontsheetMap = {};
		f(fontsheetMap);

		files.filter(function(filename) {
			return /\.png$/i.test(filename);
		}).forEach(function(filename) {
			var fullPath = path + '/' + filename;
			var targetPath = (prependDir ? prependDir + "/" : "") + filename;
			var cb = f.wait();
			$.file(fullPath, function(s, o, e) {
				var parts = o.split(' ');
				fontsheetMap[targetPath] = {
					w: +parts[4],
					h: +parts[6].slice(0, -1)
				};

				cb();
			});
		});
	}, function (fontsheetMap) {
		fs.writeFile(targetFilename, JSON.stringify(fontsheetMap), f());
	}, function() {
		logger.log("wrote " + targetFilename + ".json to " + path);
	}).cb(cb);
};
