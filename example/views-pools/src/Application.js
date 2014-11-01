//# Using ViewPools <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/views/pools/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//This file demonstrates how to use ViewPools to efficiently manage views.

import animate;
import ui.View as View;
import ui.ImageView as ImageView;
import ui.ViewPool as ViewPool;

//## Class: Application
exports = Class(GC.Application, function() {

	//Define some constants for our ImageViews and animations.
	var IMG_WIDTH = 30;
	var IMG_HEIGHT = 30;

	this.initUI = function() {
		//Create a background View as a parent for our ImageViews.
		this.backgroundView = new View({
			superview: this.view,
			x: 0,
			y: 0,
			width: this.view.style.width,
			height: this.view.style.height,
			backgroundColor: "rgb(20, 20, 40)"
		});

		//Use backgroundView's tick function to drive our animations. Bind `this` as our context so we can reference the ViewPool we created. Otherwise, `this` within the tick function would refer to backgroundView.
		this.backgroundView.tick = bind(this, function(dt) {
			//Randomly throw views across the screen!
			if (Math.random() < 0.05) {
				//Choose an image at random.
				var image = Math.random() < 0.5 ? "resources/images/star.png" : "resources/images/heart.png";
				//Obtain an ImageView from our ViewPool with the desired options.
				var view = this.imageViewPool.obtainView();
				view.updateOpts({
					superview: this.backgroundView,
					x: Math.random() * (this.view.style.width - IMG_WIDTH),
					y: -IMG_HEIGHT,
					width: IMG_WIDTH,
					height: IMG_HEIGHT,
					visible: true
				});
				//Handle any extra, class-specific settings after obtaining the view.
				view.setImage(image);

				//Animate the view across the screen.
				animate(view)
					.now({ y: this.view.style.height }, 1500, animate.easeIn)
					//Then, when the animation finishes, release the view back to the pool!
					.then(bind(this, function() {
						this.imageViewPool.releaseView(view);
					}));
			}
		});

		//Initialize a ViewPool for ImageViews, and initialize 10 ImageViews to start.
		this.imageViewPool = new ViewPool({
			ctor: ImageView,
			initCount: 20,
			initOpts: {
				superview: this.backgroundView,
				width: IMG_WIDTH,
				height: IMG_HEIGHT,
				image: "resources/images/star.png"
			}
		});
	};

	this.launchUI = function () {};
});

//The output should look like this screenshot:
//<img src="./doc/screenshot.png" alt="a view screenshot" class="screenshot">
