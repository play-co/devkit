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

var spawn = require("child_process").spawn;
var path = require("path");

var common = require("../../../common");
var logger = new common.Formatter("native");

var _child = null;
function kill (cb) {
	if (_child) {
		_child.on('exit', function (code) {
			if (cb) cb();
		});

		setTimeout(function () {
			if (_child) {
				//console.log('(native inspector sent SIGKILL)');
				_child.kill('SIGKILL');
			}
		}, 5000);

		//console.log('(native inspector sent SIGTERM)');
		_child.kill('SIGTERM');
	} else {
		if (cb) cb();
	}
}

process.on('exit', function () { kill(); });

exports.load = function (app) {
	//grab the path of the inspector
	var inspector = path.join(__dirname, "../../../../lib/NativeInspector/NativeInspector");

	kill();

	_child = spawn("node", [inspector]);

	_child.on('exit', function (code) {
		_child = null;
		if (code) {
			logger.log('native inspector exited with code ' + code);
		}
	});
};

