import device;

import ui.TextView as TextView;
import ui.widget.ButtonView as ButtonView;

exports = Class(GC.Application, function () {

	this.initUI = function () {
		this.view.style.backgroundColor = "#FFFFFF";

		//When this button is clicked then the button in the middle will be disabled...
		this._button = new ButtonView({
			superview: this.view,
			width: 200,
			height: 60,
			x: device.width / 2 - 100,
			y: 50,
			toggleSelected: true,
			state: ButtonView.states.SELECTED,
			images: {
				down: "resources/images/blue2.png",
				selected: "resources/images/blue1.png",
				unselected: "resources/images/white1.png"
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
				selected: bind(
					this,
					function () {
						this._button.setTitle("Selected");
					}
				),
				unselected: bind(
					this,
					function () {
						this._button.setTitle("Unselected");
					}
				)
			},
			title: "Selected",
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
