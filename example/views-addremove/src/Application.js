//# Add and Remove Views <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/views/addremove/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//This file demonstrates how to move a subview from one superview to another superview.

import device;

//Import the ui.View class.
import ui.View as View;

//## Class: Application.js
exports = Class(GC.Application, function() {
	this.initUI = function() {
		this.style.backgroundColor = "#FFFFFF";

		//Create a view, this is a view which will be the superview of the JumpingBox view.
		new View({
			superview: this.view,
			backgroundColor: "#FF0000",
			x: device.width / 2 - 100,
			y: device.height / 2 - 100,
			width: 100,
			height: 100
		});

		//Create another view, this is a view which will be the superview of the JumpingBox view.
		new View({
			superview: this.view,
			backgroundColor: "#0000FF",
			x: device.width / 2,
			y: device.height / 2,
			width: 100,
			height: 100
		});

		//This view will jump between the two previously instantiated views.
		new JumpingBox({
			superview: this.view.getSubviews()[0],
			backgroundColor: "#008800",
			x: 25,
			y: 25,
			width: 50,
			height: 50
		});
	};

	this.launchUI = function () {};
});

//## Class: JumpingBox
//This is a box which will jump from the red box to the blue box and back.
var JumpingBox = Class(View, function (supr) {
	this.init = function (opts) {
		supr(this, "init", [opts]);

		this._dt = 0;
		//This view starts as a subview of the red box.
		this._index = 0;
	};

	this.tick = function (dt) {
		//The number of milliseconds passed since the last time the tick function was called.
		this._dt += dt;
		//Jump every 500 ms.
		if (this._dt > 500) {
			this._dt %= 500;

			//Get the superview of the superview which is the superview of the red or blue box.
			var superview = this._superview.getSuperview();

			//Remove this view from its superview,
			//if this._index equals 0 the the superview is the red box
			//if this._index equals 1 the the superview is the blue box
			this.removeFromSuperview();

			//Use indices 0, 1, 0, 1, 0, 1, etc.
			this._index = (this._index + 1) & 1;

			//Add this view to the red or the blue view.
			superview.getSubviews()[this._index].addSubview(this);
		}
	};
});

//<img src="./doc/screenshot1.png" alt="trail screenshot" class="screenshot">
//<img src="./doc/screenshot2.png" alt="trail screenshot" class="screenshot">