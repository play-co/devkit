var fs = require('fs');
var path = require('path');
var bodyParser = require('body-parser');

function getStoragePath(appPath) {
  return path.join(appPath, 'build', 'debug', 'simulator', 'localStorage');
}

exports.init = function (api, app, routes) {
  var logger = api.logging.get('localStorage');
  var appName = app.manifest.shortName || app.paths.root;

  routes.get('/', function (req, res) {
    fs.readFile(getStoragePath(app.paths.root), 'utf8', function (err, store) {
      if (err && err.code == 'ENOENT') {
        logger.log('creating localStorage for', appName);
        res.json({});
      } else if (err) {
        logger.error(err);
        res.status(500).send(err);
      } else {
        logger.log('restoring localStorage for', appName);
        var data;
        try {
          data = JSON.parse(store);
        } catch (e) {
          logger.error('error parsing store, creating localStorage for', appName);
          data = {};
        }

        res.json(data);
      }
    });
  });

  routes.use('/', bodyParser.json({type: '*/*'}));
  routes.post('/', function (req, res) {
    var data = JSON.stringify(req.body);
    fs.writeFile(getStoragePath(app.paths.root), data, function (err) {
      if (err) {
        logger.error('error persisting localStorage for', appName, err);
        res.status(500).send(err);
      } else {
        logger.log('persisted localStorage for', appName);
        res.status(200).send();
      }
    });
  });
};
