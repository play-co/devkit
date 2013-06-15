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

var fs = require("fs");
var wrench = require('wrench');
var path = require('path');
var findit = require('findit');
var falafel = require('falafel');
var EventEmitter = require("events").EventEmitter;

/*
 * Utility Functions
 */

function collector (emitter, event, consumer) {
	var collected = [];
	emitter.on(event, function () {
		return collected.push(consumer.apply(null, arguments));
	});
	return {
		collect: function(cb) {
			return emitter.on('end', function() {
				return cb(collected);
			});
		}
	};
};

function listFiles (base, exts, cb) {
	var ret = new EventEmitter();
	if (!fs.existsSync(base)) {
		if (cb) {
			cb([]);
		} else {
			process.nextTick(function () {
				ret.emit('end');
			})
		}
		return;
	}

	findit.find(base).on('file', function(file, stat) {
		var _ref;
		if ((exts || []).indexOf(path.extname(file).substr(1)) >= 0) {
			return ret.emit('file', path.basename(file, path.extname(file)), file, stat);
		}
	}).on('end', function() {
		return ret.emit('end');
	});
	if (cb != null) {
		collector(ret, 'file', function(name, path, stat) {
			return {
				name: name,
				path: path,
				stat: stat
			};
		}).collect(cb);
	}
	return ret;
};

function listFilesSync (base, exts) {
	var ret = new EventEmitter();
	var files = []
	if (fs.existsSync(base)) {
		findit.sync(base, function (file, stat) {
			if (stat.isFile() && (exts || []).indexOf(path.extname(file).substr(1)) >= 0) {
				files.push({name: path.basename(file, path.extname(file)), path: file, stat: stat});
			}
		});
	}
	return files;
};

function serializeConfig (json) {
	return JSON.stringify(json, null, '\t');
}

function clone (obj) {
	return JSON.parse(JSON.stringify(obj));
}

function augment (a, b) {
	for (var k in b) {
		if (Object.prototype.hasOwnProperty.call(b, k)) {
			a[k] = b[k];
		}
	}
	return a;
}

function createUUID (a) {
	return a
		? (a ^ Math.random() * 16 >> a / 4).toString(16)
		: ([1e7]+1e3+4e3+8e3+1e11).replace(/[018]/g, createUUID);
}

/**
 * Module API
 */

var sanitizeCode = exports.sanitizeCode = function (code) {
	return code
		.replace(/^#/, '//#')
		.replace(/^([ \t]*(\/\/)?(import|from)\b.*)$/img, '//$1');
};

var unsanitizeCode = exports.unsanitizeCode = function (code) {
	return code
		.replace(/^\/\/#/, '#')
		.replace(/^\/\/([ \t]*(import|from)\b.*)$/img, '$1');
};

function addImport(code, pkg) {
	return code
		.replace(/^("use [^"]*"[ \t]*;[ \t]*\r?\n([ \t]*\r?\n)?)?/, '"use import";\n\nimport ' + pkg + ';\n');
}

var importRegex = /^(\s*)(import|from)\s+(.*?)\s*;*$/gm;

exports.parseImports = function (code, rel) {
	function resolve(cls) {
		if (!rel || cls.charAt(0) != '.') return cls;
		var rel2 = rel;
		while (cls.match(/^\./)) {
			rel2 = rel2.replace(/[^.]+\.?$/, '');
			cls = cls.substr(1);
		}
		return rel2 + cls;
	}

	var m = null, imports = [];
	while (m = importRegex.exec(code)) {
		var type = m[2]; rest = m[3].split(/\s+/);
		if (type == 'import') {
			imports.push({
				type: type,
				package: resolve(rest[0].replace(/((^\.)|\.)[^.]+$/, '$2')),
				class: rest[0].replace(/^(.*)\./, ''),
				alias: (rest[2] || rest[0]).replace(/^\./, ''),
				resolved: resolve(rest[0])
			})
		} else {
			imports.push({
				type: type,
				package: resolve(rest[0]),
				class: rest[2],
				alias: rest[2],
				resolved: resolve((rest[0] ? rest[0] + '.' : '') + rest[2])
			})
		}
	}
	importRegex.lastIndex = 0;
	return imports;
};

exports.listScripts = function (path, cb) {
	return listFiles(path, ['js'], cb);
};

exports.listScriptsSync = function (path) {
	return listFilesSync(path, ['js']);
};

exports.isPackage = function (root) {
	return fs.existsSync(root)
		&& fs.existsSync(path.join(root, 'manifest.json'));
};

/*
 * Package Class
 */

var GCPackage = (function() {

	function GCPackage (root) {

		if (!root) { return; }

		// deprecated: (synchronous is bad)

		this.initPaths(root);

		try {
			var contents = fs.readFileSync(this.paths.manifest, 'utf-8');
		} catch (e) {
			throw new Error('Error reading file: ' + e);
		}

		try {
			this.manifest = JSON.parse(contents);
		} catch (e) {
			console.log(contents);
			throw new Error('Invalid JSON: ' + e);
		}
	}

	GCPackage.prototype.initPaths = function (root) {
		if (!exports.isPackage(root)) {
			return new Error('Invalid game archive (expecting ./ and ./manifest.json)');
		}

		root = path.resolve(process.cwd(), root);

		this.paths = {
			root: root,
			shared: path.join(root, 'shared'),
			resources: path.join(root, 'resources'),
			lang: path.join(root, 'resources', 'lang'),
			manifest: path.join(root, 'manifest.json')
		};
	}

	GCPackage.prototype.load = function (root, next) {
		var err = this.initPaths(root);
		if (err) {
			next(err);
			return;
		}

		// load and parse manifest to initialize this object
		fs.readFile(this.paths.manifest, function (err, contents) {

			// forward IO errors
			if (err) {
				next(err);
				return;
			}

			// parse JSON of manifest
			try {
				this.manifest = JSON.parse(contents);
			} catch (e) {
				next({
					'message': 'JSON parse error',
					'contents': contents,
					'error': e
				});
				return;
			}

			// check if the appID is valid, if not then generate a new one and save the manifest (should never happen)...
			if (!this.manifest.appID || (typeof this.manifest.appID !== 'string') || (this.manifest.appID.length < 1)) {
				this.manifest.appID = createUUID();
				fs.writeFileSync(this.paths.manifest, serializeConfig(this.manifest));
			}

			// success! pass along this object
			next(null, this);
		}.bind(this));
	}

	/* Manifest */

	GCPackage.prototype.getManifestKey = function (key, def) {
		return this.manifest.hasOwnProperty(key) ? this.manifest[key] : def;
	}

	GCPackage.prototype.populateManifest = function (opts, cb) {
		if (typeof opts !== 'object') { opts = {}; }
		
		this.saveManifest(augment({
			"appID": createUUID(),
			"shortName": (typeof opts.shortName === 'undefined') ? "" : opts.shortName,
			"title": (typeof opts.title === 'undefined') ? "" : opts.title,

			"studio": {
				"name": "Your Studio Name",
				"domain": "studio.example.com",
				"stagingDomain": "staging.example.com"
			},

			"supportedOrientations": [
				"portrait",
				"landscape"
			]
		}, clone(this.manifest)), cb);
	};

	GCPackage.prototype.saveManifest = function (data, cb) {
		this.manifest = data;
		return fs.writeFile(path.join(this.paths.root, 'manifest.json'), serializeConfig(data), cb);
	};

	GCPackage.prototype.saveManifestSync = function (data) {
		this.manifest = data;
		fs.writeFileSync(path.join(this.paths.root, 'manifest.json'), serializeConfig(data));
	};

	/* Resources */

	GCPackage.prototype.listResources = function (exts, next) {
		if (typeof exts == 'function') {
			next = exts; exts = null;
		}
		return listFiles(this.paths.resources, exts, next);
	};

	GCPackage.prototype.listResourcesSync = function (exts, next) {
		if (typeof exts == 'function') {
			cb = exts; exts = null;
		}
		return listFilesSync(this.paths.resources, exts);
	};

	GCPackage.prototype.listImages = function(cb) {
		return listFiles(this.paths.resources, ['png', 'jpg', 'jpeg', 'bmp', 'gif'], cb);
	};

	GCPackage.prototype.listImagesSync = function(cb) {
		return listFilesSync(this.paths.resources, ['png', 'jpg', 'jpeg', 'bmp', 'gif']);
	};

	GCPackage.prototype.listSounds = function(cb) {
		return listFiles(this.paths.resources, ['mp3', 'ogg'], cb);
	};

	GCPackage.prototype.listSoundsSync = function(cb) {
		return listFilesSync(this.paths.lang, ['mp3', 'ogg']);
	};

	GCPackage.prototype.listConfig = function(cb) {
		return listFiles(this.paths.resources, ['json'], cb);
	};

	GCPackage.prototype.listConfigSync = function(cb) {
		return listFilesSync(this.paths.resources, ['json']);
	};

	/* Scripts */

	GCPackage.prototype.listScripts = function(cb) {
		return listFiles(this.paths.shared, ['js'], cb);
	};

	GCPackage.prototype.listScriptsSync = function(cb) {
		return listFilesSync(this.paths.shared, ['js']);
	};

	GCPackage.prototype.walkScript = function(path, opts, cb) {
		var ret;
		if (typeof opts === 'function') {
			cb = opts;
			opts = null;
		}
		ret = new EventEmitter();
		fs.readFile(path, 'utf-8', function(err, code) {
			var out;
			try {
				out = falafel(sanitizeCode(code), function(node) {
					return ret.emit('node', node);
				});
			} catch (e) {
				out = code;
			}
			return ret.emit('end', unsanitizeCode(out));
		});
		if (cb != null) {
			collector(ret, 'node', function(node) {
				return node;
			}).collect(cb);
		}
		return ret;
	};

	GCPackage.prototype.rewriteScript = function(path, opts, cb) {
		if (cb == null) {
			cb = null;
		}
		if (typeof opts === 'function') {
			cb = opts;
			opts = null;
		}
		return this.walkScript(path, opts).on('end', function(code) {
			return fs.writeFileSync(path, code, cb);
		});
	};

	/* Translations */

	GCPackage.prototype.getDefaultLanguage = function() {
		return this.getManifestKey('defaultLang', 'en');
	};

	GCPackage.prototype.listTranslations = function(cb) {
		return listFiles(this.paths.lang, ['json'], cb);
	};

	GCPackage.prototype.listTranslationsSync = function(cb) {
		return listFilesSync(this.paths.lang, ['json']);
	};

	GCPackage.prototype.getTranslation = function(code, cb) {
		try {
			return fs.readFile(path.join(this.paths.lang, code + ".json"), function(err, data) {
				return data ? cb(JSON.parse(data)) : cb(null);
			});
		} catch (e) {
			return cb(null);
		}
	};

	GCPackage.prototype.getTranslationSync = function(code, cb) {
		try {
			var data = fs.readFileSync(path.join(this.paths.lang, code + ".json"));
			return data ? JSON.parse(data) : null;
		} catch (e) {
			return null;
		}
	};

	GCPackage.prototype.removeTranslation = function(code, cb) {
		fs.unlink(path.join(this.paths.lang, code + ".json"), cb);
	};

	GCPackage.prototype.removeTranslationSync = function(code, cb) {
		fs.unlinkSync(path.join(this.paths.lang, code + ".json"));
		return true
	};

	GCPackage.prototype.saveTranslation = function(code, json, cb) {
		wrench.mkdirSyncRecursive(this.paths.lang);
		return fs.writeFile(path.join(this.paths.lang, code + ".json"), serializeConfig(json), cb);
	};

	GCPackage.prototype.saveTranslationSync = function(code, json) {
		wrench.mkdirSyncRecursive(this.paths.lang, 0777);
		fs.writeFileSync(path.join(this.paths.lang, code + ".json"), serializeConfig(json));
		return true
	};

	GCPackage.prototype.getID = function () {
		return this.manifest.shortName || this.manifest.appID;
	}

	GCPackage.prototype.toJSON = function () {
		return {
				"id": this.getID(),
				"paths": this.paths,
				"manifest": this.manifest,
				"title": this.manifest.title,
				"url": "/simulate/" + this.getID() + "/"
			};
	}

	return GCPackage;

})();

exports.load = function(path) {
	return new GCPackage(path);
};

exports.getProject = function (path, next) {
	var package = new GCPackage();
	package.load(path, next);
}
