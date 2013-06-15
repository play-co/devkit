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

process.title = "basil";
process.opts = require("optimist").argv;

/**
 * Command line interface.
 */

/* Initialize js.io environment for all modules.
 * Needs to be initialised first because it installs some globals used in
 *  some modules. This way each module uses the same jsio env.
 */
var jsio = require(require('./common').paths.sdk('jsio/jsio'));
jsio('from base import *');
jsio.path.add(require('./common').paths.root('src'));

//non-local modules
var spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');
var ff = require('ff');
var clc = require('cli-color');
var wrench = require('wrench');

//local modules
// Load common module and ecmascript 5 polyfills.
var common = require('./common');
common.polyfill();

var logger = new common.Formatter("basil");

// Display the glorious SDK header.
function displayHeader () {
	var opts = [
		"Mobile social platform html5 javascript multiplayer game platform!",
		"camelCase or __score__?",
		"absolutely no jquery (only sizzle).",
		"First games. Then freeways. Then the USA.",
		"Building a time machine, one function at a time.",
		"Monkey see monkey do...",
		"Coffee and cheerios.",
		"Did you run submodule update? Sometimes that fixes it.",
		"Like fireworks in a shed.",
		"throw new NotAndWillNeverBeImplementedException()",
		"Now we know. Noooow we know. We know now.",
		"Hate the game.",
		"Syms and shims",
		"Zoinks!",
		"Using DHTML technologies",
		"Life is squill.Pane",
		"Needs more ketchup."
	].sort(function () { return Math.random() - 0.5; });

	var version = common.sdkVersion.toString();
	var versionLength = version.length; //clc adds escape chars
	version = clc.yellow(version);

	var colouredGCText = clc.white.bright("{{") + clc.cyan.bright(" Game Closure SDK ") + clc.white.bright("}}");
	console.log([
		"============================================================",
		"                   " + colouredGCText + "                   ",
		"                                                            ".substr(0, (60-versionLength)/2) + version,
		"                                                            ".substr(0, (60-opts[0].length)/2) + opts[0],
		"------------------------------------------------------------",
		""].join('\n'));
}

// this should be removed and replaced with local pho usage
function ensureLocalProject () {
	if (!fs.existsSync('./manifest.json')) {
		console.error(clc.red('ERROR: '), 'Basil started in non-GC project folder, aborting.');
		process.exit(2);
	}
}

// Java is only prompted to be installed on OS X when you first run it.
// Let's run Java from the command line
function ensureJava (next) {
	common.child('java', ['-version'], {
		silent: true,
		silentErr: true
	}, function (err) {
		if (err) {
			console.log(clc.red('ERROR:'), 'Java is required in order to run this basil command.');
			process.exit(2);
		}
		next();
	});
}

function printHelp () {
	console.log([
		"basil [command]",
		"  about",
		"  build {target}",
		"  serve",
		"  testapp",
		"  init {name}",
		"  register",
		"  unregister",
		"  clean-register",
		"  install {addon}",
		"  update",
		"",
		"For command-specific help, type basil help [command].",
		""].join('\n'));
}

function commandHelp (command) {
	
	switch (command) {
		case 'build':
			console.log([
				"Builds a packaged game for the platform you specify.",
				"  basil build [platform] [--no-compress] [--clean] [--debug]",
				"",
				"Example usage:",
				"  basil build native-android --no-compress",
				"",
				"Platforms:",
				"  native-android",
				"  native-ios",
				/*"  browser-mobile", taking this out until it is supported -cat */
				"  browser-desktop",
				""].join('\n'));
			break;
		case 'serve':
			console.log([
				"Serves the basil web interface to (by default) http://localhost:9200.",
				"  basil serve [-p | --port PORT] [--production]",
				"",
				"Example usage:",
				"  basil serve -p 8080",
				"",
				"Flags:",
				"  -p --port    Specify the port to serve on. (Default 9200)",
				"  --production Specify that we should use production servers.",
				"",
				"Further information:",
				"  If basil serve is run from within a directory, it will attempt to automatically register",
				"  that directory.",
				""].join('\n'));
			break;
		case 'testapp':
			console.log([
				"Launches a Test App on a connected mobile device.",
				"  basil testapp [target]",
				"",
				"Example usage:",
				"  basil testapp native-ios",
				"",
				"Further information:",
				"  Run basil testapp without arguments to see a list of valid targets.",
				""].join('\n'));
			break;
		case 'register':
			console.log([
				"Adds a directory (or directories), if it is a game project, to the web interface.",
				"  basil register [path(s)]",
				"",
				"Example usage:",
				"  basil register ./projects/myGameProject",
				"",
				"Further information:",
				"  With no arguments, this attempts to register the current project.",
				"  If there is no properly formatted manifest.json in the target directory,",
				"  this will fail.",
				"  Registering a project means that it will display in the web interface's Projects pane.",
				"  Running basil serve within a project will automatically register that project.",
				"  If you see errors with the project registry, try running basil clean-register.",
				""].join('\n'));
			break;
		case 'unregister':
			console.log([
				"Removes a directory (or directories) from the basil registry.",
				"  basil unregister [path(s)]",
				"",
				"Example usage:",
				"  basil unregister ./projects/myGameProject",
				"",
				"Further information:",
				"  This is the counterpart to basil register.",
				"  You may not ever need to use this.",
				"  If you see errors with the project registry, try running basil clean-register.",
				""].join('\n'));
			break;
		case 'clean-register':
			console.log([
				"Removes all invalid projects from the basil registry.",
				"  basil clean-register",
				"",
				"Example usage:",
				"  basil clean-register",
				"",
				"Further information:",
				"  This removes invalid projects from the basil registry. This includes projects with",
				"  incorrect or missing manifest.json files and directories that no longer exist.",
				"  This is the first line of defence against registry errors. If this did not fix your error,",
				"  attempt viewing the registry yourself at $your_basil_root/config.json. In particular, check",
				"  for malformed JSON.",
				""].join('\n'));
			break;
		case 'init':
			console.log([
				"Initialise a new project either in the current directory or in the path specified.",
				"  basil init [path] [-t | --template TEMPLATE]",
				"",
				"Example usage:",
				"  basil init ./projects/myNewProject",
				"",
				"Templates:",
				"  empty",
				"  stackview",
				"",
				"Further information:",
				"  The shortName of the new game is generated from the path supplied.",
				"  This also automatically runs basil register.",
				""].join('\n'));
			break;
		default:
			console.log("There's no help for " + command + ".");
	}

	process.exit(0);
}

function initAddons (cb) {
	require('./AddonManager').scanAddons(cb);
}

function initBuild (cb) {
	require(common.paths.lib('timestep', 'build')).init(require('./build'), cb);
}

/**
 * Module API.
 */

// Command line invocation.
if (require.main === module) {
	var f = ff(function () {
		initAddons(f());
	}, function () {
		initBuild(f());
	}).success(main)
		.error(function (err) {
			logger.error('Error initializing basil:');
			console.error(err);
		});
}

function main () {
	var cmd = process.argv[2];

	switch (cmd) {
		case 'version':
		case '-v':
		case '--version':
			console.log(clc.yellow(common.sdkVersion));
			break;

		case 'serve':
			displayHeader();
			// Launch the server.
			var f = ff(this, function() {
				ensureJava(f());
			}, function() {
				require('./serve').cli();
			}).error(function (e) {
				logger.error(e);
			});
			break;
		
		case 'testapp':
			require('./testapp').launch(process.argv.splice(3));
			break;

		case 'about':
			require('./about/about').about();
			break;

		case 'init':
			require('./init').init(process.argv.splice(3));
			break;

		case 'update':
			require('./update/update').update();
			return;

		case 'contribute':
			require('./contribute').main(process.argv.splice(3));
			return;

		case 'debug':
		case 'release':
		case 'build':
			ensureLocalProject();
			var f = ff(this, function () {
				ensureJava(f());
			}, function () {
				require('./build').exec(process.argv.slice(3), {
					template: cmd, // debug/release/build
					android: common.config.get('android'),
					ios: common.config.get('ios'),
					sdk: common.paths.sdk()
				});
			}).error(function(e) {
				logger.err(e);
			});
			break;

		case 'which':
			console.log(common.paths.root());
			break;

		case 'compile':
			require('./compile');
			break;

		case 'deploy':
			ensureLocalProject();
			require('./deploy').deploy(process.argv[3]);
			break;

		case 'reinstall':
			ensureLocalProject();
			require('./reinstall').reinstall();
			break;

		case 'register':
			require('./register').register(process.argv[3] || '.', true);
			break;
			
		case 'unregister':
			require('./register').unregister(process.argv[3] || '.');
			break;
	
		case 'clean-register':
			require('./register').clean();
			break;

		case 'clean':
			ensureLocalProject();
			wrench.rmdirSyncRecursive('./build', true);
			console.log('Build directory cleaned.');
			break;

		case '-h':
		case 'help':
			if (process.argv[3]) {
				commandHelp(process.argv[3]);
			} else {
				printHelp();
				//process.exit(0);
			}
			break;

		case "install":
			require('./install').install(process.argv[3]);
			break;

		case "uninstall":
			require('./install').uninstall(process.argv[3]);
			break;
		
		//invaild command, print help
		default:
			printHelp();
			process.exit(2);
	}
}
