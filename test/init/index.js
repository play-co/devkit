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
var wrench = require('wrench');

var init = require(BASIL_SRC('init'));

describe('init', function () {
	before(function () {
		if (fs.existsSync('./tmpProject')) {
			wrench.rmdirSyncRecursive('./tmpProject');
		}
		fs.mkdirSync('./tmpProject');
	});
	
	it('with empty project', function () {
		init.init(['./tmpProject']);
		
		assert(fs.existsSync('./tmpProject/manifest.json'), 'manifest exists');
		assert(fs.existsSync('./tmpProject/src/Application.js'), 'Application.js exists');
		assert(fs.existsSync('./tmpProject/sdk'), 'sdk symlink exists');
	});

	after(function () {
		wrench.rmdirSyncRecursive('./tmpProject');
	});
});
