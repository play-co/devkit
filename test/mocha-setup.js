//run before every test
var path = require('path');

global.assert = require('assert');

global.BASIL_SRC = function (pathToJoin) {
	return path.resolve(path.join('./src/', pathToJoin));
};
