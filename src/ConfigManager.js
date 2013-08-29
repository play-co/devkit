var fs = require('fs');
var common = require('./common');
var PubSub = common.jsio("import lib.PubSub");

// create a singleton object for the config
//   emits 'change' events when listening for config.json file changes
var ConfigManager = module.exports = Class(PubSub, function () {
	var logger = new common.Formatter('devkit-config');
	var CONFIG_PATH = common.paths.root('config.json');
	var _config;

	this.init = function () {
		process.on('exit', bind(this, 'stopWatch'));

		// initial reading of config.json can happen synchronously using require
		try {
			_config = require(CONFIG_PATH);
		} catch (e) {
			if (e.code != 'MODULE_NOT_FOUND') {
				logger.error("Error loading", CONFIG_PATH);
				if (e instanceof SyntaxError) {
					if (fs.readFileSync(CONFIG_PATH) == "") {
						logger.warn("Your config.json was an empty file! Writing a new one...")
					} else {
						logger.error("Syntax error parsing JSON.");
						process.exit(1);
					}
				} else {
					logger.error(e);
				}
			}

			_config = {};
		}

		this._writeCbs = [];

		// write config.json if it doesn't exist the first time
		if (!fs.existsSync(CONFIG_PATH)) {
			this.write();
		}

	}

	// called to re-read the config.json file
	this.reload = function () {
		console.log("RELOADING CONFIG")
		fs.readFile(CONFIG_PATH, 'utf8', bind(this, function (err, data) {
			if (data) {
				try {
					_config = JSON.parse(data);
				} catch (e) {
					logger.error('unable to parse config.json', e);
				}

				this.emit('change');
			}
		}));
	}

	// get a property from the config file
	//
	// Note: nested keys can be accessed using dots or colons,
	//       e.g. get('foo.bar') or get('foo:bar')
	this.get = function (key) {
		var pieces = (key || '').split(/[.:]/);
		var data = _config;
		var i = 0;
		while (pieces[i]) {
			if (!data) { return undefined; }

			data = data[pieces[i]];
			++i;
		}
		return data;
	};

	// set a property in the config file
	// see note in `get()`
	this.set = function (key, value, cb) {
		var pieces = (key || '').split(/[.:]/);
		var data = _config;
		var i = 0;
		while (pieces[i + 1]) {
			if (!data[pieces[i]]) {
				data[pieces[i]] = {};
			}

			data = data[pieces[i]];
			++i;
		}

		if (data[pieces[i]] !== value) {
			data[pieces[i]] = value;
			this._scheduleWrite(cb);
		}
	};

	this._scheduleWrite = function (cb) {
		if (!this._isScheduled) {
			this._isScheduled = true;
			process.nextTick(bind(this, '_write'));
		}

		this._writeCbs.push(cb);
	};

	// async-safe write using a callback queue
	// callbacks will not fire until all pending writes complete
	this._write = function () {
		this._isScheduled = false;
		
		// schedule the callback
		fs.writeFileSync(CONFIG_PATH, JSON.stringify(_config, null, '\t'), 'utf8');

		if (this._writeCbs.length) {
			var cbs = this._writeCbs;
			this._writeCbs = [];
			cbs.forEach(function (cb) {
				cb && cb();
			});
		}
	};

	this.startWatch = function () {
		if (!this._watcher) {
			// persistent: false -- don't prevent DevKit from exiting while this file is being watched
			this._watcher = fs.watch(CONFIG_PATH, {persistent: false});
			this._watcher.on('change', bind(this, 'reload'));
		}
	};

	// stop watching config.json
	this.stopWatch = function () {
		if (this._watcher) {
			this._watcher.close();
		}
	};
});
