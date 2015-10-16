// Defines the public API for DevKit extensions

var jvmtools = require('../jvmtools');
var logging = require('../util/logging');
var path = require('path');

// defines the public API for jvmtools
// NOTE: the jvmtools module should not be directly exposed by the API

var api = module.exports = {
  jvmtools: {
    checkSyntax: function (src, cb) {
      jvmtools.checkSyntax(src, cb);
    },
    exec: function (opts, cb) {
      jvmtools.exec(opts, cb);
    }
  },
  logging: {
    get: function (name) {
      return logging.get(name);
    }
  },
  apps: require('./apps'),
  paths: {
    devkit: path.resolve(__dirname, '..', '..')
  }
};

