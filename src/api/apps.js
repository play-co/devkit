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

var fs = require('fs');
var path = require('path');
var printf = require('printf');
var walk = require('../util/walk').walk;
var EventEmitter = require('events').EventEmitter;
var apps = require('../apps');

/**
 ** WARNING
 **
 ** This file is a public DevKit API file.  Do not remove functionality, or
 ** DevKit extensions will fail.
 **/

/*
 * returns an object describing an app
 */
exports.get = function (app, cb) {
  // get the JSON for this app
  // see toJSON methods for App and Module for API
  cb && cb(null, app && app.toJSON());
}
