//# Create a ScrollView <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/ui/scrollview-basic/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//In this example, we’ll use the `ScrollView` as a viewport to move around a large background image.
//Dragging the screen moves the map until it reaches the edge of the scroll bounds.

import ui.ScrollView as ScrollView;
import ui.ImageView as ImageView;
import ui.resource.Image as Image;

var backgroundImage = new Image({url: "resources/images/europemap.png"});

//## Class: Application
exports = Class(GC.Application, function () {

	this.launchUI = function () {
		var scrollView = new ScrollView({
			superview: this.view,
			scrollBounds: {
				minX: 0,
				maxX: backgroundImage.getWidth(), //=> 916 px
				minY: 0,
				maxY: backgroundImage.getHeight() //=> 672 px
			},
			x: 0,
			y: 0,
			width: this.style.width,
			height: this.style.height
		});

		var imageView = new ImageView({
			superview: scrollView,
			image: backgroundImage,
			width: backgroundImage.getWidth(),
			height: backgroundImage.getHeight()
		});
	};
});

//The output of this demo should look like this:
//<img src="./doc/screenshot.png" alt="scrollview screenshot" class="screenshot">
