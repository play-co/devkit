var fs = require('fs');

var Template = Class(function() {
    this.init = function(name, path) {
        this._name = name;
        this._path = path;
    };

    this.getName = function() {
        return this._name;
    };

    this.getPath = function() {
        return this._path;
    }
});
var TemplateManager = Class(function() {

    this.init = function() {
        this._templates = {};
    };

    this.addTemplate = function(templateOpts) {
        var templateName = templateOpts.name;
        var templatePath = templateOpts.path;
        if (!templatePath || !fs.existsSync(templatePath)) {
            logger.warn('Failed to register template', templateName, 'bad path');
        }
        this._templates[templateName] = (new Template(templateName, templatePath));
    };

    this.getTemplates = function() {
        return this._templates;
    };

    this.getTemplate = function(name) {
        return this._templates[name];
    };

});


module.exports = new TemplateManager();
