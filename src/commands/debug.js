'use strict';
let lazy = require('lazy-cache')(require);

lazy('../build');
lazy('../apps');

let BaseCommand = require('devkit-commands/BaseCommand');

class DebugCommand extends BaseCommand {
  constructor () {
    super();

    this.name = 'debug';
    this.alias = [{
      name: 'release',
      description: 'creates a release build'
    }];
    this.description = 'creates a debug build';

    this.opts
      .describe('simulated', 'build for the devkit simulator')
      .describe('output', 'path where build output is written').alias('output', 'o')
      .describe('server', 'local | inherit | local | production')
      .describe('localServerURL', 'if server is local, overrides default local server URL')
      .describe('debug', 'creates a debug build')
      .describe('scheme', 'debug | release')
      .describe('version', 'override the version provided in the manifest')
      .describe('get-config', 'output ONLY the build configuration to stdout');
  }

  showHelp (args) {
    supr(this, 'showHelp', arguments);

    process.argv.push('--help');
    this.exec(this.name, args);
  }

  getHelp (app, target) {
    if (target) {
      let buildModule = this.getBuildModule(app, target);
      if (buildModule) {
        return this.getHelpText(target, buildModule);
      } else {
        if (target) {
         return 'The build target ' + target + ' is not valid (it may not be installed)';
        }

        return 'Valid targets are ' + Object.keys(this.getBuildModules(app)).join(', ');
      }
    } else {
      let modules = this.getBuildModules(app);
      return 'Build Targets:\n\n' + Object.keys(modules).map(target => {
        return '  ' + this.getHelpText(target, modules[target]);
      }).join('\n');
    }
  }

  getHelpText (target, buildModule) {
    if (buildModule.opts) {
      return target + ':\n' +
        buildModule.opts.help().replace(/^Options:/, '')
        .split('\n')
        .map(line => {
          return '  ' + line;
        })
        .join('\n');
    } else {
      return target + ':\n' +
        '\n  Sorry! No help is available for this build target\n';
    }
  }

  getBuildModules (app) {
    let buildModules = {};
    let modules = app.getModules();
    Object.keys(modules).forEach(moduleName => {
      let module = modules[moduleName];
      Object.keys(module.getBuildTargets()).forEach(target => {
        buildModules[target] = module.loadBuildTarget(target);
      });
    });
    return buildModules;
  }

  getBuildModule (app, target) {
    let modules = app.getModules();
    for (let moduleName in modules) {
      let module = modules[moduleName];
      let buildModule = module.loadBuildTarget(target);
      if (buildModule) {
        return buildModule;
      }
    }
  }

  exec (command, args) {
    let defer = Promise.defer();

    let argv = this.argv;
    if (command === 'release') {
      argv.scheme = 'release';
      // unless overriden with --debug, debug is false for release builds
      if (!('debug' in argv)) {
        argv.debug = false;
      }
    }

    let appPath = argv.app || null;

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
      lazy.apps.get(appPath, (err, app) => {
        if (err) { return console.log(err); }
        console.log(this.getHelp(app, argv.target));
        defer.resolve();
      });
    } else {
      lazy.build.build(appPath, argv, (err, res) => {
        require('../jvmtools').stop();
        defer.resolve();
      });
    }

    return defer.promise;
  }
}

module.exports = DebugCommand;
