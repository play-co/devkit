//# Text View Clock <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/text/textviews-clock/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//Here we will create a completely working clock using Text Views!
//Different positioning and scaling options are presented in this example
//as well as how to update text views dynamically after creation.

import device;
import ui.TextView as TextView;

exports = Class(GC.Application, function () {
	this.initUI = function () {
		this.style.backgroundColor = "#FFFFFF";

		//Create the header bar.
		var title = new TextView({
			superview: this.view,
			buffer: false,
			autoFontSize: true,
			x: 50,
			y: 20,
			height: device.height * .10,
			width: this.view.style.width - 100,
			size: (device.height * .05)  | 0,
			text: "Text View Clock",
			color: "#888888",
			backgroundColor: "#D8D8D8",
			outlineColor: "#000000",
			verticalPadding: 5,
			horizontalPadding: 20
		});

		// Create a TextView to hold the date
		var dateTextView = new TextView({
			superview: this.view,
			buffer: false,
			autoFontSize: true,
			x: 50,
			y: title.style.y + title.style.height + device.height * .05,
			height: device.height * .25,
			width: this.view.style.width - 100,
			size: (device.height * .07) | 0,
			wrap: true,
			text: "Date\n",
			color: "#FF8888",
			backgroundColor: "#DDDDDD",
			outlineColor: "#000000",
			verticalPadding: 5,
			horizontalPadding: 20
		});

		// Create a TextView to hold the time
		var timeTextView = new TextView({
			superview: this.view,
			buffer: false,
			autoFontSize: true,
			x: 50,
			y: dateTextView.style.y + dateTextView.style.height + 40,
			height: device.height * .3,
			width: this.view.style.width - 100,
			size: (device.height * .06) | 0,
			wrap: true,
			text: "Time\n",
			color: "#4488FF",
			outlineColor: "#000000",
			verticalPadding: 5,
			horizontalPadding: 20,
			backgroundColor: "#D0D0D0"
		});

		// Check what the date / time it is every half second, and
		// adjust date and time appropriately within the text views.
		// Make sure we don't miss a second!
		setInterval(bind(this, function() {
			var date = new Date();
			dateTextView.setText("Date\n" + date.toLocaleDateString().replace(/\//g, ' / '));
			timeTextView.setText("Time\n" + date.toLocaleTimeString());
		}, 500));
	}
});

//Place this in the `Application.js` file of your project and you should see something like the following screenshot.
//<img src="./doc/screenshot.png" alt="many textviews screenshot" class="screenshot">
