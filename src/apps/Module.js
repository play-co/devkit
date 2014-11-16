var path = require('path');
var fs = require('fs');
var color = require('cli-color');
var spawn = require('child_process').spawn;
var os = require('os');

var gitClient = require('../util/gitClient');
var logger = require('../util/logging').get('module');

var exists = function (filePath) {
  return new Promise(function (resolve, reject) {
    fs.exists(filePath, function (pathExists) {
      if (pathExists) {
        return resolve(pathExists);
      }

      return reject({
        code: 'ENOENT',
        filename: filePath
      });
    });
  });
};

/**
 * A module for a game has several properties:
 *  - app paths: defines a list of paths into a module's file structure for
 *    files that a game can import
 *  - build targets: defines a list of build targets this module can generate
 *  - extensions: defines devkit extension modules (e.g. 'simulator')
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
        this._buildTargets[target] =
          path.resolve(this.path, devkit.buildTargets[target]);
        logger.log(target);
        logger.log(this._buildTargets[target]);
      }
    }

    this._extensions = {};
    if (devkit.extensions) {
      for (var name in devkit.extensions) {
        this._extensions[name] = path.join(this.path, devkit.extensions[name]);
      }
    }
  };

  this.getClientPaths = function (relativeTo) {
    return this._clientPaths;
  };

  this.getBuildTargets = function () {
    return this._buildTargets;
  };

  this.getExtensions = function () {
    return this._extensions;
  };

  this.loadExtension = function (name) {
    var extension = this._extensions[name];
    return extension && require(extension) || null;
  };

  this.loadBuildTarget = function (name) {
    var buildTarget = this._buildTargets[name];
    return buildTarget && require(buildTarget) || null;
  };

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
  };
});

function strip(str) {
  return str.replace(/^\s+|\s+$/g, '');
}

Module.getURL = function (modulePath, cb) {
  var git = gitClient.get(modulePath);
  return git('remote', '-v', {extraSilent: true}).then(function (remotes) {
    return remotes.split('\n').map(function (line) {
      return line.match(/^origin\s+(.*?)\s+\(fetch\)/);
    }).filter(function (match) {
      return match;
    }).map(function (match) {
      return match[1];
    })[0];
  }).nodeify(cb);
};

Module.describeVersion = function (modulePath, cb) {
  trace('Module.describeVersion');
  var git = gitClient.get(modulePath);
  var moduleName = path.basename(modulePath);

  return exists(modulePath).then(function () {
    return [
      git.getCurrentTag(),
      git.getCurrentHead()
    ];
  }).all().spread(function (tag, head) {
    return {
      tag: tag,
      hash: head
    };
  }).nodeify(cb);
};

Module.getVersions = function (modulePath, cb) {
  var git = gitClient.get(modulePath);
  return Promise.all([
    git.getLocalTags(),
    git('describe', '--tags', {extraSilent: true})
  ]).then(function (versions, currentVersion) {
    return {
      current: strip(currentVersion),
      versions: versions
    };
  }).nodeify(cb);
};

Module.setVersion = function (modulePath, version, opts) {
  trace('setVersion - opts:', opts);
  opts = opts || {};

  trace('modulePath', modulePath);

  var git = gitClient.get(modulePath);
  var moduleName = path.basename(modulePath);
  var forceInstall = opts.forceInstall;

  return exists(modulePath).bind({}).then(function () {
    return git.fetch();
  }).then(function () {
    return git.ensureVersion(version);
  }).then(function (requestedVersion) {
    trace('input version', version);
    trace('requestedVersion', requestedVersion);
    this.requestedVersion = strip(requestedVersion);

    // Get information about current head and the requested version
    return [
      git.getHashForRef(requestedVersion),
      Module.describeVersion(modulePath)
    ];
  }).all().spread(function (requestedVersionHash, currentVersion) {
    trace('requestedVersionHash', requestedVersionHash);
    trace('currentVersion', currentVersion);
    this.currentTag = currentVersion.tag;
    this.currentHash = currentVersion.hash;
    this.requestedHash = requestedVersionHash;
    this.name = this.currentTag || this.currentHash;

    var onRequestedVersion = this.currentHash === this.requestedHash;
    if (!forceInstall && onRequestedVersion) {
      logger.log(
        color.cyanBright('set version'),
        color.yellowBright(moduleName + '@' + this.name)
      );
      trace('already on requested version', this.name);
      return this.requestedVersion;
    } else {
      trace('installing requested version', this.requestedVersion);
      return git.checkoutRef(this.requestedVersion).then(function () {
        return Module.runInstallScripts(modulePath);
      }).bind(this).then(function () {
        logger.log(
          color.cyanBright('set version'),
          color.yellowBright(moduleName + '@' + this.requestedVersion)
        );
        return this.requestedVersion;
      });
    }
  });
};

Module.runInstallScripts = function runInstallScripts (modulePath, cb) {
  logger.log('running install scripts...');

  var npmArgs = ['install'];
  if (process.getuid && process.getuid() === 0) {
    npmArgs.push('--unsafe-perm');
  }

  var command = 'npm';
  var options = {stdio: 'inherit', cwd: modulePath};

  // detect windows
  var windows = (os.platform() === 'win32');

  // on windows, process.spawn can only call executables on the path
  // this is an ugly workaround to allow calling npm install inside
  // the module directory. This should be replaced with proper npm
  // install handling for modules.
  if (windows) {
    command = 'cmd.exe';
    npmArgs = ['/C', 'npm'].concat(npmArgs);
    options.windowsVerbatimArguments = true;
  }

  var npm = spawn(command, npmArgs, options);
  return new Promise(function (resolve, reject) {
    npm.on('close', resolve);
  }).nodeify(cb);
};
