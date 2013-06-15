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

var path = require('path');
var fs = require('fs');
var ff = require('ff');
var optimist = require('optimist');
var wrench = require('wrench');
var clc = require('cli-color');

var common = require('../common');
var logger = new common.Formatter('testapp');

/**
 * Module API.
 */
 
var targetNames = [];
var targetPaths = []; // Path to targets

function testapp(target, opts, next) {
	logger.log(clc.yellow.bright('Launching Test App:'), target);

	common.track("BasilTestApp", {"target":target});

	if (targetNames.indexOf(target) >= 0) {
		require(targetPaths[target]).testapp(common, opts, next);
	} else {
		next(1);
	}
}

function exec(args, config, next) {
	var Optimist = require('optimist');

	var optimistParser = new Optimist(args)
		.usage('Usage: ' + clc.green.bright('basil testapp') + clc.yellow.bright(' [target], ')
			+ 'where ' + clc.yellow.bright('[target]') + ' may be: ' + clc.yellow.bright(targetNames.join(', ')));

	var argv = optimistParser.argv;
	var target = argv._[0] && argv._[0].toLowerCase();
	if (!target || targetNames.indexOf(target) < 0) {
		optimistParser.showHelp();
		next && next();
		return;
	}

	common.startTime('testapp');

	testapp(target, {}, next);
}

/**
 * Module API.
 */

exports.registerTarget = function(target, path) {
	targetNames.push(target);
	targetPaths[target] = path;
}

exports.launch = function(args) {
	var f = ff(this, function () {
		exec(args, {}, f.wait());
	}).error(function(){
	}).cb(function(){
	});
}

exports.isTargetAvailable = function (target) {
	return target && targetNames.indexOf(target) < 0;
}

