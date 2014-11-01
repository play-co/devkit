//# Handling click events <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/events/input-click/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//This file demonstrates how to handle click events, when the view is clicked the color changes.

//Import the `ui.View` class.
import ui.View as View;

//## Class: Application
//Create an application with the clickable view.
exports = Class(GC.Application, function () {

	//Create a new instance of the ClickBox view with the applications view as superview.
	this.initUI = function () {
		this.style.backgroundColor = "#FFFFFF";
		new ClickBox({
			superview: this.view,
			x: this.style.width / 4,
			y: this.style.height / 4,
			width: this.style.width / 2,
			height: this.style.height / 2,
			backgroundColor: "#FF0000"
		});
	};

	this.launchUI = function () {};
});

//## Class: ClickBox
//Create a view which changes color when clicked.
var ClickBox = Class(View, function (supr) {
	this.init = function (opts) {
		supr(this, "init", [opts]);

		this.on("InputSelect", function () {
			// Change the background color of this view
			var backgroundColor = (this.style.backgroundColor === "#FF0000") ? "#0000FF" : "#FF0000";
			this.updateOpts({backgroundColor: backgroundColor});
		});
	};
});

//The output should look like this screenshot:
//<img src="./doc/screenshot1.png" alt="a book screenshot" class="screenshot">
//After clicking on the red rectangle the screen should look like this:
//<img src="./doc/screenshot2.png" alt="a book screenshot" class="screenshot">
