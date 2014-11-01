import device;

import ui.TextView as TextView;
import ui.widget.ButtonView as ButtonView;

exports = Class(GC.Application, function () {

	this.initUI = function () {
		this.view.style.backgroundColor = "#FFFFFF";

		//Create button2 first because button1 and button2 bind callbacks to this button...
		//This is the button which will be enabled or disabled
		this._button2 = new ButtonView({
			superview: this.view,
			width: 200,
			height: 60,
			x: device.width / 2 - 100,
			y: 150,
			images: {
				up: "resources/images/blue1.png",
				down: "resources/images/blue2.png",
				disabled: "resources/images/white1.png"
			},
			scaleMethod: "9slice",
			sourceSlices: {
				horizontal: {left: 80, center: 116, right: 80},
				vertical: {top: 10, middle: 80, bottom: 10}
			},
			destSlices: {
				horizontal: {left: 40, right: 40},
				vertical: {top: 4, bottom: 4}
			},
			title: "Button",
			text: {
				color: "#000044",
				size: 16,
				autoFontSize: false,
				autoSize: false
			}
		});

		//When this button is clicked then the button in the middle will be disabled...
		new ButtonView({
			superview: this.view,
			width: 200,
			height: 60,
			x: device.width / 2 - 100,
			y: 50,
			images: {
				up: "resources/images/blue1.png",
				down: "resources/images/blue2.png"
			},
			scaleMethod: "9slice",
			sourceSlices: {
				horizontal: {left: 80, center: 116, right: 80},
				vertical: {top: 10, middle: 80, bottom: 10}
			},
			destSlices: {
				horizontal: {left: 40, right: 40},
				vertical: {top: 4, bottom: 4}
			},
			on: {
				up: bind(this._button2, "setState", ButtonView.states.DISABLED)
			},
			title: "Disable",
			text: {
				color: "#000044",
				size: 16,
				autoFontSize: false,
				autoSize: false
			}
		});

		//When this button is clicked then the button in the middle will be enabled...
		new ButtonView({
			superview: this.view,
			width: 200,
			height: 60,
			x: device.width / 2 - 100,
			y: 250,
			images: {
				up: "resources/images/blue1.png",
				down: "resources/images/blue2.png"
			},
			scaleMethod: "9slice",
			sourceSlices: {
				horizontal: {left: 80, center: 116, right: 80},
				vertical: {top: 10, middle: 80, bottom: 10}
			},
			destSlices: {
				horizontal: {left: 40, right: 40},
				vertical: {top: 4, bottom: 4}
			},
			on: {
				down: bind(this._button2, "setState", ButtonView.states.UP)
			},
			title: "Enable",
			text: {
				color: "#000044",
				size: 16,
				autoFontSize: false,
				autoSize: false
			}
		});
	};

	this.launchUI = function () {};
});
//The output should look like this screenshot:
//<img src="./doc/screenshot.png" alt="a book screenshot" class="screenshot">