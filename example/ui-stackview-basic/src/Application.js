//# Multiple Stacked Modals Using a StackView <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/ui/stackview-basic/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>

import ui.View as View;
import ui.TextView as TextView;
import ui.StackView as StackView;

//## Class: Application
exports = Class(GC.Application, function () {
	this.initUI = function () {
		this.style.backgroundColor = "#FFFFFF";

		var stackView = new StackView({
			superview: this.view,
			x: this.style.width / 2 - 100,
			y: this.style.height / 2 - 100,
			height: 200,
			width: 200,
			backgroundColor: "#999"
		});

		//when added to a stackView, child views take the same dimensions.
		var front = new TextView({
			text: "Click to dismiss!\nThis is the front view.",
			backgroundColor: "#00F", //blue,
			color: "#FFF",
			size: 20,
			autoSize: false,
			autoFontSize: false,
			wrap: true
		});

		var middle = new TextView({
			text: "Click to dismiss!\nThis is the middle view.",
			backgroundColor: "#080", //green
			color: "#FFF",
			size: 20,
			autoSize: false,
			autoFontSize: false,
			wrap: true
		});

		var back = new TextView({
			text: "Click to dismiss!\nThis is the back view.",
			backgroundColor: "#F00", //red
			color: "#FFF",
			size: 20,
			autoSize: false,
			autoFontSize: false,
			wrap: true
		});

		function popOff () {
			stackView.pop(this);
		}

		front.on('InputStart', popOff);
		middle.on('InputStart', popOff);
		back.on('InputStart', popOff);

		//Don't animate the views as they are attached to the stackView.
		stackView.push(front, true);
		stackView.push(middle, true);
		stackView.push(back, true);
	};

	this.launchUI = function () {};
});

//<img src="./doc/screenshot1.png" alt="view style screenshot" class="screenshot">
//<img src="./doc/screenshot2.png" alt="view style screenshot" class="screenshot">
//<img src="./doc/screenshot3.png" alt="view style screenshot" class="screenshot">
//<img src="./doc/screenshot4.png" alt="view style screenshot" class="screenshot">
