#!/usr/bin/env sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

/** @license
 * This file is part of the Game Closure SDK.
 *
 * The Game Closure SDK is free software: you can redistribute it and/or modify
 * it under the terms of the Mozilla Public License v. 2.0 as published by
 * Mozilla.
 *
 * The Game Closure SDK is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * Mozilla Public License v. 2.0 for more details.
 *
 * You should have received a copy of the Mozilla Public License v. 2.0
 * along with the Game Closure SDK.  If not, see <http://mozilla.org/MPL/2.0/>.
 */

process.title = 'devkit';

/**
 * Command line interface.
 */

/* jshint -W020 */
require('jsio');
/* jshint +W020 */

require('./globals');

/**
 * Module API.
 */

// Command line invocation.
if (require.main === module) {
  main();
}

function main () {
  var commands = require('./commands');
  var argv = commands.argv;
  var args = argv._;

  var name;

  if (argv.help) {
    name = 'help';
  } else if (commands.has(args[0])) {
    name = args.shift();
  } else if (argv.version) {
    name = 'version';
  } else if (argv.info) {
    name = 'info';
  } else {
    name = 'help';
  }

  var command = commands.get(name);
  command.exec(name, args);
}
