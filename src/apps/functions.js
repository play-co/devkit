var path = require('path');

var HOME = process.env.HOME
      || process.env.HOMEPATH
      || process.env.USERPROFILE;

exports.resolveAppPath = function resolveAppPath(appPath) {
  return appPath && path.resolve(
    process.cwd(), appPath.replace(/^~[\/\\]/, HOME + path.sep)
  ) || findNearestApp();
};

function findNearestApp (dir) {
  if (!dir) {
    dir = process.cwd();
  }

  if (isDevkitApp(dir)) {
    return dir;
  } else if (fs.existsSync(path.join(dir, '..'))) {
    return findNearestApp(path.normalize(path.join(dir, '..')));
  } else {
    return null;
  }
}

