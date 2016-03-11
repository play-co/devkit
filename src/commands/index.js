var lazy = require('lazy-cache')(require);
lazy('fs');
lazy('path');
lazy('printf');
lazy('yargs');

lazy('../util/logging', 'logging');

var logger = lazy.logging.get('commands');

var commandNames = [];
var _usage = [];
var _commands = {};
var commandUsages = [];

var loadCommand = function (name) {
  return new Promise(function(resolve, reject) {
    var Command = require('./' + name);

    var aliasNames = [];
    var aliasUsages = [];
    if (typeof Command !== 'function') {
      resolve();
      return;
    }

    var cmd = _commands[name] = new Command();

    // setup a single or array of aliases (e.g. "--version" and "-v" for the "version" command)
    if (cmd.alias) {
      var isArray = Array.isArray(cmd.alias);
      var aliases = cmd.alias;
      if (!isArray) {
        aliases = [aliases];
      }

      for (var i = 0; i < aliases.length; i++) {
        var alias = aliases[i];

        // if alias is an object with description, treat as own command
        if (alias.name && alias.description) {
          var aliasCommand = alias.name;
          var description = alias.description;
          if (!_commands[aliasCommand]) {
            // add alias as a reference to this command
            _commands[aliasCommand] = cmd;

            // build usage string and add to alias usage list
            aliasUsages.push(alias);
          }

        } else {
          // add alias for command name
          lazy.yargs.alias(name, alias);

          // add to list of alias names
          aliasNames.push(alias);
        }
      }
    }

    // create "command name (aliases)" string
    var commandName = cmd.name;
    if (aliasNames.length > 0) {
      commandName += ", " + aliasNames.join(', ');
    }
    // create usage data
    commandUsages.push({name: commandName, description: cmd.description});

    // add alias command usages after the main command
    if (aliasUsages.length > 0) {
      commandUsages = commandUsages.concat(aliasUsages);
    }

    resolve();
  });
};

// Let commands update args
var _yargsObj = lazy.yargs
  .count('verbose')
  .alias('v', 'verbose')
  .array('trace');

exports._yargsObj = _yargsObj;
exports.argv = _yargsObj.argv;

/** get all commands and their descriptions */
exports.initCommands = function() {
  var tasks = [];
  lazy.fs.readdirSync(__dirname).forEach(function (item) {
    var extname = lazy.path.extname(item);
    if (extname === '.js' && item !== 'index.js') {
      var cmdName = lazy.path.basename(item, extname);
      tasks.push(loadCommand(cmdName));
    }
  });

  return Promise.all(tasks).then(function() {
    // build usage strings for all the commands
    // find the longest command name
    var commandLength = 0;
    for (var i = 0; i < commandUsages.length; i++) {
      if (commandUsages[i].name.length > commandLength) {
        commandLength = commandUsages[i].name.length;
      }
    }

    var format = '  %-' + (commandLength + 1) + 's %s';
    for (var i = 0; i < commandUsages.length; i++) {
      _usage.push(
        lazy.printf(
          format, commandUsages[i].name, commandUsages[i].description
        )
      );
    }

    var usageStr = 'usage: devkit [--version] [--help] <command> [<args>]\n\n' +
      'available commands:\n' + _usage.join('\n') + '\n\n' +
      'See \'devkit help <command>\' to read about a specific command';
    _yargsObj.usage(usageStr);

    for (var commandName in _commands) {
      var command = _commands[commandName];
      if (command.updateArgs) {
        _yargsObj = command.updateArgs(_yargsObj);
      }
    }
  });
};

exports.get = function (name) {
  return _commands[name];
};

exports.has = function (name) {
  return name && !!_commands[name];
};

exports.run = function(name, args) {
  logger.debug('running commaned', name, args);
  var command = exports.get(name);
  var commandPromise = command.exec(name, args);
  if (!Promise.is(commandPromise)) {
    logger.warn('Command did not return promise, async issues may result.');
  }
  return commandPromise;
};

