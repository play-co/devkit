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
