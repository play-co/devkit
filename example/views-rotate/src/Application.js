//# Rotate Views <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/views/rotate/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//Create two views and rotate them around different centers.

import device;

import ui.View as View;

import ui.TextView as TextView;

exports = Class(GC.Application, function () {

	this.initUI = function () {
		this.style.backgroundColor = "#FFFFFF";

		this._time = 0;

		//Create a view, set the anchor to the center of the view, this view will rotate around its center
		this._view1 = new View({
			superview: this.view,
			backgroundColor: "#FF0000",
			x: device.width * 0.25,
			y: device.height * 0.25,
			width: 100,
			height: 100,
			anchorX: 50,
			anchorY: 50
		});

		//Create another view, this view will rotate around the top left corner
		this._view2 = new View({
			superview: this.view,
			backgroundColor: "#0000FF",
			x: device.width * 0.75,
			y: device.height * 0.75,
			width: 100,
			height: 100
		});
	};

	//This function is called each time a frame is rendered,
	//the `dt` parameter is the number of milliseconds between this call and
	//the previous call
	this.tick = function (dt) {
		this._time += dt;

		this._view1.style.r = this._time / 1000;
		this._view2.style.r = this._time / 1000;
	};

	this.launchUI = function () {};
});

//The output of this demo should look like this:
//<img src="./doc/screenshot.png" alt="view style screenshot" class="screenshot">