"use import";

import sdkPlugin;
import .GUI;

from util.browser import $;

//no longer used - go look at index.html instead.
exports = Class(sdkPlugin.SDKPlugin, function(supr) {
	this._def = {
		id: 'simulatePane',
		children: [
			{
				tag: 'iframe',
				id: 'simulatePaneFrame'
			}
		]
	};

	this.onBeforeShow = function() {
		if (this._project == this._lastProject) { return; }
		this._lastProject = this._project;

		var frame = this.simulatePaneFrame;
		
		//show a message to choose a project
		if (!this._project) {
			frame.src = "javascript:document.body.innerHTML='Select a project'";
		} else {
			frame.src = '/simulate/' + this._project.appID + '/#hasServer=0&clients=[{"displayName":"woot","device":"iphone","rotation":1,"entry":"intro"}]';
		}
	};

	this.onBeforeHide = function() {
		this._lastProject = null;
		document.getElementById('simulatePaneFrame').src = 'about:blank';
	};
});
