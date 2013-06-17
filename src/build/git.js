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

var fs = require('fs');
var path = require('path');

var common = require('../common');

var git = exports;

// Git tools.

git.listVersionedFiles = function (dir, next) {
	common.child('git', ['ls-tree', '--name-only', 'HEAD'], {
		cwd: dir, silent: true
	}, function (code, data) {
		next(String(data).split(/\n/).filter(function (name) {
			return name
		}).map(function (name) {
			return name + (fs.statSync(path.join(dir, name)).isDirectory() ? '/' : '');
		}));
	})
};

git.getStatus = function (dir, next) {

};


git.currentTag = function (gitDir, next) {
	var tagName = "Unknown";
	
	common.child('git', [
		"--git-dir", path.join(gitDir, ".git"),
		"describe", "--always", "--tag"
	], {
		cwd: gitDir
	}, function (error, data) {
		if (error) {
			console.log("Error: failed to get git tag for dir: " + gitDir);
		}

		var tagName = String(data).trim();
		console.log("Found tag name " + tagName);
		next(tagName);
	});
};

git.stash = function (dir, next) {
	common.child('git', ['stash'], {
		cwd: dir
	}, next);
}

git.stashApply = function (dir, next) {
	common.child('git', ['stash', 'apply'], {
		cwd: dir
	}, next);
}

git.fetch = function (dir, next) {
	common.child('git', ['fetch'], {
		cwd: dir
	}, next);
}

git.pull = function (dir, remote, branch, next) {
	common.child('git', ['pull'].concat(remote && branch ? [remote, branch] : []), {
		cwd: dir
	}, next);
}

git.checkout = function (dir, branch, opts, next) {
	common.child('git', ['checkout'].concat(opts.map(function(opt) {
		return '--' + opt;
	})).concat(branch ? [branch] : []), {
		cwd: dir
	}, next);
};

git.merge = function (dir, branch, next) {
	common.child('git', ['merge'].concat(branch ? [branch] : []), {
		cwd: dir
	}, next);
}

git.submoduleUpdate = function (dir, opts, next) {
	common.child('git', ['submodule', 'update'].concat(opts.map(function (opt) {
		return '--' + opt;
	})), {
		cwd: dir
	}, next);
}
