//# Using a sprite sheet <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/images/spritesheet/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//This file demonstrates how to set the source location of the image within an image map.

//This example demonstrates how to set the source location of the image within an image map.
//It uses an image `resources/images/stars.png` which contains nine separate images
//in a grid. Each of the nine images is displayed in a loop.

//Import the `ui.ImageView` class.
import ui.ImageView as ImageView;

//## Class: Application
//An application with default settings is defined.
exports = Class(GC.Application, function () {

	this.initUI = function() {
		//The SheetView class is instantiated with the root view as the parent.
		new SheetView({
			superview: this.view,
			x: 10,
			y: 10,
			width: 26 * 3,
			height: 26 * 3,
			image: "resources/images/stars.png"
		});
	};

	this.launchUI = function () {};
});

//## Class: SheetView
//Create a class to display an image from a sprite map:
var SheetView = Class(ImageView, function(supr) {
	this.init = function(opts) {
		supr(this, "init", [opts]);

		// The map contains three rows and three columns of images...
		var map = this.getImage().getMap();

		// Get the initial location,
		// if the image is packed in a sprite sheet then the left top
		// position is probably not (0, 0)
		this._offsetX = map.x;
		this._offsetY = map.y;

		// Get the size of the image in the sprite sheet, it is posible that the image is scaled.
		this._sizeX = (map.width / 3) | 0;
		this._sizeY = (map.height / 3) | 0;

		this._index = 0;
		this._dt = 500;
	};

	//The tick function is called each frame.
	this.tick = function (dt) {
		this._dt += dt;
		if (this._dt > 500) {
			this._dt %= 500;

			// Change the index, there are nine images.
			this._index = (this._index + 1) % 9;

			var map = this.getImage().getMap();

			// Use the values from the initial map.
			map.width = this._sizeX;
			map.height = this._sizeY;
			map.x = this._offsetX + ((this._index / 3) | 0) * this._sizeX;
			map.y = this._offsetY + (this._index % 3) * this._sizeY;
		}
	};
});

//A screenshot of one of the sprites on screen:
//<img src="./doc/screenshot.png" alt="a sprite" class="screenshot">
