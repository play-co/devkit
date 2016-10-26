'use strict';
const childProcess = require('child_process');
const path = require('path');

const Promise = require('bluebird');

const logging = require('../util/logging')

const BuildItem = require('./BuildItem');


const logger = logging.get('ForkBuildItem');

const buildFork = path.resolve(__dirname, './fork');


class ForkBuilder extends BuildItem {
  constructor (buildQueue, appPath, buildOpts) {
    super(buildQueue, appPath, buildOpts);
    this._build = null;
  }

  run () {
    var args = this.getArgs();

    logger.log('starting build', this.appPath, this.buildOpts.target);

    this._build = childProcess.fork(buildFork, [(args)])
      .on('message', this._onFinish.bind(this))
      .on('close', this._onClose.bind(this));
  }

  cancel () {
    return new Promise((resolve, reject) => {
      if (this.done) {
        resolve();
      } else if (!this._build) {
        reject({ message: 'not building' });
      } else {
        this._onStop = resolve;
        this._build.send('stop');
      }
    })
    .timeout(5000)
    .bind(this)
    .catch(Promise.TimeoutError, () => {
      logger.warn('build did not stop, killing...');
      this._build.kill('SIGKILL');
    });
  }

  _onFinish (msg) {
    this.pOnComplete(msg.err, msg.res);
  }

  _onClose () {
    // if the fork terminated normally, done will be true here
    this.pOnFail();
  }
}


module.exports = ForkBuilder;
