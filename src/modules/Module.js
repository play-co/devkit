var path = require('path');
var fs = require('fs');
var chalk = require('chalk');
var printf = require('printf');
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
      }
    }

    this._extensions = {};
    if (devkit.extensions) {
      for (var name in devkit.extensions) {
        var extInfo = devkit.extensions[name];
        if (typeof extInfo == 'string') {
          extInfo = path.join(this.path, devkit.extensions[name]);
        }

        this._extensions[name] = extInfo;
      }
    }
  };

  this.getClientPaths = function () {
    return this._clientPaths;
  };

  this.getBuildTargets = function () {
    return this._buildTargets;
  };

  this.getExtensions = function () {
    return this._extensions;
  };

  this.getExtension = function (name) {
    return this._extensions[name];
  };

  this.loadExtension = function (name) {
    var extension = this._extensions[name];
    return extension && require(extension) || null;
  };

  this.loadBuildTarget = function (name) {
    var buildTarget = this._buildTargets[name];
    return buildTarget && require(buildTarget) || null;
  };

  this.setParent = function (parentPath, isDependency) {
    this.parent = parentPath;
    this.isDependency = !!isDependency;
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
  str = str || '';
  return str.replace(/^\s+|\s+$/g, '');
}

Module.load = function (modulePath, /* optional */ opts) {

  var packageFile = path.join(modulePath, 'package.json');

  if (!fs.existsSync(packageFile)) { return; }

  var packageContents;
  try {
    packageContents = require(packageFile);
  } catch (e) {
    return logger.warn('Module', modulePath, 'failed to load, invalid package.json');
  }

  if (!packageContents.devkit) { return; }

  var name = path.basename(modulePath);

  opts = opts || {};

  return new Module({
    name: name,
    path: modulePath,
    parent: opts.parent,
    isDependency: opts.isDependency,
    version: opts.version,
    packageContents: packageContents
  });
};

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

  return exists(modulePath)
    .then(function () {
      return [
        git.getCurrentTag(),
        git.getCurrentHead()
      ];
    })
    .all()
    .spread(function (tag, head) {
      return {
        tag: tag,
        hash: head
      };
    })
    .nodeify(cb);
};

Module.getVersions = function (modulePath, cb) {
  var git = gitClient.get(modulePath);
  return Promise.all([
    git.getLocalTags(),
    git('describe', '--tags', {extraSilent: true})
  ]).spread(function (versions, currentVersion) {
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

  return exists(modulePath)
    .bind({})
    .then(function () {
      // determine if version is a tag, branch, or hash
      return git.validateVersion(version);
    })
    .spread(function (version, type) {
      // always fetch if branch
      if (type == 'branch' && !opts.skipFetch) {
        return git.fetch().return(version);
      }

      return version;
    })
    .catch(gitClient.UnknownGitRevision, function (e) {
      // check if version exists locally and try to fetch it if not
      if (!opts.skipFetch) {
        return git
          .fetch()
          .then(function () {
            return git.validateVersion(version);
          })
          .spread(function (version, type) {
            return version;
          });
      } else {
        throw e;
      }
    })
    .then(function (requestedVersion) {
      trace('input version', version);
      trace('requestedVersion', requestedVersion);
      this.requestedVersion = strip(requestedVersion);

      // Get information about current head and the requested version
      return [
        git.getHashForRef(requestedVersion),
        Module.describeVersion(modulePath)
      ];
    })
    .all()
    .spread(function (requestedVersionHash, currentVersion) {
      trace('requestedVersionHash', requestedVersionHash);
      trace('currentVersion', currentVersion);
      this.currentTag = currentVersion.tag;
      this.currentHash = currentVersion.hash;
      this.requestedHash = requestedVersionHash;
      this.name = this.currentTag || this.currentHash;

      var alreadyOnRequestedVersion = (this.currentHash === this.requestedHash);
      if (alreadyOnRequestedVersion) {
        trace('already on requested version', this.name);
      }

      if (!forceInstall && alreadyOnRequestedVersion) {
        logger.log(
          chalk.cyan('set version'),
          chalk.yellow(moduleName + '@' + this.name)
        );
        return this.requestedVersion;
      } else {
        trace('installing requested version', this.requestedVersion);

        // check for unstaged changes and untracked files
        return (alreadyOnRequestedVersion
            ? Promise.resolve()
            : checkoutVersion(git, this.requestedVersion, opts))
          .bind(this)
          .then(function () {
            return Module.runInstallScripts(modulePath);
          })
          .then(function () {
            logger.log(
              chalk.cyan('set version'),
              chalk.yellow(moduleName + '@' + this.requestedVersion)
            );
            return this.requestedVersion;
          });
      }
    });
};

function checkoutVersion(git, version, opts) {
  return git
    .listChanges()
    .then(function (changes) {
      var untracked = changes.filter(function (change) {
        return change.code === '??';
      });

      if (untracked.length) {
        logger.warn('Your module has files we don\'t recognize in it. This',
          'is normally ok, but in some cases it can prevent devkit from',
          'updating your module. If an error occurs, you should consider',
          'removing these files and then running this command again:\n'
          + untracked
            .map(function (change) {
              return change.filename;
            })
            .join('\n\t'),
          '\n(' + git.path + ')');
      }

      // ignore untracked files
      var modified = changes.filter(function (change) {
        return change.code !== '??';
      });

      if (modified.length && !opts.unsafe) {
        throw new ModifiedTreeError(git.path, changes);
      }

      return git
        .checkoutRef(version)
        .catch(function (e) {
          throw new CheckoutError(path.basename(git.path), version, e.stderr);
        });
    });
}

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
    npm.on('close', function (code) {
      if (code) {
        reject(new NpmInstallError(modulePath, code));
      } else {
        resolve();
      }
    });
  }).nodeify(cb);
};

function createError(cls) {
  cls.prototype = Object.create(Error.prototype);
  cls.prototype.constructor = cls;
  return cls;
}

function ModifiedTreeError(modulePath, changes) {
  var msg = 'you have made modifications to the module %(name)s (%(path)s)';
  this.message = printf(msg, {
                   name: path.basename(modulePath),
                   path: modulePath
                 });

  this.modulePath = modulePath;
  this.changes = changes;
  this.name = 'ModifiedTreeError';
  Error.captureStackTrace(this, ModifiedTreeError);
}

Module.ModifiedTreeError = createError(ModifiedTreeError);

function CheckoutError(name, version, stderr) {
  var msg = 'checkout of module %(name)s at version %(version)s failed.'
          + '\n\n%(stderr)';
  this.message = printf(msg, {
                   name: name,
                   version: version,
                   stderr: stderr
                 });

  this.name = 'CheckoutError';
  Error.captureStackTrace(this, CheckoutError);
}

Module.CheckoutError = createError(CheckoutError);

function NpmInstallError(modulePath, code) {
  var msg = 'npm install for module %(module)s failed (exit code %(code)s).';

  this.message = printf(msg, {
                   module: path.basename(modulePath),
                   code: code
                 });

  this.name = 'NpmInstallError';
  Error.captureStackTrace(this, NpmInstallError);
}

Module.CheckoutError = createError(NpmInstallError);
