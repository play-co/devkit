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
    this.opts = require('optimist')(process.argv);
    this.logger = logging.get(this.name);
  };

  this.showHelp = function () {
    console.log('devkit', this.name + ':', this.description);
    console.log();
    this.opts.showHelp();
  };

  this.exec = function (args, cb) {
    // to implement
  };
});
