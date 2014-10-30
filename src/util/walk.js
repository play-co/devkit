var path = require('path');
var fs = require('fs');

/**
 * dir: path to the directory to explore
 * action(file, stat): called on each file or until an error occurs. file: path to the file. stat: stat of the file (retrived by fs.stat)
 * done(err): called one time when the process is complete. err is undifined is everything was ok. the error that stopped the process otherwise
 */
exports.walk = function (dir, opts) {

	// this flag will indicate if an error occured (in this case we don't want to go on walking the tree)
	var dead = false;

	// this flag will store the number of pending async operations
	var pending = 0;

	var fail = function(err) {
		if (!dead) {
			dead = true;
			var cb = opts.onComplete;
			cb && cb(err);
		}
	};

	var checkSuccess = function() {
		if (!dead && pending == 0) {
			dead = true;
			var cb = opts.onComplete;
			cb && cb();
		}
	};

	var performAction = function(file, stat) {
		if (stat.isDirectory()) {
			// dive by default, optional callback can forward an error to stop diving
			if (!opts.onDirectory) {
				dive(file);
			} else {
				opts.onDirectory(file, stat, function (err) {
					if (!err) {
						dive(file);
					}
				});
			}
		} else {
			try {
				var cb = opts.onFile;
				cb && cb(file, stat);
			} catch(error) {
				fail(error);
			}
		}
	};

	// this function will recursively explore one directory in the context defined by the variables above
	var dive = function(dir) {
		pending++; // async operation starting after this line
		fs.readdir(dir, function(err, list) {
			if (dead) { return; }
			if (err) { return fail(err); }

			// iterate over the files
			list.forEach(function(file) {
				if(!dead) { // if we are already dead, we don't do anything
					var fullPath = path.join(dir, file);
					pending++; // async operation starting after this line
					fs.stat(fullPath, function(err, stat) {
						if (dead) { return; }
						if (err) {
							fail(err); // if an error occured, let's fail
						} else {
							if (!/^\./.test(file)) {
								performAction(fullPath, stat);
							}
							pending--; checkSuccess(); // async operation complete
						}
					});
				}
			});
			pending--; checkSuccess(); // async operation complete
		});
	};

	fs.stat(dir, function (err, stat) {
		if (stat && stat.isDirectory()) {
			// start exploration
			dive(dir);
		} else {
			fail(new Error("not a directory: " + dir));
		}
	});
};

exports.walkSync = function (start, callback, onFinish) {
	var stat = fs.statSync(start);
	if (stat.isDirectory()) {
		fs.readdirSync(start).forEach(function (name) {
			var absPath = path.join(start, name);
			var stat = fs.statSync(absPath);
			if (stat.isDirectory()) {
				exports.walkSync(absPath, callback);
			} else {
				callback && callback(absPath, stat);
			}

			return acc;
		});
	} else {
		throw new Error("path: " + start + " is not a directory");
	}

	onFinish && onFinish();
};
