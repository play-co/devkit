//# Using 9-Slice image scaling in an animation <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/images/nine-slice-animation/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//This file demonstrates how to use 9-slice in an animating scroll.
//This example requires two images located in the resources directory:
//`resources/images/scrollBottom.png` and `resources/images/scrollTop.png`.

//Import device to get the size of the screen, import ImageView to display a
//basic image and import ImageScaleView to apply 9-slice scaling to an image.
import device as device;
import ui.ImageView as ImageView;
import ui.ImageScaleView as ImageScaleView;

//## Class: Application
//Create an application class with the default settings.
exports = Class(GC.Application, function() {

	this.initUI = function() {
		// The device width is used to center the image.
		this._imageScaleView = new ImageScaleView({
			superview: this.view,
			x: (device.width - 165) / 2,
			y: 15,
			width: 165,
			height: 50,
			image: "resources/images/scrollBottom.png",
			scaleMethod: "9slice",
			// These are the slices from the source image...
			//
			// If the sum of the slices in a direction doesn't match the image size
			// of that given direction then the slice size is scaled, for example:
			//
			// The image has a width of 120 pixels,
			// the horizontal slices are 50, 60 and 70
			// then the slices are scaled with: 120 / (50 + 60 + 70)
			sourceSlices: {
				horizontal: {left: 120, center: 120, right: 120},
				vertical: {top: 10, middle: 215, bottom: 75}
			},
			// These are the destination slices...
			//
			// If the images width is larger then the sum of the horizontal
			// slices then the rest value is filled with the center slice.
			//
			// If the sum of the horizontal slices exceeds the width then
			// the slices are scaled to fit and no center is used.
			destSlices: {
				horizontal: {left: 55, right: 55},
				vertical: {top: 5, bottom: 50}
			}
		});

		// Put an image on top of the animating image...
		var imageview = new ImageView({
			superview: this.view,
			x: (device.width - 165) / 2,
			y: 10,
			width: 165,
			height: 35,
			image: "resources/images/scrollTop.png"
		});

		this.animate();
	};

	//A continuous animation.
	//First the height of the image is increased, the center stretches but the top
	//and bottom caps keep their width and height. When the image height is 250 pixels
	//then then animation pauses for 1.5 seconds after which the size is decreased to
	//70 pixels. After pausing another 1.5 seconds the animation starts again.
	this.animate = function() {
		this._imageScaleView.getAnimation()
			.clear()
			// Increase the height, the center stretches
			.then({height: 250}, 350)
			.wait(1500)
			// Decrease the height
			.then({height: 70}, 350)
			.wait(1500)
			// Run it again
			.then(bind(this, "animate"));
	};

	this.launchUI = function () {};
});
//<img src="./doc/screenshot.png" alt="9-slice screenshot" class="screenshot">
