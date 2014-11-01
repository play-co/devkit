//# A Basic View <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/views/basic/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//This file demonstrates how to create a simple view.

import device;

//Import the [ui.View](../../api/ui-view.html) class
import ui.View as View;

//## Class: Application
exports = Class(GC.Application, function() {
	this.initUI = function() {
		this.style.backgroundColor = "#FFFFFF";

		// Create a single red squared view...
		var view = new View({
			superview: this.view,
			backgroundColor: "#FF0000",
			x: 50,
			y: 50,
			width: device.width - 100,
			height: device.height - 100
		});
	};

	this.launchUI = function () {};
});

//The output should look like this screenshot:
//<img src="./doc/screenshot.png" alt="a view screenshot" class="screenshot">
