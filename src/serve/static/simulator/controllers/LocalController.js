import std.uri;
import util.ajax;

exports = Class(function () {

  this.init = function (opts) {
    this._device = opts.device;
    this._app = opts.app || new std.uri(window.location).query('app');
    this._debug = true;
  }

  this.rebuild = function (params, cb) {
    var simulator = this._device.getSimulator();
    simulator.setBuilding(true);

    // get or update a simulator port with the following options
    util.ajax.get({
      url: '/api/simulate/',
      query: {
        app: this._app,
        deviceType: this._device.getType(),
        deviceId: this._device.getId(),
        scheme: this._device.isDebug() ? 'debug' : 'release',
        target: this._device.getBuildTarget()
      }
    }, bind(this, function (err, res) {
      simulator.setBuilding(false);

      if (err) {
        cb && cb(err);
      } else {
        var url = res.url;
        if (!url && res.port) {
          var hostname = location.hostname;
          url = 'http://' + hostname + ':' + res.port + '/';
        }

        simulator.loadURL(url);

        cb && cb(null, res);
      }
    }));
  };
});
