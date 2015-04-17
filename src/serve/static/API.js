import .util.ChannelAPI as ChannelAPI;
import .devkitConn;

exports = Class(ChannelAPI, function (supr) {

  this.init = function (simulator) {
    supr(this, 'init');

    this._simulator = simulator;

    devkitConn.getTransport().bind(this).then(function (socket) {
      this.devkit.setTransport(socket);
    });
  };

  this.devkit = new ChannelAPI();

});
