/** @license
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
