//# Detect an input out event <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/events/input-handling/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//This demo shows how to detect some of the more commonly used input events on views.
//These events include "InputStart", "InputOver", "InputMove", "InputOut", and "InputSelect"
//Try experimenting with clicking on and off of the red view and by moving input on and off
//of the red view and see which events are triggered at what times.

//Import the `ui.View` class.
import ui.View as View;
import ui.TextView as TextView;

//## Class: Application
//Create an application with its default settings.
exports = Class(GC.Application, function () {

	this.initUI = function () {
		this.style.backgroundColor = "#FFFFFF";
		var clickBox = new ClickBox({
			superview: this.view,
			x: this.style.width / 4,
			y: this.style.height / 4,
			width: this.style.width / 2,
			height: this.style.height / 2,
			backgroundColor: "#FF0000"
		});

		this.view.on("InputSelect", bind(this, function () {
			// Restore the background of the view.
			clickBox.updateOpts({backgroundColor: "#FF0000"});
		}));
	};

	this.launchUI = function () {};
});

//## Class: ClickBox
//Create a view based on the view class which changes color when clicked.
//The view will also change the text presented inside of it when different
//input events occur.
var ClickBox = Class(View, function (supr) {
	this.init = function (opts) {
		supr(this, "init", [opts]);

		//create a TextView to indicate which input event is currently occurring
		this.textView = new TextView({
			superview: this,
			size: this.style.height / 4,
			wrap: true,
			width: this.style.width,
			height: this.style.height,
			color: "#FFFFFF"
		});

		this.on("InputStart", function () {
			// Change text to "input start" when view is clicked.
			this.textView.setText("input\nstart");
			// Change the color when the view is clicked.
			this.style.backgroundColor = "#AA0000";
		});

		this.on("InputOver", function () {
			// Change text to "input over" when input is moved over the view
			this.textView.setText("input\nover");
			// Change the view when dragged outside the view.
			this.style.backgroundColor = "#AA0000";
		});
		this.on("InputMove", function () {
			// Change text to "input move" when input is moved on the view
			this.textView.setText("input\nmove");
			// Change the view when dragged outside the view.
			this.style.backgroundColor = "#AA0000";
		});

		this.on("InputOut", function () {
			// Change text to "input out" when input has left the view
			this.textView.setText("input\nout");
			// Change the view when dragged outside the view.
			this.style.backgroundColor = "#AA0000";
		});

		this.on("InputSelect", function () {
			// Change text to "input up" when the view is deselected
			this.textView.setText("input\nup");
			// Change the color when the view is clicked.
			this.style.backgroundColor = "#AA0000";
		});

	};

});

//The output should look like this screenshot:
//<img src="./doc/screenshot.png" alt="a book screenshot" class="screenshot">