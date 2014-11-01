//# Grid, Move Cell <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/ui/grid-movecell/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>

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

	this.setColspan = function (colspan) {
		this._demoCell._opts.colspan = colspan;
	};

	this.setRowspan = function (rowspan) {
		this._demoCell._opts.rowspan = rowspan;
	};

	this.moveCell = function () {
		this._demoCell.move();
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
			cols: 5,
			rows: 4,
			//Make hide cells out of the grid range...
			hideOutOfRange: true,
			//Make cells in the grid range visible...
			showInRange: true
		});

		this._demoCell = new DemoCellView({superview: this._gridView, backgroundColor: "#880000", col: 0, row: 0});

		var left = device.width / 2 - 140;

		//A button to change the horizontal margin of the GridView
		new GridViewSetting({
			superview: this.view,
			target: this._gridView,
			x: left,
			y: 220,
			property: "horizontalMargin",
			setter: bind(this, "setHorizontalMargin"),
			options: [0, 10, [5, 15], [10, 0]]
		});
		//A button to change the vertical margin of the GridView
		new GridViewSetting({
			superview: this.view,
			target: this._gridView,
			x: left,
			y: 255,
			property: "verticalMargin",
			setter: bind(this, "setVerticalMargin"),
			options: [0, 10, [5, 15], [10, 0]]
		});
		//A button to change the number of columns
		new GridViewSetting({
			superview: this.view,
			target: this._gridView,
			x: left,
			y: 290,
			property: "cols",
			setter: bind(this, "setCols"),
			options: [5, 4]
		});
		//A button to change the colspan
		new GridViewSetting({
			superview: this.view,
			target: this._gridView,
			x: left,
			y: 325,
			property: "colspan",
			setter: bind(this, "setColspan"),
			options: [1, 2, 3]
		});
		//A button to move the cell
		new GridViewSetting({
			superview: this.view,
			target: this._gridView,
			x: left,
			y: 360,
			property: "",
			setter: bind(this, "moveCell"),
			options: ["move"]
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
			options: [4, 3]
		});
		//A button to change the number of rows
		new GridViewSetting({
			superview: this.view,
			target: this._gridView,
			x: left,
			y: 325,
			property: "rowspan",
			setter: bind(this, "setRowspan"),
			options: [1, 2, 3]
		});
	};

	this.launchUI = function () {};
});

function optionValue (s) {
	s += "";
	return (s.length > 10) ? (s.substr(0, 10) + "...") : s;
}


//## Class: DemoCellView
var DemoCellView = Class(View, function (supr) {
	this.move = function () {
		var opts = this._opts;
		var col = opts.col;
		var row = opts.row;

		col++;
		if (col >= this._superview.getCols()) {
			col = 0;
			row++;
			if (row >= this._superview.getRows()) {
				row = 0;
			}
		}
		opts.col = col;
		opts.row = row;
	};
});

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
				title: opts.property + (opts.property ? "=" : "") + optionValue(opts.options[0])
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
		this._text.setText(this._property + (this._property ? "=" : "") + optionValue(this._options[this._optionIndex]));
		this._setter(this._options[this._optionIndex]);
	};
});
//The output should look like this screenshot:
//<img src="./doc/screenshot.png" alt="a book screenshot" class="screenshot">
