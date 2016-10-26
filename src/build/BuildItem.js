'use strict';


class BuildItem {
  constructor (buildQueue, appPath, buildOpts) {
    this.buildQueue = buildQueue;
    this.appPath = appPath;
    this.buildOpts = buildOpts;

    this.onComplete = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });

    this.done = false;
  }

  getArgs () {
    return JSON.stringify({
      appPath: this.appPath,
      buildOpts: this.buildOpts
    });
  }

  equals (buildItem) {
    return this.appPath === buildItem.appPath
        && this.buildOpts.target === buildItem.buildOpts.target;
  }

  /**
   * @protected
   */
  pOnFail () {
    if (this.done) { return; }

    this._reject({ message: 'build failed' });

    this.done = true;
    if (this._onStop) {
      this._onStop();
    }

    this.buildQueue.checkQueue();
  }

  /**
   * @protected
   */
  pOnComplete (err, res) {
    this.done = true;
    if (this._onStop) {
      this._onStop();
    }

    if (err) {
      this.error = err;
      this._reject(this.error);
    } else {
      this._resolve(res);
    }

    this.buildQueue.checkQueue();
  }

  /**
   * @return {Promise}
   */
  run () {}

  /**
   * @return {Promise}
   */
  cancel () {}
}


module.exports = BuildItem;
