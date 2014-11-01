//# Subscribe to an event <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/events/on/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//This demo shows how to use emit and subscribe.

import device;
import ui.TextView as TextView;

//Create a view which publishes an event and a value,
//each time the view is clicked the value will be increased...
var PublishView = Class(TextView, function(supr) {
	this.onInputSelect = function() {
		this._value = this._value || 0;
		this._value++;
		this.emit("Clicked", this._value);
	};
});

//Create a view with a function which can be called when the view is clicked, the takes one parameter:
var SubscribeView1 = Class(TextView, function(supr) {
	this.onClick = function(someValue) {
		this.setText("Red was clicked, someValue: " + someValue);
	};
});

//Create a view with a function which can be called when the view is clicked, the takes two parameters:
var SubscribeView2 = Class(TextView, function(supr) {
	this.onClick = function(text, someValue) {
		this.setText(text + someValue);
	};
});

//Create the application with default settings:
exports = Class(GC.Application, function() {

	this.initUI = function() {
		this.style.backgroundColor = "#FFFFFF";

		this._subscribeView1 = new TextView({
			superview: this.view,
			text: "Waiting for click",
			color: "#000000",
			backgroundColor: "#00FF00",
			width: device.width - 20,
			height: 50,
			x: 10,
			y: 70
		});
		this._subscribeView2 = new SubscribeView1({
			superview: this.view,
			text: "Waiting for click",
			color: "#000000",
			backgroundColor: "#FFDD00",
			width: device.width - 20,
			height: 50,
			x: 10,
			y: 130
		});
		this._subscribeView3 = new SubscribeView2({
			superview: this.view,
			text: "Waiting for click",
			color: "#000000",
			backgroundColor: "#00DDFF",
			width: device.width - 20,
			height: 50,
			x: 10,
			y: 190
		});

		new PublishView({
			superview: this.view,
			text: "Click me",
			color: "#FFFFFF",
			backgroundColor: "#FF0000",
			width: device.width - 20,
			height: 50,
			x: 10,
			y: 10
		})

//When "Clicked" is published then the setText method is
//invoked with the parameter value "Red was clicked".
//After publishing the event the subscriber is un-subscribed
			.on("Clicked", bind(this._subscribeView1, "setText", "Red was clicked"))

//When "Clicked" is published then the onClick method is
//invoked, this method will also use the parameter value 12 which
//is passed from the publish call.
//After publishing the event the subscriber is un-subscribed

			.on("Clicked", bind(this._subscribeView2, "onClick"))
//When "Clicked" is published then the onClick method is
//invoked, the onClick method will receive two parameters: the
//string "Red was clicked, someValue: " and the number 12 which
//is passed from the publish call.
//After publishing the event the subscriber is un-subscribed

			.on("Clicked", bind(this._subscribeView3, "onClick", "Red was clicked, someValue: "));
	};

	this.launchUI = function () {};
});

//The output should look like this screenshot:
//<img src="./doc/screenshot1.png" alt="a book screenshot" class="screenshot">
//After clicking the red button once the output should look like this:
//<img src="./doc/screenshot2.png" alt="a book screenshot" class="screenshot">
//After clicking the red button twice the output should look like this:
//<img src="./doc/screenshot3.png" alt="a book screenshot" class="screenshot">