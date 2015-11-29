var commands = require('./index');
var BaseCommand = require('../util/BaseCommand').BaseCommand;
var logger = require('../util/logging').get('compileModule');

var gulpTasks = require('../modules/gulpTasks');

var CompileModuleCommand = Class(BaseCommand, function (supr) {

  this.name = 'compileModule';
  this.description = 'usage\ncompile specific module:\n\tcompileModule <modulePath>\nrebuild on changes:\n\tcompileModule --watch <modulePath>';

  this.updateOptimist = function(optimistObj) {
    return optimistObj.boolean('watch');
  };

  this.exec = function (command, args, cb) {
    var moduleDir = args.shift();

    if (commands.argv.watch) {
      gulpTasks.watch(moduleDir, cb);
    } else {
      gulpTasks.compile(moduleDir, cb);
    }
  };

});

module.exports = CompileModuleCommand;
