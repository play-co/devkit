var path = require('path');

var HOME = process.env.HOME
      || process.env.HOMEPATH
      || process.env.USERPROFILE;

exports.resolveAppPath = function resolveAppPath(appPath) {
  return appPath && path.resolve(
    process.cwd(), appPath.replace(/^~[\/\\]/, HOME + path.sep)
  ) || findNearestApp();
};
