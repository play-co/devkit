//# Linear Layouts: <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/ui/layout/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//This is a demonstration of linear layouts
import ui.View as View;
import ui.TextView as TextView;

// test values and helper function
var colorNum = 0;
var colors = [ 'blue', 'red', 'green', 'orange', 'yellow', 'white', 'gray', 'teal', 'purple' ];
var nextColor = function() {
	colorNum = (colorNum + 1) % colors.length;
	return colors[colorNum];
};

//### Class: Application
exports = Class(GC.Application, function () {
	this.initUI = function () {
		this.style.layout = 'linear';
		this.style.direction = 'vertical';
		// build top row
		this.topRow = new View({
			superview: this,
			layout: 'linear',
			direction: 'horizontal',
			flex: 1
		});
		// add row button
		(new TextView({
			superview: this.topRow,
			text: 'ADD ROW',
			backgroundColor: nextColor(),
			layout: 'box',
			flex: 1
		})).on('InputSelect', bind(this, 'addRow'));
		// remove row button (starts hidden)
		(new TextView({
			superview: this.topRow,
			text: 'REMOVE ROW',
			backgroundColor: nextColor(),
			layout: 'box',
			canHandleEvents: false,
			flex: 0
		})).on('InputSelect', bind(this, 'removeRow'));
	};
	// show/hide remove row button
	this.setRemover = function(isOn) {
		var remover = this.topRow.getSubviews()[1];
		remover.style.flex = isOn ? 1 : 0;
		remover.canHandleEvents(isOn);
	};
	// add a cell to the current row
	this.addCell = function (row) {
		var subs = row.getSubviews();
		if (subs.length == 1) {
			(new TextView({
				superview: row,
				backgroundColor: nextColor(),
				text: 'REMOVE CELL',
				layout: 'box',
				flex: 1
			})).on('InputSelect', bind(this, 'removeCell', row));
		} else {
			new View({
				superview: row,
				backgroundColor: nextColor(),
				layout: 'box',
				flex: 1
			});
		}
	};
	// remove a cell from the current row
	this.removeCell = function (row) {
		var subs = row.getSubviews();
		subs[subs.length - 1].removeFromSuperview();
	};
	// add a row
	this.addRow = function () {
		this.setRemover(true);
		var row = new View({
			superview: this,
			layout: 'linear',
			direction: 'horizontal',
			flex: 1
		});
		(new TextView({
			superview: row,
			backgroundColor: nextColor(),
			text: 'ADD CELL',
			layout: 'box',
			flex: 1
		})).on('InputSelect', bind(this, 'addCell', row));
	};
	// remove a row
	this.removeRow = function() {
		var rows = this.getSubviews();
		if (rows.length == 2) {
			this.setRemover(false);
		}
		rows[rows.length - 1].removeFromSuperview();
	};
});

//The output should look like this screenshot:
//<img src="./doc/screenshot.png" alt="a book screenshot" class="screenshot">