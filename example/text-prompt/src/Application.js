//# TextView: Text wrapping and alignment <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/text/prompt/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//This demo demonstrates different setting for the TextView class
import ui.View as View;
import ui.TextView as TextView;
import device;

import ui.TextPromptView as TextPromptView;

//## Class: Application
exports = Class(GC.Application, function () {
	this.initUI = function () {
		this.view.style.backgroundColor = "#FFFFFF";

		this._textPromptView = new TextPromptView({
			//These are inherited properties from View and TextView...
			superview: this.view,
			x: device.width / 2 - 140,
			y: 10,
			backgroundColor: "#404040",
			width: 280,
			height: 30,
			color: "#FFFFFF",
			size: 11,
			horizontalAlign: "center",
			verticalALign: "center",
			wrap: false,
			autoSize: false,
			autoFontSize: false,
			clip: true,
			//The message shown in the dialog
			prompt: "Say hello!",
			//Set the text shown in the TextPromptView, when the view is clicked, the text is changed and ok clicked
			//then the text in the view will be updated
			text: "show prompt"
		});

		//Subscribe to the change event, this event is published when the text is changed and ok is pressed.
		this._textPromptView.subscribe("Change", this, "onChangeText");
		//Subscribe to the cancel event, this event is published when the cancel button in the dialog is pressed.
		this._textPromptView.subscribe("Cancel", this, "onCancelText");

		//Create the TextView the show if text is changed or cancel pressed.
		this._textView = new TextView({
			superview: this.view,
			layout: "box",
			text: "",
			color: "#000000",
			backgroundColor: "#E0E0E0",
			horizontalAlign: "left",
			padding: 10,
			wrap: true,
			autoSize: false,
			autoFontSize: true,
			verticalAlign: "top",
			x: device.width / 2 - 140,
			y: 45,
			width: 280,
			height: 100,
			size: 20,
			fontFamily: "Arial Black",
			clip: true
		});
	};

	//This function is called when the text is changed and ok is pressed
	this.onChangeText = function (text) {
		this._textView.setText("Text input: '" + text + "'");
	};

	//This function is called when cancel is clicked in the dialog
	this.onCancelText = function (text) {
		this._textView.setText("Cancel selected.");
	};

	this.launchUI = function () {};
});

//The output should look like this screenshot:
//<img src="./doc/screenshot.png" alt="a book screenshot" class="screenshot">