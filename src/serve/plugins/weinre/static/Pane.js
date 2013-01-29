import sdkPlugin;

from util.browser import $;

exports = Class(sdkPlugin.SDKPlugin, function(supr) {
	this._def = {
		id: 'weinrePane',
		children: [
			{
				tag: 'iframe',
				id: 'weinrePaneFrame'
			}
		]
	};

	this.onBeforeShow = function() {
		document.getElementById("weinrePaneFrame").src = "http://0.0.0.0:9223/client/#anonymous";
	};

	this.onBeforeHide = function() {
		document.getElementById("weinrePaneFrame").src = "about:blank";
	};
});
