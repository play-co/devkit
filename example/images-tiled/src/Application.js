//# Tiled ImageScaleView <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/images/tiled/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//This demo shows how to display tiled images.

//The debugging flag of the `ImageScaleView` is set to true so you can see the view bounds.
import ui.ImageScaleView;

exports = Class(GC.Application, function () {
	this.initUI = function () {
		// create a tiling ImageScaleView
		new ui.ImageScaleView({
			superview: this,
			image: 'resources/images/flower.png',
			layout: 'box',
			layoutWidth: '80%',
			layoutHeight: '80%',
			scaleMethod: 'tile',
			columns: 5,
			centerX: true,
			centerY: true,
			debug: true
		});
	};
});

//Run this code as the `Application.js` file in your project, and you should see something
//like this in the simulator:
//<img src="./doc/screenshot.png" alt="tiled screenshot" class="screenshot">