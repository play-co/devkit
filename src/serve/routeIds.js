module.exports = (function () {
  // tracks used route uuids
  var _routes = {};
  var _routeMap = {};

  // create a unique route hash from the app path
  return {
    generate: function (appPath) {
      if (appPath in _routeMap) {
        return _routeMap[appPath];
      }

      // compute a hash
      var hash = 5381;
      var i = appPath.length;
      while(i) {
        hash = (hash * 33) ^ appPath.charCodeAt(--i);
      }
      hash >>> 0;

      // increase until unique
      var routeId;
      do {
        routeId = hash.toString(36);
      } while ((routeId in _routes) && ++hash);
      _routes[routeId] = appPath;
      _routeMap[appPath] = routeId;
      return routeId;
    },

    lookup: function (routeId) {
      return _routes[routeId];
    }
  };
})();
