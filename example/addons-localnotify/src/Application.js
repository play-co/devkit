import ui.TextView as TextView;
import ui.widget.ButtonView as ButtonView;
import device;

// Import the LocalNotify plugin
import plugins.localnotify.localNotify as localNotify;

// Note that the LocalNotify plugin is also specified in the addons section of the manifest.json

exports = Class(GC.Application, function () {
	// This convenience function makes some pretty buttons for each of the test features
	this.makeButton = function(title, onUp) {
		return new ButtonView({
			superview: this.view,
			layout: "box",
			width: device.width * .8,
			height: device.height/10,
			centerX: true,
			images: {
				up: "resources/images/white1.png",
				down: "resources/images/white2.png",
				disabled: "resources/images/blue2.png"
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
				up: bind(this, onUp)
			},
			title: title,
			text: {
				color: "#000044",
				size: 16,
				autoFontSize: false,
				autoSize: false
			}
		});
	}

	// This function adds a local notification "Stuff Happened"
	this.addIt = function(name, secondsAhead, text) {
		localNotify.add({
			name: name,
			number: 1,
			sound: true,
			action: "Respond",
			title: "Stuff Happened",
			text: text,
			delay: {
				seconds: secondsAhead
			},
			icon: "resources/images/custom.png",
			userDefined: {
				extraData: 27
			}
		});
	}

	this.initUI = function () {
		this.view.style.layout = "linear";
		this.view.style.direction = "vertical";

		// Send an immediate notification (just a test case, not very practical..)
		this.set0 = this.makeButton("Set immediate", function() {
			this.addIt("set0", 0, "Fast notification test");
		});

		// Add a 10 second notification for testing
		this.set10 = this.makeButton("Set 10 seconds ahead", function() {
			this.addIt("set10", 10, "10 second notification test");
		});

		// Add a second 20-second notification for testing
		this.set20 = this.makeButton("Set 20 seconds ahead", function() {
			this.addIt("set20", 20, "20 second notification test");
		});

		// Remove the 10 second one
		this.remove10 = this.makeButton("Remove 10 seconds ahead", function() {
			localNotify.remove("set10");
		});

		// Remove the 20 second one
		this.remove20 = this.makeButton("Remove 20 seconds ahead", function() {
			localNotify.remove("set20");
		});

		// Remove all notifications
		this.removeAll = this.makeButton("Clear all", function() {
			localNotify.clear();
			this.notifyInfo.setText("");
		});

		// Get the 20 second notification info
		this.get20 = this.makeButton("Dump 20 second notify", function() {
			localNotify.get("set20", function(obj) {
				logger.log("{LocalNotify} 20 second event info:", JSON.stringify(obj, undefined, 4));
				if (obj) {
					this.notifyInfo.setText("Got info for: " + obj.name);
				} else {
					this.notifyInfo.setText("No 20 second info");
				}
			}.bind(this));
		});

		// Dump all notification information to console
		this.list = this.makeButton("Dump all", function() {
			localNotify.list(function(objs) {
				logger.log("{LocalNotify} All scheduled events:", JSON.stringify(objs, undefined, 4));
				if (objs) {
					this.notifyInfo.setText("Got info for " + objs.length + " alarm(s)");
				} else {
					this.notifyInfo.setText("ERROR");
				}
			}.bind(this));
		});

		// An info text box
		this.notifyInfo = new TextView({
			superview: this.view,
			layout: "box",
			text: "(lastNotify)",
			color: "white",
			flex: 1
		});

		// Handle notifications when they expire.  Startup notifications get mixed in here
		localNotify.onNotify = function(info) {
			logger.log("Got notification:", JSON.stringify(info, undefined, 4));

			var text;

			if (info.launched) {
				text = "Launched: ";
			} else {
				text = "Got: ";
			}

			text += info.name;

			if (info.shown) {
				text += "(shown)";
			} else {
				text += "(hidden)";
			}

			this.notifyInfo.setText(text);
		}.bind(this);
	};
	
	this.launchUI = function () {};
});

//The output should look like this screenshot:
//<img src="./doc/screenshot.png" alt="screenshot" class="screenshot">

