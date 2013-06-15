/* @license
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
