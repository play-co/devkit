'use strict';
const childProcess = require('child_process');
const path = require('path');

const Promise = require('bluebird');

const logging = require('../util/logging')

const BuildItem = require('./BuildItem');
const build = require('./index');


const logger = logging.get('ForkBuildItem');


const clone = (o) => JSON.parse(JSON.stringify(o));


class InlineBuilder extends BuildItem {
  constructor (buildQueue, appPath, buildOpts) {
    super(buildQueue, appPath, buildOpts);
    this._build = null;
  }

  run () {
    logger.log('starting build', this.appPath, this.buildOpts.target);

    try {
      build.build(
        clone(this.appPath),
        clone(this.buildOpts),
        (err, res) => {
          this.pOnComplete(err, res)
        }
      );
    } catch (err) {
      console.error('Inline build failed!');
      console.error(err.stack);

      this._reject({ message: 'build failed' });
      this.done = true;
    }
  }

  cancel () {
    throw new Error('TODO');
    // return new Promise((resolve, reject) => {
    //   if (this.done) {
    //     resolve();
    //   } else if (!this._build) {
    //     reject({ message: 'not building' });
    //   } else {
    //     this._onStop = resolve;
    //     this._build.send('stop');
    //   }
    // })
    // .timeout(5000)
    // .bind(this)
    // .catch(Promise.TimeoutError, () => {
    //   logger.warn('build did not stop, killing...');
    //   this._build.kill('SIGKILL');
    // });
  }
}


module.exports = InlineBuilder;
