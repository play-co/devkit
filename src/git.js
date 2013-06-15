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

var common = require('./common');

var git = exports;

// Git tools.

git.createClient = function (dir, opts) {
	var opts = merge(opts, {cwd: dir});

	var client = function () {
		var last = arguments.length - 1;
		var cb = arguments[last];

		if (Array.isArray(arguments[0])) {
			var args = arguments[0];
			var i = 0;
			var _out = [], _err = [];
			var next = function (code, out, err) {
				_out.push(out);
				_err.push(err);
				if (code || !args[i]) { return cb(code, _out, _err); }
				common.child('git', args[i++], opts, next);
			};

			next();
		} else {
			var args = Array.prototype.slice.call(arguments, 0, last);
			common.child('git', args, opts, cb);
		}
	};

	return client;
}

git.listVersionedFiles = function (dir, next) {
	common.child('git', ['ls-tree', '--name-only', 'HEAD'], {
		cwd: dir, silent: true
	}, function (code, data) {
		next(String(data).split(/\n/).filter(function (name) {
			return name;
		}).map(function (name) {
			return name + (fs.statSync(path.join(dir, name)).isDirectory() ? '/' : '');
		}));
	});
};

git.getStatus = function (dir, next) {

};

git.currentTag = function (gitDir, next) {
	var tagName = "Unknown";
	
	common.child('git', [
		"--git-dir", path.join(gitDir, ".git"),
		"describe", "--always", "--tag"
	], {
		cwd: path.join(gitDir, ".git"),
		silent: true
	}, function (error, data) {
		if (error) {
			console.log("Error: failed to get git tag for dir: " + gitDir);
		}

		var tagName = String(data).trim();
		next(error, tagName);
	});
};

git.stash = function (dir, next) {
	common.child('git', ['stash'], {
		cwd: dir
	}, next);
};

git.stashApply = function (dir, next) {
	common.child('git', ['stash', 'apply'], {
		cwd: dir
	}, next);
};

git.fetch = function (dir, next) {
	common.child('git', ['fetch'], {
		cwd: dir
	}, next);
};

git.pull = function (dir, remote, branch, next) {
	common.child('git', ['pull'].concat(remote && branch ? [remote, branch] : []), {
		cwd: dir
	}, next);
};

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
};

git.submoduleSync = function (dir, next) {
	common.child('git', ['submodule', 'sync'], {
		cwd: dir
	}, next);
};

git.submoduleUpdate = function (dir, opts, next) {
	common.child('git', ['submodule', 'update'].concat(opts.map(function (opt) {
		return '--' + opt;
	})), {
		cwd: dir
	}, next);
};

git.getAuthor = function (dir, next) {
	common.child('git', ['config', '--get', 'user.name'], {
		cwd: dir
	}, next);
}

git.add = function (dir, path, next) {
	common.child('git', ['add', path], {
		cwd: dir
	}, next);
}

git.revert = function (dir, next) {
	common.child('git', ['reset', '--hard'], {
		cwd: dir
	}, next);
}

git.commitPush = function (dir, message, next) {
	var opts = {cwd: dir};
	common.child('git', ['commit', '-m', message], opts, function (err, res) {
		common.child('git', ['push', 'origin', 'HEAD'], opts, function (err2, res2) {
			next(err || err2, [res, res2]);
		})
	})
}

git.branchIfNeeded = function (dir, branch, next) {
	var opts = {
		cwd: dir
	};

	common.child('git', ['branch'], opts, function (err, res) {
		//grab all branches
		var branches = String(res).split('\n');
		for (var i = 0, n = branches.length; i < n; ++i) {
			var b = branches[i].replace(/^\*/, '').replace(/^\s*|\s*$/g, '');
			
			//branch found, execute callback
			if (b == branch) { 
				common.child('git', ['checkout', branch], opts, function () {		
					git.revert(dir, next);
				});
				
				return;
			} 
		}

		//doesnt exist lets create it
		common.child('git', ['checkout', '-b', branch], opts, function (err2, res2) {
			git.revert(dir, next);
		});
  }); 
}

git.getGithubHash = function(dir, next){
	common.child('git', ['show', 'HEAD', '--pretty=oneline'], { cwd: dir, silent: true }, function(code, data){
		next(code, String(data).split(' ')[0]);
	});
};

git.getGithubBranch = function(dir, next){
	common.child('git', ['name-rev', '--name-only', 'HEAD'], {cwd: dir, silent: true}, function(code, data){
		next(code, String(data).split(' ')[0]);
	});
};

git.getGithubRepo = function(dir, next){
	common.child('git',	['config', '--get', 'remote.origin.url'], {cwd: dir, silent: true}, function(code, data){
		//change origin url to a link to the repo
		//regex is an mcav original
		next(code, String(data).replace(/^git@(.*?)\:([^\.]*?)(\.git)?$/, 'http://$1\/$2'));
	});
};
