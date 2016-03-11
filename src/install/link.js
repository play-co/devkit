'use strict';
let lazy = require('lazy-cache')(require);
lazy('path');
lazy('path-extra');
lazy('../util/fs', 'fs');
lazy('../util/logging', 'logging');
lazy('../modules/Module', 'Module');


let logger = lazy.logging.get('install.link');
let LINK_DIR = lazy.path.join(lazy.pathExtra.datadir(process.title), 'links');


module.exports.createLink = function(src, dest) {
  logger.debug('Creating link:', src, '-->', dest);
  return Promise.promisify(lazy.fs.lstat)(dest).catch(err => {
    if (err.code !== 'ENOENT') {
      return Promise.reject(err);
    }
  }).then(stat => {
    if (!stat) {
      return;
    }
    if (stat.isSymbolicLink()) {
      logger.debug('Existing link found, unlinking');
      return Promise.promisify(lazy.fs.unlink)(dest);
    } else {
      return Promise.reject('Existing file at: ' + dest);
    }
  }).then(() => {
    return Promise.promisify(lazy.fs.ensureDir)(lazy.path.dirname(dest));
  }).then(() => {
    return Promise.promisify(lazy.fs.symlink)(src, dest, 'junction');
  });
};


module.exports.linkToGlobal = function(cwd) {
  logger.info('Linking to global:', cwd);
  let module = lazy.Module.load(cwd);
  let linkPath = lazy.path.join(LINK_DIR, module.name);
  return module.exports.createLink(cwd, linkPath);
};


module.exports.linkFromGlobal = function(cwd, name) {
  logger.info('Linking from global:', name, '-->', cwd)
  let linkPath = lazy.path.join(LINK_DIR, name);
  let destPath = lazy.path.join(cwd, 'modules', name);
  return module.exports.createLink(linkPath, destPath);
};


module.exports.getAllLinks = function() {
  return Promise.promisify(lazy.fs.readdir)(LINK_DIR).then((fileNames) => {
    let files = [];
    for (let i = 0; i < fileNames.length; i++) {
      let fname = fileNames[i];
      let fpath = lazy.path.join(LINK_DIR, fname);
      files.push({
        name: fname,
        path: fpath,
        stat: lazy.fs.statSync(fpath)
      });
    }
    return files;
  })
  .filter(item => {
    return item.stat.isDirectory();
  })
  .map(item => {
    return lazy.Module.load(item.path);
  });
};
