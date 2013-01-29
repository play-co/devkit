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
