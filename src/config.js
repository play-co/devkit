var EventEmitter = require('events').EventEmitter;
var fs = require('./util/fs');
var path = require('path');
var logging = require('./util/logging');
var stringify = require('./util/stringify');
var pathExtra = require('path-extra');

/**
 * Make sure the directory and file for the config.json exists
 */

function ensureConfigExists (configPath) {
  if (!fs.existsSync(configPath)) {
    var dirname = path.dirname(configPath);
    if (!fs.existsSync(dirname)) {
      fs.ensureDirSync(dirname);
    }

    fs.writeFileSync(configPath, '{}', 'utf8');
  }
}

// create a singleton object for the config
//   emits 'change' events when listening for config.json file changes
var Config = Class(EventEmitter, function () {
  var logger = logging.get('devkit-config');
  var CONFIG_PATH = path.join(pathExtra.datadir(process.title), 'config.json');

  this.init = function () {
    EventEmitter.call(this);

    process.on('exit', this.stopWatch.bind(this));

    ensureConfigExists(CONFIG_PATH);

    // initial reading of config.json can happen synchronously using require
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        var contents = fs.readFileSync(CONFIG_PATH, 'utf8');
        if (contents) {
          this._config = JSON.parse(contents);
        }
      }
    } catch (e) {
      logger.error('error parsing', CONFIG_PATH);
      logger.log('overwriting config.json...');
    }

    if (typeof this._config !== 'object') {
      this._config = {};
    }

    this._writeCbs = [];

    // write config.json if it doesn't exist the first time
    if (!fs.existsSync(CONFIG_PATH)) {
      this._write();
    }
  };

  // called to re-read the config.json file
  this.reload = function () {
    fs.readFile(CONFIG_PATH, 'utf8', function (err, data) {
      if (data) {
        try {
          data = JSON.parse(data);
        } catch (e) {
          logger.error('unable to parse config.json', e);
        }

        if (stringify(this._config) !== stringify(data)) {
          logger.log('reloading config');
          this._config = data;
          this.emit('change');
        }
      }
    }.bind(this));
  };

  // get a property from the config file
  //
  // Note: nested keys can be accessed using dots or colons,
  //       e.g. get('foo.bar') or get('foo:bar')
  this.get = function (key) {
    var pieces = (key || '').split(/[.:]/);
    var data = this._config;
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
    var data = this._config;
    var i = 0;
    while (pieces[i + 1]) {
      if (!data[pieces[i]]) {
        data[pieces[i]] = {};
      }

      data = data[pieces[i]];
      ++i;
    }

    if (stringify(data[pieces[i]]) !== stringify(value)) {
      data[pieces[i]] = value;
      this._scheduleWrite(cb);
    }
  };

  this._scheduleWrite = function (cb) {
    if (!this._isScheduled) {
      this._isScheduled = true;
      process.nextTick(this._write.bind(this));
    }

    this._writeCbs.push(cb);
  };

  // async-safe write using a callback queue
  // callbacks will not fire until all pending writes complete
  this._failCount = 0;
  this._write = function () {
    this._isScheduled = false;

    try {
      fs.writeFileSync(CONFIG_PATH, stringify(this._config));

      // reset fail count
      this._failCount = 0;
      if (this._writeCbs.length) {
        var cbs = this._writeCbs;
        this._writeCbs = [];
        cbs.forEach(function (cb) {
          cb && cb();
        });
      }
    } catch (e) {
      if (e.code === 'EACCES') {
        ++this._failCount;
        if (this._failCount < 10) {
          setTimeout(this._scheduleWrite.bind(this), 100);
        }
      }
    }
  };

  this.startWatch = function () {
    if (!this._watcher) {
      // persistent: false -- don't prevent DevKit from exiting while this file
      // is being watched
      this._watcher = fs.watch(CONFIG_PATH, {persistent: false});
      this._watcher.on('change', this.reload.bind(this));
    }
  };

  // stop watching config.json
  this.stopWatch = function () {
    if (this._watcher) {
      this._watcher.close();
    }
  };
});

module.exports = new Config();
