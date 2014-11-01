//# 6-Slice Image Scaling <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/images/six-slice/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//Given the following image:
//<img src="./doc/window.png" alt="button image" class="screenshot" style="display:block;width:200px;">

//This demos shows how to display images with 6-slice scaling. The three images have different ratios between
//the source and destination slices.

//The debugging flag of the `ImageScaleView` is set to true so you can see how the slices are sectioned off.

import device;
import ui.ImageScaleView;

exports = Class(GC.Application, function () {
	this.initUI = function () {
		this.style.backgroundColor = "#FFFFFF";

		var y = device.height / 2 - 165;
		for (var i = 0; i < 3; i++) {
			new ui.ImageScaleView({
				superview: this.view,
				x: device.width / 2 - 110,
				y: y + i * 110 + 10,
				width: 100,
				height: 100,
				image: "resources/images/window.png",
				scaleMethod: "6slice",
				debug: true,
				sourceSlices: {
					horizontal: {left: 50, center: 100, right: 50},
					vertical: {top: 50, bottom: 50}
				},
				destSlices: {
					horizontal: {left: 10 + i * 20, right: 10 + i * 20},
					vertical: {top: 50, bottom: 50}
				}
			});

			new ui.ImageScaleView({
				superview: this.view,
				x: device.width / 2 + 10,
				y: y + i * 110 + 10,
				width: 100,
				height: 100,
				image: "resources/images/window.png",
				scaleMethod: "6slice",
				debug: true,
				sourceSlices: {
					horizontal: {left: 50, right: 50},
					vertical: {top: 50, middle: 100, bottom: 50}
				},
				destSlices: {
					horizontal: {left: 50, right: 50},
					vertical: {top: 10 + i * 20, bottom: 10 + i * 20}
				}
			});
		}
	};
});

//Run this code as the `Application.js` file in your project, and you should see something
//like this in the simulator:
//<img src="./doc/screenshot.png" alt="9-slice screenshot" class="screenshot">