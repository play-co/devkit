// Defines the public API for DevKit extensions

var jvmtools = require('../jvmtools');
var logging = require('../util/logging');

// defines the public API for jvmtools
// NOTE: the jvmtools module should not be directly exposed by the API

exports.jvmtools = {};

exports.jvmtools.checkSyntax = function (src, cb) {
  jvmtools.checkSyntax(src, cb);
}

exports.jvmtools.exec = function (opts, cb) {
  jvmtools.exec(opts, cb);
}

exports.logging = {};

exports.logging.get = function (name) {
  return logging.get(name);
}

exports.apps = require('./apps');

var path = require('path');
exports.paths = {
  devkit: path.resolve(__dirname, '..', '..')
};

