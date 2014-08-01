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

var exec = require('child_process').exec;
var logging = require('./logging');

exports.BaseCommand = Class(function () {

  this.name = '';
  this.description = '';

  this.init = function () {
    this.opts = require('optimist')(process.argv);
    this.logger = logging.get(this.name);
  }

  this.showHelp = function () {
    console.log("devkit", this.name + ":", this.description);
    console.log();
    this.opts.showHelp();
  }

  this.onCommand = function (commands) {
    var next = this.exec.bind(this, commands);
    if (this.autoRegister) {
      this.util.autoRegister(next);
    } else {
      next();
    }
  }

  this.exec = function (commands) {
    // to implement
  }

  // useful util functions shared between commands
  this.util = {
    autoRegister: function (cb) {
      cb();
    },
    ensureLocalProject: function () {
      if (!fs.existsSync('./manifest.json')) {
        console.error(clc.red('ERROR: '), 'Basil started in non-GC project folder, aborting.');
        process.exit(2);
      }
    },
    ensureJava: function (cb) {
      // Try to run Java. In OS X, you'll be prompted to install Java on first
      // run if you haven't installed it yet.
      exec('java -version', function (error, stdout, stderr) {
        if (error) {
          console.log(clc.red('ERROR:'), 'Java is required in order to run DevKit.');
          process.exit(2);
        } else {
          cb();
        }
      });
    }
  };

});
