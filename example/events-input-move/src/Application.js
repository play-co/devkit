//# Create a trail with move events <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/events/input-move/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//This demo shows how to create a trail behind the mouse when clicking and dragging.
//Click on the view and then drag.

//Import the `ui.View` class.
import ui.View as View;

//## Class: Application
//Create an application.
exports = Class(GC.Application, function () {

	//Create a circular buffer and the index in the buffer.
	this.initUI = function () {
		this.style.backgroundColor = "#FFFFFF";
		//A circular buffer
		this._trail = [];
		//The index in the buffer
		this._index = 0;

		//This function is called when the user drags. The second parameter contains the drag coordinates.
		this.view.on("InputMove", function (evt, pt) {
			var opts = {superview: GC.app.view, x: pt.x - 3, y: pt.y - 3};

			if (GC.app._trail.length < 64) {
				//Add a new view to the circular buffer.
				GC.app._trail.push(new TrailBox(opts));
			} else {
				GC.app._trail[GC.app._index].reset(opts);
				//Next value of the circular buffer.
				GC.app._index = (GC.app._index + 1) & 63;
			}
		});
	};

	this.launchUI = function () {};
});

//## Class: TrailBox
//Create a view which fades out over a time of 500 ms.
var TrailBox = Class(View, function (supr) {
	this.init = function (opts) {
		supr(this, "init", [merge(opts, {width: 6, height: 6, backgroundColor: "#008800"})]);
		//Set the start time.
		this._dt = 0;
	};

	//Reset the view.
	this.reset = function (opts) {
		//Set the start time
		this._dt = 0;
		//Because opts contains a superview this view is added to the superview!
		this.updateOpts(opts);
	};

	//This function is called 500ms and then removed from its superview
	this.tick = function (dt) {
		this._dt += dt;
		if (this._dt > 500) {
			//Remove this view from the superview
			this.removeFromSuperview();
		} else {
			//Fade out...
			this.updateOpts({opacity: 1 - this._dt / 500});
		}
	};
});

//When you click (or touch) and drag the screen should look like this:
//<img src="./doc/screenshot.png" alt="trail screenshot" class="screenshot">