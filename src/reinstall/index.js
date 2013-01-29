var fs = require('fs');
var ff = require('ff');
var path = require('path');

var common = require('../common');

exports.reinstall = function(next){
	var f = ff(this, function () {
		fs.readFile('./manifest.json', 'utf8', f());
	}, function (manifest) {
		var shortName = JSON.parse(manifest).shortName;

		//ugh, we need to figure out which was the more recent build
		var debugApk = {};
		var releaseApk = {};

		debugApk.path = path.join('./build/debug/native-android/', shortName + '.apk');
		debugApk.timestamp = (fs.existsSync(releaseApk.path))? +fs.statSync(debugApk.path).ctime : 0;
		
		releaseApk.path = path.join('./build/release/native-android/', shortName + '.apk'),
		releaseApk.timestamp = (fs.existsSync(releaseApk.path))? +fs.statSync(releaseApk.path).ctime : 0;

		//compare timestamps and install latest .apk
		common.child(
			'adb', ['install', '-r', (debugApk.timestamp > releaseApk.timestamp)? debugApk.path : releaseApk.path ],
			{ cwd: process.cwd() }, f.waitPlain());
	}).cb(next || process.exit);
};
