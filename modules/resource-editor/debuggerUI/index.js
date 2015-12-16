var ResourceEditorUI = Class(function() {

  this.init = function() {
    this._childWindow = null;

    devkit.addModuleButton({
      iconClassName: 'fa fa-folder-open'
    }).on('Select', this.toggleVisibility.bind(this));
  };

  this.toggleVisibility = function() {
    if (this._childWindow && !this._childWindow.closed) {
      this._childWindow.focus();
    } else {
      var url = location.protocol + '//' + location.host;
      url += devkit.getSimulator().getURL();
      url += 'modules/resource-editor/extension/ui/';
      this._childWindow = window.open(url, '_blank');
    }
  };

});

module.exports = new ResourceEditorUI();
