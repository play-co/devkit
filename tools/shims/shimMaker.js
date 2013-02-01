
var ff = require('ff');
var fs = require('fs');
var optimist = require('optimist');
var util = require('util');
var path = require('path');

var NEW_LINE = '\n';
var TAB = '\t';

var optimistParser = require('optimist')
	.options({
		'directory': {
			'type': 'string',
			'alias': 'd',
			'describe': 'location to run on'
		},
		'force': {
			'type': 'boolean',
			'alias': 'f',
			'describe': 'removes shims even if the contents have changed'
		},
		'test': {
			'type': 'boolean',
			'alias': 't',
			'describe': "preview result of running shimMaker, but don't actually modify any files"
		},
		'harsh': {
			'type': 'boolean',
			'alias': 'h',
			'describe': 'replace shims with errors rather than warnings'
		}
	})
	// .string('directory')
	// 	.alias('directory', 'd')
	// .boolean('force')
	// 	.alias('force', 'f')
	// 	.default('force', false)
	// 	.describe('force', 'removes shims even if the contents have changed')
	// .boolean('test')
	// 	.alias('test', 'd')
	// 	.default('test', false)
	// 	.describe('test', "preview result of running shimMaker, but don't actually modify any files")

	.usage('node shimMaker.js [create | remove] <shimFile.json>');

var argv = optimistParser.parse(process.argv.slice(2));
var action = argv._[0];
var filename = path.resolve(process.cwd(), argv._[1]);

var directory = argv.directory || argv.d;
var DEBUG = argv.test || argv.t;
var force = argv.force || argv.f;
var harsh = argv.harsh || argv.h;

if (argv.h || argv.help) {
	optimistParser.showHelp();
	process.exit(0);
}

if (directory) {
	try {
		process.chdir(directory);
	} catch (e) {
		console.error('Error entering directory:', directory);
		console.error(e);
		process.exit(1);
	}
}

var f = ff(function () {
	if (['create', 'remove'].indexOf(action) == -1) {
		f.fail('no action provided');
	} else if (!filename) {
		f.fail('no shim file provided');
	} else {
		fs.exists(filename, f.slotPlain());
	}
}, function (exists) {
	if (!exists) {
		f.fail('shim file does not exist')
	} else {
		fs.readFile(filename, 'utf-8', f());
	}
}, function (contents) {
	try {
		f(JSON.parse(contents));
	} catch (e) {
		console.error(contents);
		process.exit()
	}
}, function (shims) {
	if (action == 'create') {
		createShims(shims);
	} else if (action == 'remove') {
		removeShims(shims);
	}
}).error(function (err) {
	optimistParser.showHelp();
	console.error(err);
	throw err;
});

function indent (src, space) {
	if (typeof space == 'number') {
		space = new Array(space + 1).join(TAB);
	} else if (!space) {
		space = TAB;
	}

	return src.split(NEW_LINE)
		.map(function (line) { return space + line; })
		.join(NEW_LINE);
}

function addTrailingNewLine (src) {
	return /\n\s*$/.test(src) ? src : src + '\n';
}

function makeBlockComment (src) {
	return '/**' + NEW_LINE + addTrailingNewLine(indent(src, ' * ')) + ' */' + NEW_LINE;
}

function getShimCode (deprecated, target) {
	var comment = makeBlockComment([
		"@package " + deprecated,
		"@deprecated",
		"@shim",
		"",
		"DEPRECATED."
	].join(NEW_LINE));

	if (target == '-' || harsh) {
		return comment + [
				util.format("throw '%s does not exist anymore.';", deprecated),
			].join(NEW_LINE);
	} else {
		return comment + [
				util.format("logger.warn('`%s` is deprecated. Import `%s` module instead.');", deprecated, target),
				util.format("import %s as exports;", target)
			].join(NEW_LINE);
	}
}

function getJSFilename (deprecated) {
	return deprecated.replace(/\./g, '\/') + '.js';
}

function stripSpace (str) {
	return str && str.replace(/^\s+|\s+$/g, '');
}

function createShim (deprecated, target, cb) {
	var code = getShimCode(deprecated, target);
	var filename = getJSFilename(deprecated);

	if (target != '-') {
		var targetPath = getJSFilename(target);
	}

	var f = ff(function () {
		fs.exists(filename, f.slotPlain());

		if (targetPath) {
			fs.exists(targetPath, f.slotPlain());
		} else {
			f(true);
		}
	}, function (srcExists, targetExists) {
		console.log(deprecated, target)
		if (!targetExists) {
			throw "Target file does not exist for " + deprecated;
		}

		if (!srcExists) {
			// all done
			writeShim();
			f.succeed();
		} else {
			fs.readFile(filename, 'utf8', f());
		}
	}, function (contents) {
		if (stripSpace(contents) != stripSpace(code)) {
			writeShim(f());
		}
	}).error(function (err) {
		console.error(err);
	}).success(cb);

	function writeShim (cb) {
		var f = ff(function () {
				ensureDir(path.dirname(filename), f());
			}, function () {
				if (!DEBUG) {
					fs.writeFile(filename, code, f());
				} else {
					console.log('(test) write', filename);
				}
			})
			.error(function (err) {
				console.error(util.format("Could not write shim for %s to %s.", deprecated, target));
				console.error(err);
			})
			.cb(cb);
	}
};

function removeShim (deprecated, target, cb) {
	var code = getShimCode(deprecated, target);
	var filename = getJSFilename(deprecated);

	var f = ff(function () {
		console.log('Checking', filename);
		fs.exists(filename, f.slotPlain());
	}, function (exists) {
		if (!exists) {
			console.warn(util.format("Could not find shim for %s to %s.", deprecated, target));

			// all done
			f.succeed();
		} else {
			fs.readFile(filename, 'utf8', f());
		}
	}, function (contents) {
		if (stripSpace(contents) == stripSpace(code)) {
			console.log(util.format("removing shim for %s to %s", deprecated, target));
			if (!DEBUG) {
				fs.unlink(filename, f());
			} else {
				console.log("(test) would remove", filename);
			}
		} else if (force) {
			console.warn(util.format("shim file for %s to %s found but code has been modified. removing anyway...", deprecated, target));
			if (!DEBUG) {
				fs.unlink(filename, f());
			} else {
				console.log("(test) would remove", filename);
			}
		} else {
			console.warn(util.format("shim file for %s to %s found but code has been modified. skipping...", deprecated, target));
		}
	}).error(function (err) {
		console.error(util.format("Could not remove shim for %s to %s.", deprecated, target));
		console.error(err);
	}).cb(cb);
};

function createShims (shims) {
	var f = ff(function () {
		for (var i = 0, shim; shim = shims[i]; ++i) {
			console.log(util.format("Creating shim file for %s to %s", shim[0], shim[1]));
			createShim(shim[0], shim[1], f.wait());
		}
	}).success(function () {
		console.log("done");
	});
}

function removeShims (shims) {
	var f = ff(function () {
		for (var i = 0, shim; shim = shims[i]; ++i) {
			console.log(util.format("Removing shim file for %s to %s", shim[0], shim[1]));
			removeShim(shim[0], shim[1], f.wait());
		}

		removeShim2();
	}).success(function (err) {
		console.log("done");
	});
}

function ensureDir(dir, mode, cb) {
	if (mode && typeof(mode) === 'function') {
		cb = mode;
		mode = null;
	}

	mode = mode || 0777 & (~process.umask());
	cb = cb || function () {};

	if (DEBUG) {
		console.log("(test) creating directories for", dir);

		// return process.nextTick(cb);
		return cb && cb();
	} else {
		_ensureDir(dir, mode, cb);
	}
}

function _ensureDir(dir, mode, cb) {
	var f = ff(function () {
		fs.exists(dir, f.slotPlain());
	}, function (exists) {
		if (exists) {
			f.succeed();
		} else {
			var current = path.resolve(dir);
			var parent = path.dirname(current);
			f(current);
			_ensureDir(parent, mode, f());
		}
	}, function (current) {
		var onMake = f();
		fs.mkdir(current, mode, function (err, res) {
			if (err && err.code == 'EEXIST') {
				f.fail(err);
			}

			onMake();
		});
	}).cb(cb);
}
