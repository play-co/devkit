//# A Basic List <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/ui/list-basic/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//Displaying a list of items requires the coordinated use of three classes: `ui.widget.ListView`,
//`ui.widget.CellView`, and `GCDataSource`. There are components that handle some of these for you,
//but to understand how they work together, we’ll display a list of arbitrary data that we can
//scroll and click.

//Import device to get the screen size.
import device;
//Import `GCDataSource` to store the items.
import GCDataSource;

import ui.widget.ButtonView as ButtonView;
//Import the `List` and `Cell` classes to create a list.
import ui.widget.List as ListView;
import ui.widget.Cell as CellView;

import ui.TextView as TextView;
import ui.View as View;

//## Class: Application
//Create an application, set the default properties.
exports = Class(GC.Application, function () {

	this.getCell = function () {
		var filmList = this._filmList;

		return new FilmCell({superview: filmList, height: 50});
	};

	this.initUI = function () {
		this.style.backgroundColor = "#FFFFFF";

		//Set up the datasource.
		this._filmData = new GCDataSource({
			//Entries require a key, which defaults to "id".
			key: "title",
			//Sort chronologically, then alphabetize
			sorter: function (data) { return data.year + data.title; }
		});
		//And load our data.
		this._filmData.add(scifiFilms);

		//Create the List, which inherits from `ScrollView`.
		var filmList = new ListView({
			superview: this.view,
			x: device.width / 2 - 140,
			y: 10,
			width: 280,
			height: 300,
			backgroundColor: "#D0D0D0",
			//Use the dataSource:
			dataSource: this._filmData,
			selectable: "multi",
			selections: [ "RoboCop", "Godzilla", "Brazil" ],
			maxSelections: 10,
			scrollX: false,
			getCell: bind(this, "getCell")
		});
		this._filmList = filmList;

		var left = device.width / 2 - 140;
		//A button to select single or multi select
		new ListViewSetting({
			superview: this.view,
			x: left,
			y: 320,
			options: [
				{name: "multi select", callback: bind(this, "onMultiSelect")},
				{name: "single select", callback: bind(this, "onSingleSelect")}
			]
		});

		left = device.width / 2 + 5;

		//A button the log the selected items
		new ListViewSetting({
			superview: this.view,
			x: left,
			y: 320,
			options: [
				{name: "log selection", callback: bind(this, "onLogSelection")}
			]
		});
	};

	this._updateFilmList = function (selectable) {
		this._filmList.deselectAll();

		this._filmList.updateOpts({
			dataSource: this._filmData,
			selectable: selectable,
			maxSelections: 10,
			getCell: bind(this, "getCell")
		});
	};

	this.onMultiSelect = function () {
		this._updateFilmList("multi");
	};

	this.onSingleSelect = function () {
		this._updateFilmList("single");
	};

	this.onLogSelection = function () {
		var selection = this._filmList.model.selection;
		if (selection.getSelectionCount()) {
			var selected = selection.get();
			console.log("=== Selected ===");
			for (var i in selected) {
				console.log(i);
			}
		} else {
			console.log("=== No items selected ===");
		}
	};

	this.launchUI = function () {};
});

//## Class: FilmCell
//Subclass a Cell which is a view, it can have child views, and accepts data from a List.
var FilmCell = Class(CellView, function (supr) {
	this.init = function (opts) {
		opts.width = 280;
		opts.height = 32;

		supr(this, "init", [opts]);

		this._title = new TextView({
			superview: this,
			width: opts.width,
			height: opts.height
		});
	};

	//Called when the cell is selected...
	this._onSelect = function () {
		this._title.updateOpts({color: "#FF0000"});
	};

	//Called when the cell is deselected...
	this._onDeselect = function () {
		this._title.updateOpts({color: "#000000"});
	};

	//Called when a cell is put on screen.
	//We'll use it to update our TextView child.
	this.setData = function (data) {
		this._data = data; // Store it for the input event handler

		this._title.setText(data.title + " (" + data.year + ")");
		this._title.updateOpts({color: this.isSelected(this._data) ? "#FF0000" : "#000000"});
	};
});

//These are the items which will be displayed in the list.
var scifiFilms = [
	{title: "Blade Runner", year: 1982},
	{title: "2001: A Space Odyssey", year: 1968},
	{title: "Alien", year: 1979},
	{title: "The Terminator", year: 1984},
	{title: "The Matrix", year: 1999},
	{title: "Close Encounters of the Third Kind", year: 1977},
	{title: "Inception", year: 2010},
	{title: "WALL-E", year: 2008},
	{title: "Metropolis", year: 1927},
	{title: "E.T.: The Extra-Terrestrial", year: 1982},
	{title: "Back to the Future", year: 1985},
	{title: "Tron", year: 1982},
	{title: "Solaris", year: 1972},
	{title: "Brazil", year: 1985},
	{title: "Star Trek II: The Wrath of Khan", year: 1982},
	{title: "Star Wars", year: 1977},
	{title: "Planet of the Apes", year: 1968},
	{title: "RoboCop", year: 1987},
	{title: "Godzilla", year: 1954},
	{title: "Mad Max", year: 1979}
];

//## Class: ListViewSetting
//A button to modify settings of the TextView
var ListViewSetting = Class(ButtonView, function (supr) {
	this.init = function (opts) {
		this._options = opts.options;
		this._optionIndex = 0;

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
				title: this._options[this._optionIndex].name
			}
		);

		supr(this, "init", [opts]);
	};

	this.onChange = function () {
		//Step through the available options
		this._optionIndex = (this._optionIndex + 1) % this._options.length;
		this._text.setText(this._options[this._optionIndex].name);
		this._options[this._optionIndex].callback();
	};
});

//Run this code in the simulator, and you should see something like the following screenshot.
//You can drag the list up and down, but not right or left. When you click on a film title, it
//will turn red and output its title in the debugging console.
//<img src="./doc/screenshot.png" alt="listview screenshot" class="screenshot">