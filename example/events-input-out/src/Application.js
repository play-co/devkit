//# Detect an input out event <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/events/input-out/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//This demo shows how to detect if there's a click on the view but released outside the view.
//This construction is mainly used for buttons, a button click is only registered when a user
//touches the button and the touch up event is also triggered inside the same button.
//Click on the view and then drag out of the view and release.

//Import the `ui.View` class.
import ui.View as View;

//## Class: Application
//Create an application.
exports = Class(GC.Application, function () {

	this.initUI = function () {
		this.style.backgroundColor = "#FFFFFF";
		var clickBox = new ClickBox({
			superview: this.view,
			x: this.style.width / 4,
			y: this.style.height / 4,
			width: this.style.width / 2,
			height: this.style.height / 2,
			backgroundColor: "#008800"
		});

		this.view.on("InputSelect", bind(this, function () {
			//Restore the background of the view.
			clickBox.updateOpts({backgroundColor: "#FF0000"});
		}));
	};

	this.launchUI = function () {};
});

//## Class: clickBox
//Create a view based on the view class which changes color when clicked.
var ClickBox = Class(View, function (supr) {
	this.init = function (opts) {
		supr(this, "init", [opts]);

		this.on("InputStart", function () {
			//Change the color when the view is clicked.
			this.style.backgroundColor = "#0000FF";
		});

		this.on("InputOut", function () {
			//Change the view when dragged outside the view.
			this.style.backgroundColor = "#00AA00";
		});
	};
});

//The output should look like this screenshot:
//<img src="./doc/screenshot.png" alt="a book screenshot" class="screenshot">
