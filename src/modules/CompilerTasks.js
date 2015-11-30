var path = require('path');

var _logger = require('../util/logging');
var logger = _logger.get('StandaloneGulpTasks');


module.exports = Class(function() {

  this.init = function(opts) {
    this.modulePath = opts.modulePath;
    this.modulePackage = opts.modulePackage;

    this.src = opts.src;
    this.srcPath = path.join(this.modulePath, this.src);

    this.buildPath = path.join(this.modulePath, 'build', this.src);

    this.moduleName = this.modulePackage.name;
  };

  /** Run any tasks required to compile this module, add promises to task array */
  this.compile = function(tasks) {
  };

  this.watch = function(tasks) {
  };

});

