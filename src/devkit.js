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

var commandNames = ['debug', 'new', 'open', 'serve', 'help', 'version'];

process.title = "devkit";
process.opts = require("optimist").argv;

/**
 * Command line interface.
 */

require = require('jsio');
require('./globals');

var path = require('path');
var clc = require('cli-color');
var printf = require('printf');

var logging = require('./util/logging');

var logger = logging.get('devkit');

process.on('uncaughtException', function (e) {
	console.error(e, e.stack);
	process.exit(1);
});

/**
 * Module API.
 */

// Command line invocation.
if (require.main === module) {
	main();
}

function main () {
	var optimist = require('optimist');
	var commands = {};
	var usage = [];

	// get all commands and their descriptions
	commandNames.forEach(function (name) {
		var Command = require('./commands/' + name);
		if (typeof Command == 'function') {
			var cmd = commands[name] = new Command();

			// setup a single or array of aliases (e.g. "--version" and "-v" for the "version" command)
			if (cmd.alias) {
				var isArray = Array.isArray(cmd.alias);
				var first = isArray ? cmd.alias[0] : cmd.alias;
				optimist.boolean(first, cmd.description);
				if (isArray) {
					cmd.alias.slice(1).forEach(function (alias) {
						optimist.alias(alias, first);
					});
				}
			}

			usage.push(printf('  %-10s %s', cmd.name, cmd.description));
		}
	});

	var usageStr = "usage: devkit [--version] [--help] <command> [<args>]\n\n"
		+ "available commands:\n" + usage.join('\n') + "\n\n"
		+ "See 'devkit help <command> to read about a specific command";

	var argv = optimist.usage(usageStr).argv;
	var args = argv._;

	var name;
	if (args[0] && (args[0] in commands)) {
		name = args.shift();
	} else if (argv.version) {
		name = 'version';
	} else {
		name = 'help';
	}

	try {
		commands[name].exec(commands, args);
	} catch (e) {
		if (commands[name].logger) {
			commands[name].logger.error(e);
		} else {
			console.log(e);
		}

		// exit immediately so that this error isn't hidden by future errors
		process.exit(1);
	}
}
