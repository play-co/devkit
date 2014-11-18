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
var fs = require('fs');
var path = require('path');

exports.BaseCommand = Class(function () {

  this.name = '';
  this.description = '';

  this.init = function () {

    // strip off executable if it matches node|nodejs
    var executable = path.basename(process.argv[0]);
    if (executable === 'node' || executable === 'nodejs') {
      process.argv.shift();
    }

    this.opts = require('optimist')(process.argv);
    this.logger = logging.get(this.name);
  };

  this.showHelp = function () {
    console.log('devkit', this.name + ':', this.description);
    console.log();
    this.opts.showHelp();
  };

  this.exec = function (command, args, cb) {
    // to implement
  };
});

/**
 * @class UsageError
 */

function UsageError (message) {
  this.message = message;
  this.name = 'UsageError';
  Error.captureStackTrace(this, UsageError);
}

UsageError.prototype = Object.create(Error.prototype);
UsageError.prototype.constructor = UsageError;

exports.UsageError = UsageError;
