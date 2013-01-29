import sdkPlugin;

from util.browser import $;

exports = Class(sdkPlugin.SDKPlugin, function(supr) {
	this._def = {
		id: 'nativePane',
		children: [
			{
				tag: 'iframe',
				id: 'nativePaneFrame'
			}
		]
	};

	this.onBeforeShow = function() {
		document.getElementById("nativePaneFrame").src = "http://0.0.0.0:9220";
	};

	this.onBeforeHide = function() {
		document.getElementById("nativePaneFrame").src = "about:blank";
	};
});
