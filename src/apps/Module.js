var path = require('path');
var logger = require('../util/logging').get('apps');

/**
 * A module for a game has several properties:
 *  - app paths: defines a list of paths into a module's file structure for
 *    files that a game can import
 *  - build targets: defines a list of build targets this module can generate
 *  - extensions: defines devkit extension modules (e.g. "simulator")
 */

var Module = module.exports = Class(function () {
  this.init = function (name, modulePath, opts) {
    this.name = name;
    this.path = modulePath;

    // game-side js.io path for importing client code from this module
    this._clientPaths = {};

    if (opts.clientPaths) {
      for (var key in opts.clientPaths) {
        this._clientPaths[key] = opts.clientPaths[key];
      }
    }

    this._buildTargets = {};
    if (opts.buildTargets) {
      for (var target in opts.buildTargets) {
        this._buildTargets[target] = path.join(modulePath, opts.buildTargets[target]);
      }
    }

    this._extensions = {};
    if (opts.extensions) {
      for (var name in opts.extensions) {
        this._extensions[name] = path.join(modulePath, opts.extensions[name]);
      }
    }
  }

  this.getClientPaths = function (relativeTo) {
    return this._clientPaths;
  }

  this.getBuildTargets = function () {
    return this._buildTargets;
  }

  this.getExtensions = function () {
    return this._extensions;
  }

  this.loadExtension = function (name) {
    var extension = this._extensions[name];
    return extension && require(extension) || null;
  }

  this.loadBuildTarget = function (name) {
    var buildTarget = this._buildTargets[name];
    return buildTarget && require(buildTarget) || null;
  }

  // defines the public JSON API for DevKit extensions
  this.toJSON = function () {
    return {
      name: this.name,
      path: this.path,
      clientPaths: this.getClientPaths(),
      extensions: this.getExtensions()
    };
  }

});
