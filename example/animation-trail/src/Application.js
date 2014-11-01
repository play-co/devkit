//# Trailing Animation
//This example shows how to create a trail behind the mouse when clicking and dragging.
//How to use: click on the view and then drag.

//Import the `ui.View` class.
import ui.View as View;
//Import the `animate` module.
import animate;

//## Class: Application
exports = Class(GC.Application, function () {

	this.initUI = function () {
		this.style.backgroundColor = "#FFFFFF";

		this.view.on("InputMove", function (evt, pt) {
			new TrailBox(merge(pt, {superview: GC.app.view}))
		});
	};

	this.launchUI = function () {};
});

//## Class: TrailBox
//Create a View which fades out and the removes its self.
var TrailBox = Class(View, function(supr) {
	this.init = function (opts) {
		opts = merge(opts, {
			backgroundColor: "#FF0000",
			opacity: 0.8,
			anchorX: 1.5,
			anchorY: 1.5,
			width: 3,
			height: 3,
			r: 0
		});

		supr(this, "init", [opts]);

		animate(this).now({
			opacity: 0,
			x: opts.x - 15,
			y: opts.y - 15,
			anchorX: 15,
			anchorY: 15,
			width: 30,
			height: 30,
			r: Math.PI * 4
		}, 1500).then(this.removeFromSuperview.bind(this));
	};
});
//The output should look like this screenshot:
//<img src="./doc/screenshot.png" alt="a book screenshot" class="screenshot">