var path = require('path');
var cache = require(path.join(__src, 'install', 'cache'));

describe('cache', function () {
  describe('#getPath', function () {
    var CACHE_PATH = cache.CACHE_PATH;

    it('should return the cache path with no arguments', function () {
      assert.deepEqual(CACHE_PATH, cache.getPath());
    });

    it('should return a path in the cache with string arguments', function () {
      assert.deepEqual(path.join(CACHE_PATH, 'arst'), cache.getPath('arst'));
    });
  });
});
