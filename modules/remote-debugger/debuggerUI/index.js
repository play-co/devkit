var RemoteDebuggerUI = Class(function() {

  this.init = function() {
    devkit.addModuleButton({
      iconClassName: 'fa fa-wifi'
    }).on('Select', bind(this, 'toggleVisibility'));
  };

  this.toggleVisibility = function() {
    // var appPath = devkit.getSimulator().getApp();
    var remoteUrl = location.protocol + '//' + location.host + '/modules/remote-debugger/extension/remoteDeviceConnect/';
    // remoteUrl += '?app=' + encodeURI(appPath);
    window.open(remoteUrl, '_blank');
  };

});

module.exports = new RemoteDebuggerUI();
