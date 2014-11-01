//# TextView: Text wrapping and alignment <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/text/prompt/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//This demo demonstrates different setting for the TextView class
import ui.View as View;
import ui.TextView as TextView;
import device;

import ui.TextEditView as TextEditView;

//## Class: Application
exports = Class(GC.Application, function () {
	this.initUI = function () {
		this.view.style.backgroundColor = "#FFFFFF";

		this._textEditView = new TextEditView({
			superview: this.view,
			x: device.width / 2 - 140,
			y: 10,
			backgroundColor: "#404040",
			width: 280,
			height: 30,
			color: "#FFFFFF",
			hintColor: "pink",
			//The message shown in the dialog
			hint: "Say hello!"
		});

		//Subscribe to the Change event. This event is published when the text is changed.
		this._textEditView.subscribe("Change", this, "onChangeText");

		//Create the TextView the show latest text.
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

	//This function is called when the text is changed.
	this.onChangeText = function (text) {
		this._textView.setText("Text input: '" + text + "'");
	};
});

//Note that the TextEditView currently falls back to an input prompt
//on iOS and in the simulator.

//The output should look like this screenshot:
//<img src="./doc/screenshot.png" alt="a book screenshot" class="screenshot">