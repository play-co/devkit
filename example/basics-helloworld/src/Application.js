//# Hello, World! <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/basics/helloworld/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//For a more detailed walk-through, take a look at the [Hello, World! Guide](http://doc.gameclosure.com/guide/hello-world.html).

//Import the [TextView](../../api/ui-text.html#class-ui.textview) class to use locally.
import ui.TextView as TextView;

//## Class: Application
//All user applications inherit from [GC.Application](../../api/appengine.html#class-gc.application).
exports = Class(GC.Application, function () {

	//The [initUI](../../api/appengine.html#handler-initui) function is called after the scene graph has been created.
	this.initUI = function () {
		//Create a new TextView instance
		var textview = new TextView({
			//Once attached to the view hierarchy, the view is a part of the scene graph and will be rendered.
			superview: this.view,
			//The layout system is explained in detail in the [Designing User Interfaces Guide](../../guide/designing-user-interfaces.html).
			layout: "box",
			//The text to display on screen
			text: "Hello, world!",
			color: "blue"
		});
	};

	//The [launchUI](../../api/appengine.html#handler-launchui) function is executed when the game is ready, and the splash screen has been removed.
	this.launchUI = function () {};
});
