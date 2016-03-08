var EventEmitter = require('events').EventEmitter;

var lazy = require('lazy-cache')(require);
lazy('path');
lazy('path-extra');
lazy('nodegit');
lazy('bluebird', 'Promise');

lazy('../util/fs', 'fs');

lazy('../util/logging', 'logging');
lazy('./nodegitCredentialHelper');
lazy('./cacheErrors');
lazy('../modules/Module', 'Module');


var logger = lazy.logging.get('cache');
var MODULE_CACHE = lazy.path.join(lazy.pathExtra.datadir(process.title), 'cache');


var ModuleCache = Class(EventEmitter, function () {

  this.init = function () {
    EventEmitter.call(this);

    this._isLoaded = false;
    this._entries = {};
  };

  this.loadCache = function() {
    logger.debug('initializing module cache at', MODULE_CACHE);
    return lazy.fs.ensureDirAsync(MODULE_CACHE)
      .bind(this)
      .then(function () {
        return lazy.fs.readdirAsync(MODULE_CACHE);
      })
      .map(function (entryName) {
        // Manually exclude anything starting with a '.'
        if (entryName.indexOf('.') === 0) {
          return;
        }

        var cachePath = this.getPath(entryName);
        logger.silly('discovered entry', entryName, cachePath);
        return lazy.nodegit.Repository.open(cachePath).then(function(repo) {
          return {
            repo: repo,
            path: cachePath,
            name: lazy.path.basename(cachePath),
            loaded: false
          };
        });
      })
      .reduce(function (entries, entry) {
        if (!entry) { return entries; }

        if (!entry.repo.isBare()) {
          logger.silly('cache entry is not bare, removing', entry.path);
          this.remove(entry.name);
          return entries;
        }

        entries.push(entry);

        return entries;
      }, [])
      .each(function(entry) {
        return entry.repo.getRemote('origin')
          .then(function(remote) {
            entry.origin = remote;
            entry.url = remote.url();
            entry.loaded = true;
          })
          .catch(function(err) {
            logger.warn('Error getting remote "origin" for ' + entry.name, err);
            this.remove(entry.name);
          });
      })
      .then(function (entries) {
        logger.silly('entries loaded', entries);
        entries.forEach(function(entry) {
          if (entry.loaded) {
            this._entries[entry.name] = entry;
          }
        }.bind(this));
        this._isLoaded = true;
        this.emit('loaded');
      });
  };

  /** sync */
  this.remove = function(name) {
    // Remove from filesystem
    var cachePath = this.getPath(name);
    if (lazy.fs.existsSync(cachePath)) {
      lazy.fs.removeSync(cachePath);
    }
    // Remove from entries
    delete this._entries[name];
  };

  /**
   * @param {String} args - n strings to join with the cache path
   */
  this.getPath = function () {
    if (arguments.length) {
      return lazy.path.join(MODULE_CACHE, lazy.path.join.apply(lazy.path, arguments));
    }

    return MODULE_CACHE;
  };

  this._safeGetLocalRepo = function(repoPath) {
    if (!lazy.fs.existsSync(repoPath)) {
      // Initialize the new repository
      var isBare = 0;
      return lazy.nodegit.Repository.init(repoPath, isBare);
    }

    var repo = null;
    return lazy.nodegit.Repository.open(repoPath)
      .then(function(_repo) {
        repo = _repo;
        return repo.getStatus();
      }, function(err) {
        logger.debug('error opening for local update:', err);
        // If the directory exists, error to user
        if (lazy.fs.existsSync(repoPath)) {
          logger.warn('Directory exists at:', repoPath);
          logger.warn('Please remove this directory if you want the devkit to manage the module');
          logger.warn('Cache exiting for safety of local files');
          throw new lazy.cacheErrors.DirectoryCollision('local directory collision at ' + repoPath);
        }
      })
      .then(function(statusArray) {
        // Ignore "modules" folder
        // TODO: should really check to make sure that (at least) the folder names are expected as per the manifest
        var changedFileNames = [];
        statusArray.forEach(function(status, index) {
          var statusPath = status.path();
          if (statusPath.indexOf('modules/') === 0) {
            logger.silly('ignoring changed file:', statusPath);
            return;
          }

          changedFileNames.push(statusPath);
        });

        if (changedFileNames.length > 0) {
          logger.debug('Changed files:', changedFileNames);

          logger.warn('You have made local changes to the module:', repoPath);
          logger.warn('Please remove the existing repository (after saving changes)');
          logger.warn('Cache exiting for safety of local files');
          throw new lazy.cacheErrors.DirtyRepo('local repository not clean ' + repoPath, changedFileNames);
        }
      })
      .then(function() {
        return repo;
      });
  };

  this._checkHead = function(entryName, testRepo) {
    var entry = this._get(entryName);
    // Check to make sure the head of this repo is not pointing to an unknown commit
    logger.silly('checkHead', entryName, testRepo.path());
    return testRepo.head()
      .then(function(headRef) {
        var headCommitHash = headRef.target();
        logger.silly('checking for commit in cache:', headCommitHash);
        return entry.repo.getCommit(headCommitHash)
          .then(function(entryCommit) {
            logger.silly('this commit is in the cache, all good');
          }, function() {
            // this commit is not in the cache, bad
            logger.warn('Local repository on an unknown commit:', headCommitHash);
            logger.warn('Please make sure to push your local commits before running devkit install.');
            logger.warn('Cache exiting for safety of local files');
            throw new lazy.cacheErrors.UnknownLocalCommit('local repository on unknown commit ' + testRepo.path());
          });
      }, function() {
        logger.silly('local repo has no head, all good');
      });
  };

  /** @returns {Promise} */
  this.localUpdate = function(entryName, destPath, version) {
    logger.debug('running local update:', entryName, destPath, version);

    // Make sure we have an entry for this
    var entry = this._get(entryName);
    if (!entry) {
      return lazy.Promise.reject('No entry for: ' + entryName);
    }

    var repo = null;
    var remoteCache = null;

    return lazy.Promise.resolve()
      .bind(this)
      .then(function() {
        return this._safeGetLocalRepo(destPath);
      })
      .then(function(_repo) {
        repo = _repo;
        return this._checkHead(entryName, repo);
      })
      .then(function() {
        // ensure proper remotes are in place
        return lazy.Promise.all([
          this._ensureRemote(repo, 'origin', entry.origin.url()),
          this._ensureRemote(repo, 'cache', entry.path)
        ]);
      })
      .spread(function(remoteOrigin, _remoteCache) {
        remoteCache = _remoteCache;
        // return repo.fetch(remoteCache, { });
        var refspecs = ['+refs/heads/*:refs/heads/*'];
        // var refspecs = [];
        return remoteCache.fetch(refspecs, {}, '');
      })
      .then(function() {
        logger.silly('setting head', destPath, version);
        // Try to get the ref (branch / tag)
        return entry.repo.getReference(version)
          .then(function(ref) {
            logger.silly('version is ref');
            return repo.setHead('refs/heads/' + version)
              .then(function() {
                return ref.target().tostrS();
              });
          }, function() {
            logger.silly('version is hash');
            repo.setHeadDetached(version);
            return version;
          });
      })
      .then(function(hash) {
        return repo.getCommit(hash).then(function(targetCommit) {
          return targetCommit;
        }, function(err) {
          throw new Error('Could not get target commit: ' + targetCommit);
        });
      })
      .then(function(targetCommit) {
        logger.silly('resetting repository to cache contents:', targetCommit.id());
        return lazy.nodegit.Reset.reset(repo, targetCommit, lazy.nodegit.Reset.TYPE.HARD);
      })
      .then(function() {
        var packagePath = lazy.path.join(destPath, 'package.json');
        if (!lazy.fs.existsSync(packagePath)) {
          return;
        }

        logger.debug('package.json found, running npm install');
        return lazy.Module.runInstallScripts(destPath);
      })
      .then(function() {
        logger.debug('local update complete for', destPath);
      });
  };

  this.doesLocalNeedUpdate = function(dir, version) {
    return this._safeGetLocalRepo(dir)
      .then(function(repo) {
        // Nest this promise because we want to propagate errors if they are thrown from _safeGetLocalRepo
        return repo.getHeadCommit()
          .then(function(headCommit) {
            return !headCommit || (headCommit.id().toString().indexOf(version) !== 0);
          }, function() {
            // tag, branch, unknown commit
            return true;
          });
      });
  };

  this._ensureRemote = function(repo, remoteName, remoteUrl) {
    logger.silly('ensuring remote for', repo.path(), ':', remoteName, remoteUrl);
    return repo.getRemote(remoteName)
      .then(function(remote) {
        var currentUrl = remote.url();
        if (currentUrl !== remoteUrl) {
          logger.debug('remote url mismatch (setting to desired)', currentUrl, remoteUrl);
          return lazy.nodegit.Remote.setUrl(repo, remoteName, remoteUrl)
            .then(function() {
              // Return the new remote
              return repo.getRemote(remoteName);
            });
        }
        return remote;
      }, function(err) {
        logger.silly('remote missing, making new:', remoteName, remoteUrl);
        return lazy.nodegit.Remote.create(repo, remoteName, remoteUrl);
      });
  };

  /** @returns {Promise} */
  this.add = function(name, url) {
    logger.debug('adding', name, url);
    // Make the new entry
    var cachePath = this.getPath(name);
    logger.silly('> cachePath', cachePath);
    var isBare = 1;
    return lazy.nodegit.Repository.init(cachePath, isBare)
      .then(function(repo) {
        var entry = {
          repo: repo,
          path: cachePath,
          name: lazy.path.basename(cachePath),
          url: url,
          origin: lazy.nodegit.Remote.create(repo, 'origin', url)
        };
        this._entries[name] = entry;
        return entry;
      }.bind(this))
      .then(function() {
        return this._updateEntry(name);
      }.bind(this))
      .then(function() {
        return this._entries[name];
      })
      .catch(function(err) {
        logger.error('Error while adding to cache:', name, url);
        // Remove the folder
        // this.remove(name);
      }.bind(this));
  };

  /**
   * Either will
   * - Add new entry
   * - Check existing entry for this hash (if version is hash)
   * - Update entry
   * @returns {Promise}
   */
  this.update = function(entryName, version) {
    logger.debug('updating', entryName, version);
    var entry = this._get(entryName);

    return entry.repo.getCommit(version)
      .then(function(commit) {
        logger.silly('commit present in cache, no fetch required');
        return lazy.Promise.resolve();
      }, function() {
        logger.silly('no commit present in cache, fetch required');
        return this._updateEntry(entryName);
      }.bind(this));
  };

  /** @returns {Promise} */
  this._updateEntry = function(name) {
    logger.debug('_updating entry', name);
    var entry = this._get(name);

    var remote = entry.origin;
    var fetchOpts = lazy.nodegitCredentialHelper.getFetchOpts();

    // Manually call fetch... this is some internal nodegit magic.
    // This properly connects, while remote.connect() results in error: Must call UPLOADPACK_LS before UPLOADPACK
    return remote.fetch(['+refs/heads/*:refs/heads/*'], fetchOpts, '')
      .then(function() {
        // Manually disconnect the remote
        logger.debug('> Update complete');
        return remote.disconnect();
      });
  };

  this.link = function (cacheEntry, destPath, cb) {
    var src = this.getPath(cacheEntry.name);
    var dest = lazy.path.join(destPath, cacheEntry.name);
    return createLink(src, dest, cb);
  };

  this.has = function (name) {
    return !!this._get(name);
  };

  this._get = function (name) {
    return this._entries[name];
  };
});

var unlink = lazy.Promise.promisify(lazy.fs.unlink);
var symlink = lazy.Promise.promisify(lazy.fs.symlink);
var lstat = lazy.Promise.promisify(lazy.fs.lstat);

function createLink(src, dest, cb) {
  return lstat(dest).catch(function (err) {
    if (err.code !== 'ENOENT') {
      return lazy.Promise.reject(err);
    }
  }).then(function (stat) {
    if (stat) {
      if (stat.isSymbolicLink()) {
        return unlink(dest);
      } else {
        return lazy.Promise.reject(
          new Error('Please remove existing module before using --link')
        );
      }
    }
  }).then(function () {
    return symlink(src, dest, 'junction');
  }).nodeify(cb);
}

module.exports = new ModuleCache();
module.exports.CACHE_PATH = MODULE_CACHE;
