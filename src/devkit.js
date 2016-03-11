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

require('jsio');

var main = function() {
  // preliminary logging and globals setup //
  var commands = require('devkit-commands');
  var argv = commands.argv;
  var args = argv._;

  if (argv.trace) {
    process.env.DEVKIT_TRACE = true;
    process.DEVKIT_TRACE_NAMES = argv.trace;
  }

  require('./globals');

  var logging = require('./util/logging');
  if (argv.verbose > 0) {
    logging.setDefaultLevel(logging.getDefaultLevel() + argv.verbose);
  }

  var logger = logging.get('devkit.main');
  logger.silly('Main called; getting command:\nargv', argv, '\nargs ', args);
  // ---- //

  var path = require('path');
  var cache = require('./install/cache');
  var apps = require('./apps');

  return Promise.all([
    cache.loadCache(),
    commands.initCommands(path.join(__dirname, 'commands')),
    apps.reload()
  ]).then(function() {
    // Now kick off command handling
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

    return commands.run(name, args).then(function() {
      // TODO: shouldnt need this...
      // Possibly a result of https://github.com/nodegit/nodegit/issues/866
      logger.silly('Command run complete', arguments);
      process.exit(0);
    }, function(e) {
      logger.error('Uncaught error in command execution', e);
      process.exit(1);
    });
  });
};


if (require.main === module) {
  // Command line invocation.
  main();
} else {
  // Import setup
  require('./globals');
}
