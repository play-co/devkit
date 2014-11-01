import ui.View as View;
import ui.SpriteView as SpriteView;

exports = Class(GC.Application, function () {

	this.initUI = function () {
		this.on('InputSelect', function(evt, pt) {
			// Create a sprite of the sdkBot
			var mySprite = new SpriteView({ 
				superview: this, 
				x: pt.x, 
				y: pt.y,
				autoSize: true, // Can autosize the sprite view to image
				offsetX: -200, // But these need to be specified to center on cursor
				offsetY: -200,
				url: 'resources/images/sdkBot', 
			}); 

			// Start animation of walking
			mySprite.startAnimation('walk', {
				iterations: 4, // Iterate it a couple of times
				callback: function () {
					// Clean up the animation subsystem to avoid leaks
					mySprite.stopAnimation();

					// Clean up the view subsystem to avoid leaks
					mySprite.removeFromSuperview(); 
				} 
			});
		});
	};
	
	this.launchUI = function () {};
});
