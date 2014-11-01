//# Many Random TextView <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/text/textviews-random/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//Here we'll create a header using some of the `TextView` positional options, then add many, many random letters scattered around the screen, each its own `TextView`.

import device;
import ui.TextView as TextView;

exports = Class(GC.Application, function () {
	this.initUI = function () {
		//Create the header bar.
		var title = new TextView({
			superview: this.view,
			autoSize: false,
			y: 20,
			height: 25,
			fontSize: 26,
			zIndex: 1,
			text: "Welcome to the TextView",
			color: "#000000",
			backgroundColor: "#FFFFFF",
			shadow: true,
			shadowColor: "#FFFFFF",
			verticalAlign: "top",
			textAlign: "left",
			verticalPadding: 5,
			horizontalPadding: 25
		});
		//Create a lot of TextViews
		for (var i = 0; i < 1500; i++) {
			//Randomize the style properties of each TextView.
			var letter = new TextView({
				superview: this.view,
				text: Math.random().toString(36).substring(2, 3),
				color: "#FFF",
				opacity: Math.random(),
				fontSize: Math.random() * 36,
				x: Math.random() * device.width,
				y: Math.random() * device.height,
				width: Math.random() * 50,
				height: Math.random() * 50,
				r: Math.random() * (Math.PI * 2)
			});
		};
	}
});

//Place this in the `Application.js` file of your project and you should see something like the following screenshot.
//It should be noted that this is a static scene for the purpose of demonstrating `TextView` creation.
//If you tried to animate this many views at once on an actual mobile device, you may run into performance issues.
//<img src="./doc/screenshot.png" alt="many textviews screenshot" class="screenshot">
