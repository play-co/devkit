//# A Basic List <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/ui/list-ajax/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//Displaying a list of items loaded from Facebook.
//requires the coordinated use of three classes: `ui.widget.ListView`,
//`ui.widget.CellView`, and `GCDataSource`.

//Import device to get the screen size.
import device;

//Import `GCDataSource` to store the items.
import GCDataSource;

//Import the `List` and `Cell` classes to create a list.
import ui.widget.List as List;
import ui.widget.Cell as Cell;
import ui.widget.ButtonView as ButtonView;

import ui.TextView as TextView;
import ui.TextPromptView as TextPromptView;
import ui.View as View;

import util.ajax as ajax;

var COLOR1 = "rgb(59,89,152)";
var COLOR2 = "rgb(109,132,180)";
var COLOR3 = "rgb(205,216,234)";
var COLOR4 = "rgb(255,255,255)";
var COLOR5 = "rgb(175,189,212)";
var COLOR6 = "rgb(18,20,54)";

var startSearch = "learning";

var InfoDataSource = Class(GCDataSource, function (supr) {
	this.init = function (opts) {
		opts = merge(
			opts,
			{
				key: "id",
				reverse: true,
				//Sort by oldest last
				sorter: function (data) { return data.created_time; }
			}
		);

		supr(this, "init", [opts]);

		this._searchFor = startSearch;

		this.load();
	};

	this.load = function () {
		this.clear();
		this.emit("Clear");

		//Search Facebook
		ajax.get(
			{
				url: "http://graph.facebook.com/search",
				headers: {"Content-Type": "text/plain"},
				//This data will be added as query parameters
				data: {q: this._searchFor, type: "post"},
				//Parse the result as JSON
				type: "json"
			},
			//call `onData` when the search results are loaded
			bind(this, "onData")
		);
	};

	//Customize the sort function, add indices to the items after sorting
	this.sort = function () {
		supr(this, "sort");

		var i = this._byIndex.length;
		while (i) this._byIndex[--i].index = i;
	};

	//Prepend zeros to a string
	this._leadingZero = function (s, length) {
		s += "";
		while (s.length < length) s = "0" + s;
		return s;
	};

	//This callback is called when the data is loaded
	this.onData = function (err, response) {
		if (!err) {
			//Iterate over the list and parse the date
			for (var i = 0; i < response.data.length; i++) {
				var item = response.data[i];
				var date = new Date(item.created_time);

				item.posted = this._leadingZero(date.getHours(), 2) + ":" + this._leadingZero(date.getMinutes(), 2) + " - " +
					(date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear();
			}

			//Add the list to the data source
			this.add(response.data);
			//Sort the list
			this.sort();
			//Left the view know that the data is ready
			this.emit("Loaded");
		} else {
			//Something went wrong, publis the `Error` event so that a message can be displayed
			this.emit("Error");
		}
	};

	//Set the search string and load the data
	this.setSearchFor = function (searchFor) {
		this._searchFor = searchFor;
		this.load();
	};
});

//## Class: Application
//Create an application, set the default properties.
exports = Class(GC.Application, function () {

	this.getCell = function () {
		var infoList = this._infoList;

		return new InfoCell({superview: infoList, infoData: this._infoData});
	};

	this.initUI = function () {
		this.style.backgroundColor = COLOR4;

		//Set up the datasource.
		this._infoData = new InfoDataSource();
		this._infoData.on("Clear", bind(this, "onClear"));
		this._infoData.on("Loaded", bind(this, "onLoaded"));
		this._infoData.on("Error", bind(this, "onError"));

		this._title = new TextView({
			superview: this,
			x: 0,
			y: 0,
			width: device.width,
			height: 50,
			size: 30,
			text: "Search Facebook",
			color: COLOR4,
			backgroundColor: COLOR1
		});

		this._loadingLabel = new TextView({
			superview: this,
			x: 0,
			y: 50,
			width: device.width,
			height: device.height - 100,
			size: 18,
			text: "Searching for: " + startSearch,
			color: COLOR6
		});

		//Create the List, which inherits from `ScrollView`.
		this._infoList = new List({
			superview: this.view,
			x: 0,
			y: 50,
			width: device.width,
			height: device.height - 100,
			//Use the dataSource:
			dataSource: this._infoData,
			selectable: "multi",
			maxSelections: 10,
			scrollX: false,
			getCell: bind(this, "getCell"),
			visible: false
		});

		this._searchLabel = new TextView({
			superview: this,
			x: 0,
			y: device.height - 50,
			width: device.width / 2,
			height: 50,
			size: 20,
			text: "search for:",
			horizontalAlign: "right",
			color: COLOR1,
			backgroundColor: COLOR5
		});
		this._searchLabel.onInputSelect = bind(this, "onSelectSeach");
		this._search = new TextPromptView({
			superview: this,
			x: device.width / 2,
			y: device.height - 50,
			width: device.width / 2,
			height: 50,
			size: 20,
			text: startSearch,
			horizontalAlign: "left",
			padding: [0, 0, 0, 6],
			color: COLOR1,
			backgroundColor: COLOR5,
			value: startSearch,
			prompt: "Enter a search term:"
		});
		this._search.on("Change", bind(this, "onChangeSearch"));
	};

	//This callback is called when the search label is clicked
	this.onSelectSeach = function () {
		this._search.showPrompt();
	};

	//When there's a new text entered in the prompt dialog then this callback is called
	//and Facebook is searched again
	this.onChangeSearch = function (value) {
		this._loadingLabel.setText("Searching for: " + value);
		this._infoData.setSearchFor(value);
	};

	//Something in the request went wrong
	this.onError = function () {
		this._loadingLabel.setText("Failed to load data");
	};

	//This function is called when a new search starts, the list is hidden and the searching message is shown
	this.onClear = function () {
		this._infoList.style.visible = false;
		this._loadingLabel.style.visible = true;
	};

	//This callback is called when the search data is loaded
	this.onLoaded = function () {
		this._infoList.style.visible = true;
		this._loadingLabel.style.visible = false;
	};

	this.launchUI = function () {};
});

//## Class: InfoCell
//Subclass a Cell which is a view, it can have child views, and accepts data from a List.
var InfoCell = Class(Cell, function (supr) {
	this.init = function (opts) {
		this._infoData = opts.infoData;

		opts.width = device.width;
		opts.height = 75;

		supr(this, "init", [opts]);

		//The TextView showing who posted the message
		this._from = new TextView({
			superview: this,
			x: 10,
			y: 5,
			width: device.width - 20,
			height: 20,
			size: 13,
			horizontalAlign: "left",
			color: COLOR2
		});
		//The time and date when the message was posted
		this._posted = new TextView({
			superview: this,
			x: 10,
			y: 5,
			width: device.width - 20,
			height: 20,
			size: 13,
			horizontalAlign: "right",
			color: COLOR2
		});
		//The message
		this._message = new TextView({
			superview: this,
			x: 10,
			y: 25,
			width: device.width - 20,
			height: 47,
			size: 13,
			horizontalAlign: "left",
			verticalAlign: "top",
			wrap: true,
			autoFontSize: false,
			autoSize: false,
			clip: true,
			color: COLOR6
		});
	};

	this._toLength = function (s, length) {
		if (s.length > length) {
			var i = Math.max(0, length - 10);
			while (i < length - 1) {
				if (s[i] === " ") {
					break;
				}
				i++;
			}
			s = s.substr(0, i) + "...";
		}
		return s;
	};

	this.update = function () {
		var data = this._data;

		//Set the color depending on if it's an even or odd row
		this.style.backgroundColor = ((data.index & 1) === 0) ? COLOR3 : COLOR4;

		//Show the first 40 characters of the name
		this._from.setText(this._toLength(data.from.name || "", 40));
		//Show the time and date
		this._posted.setText(data.posted);
		//Show the first 100 characters of the message
		this._message.setText(this._toLength(data.message || "", 100));
	};

	//Called when a cell is put on screen.
	//We'll use it to update our TextView child.
	this.setData = function (data) {
		this._data = data;
		this.update();
	};
});

//Run this code in the simulator, and you should see something like the following screenshot.
//You can drag the list up and down, but not right or left.
//<img src="./doc/screenshot.png" alt="listview screenshot" class="screenshot">