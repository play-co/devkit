/* @license
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
