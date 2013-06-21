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


var fs = require('fs');
var ff = require('ff');

var common = require('../common');
var logger = new common.Formatter('spritesheetMap');

exports.create = function (imageMap, path, targetFilename, cb) {
	var sheets = {};
	for (var i in imageMap) {
		var img = imageMap[i];
		if (!img || !img.sheet) {
			continue;
		}

		var sheet = img.sheet;
		if (!sheets[sheet]) {
			sheets[sheet] = {
				w: img.sheetSize[0],
				h: img.sheetSize[1]
			};
		}
	}

	fs.writeFile(path + "/" + targetFilename +".json", JSON.stringify(sheets), 'utf8', function (err) {
		  if (err) {
			  logger.log(err);
		  } else  {
			  logger.log("wrote " + targetFilename + ".json to " + path);
		  }

		  cb && cb(err);
	});

};
