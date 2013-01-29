var send = require('send');
var crypto = require('crypto');
var fs = require('fs');
var parse = require('url').parse;
var path = require('path');
var hashFile = require('../hashFile');

exports.static = function (root) {
	function sendFile(req, res, pathname, next) {
		function error(err) {
			if (404 == err.status) return next();
			next(err);
		}

		send(req, pathname)
			.maxage(0)
			.root(root)
			.on('error', error)
			.on('directory', next)
			.pipe(res);
	}

	return function (req, res, next) {
		if ('GET' != req.method && 'HEAD' != req.method) return next();

		// note that the default express.static caches parsed paths
		var ifNoneMatch = req.headers['if-none-match'];
		var pathname = parse(req.url).pathname;
		var filename = path.join(root, pathname);
		hashFile(filename, function (err, hash) {
			if (err) {
				sendFile(req, res, pathname, next);
			} else {
				res.setHeader('ETag', '"' + hash + '"');
				if (ifNoneMatch && hash == ifNoneMatch) {
					res.statusCode = 304;
					res.end();
				} else {
					sendFile(req, res, pathname, next);
				}
			}
		});
	};
}