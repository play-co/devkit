#!/usr/bin/env node

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
var optimist = require('optimist');
var wrench = require('wrench');
var clc = require('cli-color');

var common = require('../common');
var logger = new common.Formatter('build');

var jvmtools = require('./jvmtools');
var compile = require('./compile');
var packager = require('./packager');
var strings = require('./strings');

var packageManager = require("../PackageManager");

/**
 * Configuration.
 */

var CREATE_SYMLINK = true;

/**
 * Module API.
 */
 
function createSDKSymlink (dir, next) {
	var from = common.paths.sdk(), to = path.join(dir, './sdk');

	// If a symlink exists, check that it points to the right location.
	try {
		if (!fs.lstatSync(to).isSymbolicLink()) {
			logger.error('File', to, 'is not a symlink. Please remove this file and retry.');
			process.exit(2);
		}

		fs.readlink(to, function (err, link) {
			if (path.resolve(dir, link) == fs.realpathSync(from)) {
				next();
			} else {
				logger.log('Relinking ./sdk'); 
				fs.unlinkSync(to);
				fs.symlink(from, to,'junction', next);
			}
		});
	} catch (e) {
		if (e.code == "ENOENT") {
			logger.log('Creating symlink ./sdk'); 
			fs.symlink(from, to, 'junction', next);
		} else {
			logger.warn('Unexpected exception trying to create a symlink at', to);
			console.error(e);
		}
	}
}

var targetNames = ['native-android', 'native-ios', /*'browser-mobile',*/ 'browser-desktop'];

function build (dir, target, opts, next) {
	var project = packageManager.load(dir);

	//create a path based on the target (debug/release)
	var releasePath = path.join(opts.debug ? 'debug' : 'release', target);
	logger.log(clc.yellow.bright('Building:'), releasePath);

	// URL for API requests
	if (!opts.servicesURL) {
		var servers = {
			dev: "http://dev.api.gameclosure.com",
			staging: "http://staging.api.gameclosure.com",
			prod: "http://api.gameclosure.com"
		};

		if (opts.serverDebug) {
			opts.servicesURL = servers.dev;
		} else if (opts.stage) {
			opts.servicesURL = servers.staging;
		} else {
			opts.servicesURL = servers.prod;
		}
	}

	if (opts.outputDir) {
		opts.buildPath = path.resolve(project.paths.root, opts.outputDir);
	} else {
		opts.buildPath = path.join(project.paths.root, 'build', releasePath);
	}

	if (CREATE_SYMLINK) {
		createSDKSymlink(dir, runBuild)
	} else {
		runBuild();
	}

	function runBuild () {
		//pull out target information
		var targetSplat = target.split("-");
		var supTarget = targetSplat[0];
		var subTarget = targetSplat[1] || targetSplat[0];

		var buildTargets = exports.getTargets();

		if (exports.isTargetAvailable(supTarget)) {
			// if target has been registered
			require(buildTargets[supTarget])
				.build(exports, project, subTarget, opts, next);
		} else {
			logger.error('Invalid build target');
			console.log(supTarget, buildTargets);
			next(1);
		}
	}
}

//commandline interface
//parses args and passes them into buid
function exec (args, config, next) {
	var Optimist = require('optimist');

	var optimistParser = new Optimist(args)
		.boolean('debug')
			.default('debug', config.template !== "release")
			.describe('debug', '[native] builds a version with debugging support')

		.boolean('compress')
			.default('compress', config.template !== "debug")
			.describe('compress', '[js] minifies JavaScript files')
		
		.boolean('stage')
			.default('stage', false)
			.describe('stage', '[server] use the staging server')

		.boolean('serverDebug')
			.default('serverDebug', false)
			.describe('serverDebug', '[server] internal use only')

		.string('servicesURL')
			.describe('servicesURL', '[server] internal use only')

		.string('outputDir')
			.alias('outputDir', 'o')
			.describe('outputDir', '[sdk] ')

		.boolean('isSimulated')
			.default('isSimulated', false)
			.describe('isSimulated', '[sdk] internal use only')

		.usage('Usage: ' + clc.green.bright('basil build') + clc.yellow.bright(' [target]\n\n')
			+ 'where ' + clc.yellow.bright('[target]') + ' is one of:\n\n'
			+ '\t' + targetNames.join('\n\t'));

	var argv = optimistParser.argv;
	var target = argv._[0] && argv._[0].toLowerCase();
	if (!target || targetNames.indexOf(target) == -1) {

		if (!target) {
			logger.error('no target provided\n');
		} else {
			logger.error('"' + clc.yellow.bright(target) + '" is not a valid target\n');
		}

		optimistParser.showHelp();
		next && next();
		return;
	}

	common.startTime('build');

	argv.template = config.template;

	build('.', target, argv, function (failed) {
		
		if (!failed) {
			logger.log('\nFinished building.');
			common.endTime('build');
		}

		jvmtools.stop(next || function () { });
		if(next) next(failed);
		else process.exit(failed ? 2 : 0);
	});
}

/**
 * Module API.
 */

var _queue = new common.BuildQueue();
exports.build = function (dir, target, opts, next) {
	_queue.add(bind(this, build, dir, target, opts), next);
};
exports.exec = exec;
exports.common = common;
exports.packager = packager;
exports.jvmtools = jvmtools;
exports.strings = strings;
exports.git = require("./git");

exports.JsioCompiler = compile.JsioCompiler;

var _targets = {};
exports.registerTarget = function (target, path) {
	_targets[target] = path;
}

exports.getTargets = function () {
	return _targets;
}

exports.isTargetAvailable = function (target) {
	var pieces = target.split('-');
	var supTarget = pieces[0];
	return _targets.hasOwnProperty(supTarget) || _targets.hasOwnProperty(target);
}

if (require.main === module) {
	// Invoke the command line.
	exec(process.argv.slice(2));
}
