//# Pause an Animation
//Pause and resume an animation. Click on the view to pause, click again to resume.

//Import the `ui.View` class.
import ui.View as View;
//Import the `animate` module.
import animate;

//## Class: Application
exports = Class(GC.Application, function() {

	this.initUI = function() {
		this.style.backgroundColor = "#FFFFFF";
		// Create a single red squared view...
		var square = new AnimationView({
			superview: this.view,
			backgroundColor: "#FFDD00",
			x: 20,
			y: 20,
			width: 100,
			height: 100
		});
		//Start the animation.
		square.continuousAnimate();
	};

	this.launchUI = function () {};
});

//## Class: AnimateView
var AnimationView = Class(View, function (supr) {
	this.init = function (opts) {
		supr(this, "init", [opts]);
		//Store the Animation object for this view.
		this.anim = animate(this);
		//When the view is selected, pause or resume
		this.on("InputSelect", bind(this, function () {
			if (this.anim.isPaused()) {
				this.anim.resume();
			} else {
				this.anim.pause();
			}
		}));
	};

	this.continuousAnimate = function () {
		//Clear the animation queue
		this.anim.clear()
			// Move right - linear
			.then({x: 200}, 1500, animate.linear)
			// Move down - ease in
			.then({y: 200}, 1500, animate.easeIn)
			// Move left - ease out
			.then({x: 20}, 1500, animate.easeOut)
			// Move up - ease in, ease out
			.then({y: 20}, 1500, animate.easeInOut)
			// Start animating again
			.then(this.continuousAnimate.bind(this));
	};
});
//<img src="./doc/screenshot.png" alt="trail screenshot" class="screenshot">