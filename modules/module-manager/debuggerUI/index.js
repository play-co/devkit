var ModuleManagerUI = Class(function() {

  this.init = function() {
    devkit.addModuleButton({
      iconClassName: 'fa fa-puzzle-piece'
    }).on('Select', bind(this, 'toggleVisibility'));
  };

  this.toggleVisibility = function() {
    var remoteUrl = location.protocol + '//' + location.host + '/modules/module-manager/extension/moduleManager';
    var appPath = devkit.getSimulator().getApp();
    remoteUrl += '?app=' + encodeURI(appPath);
    window.open(remoteUrl, '_blank');
  };

});

module.exports = new ModuleManagerUI();
