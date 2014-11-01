import device;

import ui.View as View;
import ui.TextView as TextView;

import ui.widget.ButtonView as ButtonView;
import ui.widget.SliderView as SliderView;

exports = Class(GC.Application, function () {

	this.initUI = function () {
		this.view.style.backgroundColor = "#FFFFFF";

		this._sliderVer = new SliderView({
			superview: this.view,
			minValue: 0,
			maxValue: 100,
			value: 50,
			active: true, // Optional

			track: {
				activeColor: '#EE9900',
				inactiveColor: '#E0E0E0'
			},
			thumb: {
				activeColor: '#FFBB00',
				pressedColor: '#990000',
				inactiveColor: '#B0B0B0'
			},

			x: device.width / 2 - 120,
			y: 50,
			width: 30,
			height: 200
		});
		this._sliderVer.on("Change", bind(this, "onChangeVer"));

		// Show the vertical value
		this._horValue = new TextView({
			superview: this.view,
			backgroundColor: "#E0E0E0",
			x: device.width / 2 - 60,
			y: 60,
			width: 120,
			height: 50,
			color: "#000000",
			size: 11,
			horizontalAlign: "center",
			verticalALign: "center",
			text: "horizontal\n50",
			clip: true,
			autoFontSize: false,
			wrap: true
		});

		this._sliderHor = new SliderView({
			superview: this.view,
			minValue: 0,
			maxValue: 100,
			value: 50,
			active: true, // Optional

			track: {
				active: 'resources/images/gold1.png',
				inactive: 'resources/images/white1.png',
				scaleMethod: '9slice',
				sourceSlices: {
					horizontal: {left: 10, center: 80, right: 10},
					vertical: {top: 10, middle: 20, bottom: 10}
				},
				destSlices: {
					horizontal: {left: 12, right: 12},
					vertical: {top: 12, bottom: 12}
				}
			},
			thumb: {
				active: 'resources/images/gold1.png',
				pressed: 'resources/images/gold2.png',
				inactive: 'resources/images/white1.png',
				scaleMethod: '9slice',
				sourceSlices: {
					horizontal: {left: 10, center: 80, right: 10},
					vertical: {top: 10, middle: 20, bottom: 10}
				},
				destSlices: {
					horizontal: {left: 12, right: 12},
					vertical: {top: 12, bottom: 12}
				}
			},

			x: device.width / 2 - 80,
			y: 10,
			width: 200,
			height: 30
		});
		this._sliderHor.on("Change", bind(this, "onChangeHor"));

		// Show the vertical value
		this._verValue = new TextView({
			superview: this.view,
			backgroundColor: "#E0E0E0",
			x: device.width / 2 - 60,
			y: 120,
			width: 120,
			height: 50,
			color: "#000000",
			size: 11,
			horizontalAlign: "center",
			verticalALign: "center",
			text: "vertical\n50",
			clip: true,
			autoFontSize: false,
			wrap: true
		});

		var left = device.width / 2 - 140;
		//A button to change the value of the horizontal slider
		new SliderViewSetting({
			superview: this.view,
			callback: bind(this, "setHorValue"),
			x: left,
			y: 270,
			titleText: "hor value",
			options: [0, 50, 100]
		});
		//A button to set the padding of the horizontal slider
		new SliderViewSetting({
			superview: this.view,
			callback: bind(this, "setHorPadding"),
			x: left,
			y: 305,
			titleText: "hor padding",
			options: [0, 4, [4, 20]]
		});
		//A button to change the horizontal thumb size
		new SliderViewSetting({
			superview: this.view,
			callback: bind(this, "setHorThumbSize"),
			x: left,
			y: 340,
			titleText: "hor thumb",
			options: ["auto", 60, 100]
		});
		//A button to change the horizontal increment
		new SliderViewSetting({
			superview: this.view,
			callback: bind(this, "setHorIncrement"),
			x: left,
			y: 375,
			titleText: "hor increment",
			options: [false, 1, 3, 5]
		});
		//A button to change the horizontal range
		new SliderViewSetting({
			superview: this.view,
			callback: bind(this, "setHorRange"),
			x: left,
			y: 410,
			titleText: "hor range",
			options: [[0, 100], [-50, 50], [-200, -100]]
		});
		//A button to activate/deactivate the horizontal slider
		new SliderViewSetting({
			superview: this.view,
			callback: bind(this, "setHorActive"),
			x: left,
			y: 445,
			titleText: "hor active",
			options: [true, false]
		});

		var left = device.width / 2 + 5;
		//A button to change the contents of the TextView
		new SliderViewSetting({
			superview: this.view,
			callback: bind(this, "setVerValue"),
			x: left,
			y: 270,
			titleText: "ver value",
			options: [0, 50, 100]
		});
		//A button to set the padding of the vertical slider
		new SliderViewSetting({
			superview: this.view,
			callback: bind(this, "setVerPadding"),
			x: left,
			y: 305,
			titleText: "ver padding",
			options: [0, 4, [20, 4]]
		});
		//A button to activate/deactivate the vertical slider
		new SliderViewSetting({
			superview: this.view,
			callback: bind(this, "setVerThumbSize"),
			x: left,
			y: 340,
			titleText: "ver thumb",
			options: ["auto", 60, 100]
		});
		//A button to change the vertical increment
		new SliderViewSetting({
			superview: this.view,
			callback: bind(this, "setVerIncrement"),
			x: left,
			y: 375,
			titleText: "ver increment",
			options: [false, 1, 3, 5]
		});
		//A button to change the horizontal range
		new SliderViewSetting({
			superview: this.view,
			callback: bind(this, "setVerRange"),
			x: left,
			y: 410,
			titleText: "ver range",
			options: [[0, 100], [-50, 50], [100, 200]]
		});
		//A button to activate/deactivate the vertical slider
		new SliderViewSetting({
			superview: this.view,
			callback: bind(this, "setVerActive"),
			x: left,
			y: 445,
			titleText: "ver active",
			options: [true, false]
		});
	};

	this.onChangeHor = function (value) {
		this._horValue.setText("horizontal\n" + value);
	};

	this.onChangeVer = function (value) {
		this._verValue.setText("vertical\n" + value);
	};

	this.setHorValue = function (value) {
		this._sliderHor.setValue(value);
	};

	this.setHorPadding = function (padding) {
		this._sliderHor.style.padding = padding;
	};

	this.setHorThumbSize = function (thumbSize) {
		this._sliderHor.setThumbSize(thumbSize);
	};

	this.setHorIncrement = function (increment) {
		this._sliderHor.setIncrement(increment);
	};

	this.setHorRange = function (range) {
		this._sliderHor.setMinValue(range[0]);
		this._sliderHor.setMaxValue(range[1]);
	};

	this.setHorActive = function (active) {
		this._sliderHor.setActive(active);
	};

	this.setVerValue = function (value) {
		this._sliderVer.setValue(value);
	};

	this.setVerPadding = function (padding) {
		this._sliderVer.style.padding = padding;
	};

	this.setVerThumbSize = function (thumbSize) {
		this._sliderVer.setThumbSize(thumbSize);
	};

	this.setVerIncrement = function (increment) {
		this._sliderVer.setIncrement(increment);
	};

	this.setVerRange = function (range) {
		this._sliderVer.setMinValue(range[0]);
		this._sliderVer.setMaxValue(range[1]);
	};

	this.setVerActive = function (active) {
		this._sliderVer.setActive(active);
	};

	this.launchUI = function () {};
});

function optionValue (s) {
	s += "";
	return (s.length > 10) ? (s.substr(0, 10) + "...") : s;
}

//## Class: SliderViewSetting
//A button to modify settings of the TextView
var SliderViewSetting = Class(ButtonView, function (supr) {
	this.init = function (opts) {
		opts = merge(
			opts,
			{
				width: 135,
				height: 34,
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
				text: {
					color: "#000044",
					size: 11,
					autoFontSize: false,
					autoSize: false
				},
				on: {
					up: bind(this, "onChange")
				},
				title: opts.titleText + "=" + optionValue(opts.options[0])
			}
		);

		supr(this, "init", [opts]);

		this._titleText = opts.titleText;
		this._textViewOpts = opts.textViewOpts;
		this._callback = opts.callback;
		this._optionIndex = 0;
		this._options = opts.options;
	};

	this.onChange = function () {
		//Step through the available options
		this._optionIndex = (this._optionIndex + 1) % this._options.length;
		this._text.setText(this._titleText + "=" + optionValue(this._options[this._optionIndex]));
		this._callback(this._options[this._optionIndex]);
	};
});
//The output of this demo should look like this:
//<img src="./doc/screenshot.png" alt="scrollview screenshot" class="screenshot">