var path = require('path');
var ff = require('ff');
var fs = require('fs');
var color = require('cli-color');
var spawn = require('child_process').spawn;

var gitClient = require('../util/gitClient');
var logger = require('../util/logging').get('module');

/**
 * A module for a game has several properties:
 *  - app paths: defines a list of paths into a module's file structure for
 *    files that a game can import
 *  - build targets: defines a list of build targets this module can generate
 *  - extensions: defines devkit extension modules (e.g. "simulator")
 */

var Module = module.exports = Class(function () {
  this.init = function (info) {
    this.name = info.name;
    this.path = info.path;
    this.version = info.version || info.packageContents.version;
    this.parent = info.parent;
    this.isDependency = info.isDependency;

    // game-side js.io path for importing client code from this module
    this._clientPaths = {};

    var devkit = info.packageContents.devkit;
    if (devkit.clientPaths) {
      for (var key in devkit.clientPaths) {
        this._clientPaths[key] = devkit.clientPaths[key];
      }
    }

    this._buildTargets = {};
    if (devkit.buildTargets) {
      for (var target in devkit.buildTargets) {
        this._buildTargets[target] = path.join(this.path, devkit.buildTargets[target]);
      }
    }

    this._extensions = {};
    if (devkit.extensions) {
      for (var name in devkit.extensions) {
        this._extensions[name] = path.join(this.path, devkit.extensions[name]);
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
      version: this.version,
      parent: this.parent,
      isDependency: this.isDependency,
      clientPaths: this.getClientPaths(),
      extensions: this.getExtensions()
    };
  }
});

function strip(str) {
  return str.replace(/^\s+|\s+$/g, '');
}

Module.getURL = function (modulePath, cb) {
  var git = gitClient.get(modulePath);
  var f = ff(function () {
    git('remote', '-v', {extraSilent: true}, f());
  }, function (remotes) {
    var url = remotes.split('\n').map(function (line) {
        return line.match(/^origin\s+(.*?)\s+\(fetch\)/);
      }).filter(function (match) { return match; })
        .map(function (match) { return match[1]; })[0];
    f(url);
  }).cb(cb);
}

Module.describeVersion = function (modulePath, cb) {
  var git = gitClient.get(modulePath);
  var moduleName = path.basename(modulePath);
  fs.exists(modulePath, function (exists) {
    if (!exists) {
      return cb && cb({code: 'ENOENT', filename: moduleName});
    }

    git('describe', '--tags', '--exact-match', {extraSilent: true}, function (err, stdout, stderr) {
      if (err) {
        git('rev-parse', 'HEAD', {extraSilent: true}, function (err, stdout, stderr) {
          cb && cb(err, !err && strip(stdout));
        });
      } else {
        cb && cb(null, strip(stdout));
      }
    });
  });
}

Module.getVersions = function (modulePath, cb) {
  var git = gitClient.get(modulePath);
  var f = ff(function () {
    git.getLocalVersions(f());
    git('describe', '--tags', {extraSilent: true}, f());
  }, function (versions, currentVersion) {
    f({
      current: strip(currentVersion),
      versions: versions
    });
  }).cb(cb);
}

Module.setVersion = function (modulePath, versionOrOpts, cb) {
  var opts = typeof versionOrOpts == 'object' && versionOrOpts || {};
  var version = typeof versionOrOpts == 'string' && versionOrOpts || opts.version;

  var git = gitClient.get(modulePath);
  var moduleName = path.basename(modulePath);
  var currentVersion;

  var f = ff(function () {
    git.getLocalVersions(f());
    Module.describeVersion(modulePath, f());
    // git('describe', '--tags', {extraSilent: true}, f());
  }, function (versions, _currentVersion) {
    currentVersion = _currentVersion;

    // are we already on that version?
    if (currentVersion && version == currentVersion) {
      logger.log(color.cyanBright("set version"), color.yellowBright(moduleName + "@" + currentVersion));
      return f.succeed(version);
    }

    // fetch to get the latest version or if we don't have the requested
    // version yet
    if (!opts.skipFetch && !version || versions.indexOf(version) == -1) {
      // can't be silent in case it prompts for credentials
      git('fetch', '--tags', {silent: false, buffer: false, stdio: 'inherit'}, f());
    }
  }, function () {
    git.getLocalVersions(f());
  }, function (versions) {
    if (!version) {
      version = versions[0];
    }

    if (currentVersion == version) {
      return f.succeed(version);
    }

    if (version) {
      logger.log(color.cyanBright("installing"), color.yellowBright(moduleName + "@" + version));
      git('checkout', version, f());
    } else {
      f.fail("no valid versions found");
    }
  }, function () {
    logger.log("running install scripts...");

    var npmArgs = ['install'];
    if (process.getuid() == 0) {
      npmArgs.push('--unsafe-perm');
    }

    var npm = spawn('npm', npmArgs, {stdio: 'inherit', cwd: modulePath});
    npm.on('close', f.wait());
  }, function () {
    logger.log(color.cyanBright("set version"), color.yellowBright(moduleName + "@" + version));
    f(version);
  }).cb(cb);
};
