//# Scaling to Fit <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/basics/scalescreen/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//This example scales the viewport to fit the device screen, reguardless of the
//aspect ratio. For a more thorough treatment, see the [Scaling the Game Guide](../../guide/scaling.html).
//Art delivered at 576x1024 has a ratio of 0.5625, a 1024 max texture size scaled
//up to 720x1280 has the same ratio. `576x1024 * 1.25 = 720x1280`

//Import the [device](http://../../api/device.html) module
import device;
//Import the [ImageView](../../api/ui-images.html) class
import ui.ImageView as ImageView;
//Import the [SpriteView](../../api/ui-spriteview.html) class
import ui.SpriteView as SpriteView;

//All screen coordinates are in this 576x1024 space, art should be delivered at this size.
var boundsWidth = 576,
    boundsHeight = 1024,
    baseWidth = boundsWidth,
		//`baseHeight` is calculated as 864.
    baseHeight = device.screen.height * (boundsWidth / device.screen.width),
    scale = device.screen.width / baseWidth,
		//`right_boundry` is used for screen wrapping.
    rightBoundary = baseWidth,
    leftBoundary = 0,
    vx = 0;

//## Class: GC.Application
exports = Class(GC.Application, function () {

  this.initUI = function () {
    //Scale the root view
    this.view.style.scale = scale;

		//Create the background image, its size is 576x1024.
    var background = new ImageView({
      superview: this.view,
      x: 0,
      y: 0,
      width: baseWidth,
      height: baseHeight,
      image: "resources/images/background.jpg",
      zIndex: 0
    });

		//Create a sprite using a directory full of images as frames.
    var sprite = new SpriteView({
      superview: background,
      x: baseWidth/2,
      y: baseHeight - 400,
      width: 300,
      height: 300,
      url: "resources/images/sdkBot/sdkBot",
      defaultAnimation: 'idle',
      autoStart: true,
      zIndex: 1
    });

    //The sprite's movement is determined by its position relative to the mouse position relative.
    this.view.on('InputSelect', function (evt, pt) {
      //Localize the mouse position to sprite; this is one-level deep.
      var x0 = sprite.style.x + sprite.style.width/2,
          y0 = sprite.style.y + sprite.style.height/2;

      //If the sprite is clicked, stop movement and return to the idle animation.
      if (sprite.containsLocalPoint({x: pt.x - sprite.style.x, y: pt.y - sprite.style.y})) {
        if (sprite.isPlaying) {
          vx = 0;
          sprite.resetAnimation();
        }
      } else if (pt.x < sprite.style.x + sprite.style.width/2) {
        //Walk left
        vx = -2;
        sprite.stopAnimation();
        if (sprite.style.flipX) { sprite.style.flipX = false; }
        sprite.startAnimation('walk', {loop: true});

      } else {
        //Walk right
        vx = 2;
        sprite.stopAnimation();
        if (!sprite.style.flipX) { sprite.style.flipX = true; }
        sprite.startAnimation('walk', {loop: true});
      }
    });

		//Called every animation frame.
    GC.app.engine.on('Tick', function () {
      //Add horizontal movement
      sprite.style.x += vx;

      //Apply screen wrapping to the sprite.
      if (sprite.style.x > rightBoundary) {
        sprite.style.x = leftBoundary - sprite.style.width;
      } else if (sprite.style.x + sprite.style.width < leftBoundary) {
        sprite.style.x = rightBoundary;
      }
    });
  };
});
