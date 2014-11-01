//# TextView: Text wrapping and alignment <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/text/textviews/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//This demo demonstrates different setting for the TextView class
import ui.View as View;
import ui.TextView as TextView;

import ui.widget.ButtonView as ButtonView;

import device;

//## Class: Application
exports = Class(GC.Application, function () {
	this.initUI = function () {
		this.view.style.backgroundColor = "#FFFFFF";

		//Create the initial options, these options can be changed with the buttons defined below...
		this._textViewOpts = {
			superview: this.view,
			layout: "box",
			text: "Aenean ipsum nisi, facilisis id lacinia ut, viverra vel justo.",
			color: "#FFFFFF",
			backgroundColor: "#FF0000",
			horizontalAlign: "left",
			wrap: true,
			autoSize: false,
			autoFontSize: false,
			verticalAlign: "top",
			x: device.width / 2 - 140,
			y: 10,
			width: 280,
			height: 200,
			size: 70,
			fontFamily: "Arial Black",
			clip: true
		};
		//Create the TextView with the initial options
		this._textView = new TextView(this._textViewOpts);

		var left = device.width / 2 - 140;
		//A button to change the contents of the TextView
		new TextViewSetting({
			superview: this.view,
			target: this._textView,
			textViewOpts: this._textViewOpts,
			x: left,
			y: 220,
			property: "text",
			options: ["Aenean ipsum nisi, facilisis id lacinia ut, viverra vel justo.", "Ipsum.", ""]
		});

		//A button to change the width of the TextView
		new TextViewSetting({
			superview: this.view,
			target: this._textView,
			textViewOpts: this._textViewOpts,
			x: left,
			y: 255,
			property: "width",
			options: [280, 110, 60]
		});
		//A button to change the height of the TextView
		new TextViewSetting({
			superview: this.view,
			target: this._textView,
			textViewOpts: this._textViewOpts,
			x: left,
			y: 290,
			property: "height",
			options: [200, 100, 50]
		});
		//A button to change the font size property of the TextView
		new TextViewSetting({
			superview: this.view,
			target: this._textView,
			textViewOpts: this._textViewOpts,
			x: left,
			y: 325,
			property: "size",
			options: [70, 30, 20, 6]
		});
		//A button the change the autoFontSize property of the TextView
		new TextViewSetting({
			superview: this.view,
			target: this._textView,
			textViewOpts: this._textViewOpts,
			x: left,
			y: 360,
			property: "autoFontSize",
			options: [false, true]
		});
		//A button the change the autoSize property of the TextView
		new TextViewSetting({
			superview: this.view,
			target: this._textView,
			textViewOpts: this._textViewOpts,
			x: left,
			y: 395,
			property: "autoSize",
			options: [false, true]
		});
		//A button to change the wrap property of the TextView
		new TextViewSetting({
			superview: this.view,
			target: this._textView,
			textViewOpts: this._textViewOpts,
			x: left,
			y: 430,
			property: "wrap",
			options: [true, false]
		});

		left = device.width / 2 + 5;

		//A button to change the horizontal padding of the TextView
		new TextViewSetting({
			superview: this.view,
			target: this._textView,
			textViewOpts: this._textViewOpts,
			x: left,
			y: 220,
			property: "padding",
			options: [0, 25, "10,30"]
		});

		//A button the change the maximum width of the TextView
		new TextViewSetting({
			superview: this.view,
			target: this._textView,
			textViewOpts: this._textViewOpts,
			x: left,
			y: 255,
			property: "minWidth",
			callback: bind(this, "setMinWidth"),
			options: [undefined, 100, 200]
		});
		//A button to change the maximum height the TextView
		new TextViewSetting({
			superview: this.view,
			target: this._textView,
			textViewOpts: this._textViewOpts,
			x: left,
			y: 290,
			property: "minHeight",
			callback: bind(this, "setMinHeight"),
			options: [undefined, 100, 200]
		});

		//A button the change the maximum width of the TextView
		new TextViewSetting({
			superview: this.view,
			target: this._textView,
			textViewOpts: this._textViewOpts,
			x: left,
			y: 325,
			property: "maxWidth",
			callback: bind(this, "setMaxWidth"),
			options: [undefined, 100, 200]
		});
		//A button to change the maximum height the TextView
		new TextViewSetting({
			superview: this.view,
			target: this._textView,
			textViewOpts: this._textViewOpts,
			x: left,
			y: 360,
			property: "maxHeight",
			callback: bind(this, "setMaxHeight"),
			options: [undefined, 100, 200]
		});

		//A button the change the horizontal text alignment of the text within the TextView
		new TextViewSetting({
			superview: this.view,
			target: this._textView,
			textViewOpts: this._textViewOpts,
			x: left,
			y: 395,
			property: "horizontalAlign",
			options: ["left", "center", "right", "justify"]
		});
		//A button to change the vertical alignment of the text within the TextView
		new TextViewSetting({
			superview: this.view,
			target: this._textView,
			textViewOpts: this._textViewOpts,
			x: left,
			y: 430,
			property: "verticalAlign",
			options: ["top", "middle", "bottom"]
		});
		//A button to change the stroke color
		new TextViewSetting({
			superview: this.view,
			target: this._textView,
			textViewOpts: this._textViewOpts,
			x: left,
			y: 325,
			property: "strokeColor",
			options: [undefined, "#000088"]
		});
		//A button to change the stroke width
		new TextViewSetting({
			superview: this.view,
			target: this._textView,
			textViewOpts: this._textViewOpts,
			x: left,
			y: 360,
			property: "strokeWidth",
			options: [2, 4, 8]
		});
		//A button to change the shadow color
		new TextViewSetting({
			superview: this.view,
			target: this._textView,
			textViewOpts: this._textViewOpts,
			x: left,
			y: 395,
			property: "shadowColor",
			options: [undefined, "#000000", "rgba(0,0,0,0.5)"]
		});
	};

	this.setMinWidth = function (minWidth) {
		this._textView.style.minWidth = minWidth;
	};

	this.setMinHeight = function (minHeight) {
		this._textView.style.minHeight = minHeight;
	};

	this.setMaxWidth = function (maxWidth) {
		this._textView.style.maxWidth = maxWidth;
	};

	this.setMaxHeight = function (maxHeight) {
		this._textView.style.maxHeight = maxHeight;
	};

	this.launchUI = function () {};
});

function optionValue (s) {
	s += "";
	return (s.length > 10) ? (s.substr(0, 10) + "...") : s;
}

//## Class: TextViewSetting
//A button to modify settings of the TextView
var TextViewSetting = Class(ButtonView, function (supr) {
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
				title: opts.property + "=" + optionValue(opts.options[0])
			}
		);

		supr(this, "init", [opts]);

		this._target = opts.target;
		this._textViewOpts = opts.textViewOpts;
		this._options = opts.options;
		this._optionIndex = 0;
		this._property = opts.property;
	};

	this.onChange = function () {
		//Step through the available options
		this._optionIndex = (this._optionIndex + 1) % this._options.length;
		this._text.setText(this._property + "=" + optionValue(this._options[this._optionIndex]));
		this._textViewOpts[this._property] = this._options[this._optionIndex];
		this._target.updateOpts(this._textViewOpts);
	};
});

//The output should look like this screenshot:
//<img src="./doc/screenshot.png" alt="a book screenshot" class="screenshot">