var childProcess = require('child_process');
var path = require('path');
var logger = require('../util/logging').get('build-queue');
var buildFork = path.resolve(__dirname, '../build/fork');

var _queue = [];
var _activeBuild = null;

exports.add = function (appPath, buildOpts) {

  var buildItem = new BuildItem(appPath, buildOpts);
  for (var item in _queue) {
    if (item.equals(buildItem)) {
      logger.log(appPath, 'already queued');
      return Promise.resolve(item.onComplete);
    }
  }

  _queue.push(buildItem);

  if (_activeBuild && _activeBuild.equals(buildItem)) {
    logger.log('cancelling build', appPath);
    var buildToCancel = _activeBuild;
    buildToCancel
      .cancel()
      .catch(function (e) {
        console.log(e);
        process.exit();
      })
      .finally(function () {
        if (buildToCancel === _activeBuild) {
          _activeBuild = null;
        }

        console.log('cancelled');
      })
      .finally(checkQueue);
  } else {
    checkQueue();
  }

  return Promise.resolve(buildItem.onComplete);
};

function checkQueue() {
  if (!_activeBuild || _activeBuild.done) {
    _activeBuild = _queue.shift();
    if (_activeBuild) {
      _activeBuild.run();
    }
  }
}

var BuildItem = Class(function () {
  this.init = function (appPath, buildOpts) {
    this.appPath = appPath;
    this.buildOpts = buildOpts;
    this.onComplete = new Promise(function (resolve, reject) {
      this._resolve = resolve;
      this._reject = reject;
    }.bind(this));
  };

  this.equals = function (buildItem) {
    return this.appPath === buildItem.appPath
        && this.buildOpts.target === buildItem.buildOpts.target;
  };

  this.run = function () {
    var args = JSON.stringify({
        appPath: this.appPath,
        buildOpts: this.buildOpts
      });

    logger.log('starting build', this.appPath, this.buildOpts.target);

    this._build = childProcess.fork(buildFork, [(args)])
      .on('message', this._onFinish.bind(this))
      .on('close', this._onClose.bind(this));
  };

  this.cancel = function () {
    return new Promise(function (resolve, reject) {
        if (this.done) {
          resolve();
        } else if (!this._build) {
          reject({message: "not building"});
        } else {
          this._onStop = resolve;
          this._build.send('stop');
        }
      }.bind(this))
      .timeout(5000)
      .bind(this)
      .catch(Promise.TimeoutError, function () {
        logger.warn('build did not stop, killing...');
        this._build.kill('SIGKILL');
      });
  };

  this._onFinish = function (msg) {
    this.done = true;
    if (this._onStop) {
      this._onStop();
    }

    if (msg.err) {
      this.error = msg.err;
      this._reject(this.error);
    } else {
      this._resolve(msg.res);
    }

    checkQueue();
  };

  this._onClose = function () {
    // if the fork terminated normally, done will be true here
    if (this.done) { return; }

    this._reject({message: 'build failed'});
    this.done = true;
    if (this._onStop) {
      this._onStop();
    }

    checkQueue();
  };
});
