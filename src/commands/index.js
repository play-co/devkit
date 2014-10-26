var optimist = require('optimist');
var printf = require('printf');

var commandNames = [
  'debug', 'serve', 'help', 'instructions',
  'version', 'install', 'register', 'init',
  'upgrade', 'remove', 'which',
  'apps', 'modules'];

var _usage = [];
var _commands = {};

// get all commands and their descriptions
commandNames.forEach(function (name) {
  var Command = require('./' + name);
  if (typeof Command == 'function') {
    var cmd = _commands[name] = new Command();

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

      if (!_commands[first]) {
        _commands[first] = cmd;
      }
    }

    _usage.push(printf('  %-10s %s', cmd.name, cmd.description));
  }
});

var usageStr = "usage: devkit [--version] [--help] <command> [<args>]\n\n"
  + "available commands:\n" + _usage.join('\n') + "\n\n"
  + "See 'devkit help <command>' to read about a specific command";

exports.argv = optimist.usage(usageStr).argv;

exports.get = function (name) {
  return _commands[name];
}

exports.has = function (name) {
  return name && !!_commands[name];
}
