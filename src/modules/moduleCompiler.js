var path = require('path');
var mkdirp = require('mkdirp');
var Promise = require('bluebird');

var GulpTasks = require('./GulpTasks');
var StandaloneGulpTasks = require('./StandaloneGulpTasks');

var _logger = require('../util/logging');
var logger = _logger.get('moduleCompiler');


module.exports = {
  load: function(modulePath) {
    logger.info('Loading module at:', modulePath);
    try {
      var modulePackage = require(path.join(modulePath, 'package.json'));
      // Get all the main files and compile them
      if (!modulePackage.devkit || !modulePackage.devkit.extensions) {
        logger.warn('module did not specify a devkit.extensions');
        return;
      }
      return modulePackage;
    } catch(e) {
      throw new Error('module contains no package.json');
    }
  },

  executeRunnerTask: function(modulePath, taskName, cb) {
    modulePath = path.resolve(modulePath);
    var modulePackage = this.load(modulePath);
    var moduleName = modulePackage.name;
    logger.info('Running task "' + taskName + '" on module: ' + moduleName);

    // Special case compile
    if (taskName === 'compile') {
      mkdirp.sync(path.join(modulePath, 'build'));
    }

    var taskRunners = [];
    this.checkDebuggerUI(modulePath, modulePackage, taskRunners);
    this.checkStandaloneUI(modulePath, modulePackage, taskRunners);

    var tasks = [];
    taskRunners.forEach(function(taskRunner) {
      taskRunner[taskName](tasks);
    })

    Promise.all(tasks)
      .then(function() {
        logger.info('Done!');
        cb && cb();
      })
      .catch(function(e) {
        logger.error(e);
        cb && cb(e);
      });
  },

  checkDebuggerUI: function(modulePath, modulePackage, taskRunners) {
    var debuggerUI = modulePackage.devkit.extensions.debuggerUI;
    if (!debuggerUI) {
      return;
    }

    for (var i = 0; i < debuggerUI.length; i++) {
      var taskRunner = new GulpTasks({
        modulePath: modulePath,
        modulePackage: modulePackage,

        src: debuggerUI[i]
      });
      taskRunners.push(taskRunner);
    }
  },

  checkStandaloneUI: function(modulePath, modulePackage, taskRunners) {
    var standaloneUI = modulePackage.devkit.extensions.standaloneUI;
    if (!standaloneUI) {
      return;
    }

    for (var uiRoute in standaloneUI) {
      var uiEntry = standaloneUI[uiRoute];
      var moduleSrc = typeof uiEntry === 'string' ? uiEntry : uiEntry.src;

      var taskRunner = new StandaloneGulpTasks({
        modulePath: modulePath,
        modulePackage: modulePackage,

        src: moduleSrc
      });
      taskRunners.push(taskRunner);
    }
  }

};
