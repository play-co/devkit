var RemoteDebuggerUI = Class(function() {

  this.init = function() {
    devkit.addModuleButton({
      iconClassName: 'glyphicon glyphicon-phone'
    }).on('Select', bind(this, 'toggleVisibility'));
  };

  this.toggleVisibility = function() {
    console.log('TOGGLE')
  };

});

module.exports = new RemoteDebuggerUI();
