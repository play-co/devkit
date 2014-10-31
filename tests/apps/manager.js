var App = require(__src + '/apps/App');
var ApplicationNotFoundError =
  require(__src + '/apps/errors').ApplicationNotFoundError;
var path = require('path');

var testApps = path.join(__dirname, '..', 'test-apps');

describe('App', function () {
  describe('loadFromPath', function () {
    it('should resolve an App instance on valid path', function (done) {
      var validAppPath = path.join(testApps, 'valid-app');
      App.loadFromPath(validAppPath, null).then(function (app) {
        assert(app instanceof App);
        done();
      }).catch(done);
    });

    it('resolves ApplicationNotFoundError if not devkit app', function (done) {
      var nonDevkitManifest = path.join(testApps, 'invalid-manifest');
      App.loadFromPath(nonDevkitManifest, null)
      .then(done)
      .catch(ApplicationNotFoundError, function (err) {
        done();
      });
    });

    it('resolves ApplicationNotFoundError if no manifest', function (done) {
      var noManifestPath = path.join(testApps, 'no-manifest');
      App.loadFromPath(noManifestPath, null)
      .then(done)
      .catch(ApplicationNotFoundError, function (err) {
        done();
      });
    });

    it('resolves ApplicationNotFoundError if no directory', function (done) {
      var randomPath = path.join(testApps, 'arstarstarst');
      App.loadFromPath(randomPath, null)
      .then(done)
      .catch(ApplicationNotFoundError, function (err) {
        done();
      });
    });
  });
});

