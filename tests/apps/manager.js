var path = require('path');

var App = require(path.join(__src, 'apps', 'App'));
var AppManager = require(path.join(__src, 'apps'));
var ApplicationNotFoundError =
  require(path.join(__src, '/apps/errors')).ApplicationNotFoundError;

// Some paths to various applications
var testApps = path.join(__dirname, '..', 'test-apps');
var validAppPath = path.join(testApps, 'valid-app');
var noManifestPath = path.join(testApps, 'no-manifest');
var randomPath = path.join(testApps, 'arstarstarst');
var nonDevkitManifest = path.join(testApps, 'invalid-manifest');

describe('App', function () {
  describe('loadFromPath', function () {
    it('should resolve an App instance on valid path', function (done) {
      App.loadFromPath(validAppPath, null).then(function (app) {
        assert(app instanceof App);
        done();
      }).catch(done);
    });

    it('resolves ApplicationNotFoundError if not devkit app', function (done) {
      App.loadFromPath(nonDevkitManifest, null)
      .then(done)
      .catch(ApplicationNotFoundError, function (err) {
        done();
      });
    });

    it('resolves ApplicationNotFoundError if no manifest', function (done) {
      App.loadFromPath(noManifestPath, null)
      .then(done)
      .catch(ApplicationNotFoundError, function (err) {
        done();
      });
    });

    it('resolves ApplicationNotFoundError if no directory', function (done) {
      App.loadFromPath(randomPath, null)
      .then(done)
      .catch(ApplicationNotFoundError, function (err) {
        done();
      });
    });
  });
});

describe('AppManager', function () {
  describe('#get', function () {
    it('should return cached app instances when possible', function (done) {
      var marker = 'marker';
      AppManager.get(validAppPath, null).then(function (app) {
        app.marker = marker;
        return AppManager.get(validAppPath, null);
      }).then(function (app) {
        assert.deepEqual(marker, app.marker);
      }).then(done).catch(done);
    });
  });
});
