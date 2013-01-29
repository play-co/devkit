var fs = require('fs');
var about = require(BASIL_SRC('./about/about'));

describe('about', function () {
	it('needs credits.txt', function () {
		assert(fs.existsSync(BASIL_SRC('../credits.txt')));
	});
});
