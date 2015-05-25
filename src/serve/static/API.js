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

  /**
   * A connection to the inner iframe
   */
  this.devkit = new ChannelAPI();

  this.getApp = function () {
    return this._simulator.getApp();
  };

  /**
   * @returns {HTMLElement} Iframe for the simulator
   */
  this.getFrame = function () {
    return this._simulator.getUI().getFrame();
  };

  /**
   * @returns {HTMLElement} Parent DOM node
   */
  this.getParent = function () {
    return this._simulator.getUI().getParent();
  };

  this.prompt = function (opts) {
    return this._simulator.getUI().showBanner(opts);
  };
});
