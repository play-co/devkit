var lazy = require('lazy-cache')(require);

lazy('../build');
lazy('../apps');

var BaseCommand = require('../util/BaseCommand').BaseCommand;

var DebugCommand = Class(BaseCommand, function (supr) {

  this.name = 'debug';
  this.alias = [{
    name: 'release',
    description: 'creates a release build'
  }];
  this.description = 'creates a debug build';

  this.init = function () {
    supr(this, 'init', arguments);

    this.opts
      .describe('simulated', 'build for the devkit simulator')
      .describe('output', 'path where build output is written').alias('output', 'o')
      .describe('server', 'local | inherit | local | production')
      .describe('localServerURL', 'if server is local, overrides default local server URL')
      .describe('debug', 'creates a debug build')
      .describe('scheme', 'debug | release')
      .describe('version', 'override the version provided in the manifest')
      .describe('get-config', 'output ONLY the build configuration to stdout');
  };

  this.showHelp = function (args) {
    supr(this, 'showHelp', arguments);

    process.argv.push('--help');
    this.exec(this.name, args);
  };

  this.getHelp = function(app, target) {
    if (target) {
      var buildModule = this.getBuildModule(app, target);
      if (buildModule) {
        return this.getHelpText(target, buildModule);
      } else {
        if (target) {
         return 'The build target ' + target + ' is not valid (it may not be installed)';
        }

        return 'Valid targets are ' + Object.keys(this.getBuildModules(app)).join(', ');
      }
    } else {
      var modules = this.getBuildModules(app);
      return 'Build Targets:\n\n' + Object.keys(modules).map(function (target) {
        return '  ' + this.getHelpText(target, modules[target]);
      }).join('\n');
    }
  };

  this.getHelpText = function(target, buildModule) {
    if (buildModule.opts) {
      return target + ':\n' +
        buildModule.opts.help().replace(/^Options:/, '')
        .split('\n')
        .map(function (line) {
          return '  ' + line;
        })
        .join('\n');
    } else {
      return target + ':\n' +
        '\n  Sorry! No help is available for this build target\n';
    }
  };

  this.getBuildModules = function(app) {
    var buildModules = {};
    var modules = app.getModules();
    Object.keys(modules).forEach(function (moduleName) {
      var module = modules[moduleName];
      Object.keys(module.getBuildTargets()).forEach(function (target) {
        buildModules[target] = module.loadBuildTarget(target);
      });
    });
    return buildModules;
  };

  this.getBuildModule = function(app, target) {
    var modules = app.getModules();
    for (var moduleName in modules) {
      var module = modules[moduleName];
      var buildModule = module.loadBuildTarget(target);
      if (buildModule) {
        return buildModule;
      }
    }
  };

  this.exec = function (command, args) {
    var defer = Promise.defer();

    var argv = this.argv;
    if (command === 'release') {
      argv.scheme = 'release';
      // unless overriden with --debug, debug is false for release builds
      if (!('debug' in argv)) {
        argv.debug = false;
      }
    }

    var appPath = argv.app || null;

    if (!argv.target) {
      if (args[0]) {
        // target is first unusued arg
        argv.target = args[0];
      } else {
        // no target found, show help
        argv.help = true;
      }
    }

    if (argv.help) {
      lazy.apps.get(appPath, function (err, app) {
        if (err) { return console.log(err); }
        console.log(this.getHelp(app, argv.target));
        defer.resolve();
      });
    } else {
      lazy.build.build(appPath, argv, function (err, res) {
        require('../jvmtools').stop();
        defer.resolve();
      });
    }

    return defer.promise;
  };
});

module.exports = DebugCommand;
