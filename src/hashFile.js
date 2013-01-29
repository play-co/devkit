var crypto = require('crypto');
var ff = require('ff');
var fs = require('fs');
var path = require('path');

function md5file (filename, cb) {
	var md5sum = crypto.createHash('md5');
	try {
		var s = fs.createReadStream(filename);
	} catch (e) {
		return cb(e);
	}

	s.on('error', function (e) { cb(e); });
	s.on('data', function(d) { md5sum.update(d); });
	s.on('end', function() {
		cb(null, md5sum.digest('hex'));
	});
}

module.exports = function (filename, cb) {
	var f = ff(function () {
		fs.stat(filename, f());
		md5file(filename, f());
	}, function (stat, md5) {
		f(md5 + '|' + (+stat.mtime));
	}).cb(cb);
}