//# Grid, Span <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/ui/grid-span/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>

import device;

import ui.TextView as TextView;
import ui.View as View;

import ui.widget.GridView as GridView;
import ui.widget.ButtonView as ButtonView;

//## Class: Application
exports = Class(GC.Application, function () {
	this.setHorizontalMargin = function (horizontalMargin) {
		this._gridView.updateOpts({horizontalMargin: horizontalMargin});
	};

	this.setVerticalMargin = function (verticalMargin) {
		this._gridView.updateOpts({verticalMargin: verticalMargin});
	};

	this.setHorizontalGutter = function (horizontalGutter) {
		this._gridView.updateOpts({horizontalGutter: horizontalGutter});
	};

	this.setVerticalGutter = function (verticalGutter) {
		this._gridView.updateOpts({verticalGutter: verticalGutter});
	};

	this.setCols = function (cols) {
		this._gridView.setCols(cols);
	};

	this.setRows = function (rows) {
		this._gridView.setRows(rows);
	};

	this.initUI = function () {
		this.view.style.backgroundColor = "#FFFFFF";

		this._gridView = new GridView({
			superview: this.view,
			backgroundColor: "#FF0000",
			x: device.width / 2 - 140,
			y: 10,
			width: 280,
			height: 200,
			cols: 6,
			rows: 7,
			//Make hide cells out of the grid range...
			hideOutOfRange: true,
			//Make cells in the grid range visible...
			showInRange: true
		});

		var colors1 = ["#404040", "#808080"];
		var colors2 = ["#606060", "#A0A0A0"];
		for (var n = 0; n < 6; n++) {
			new View({superview: this._gridView, backgroundColor: colors1[n & 1], col: n, row: 0, rowspan: n + 1});
			new View({superview: this._gridView, backgroundColor: colors2[n & 1], col: 0, row: n + 1, colspan: n + 1});
		}

		var left = device.width / 2 - 140;

		//A button to change the horizontal margin of the GridView
		new GridViewSetting({
			superview: this.view,
			target: this._gridView,
			x: left,
			y: 220,
			property: "horizontalMargin",
			setter: bind(this, "setHorizontalMargin"),
			options: [0, 6, [3, 6], [6, 0]]
		});
		//A button to change the vertical margin of the GridView
		new GridViewSetting({
			superview: this.view,
			target: this._gridView,
			x: left,
			y: 255,
			property: "verticalMargin",
			setter: bind(this, "setVerticalMargin"),
			options: [0, 6, [3, 6], [6, 0]]
		});
		//A button to change the number of columns
		new GridViewSetting({
			superview: this.view,
			target: this._gridView,
			x: left,
			y: 290,
			property: "cols",
			setter: bind(this, "setCols"),
			options: [6, 7]
		});

		left = device.width / 2 + 5;

		//A button to change the horizontal gutter of the GridView
		new GridViewSetting({
			superview: this.view,
			target: this._gridView,
			x: left,
			y: 220,
			property: "horizontalGutter",
			setter: bind(this, "setHorizontalGutter"),
			options: [0, 10]
		});
		//A button to change the vertical gutter of the GridView
		new GridViewSetting({
			superview: this.view,
			target: this._gridView,
			x: left,
			y: 255,
			property: "verticalGutter",
			setter: bind(this, "setVerticalGutter"),
			options: [0, 10]
		});
		//A button to change the number of rows
		new GridViewSetting({
			superview: this.view,
			target: this._gridView,
			x: left,
			y: 290,
			property: "rows",
			setter: bind(this, "setRows"),
			options: [7, 8]
		});
	};

	this.launchUI = function () {};
});

function optionValue (s) {
	s += "";
	return (s.length > 10) ? (s.substr(0, 10) + "...") : s;
}

//## Class: GridViewSetting
//A button to modify settings of a View
var GridViewSetting = Class(ButtonView, function (supr) {
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
		this._setter = opts.setter;
	};

	this.onChange = function () {
		//Step through the available options
		this._optionIndex = (this._optionIndex + 1) % this._options.length;
		this._text.setText(this._property + "=" + optionValue(this._options[this._optionIndex]));
		this._setter(this._options[this._optionIndex]);
	};
});

//The output should look like this screenshot:
//<img src="./doc/screenshot.png" alt="a book screenshot" class="screenshot">
