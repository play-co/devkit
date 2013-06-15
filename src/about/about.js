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
var path = require('path');
var common = require('../common');

exports.about = function () {
	var f = ff(this, function () {
		fs.readFile(path.join(common.paths.root(), 'credits.txt'), 'utf8', f());
	}, function (credits) {
		console.log(credits);
	}).error(function(){
		//in case we lose the file, which we've done in the past...
		console.log("basil - the Game Closure SDK.");
	}).cb(function(){
		process.exit(0);
	});
};
