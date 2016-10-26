var childProcess = require('child_process');
var path = require('path');
var logging = require('../util/logging')

var ForkBuildItem = require('../build/ForkBuildItem');
var InlineBuildItem = require('../build/InlineBuildItem');


var logger = logging.get('build-queue');

var _queue = [];
var _activeBuild = null;


// TODO: Switch this to inline at some point
// var BuildItemCtor = ForkBuildItem;
var BuildItemCtor = InlineBuildItem;


// TODO: this file should be moved to src/build
exports.add = function (appPath, buildOpts) {
  var mockBuildQueue = { checkQueue: checkQueue };
  var buildItem = new BuildItemCtor(mockBuildQueue, appPath, buildOpts);

  for (var item in _queue) {
    if (item.equals(buildItem)) {
      logger.log(appPath, 'already queued');
      return Promise.resolve(item.onComplete);
    }
  }

  _queue.push(buildItem);

  if (_activeBuild && _activeBuild.equals(buildItem)) {
    logger.log('cancelling build', appPath);
    var buildToCancel = _activeBuild;
    buildToCancel
      .cancel()
      .catch(function (e) {
        console.log(e);
        process.exit();
      })
      .finally(function () {
        if (buildToCancel === _activeBuild) {
          _activeBuild = null;
        }

        console.log('cancelled');
      })
      .finally(checkQueue);
  } else {
    checkQueue();
  }

  return Promise.resolve(buildItem.onComplete);
};

function checkQueue() {
  if (!_activeBuild || _activeBuild.done) {
    _activeBuild = _queue.shift();
    if (_activeBuild) {
      _activeBuild.run();
    }
  }
}
