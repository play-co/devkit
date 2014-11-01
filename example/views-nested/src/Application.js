//# Nesting view <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/views/nested/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//This file demonstrates the nesting of [views](../../api/ui-view.html).
//Create two rectangles, one red and blue. The red rectangle is displayed in front of the blue by modifying its `zIndex` property.

//Import information about the device.
import device;
//Import ui.View class.
import ui.View as View;

//## Class: Application
exports = Class(GC.Application, function () {
	this.initUI = function () {
		this.style.backgroundColor = "#FFFFFF";

		new DoubleBox({superview: this, width: device.width, height: device.height});
	};
});

//## Class: DoubleBox
//This class inherits from `ui.View` and contains two child views
var DoubleBox = Class(View, function (supr) {
	this.init = function (opts) {
		supr(this, "init", [opts]);

		this.style.backgroundColor = "#FFDD00"; //Yellow

		this.style.x = device.width * 0.125;
		this.style.y = device.height * 0.125;
		this.style.width = device.width * 0.75;
		this.style.height = device.height * 0.75;

		//Create a View with a red background color.
		new View({
			superview: this,
			x: 0,
			y: 0,
			width: device.width * 0.5,
			height: device.height * 0.5,
			backgroundColor: '#FF0000', //Red
			zIndex: 1
		});
		//Create a View with a blue background color.
		new View({
			superview: this,
			x: device.width * 0.25,
			y: device.height * 0.25,
			width: device.width * 0.5,
			height: device.height * 0.5,
			backgroundColor: '#0000FF' //Blue
		});
	};
});

//Load this code as the `Application.js` file in your project, run the simulator, and you should see something like this:
//<img src="./doc/screenshot.png" alt="nested views screenshot" class="screenshot">
