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

var ff = require('ff');
var path = require('path');

var common = require('./common');
var git = require('./git');
var Version = require('./shared/Version');
var logger = new common.Formatter('contribute');

exports.create = Class(function () {
	this.init = function (name, def) {
		var details = def.dev || def;

		// the working copy's primary remote & branch
		this.remote = details.remote;
		this.uri = details.uri;
		this.branch = details.branch;
		this.submodules = def.submodules;
		this.secondary = def.secondary;

		if (def.dev) {
			this.isDev = true;

			// branch to push to for releases
			this.releaseBranch = details.releaseBranch;

			// the release remote/branch
			this.release = {
				remote: def.remote,
				uri: def.uri,
				branch: def.branch
			};
		}

		this.name = name;
		this.location = path.resolve(common.paths.root(), def.path);
		this.git = git.createClient(this.location, {silent: true});
		this.logger = new common.Formatter(name);
	}

	// convenience method for logging messages related to this repository
	this.log = function () {
		this.logger.log.apply(this.logger, arguments);
	}

	this.fetchGC = function (cb) {
		this.git('fetch', this.remote, function (code, out, err) {
			if (code != 0) {
				cb({code: code, err: err});
			} else {
				cb(null);
			}
		});
	}

	this.getStatus = function (cb) {
		// porcelain: machine readable and won't change between git versions
		this.git('status', '--porcelain', function (code, out, err) {
			if (code != 0) {
				cb({code: code, err: err});
			} else {
				var res = {
					modified: [],
					staged: [],
					untracked: []
				};

				out.split('\n').forEach(function (line) {
					if (!line) { return; }

					var x = line.charAt(0);
					var y = line.charAt(1);
					var name = line.substring(3);
					if (y != ' ' && y != '?') {
						res.modified.push(name);
					}

					if (x != ' ' && x != '?') {
						res.staged.push(name);
					}

					if (y == '?') {
						res.untracked.push(name);
					}
				});

				cb(null, res);
			}
		});
	}

	this.addRemote = function (name, uri, cb) {
		if (!name) {
			return this.log("error: no name provided for remote in config.json");
		}

		if (!uri) {
			return this.log("error: no uri provided for remote", name, "in config.json");
		}

		var f = ff(this, function () {
			this.getRemotes(f());
		}, function (remotes) {
			var foundName = false;
			var foundURI = false;
			remotes.forEach(function (remote) {
				if (remote.name == name) {
					foundName = true;

					if (remote.uri == uri) {
						foundURI = true;
					}
				}
			}, this);

			if (!foundName || !foundURI) {
				var next = f();
				this.git('remote', foundName ? 'set-url' : 'add', name, uri, function (code, out, err) {
					next(code ? {code: code, err: err} : null);
				});
			}
		}).cb(cb);
	}

	this.checkRemotes = function (cb) {
		var f = ff(this, function () {
			this.addRemote(this.remote, this.uri, f());
		}, function () {
			if (this.isDev) {
				this.addRemote(this.release.remote, this.release.uri);
			}
		}).cb(cb);
	}

	this.getRemotes = function (cb) {
		// verbose gives names, uris, and types
		this.git('remote', '-v', function (code, out, err) {
			if (code) {
				cb && cb({code: code});
				return;
			}

			var remotes = [];
			out.split("\n").forEach(function (line) {
				var pieces = line.match(/^(.*?)\s*\t\s*(.*?)\s*\((.*?)\)$/);
				if (pieces) {
					remotes.push({
						name: pieces[1], // e.g. "origin"
						uri: pieces[2],  // e.g. "git@github.com:username/foo.git"
						type: pieces[3]  // e.g. "fetch" or "push"
					});
				}
			});

			cb && cb(null, remotes);
		});
	}

	this.getRemoteBranchStr = function () {
		return this.remote + '/' + this.branch;
	}

	this.getCommitsSince = function (from, to, cb) {
		var cb = arguments[arguments.length - 1];
		if (!from || typeof from != 'string') { from = this.getRemoteBranchStr(); }
		if (!to || typeof to != 'string') { to = 'HEAD'; }

		if (typeof cb != 'function') {
			return logger.warn('no callback found for getCommitsSince');
		}

		this.git('rev-list', '--left-right', '--oneline', from + '...' + to, function (code, out, err) {
			if (code) {
				cb({code: code, err: err});
			} else {
				var res = {
					from: [],
					to: []
				};

				out.toString().split('\n').forEach(function (line) {
					var hash = line.substring(1);
					if (!hash) { return; }

					if (line.charAt(0) == '<') {
						res.from.push(hash);
					} else if (line.charAt(0) == '>') {
						res.to.push(hash);
					}
				});

				cb(null, res);
			}
		});
	}

	this.getCurrentBranch = function (cb) {
		this.git("symbolic-ref", "-q", "HEAD", function (code, out, err) {
			if (code) {
				cb({code: code, err: err});
			} else {
				cb(null, path.basename(out.trim()));
			}
		});
	}


	this.getCommitDetails = function (hash, cb) {
		return {
			author: '',
			date: new Date(),

		};
	}

	this.getTags = function (cb) {
		this.git('tag', '-l', function (code, out, err) {
			if (code) {
				cb({code: code, err: err});
			} else {
				cb(null, out.toString().split('\n').filter(function (tag) { return tag; }));
			}
		});
	}

	this.getVersions = function (channel, cb) {
		this.getTags(function (err, tags) {
			if (err) {
				return cb(err);
			}
			
			var versions = tags.map(function (tag) { return Version.parse(tag); });
			if (channel) {
				versions = versions.filter(function (v) { return v && v.channel == channel; });
			}

			versions.sort(Version.sorterDesc);

			cb(null, versions);
		});
	}

	this.getNextVersion = function (channel, which, cb) {
		this.getVersions(channel, function (err, versions) {
			if (err) {
				return cb(err);
			}
			
			cb(null, versions[0].getNext(which));
		});
	}
});
