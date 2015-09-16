var apps = require('../apps');

module.exports = {
  // tracks used route uuids
  _routes: {},
  _routeMap: {},

  // create a unique route hash from the app path
  get: function(appPath) {
    if (appPath in this._routeMap) {
      return this._routeMap[appPath];
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
    } while ((routeId in this._routes) && ++hash);
    this._routes[routeId] = true;
    this._routeMap[appPath] = routeId;
    return routeId;
  },

  getAppPathByRouteId: function(routeId, cb) {
    if (this._routes[routeId]) {
      for (var appPath in this._routeMap) {
        if (this._routeMap[appPath] === routeId) {
          cb(null, appPath);
          return;
        }
      }
      cb(new Error('_routes or _routeMap corrupted'));
    }

    // dont have it, look for it in apps
    apps.getApps(function(err, apps) {
      if (err) {
        cb(err);
        return;
      }
      for (var appPath in apps) {
        var testRouteId = this.get(appPath);
        if (testRouteId === routeId) {
          cb(null, appPath);
          return;
        }
      }
      cb(new Error('no matching app path for routeId: ' + routeId))
    }.bind(this));
  }
};
