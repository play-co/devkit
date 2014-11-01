import ui.TextView as TextView;
import plugins.geoloc.install;

exports = Class(GC.Application, function () {
	this.updatePosition = function() {
		logger.log("Demo: Requesting position...");
		this.statusView.setText("REQUESTING...");

		// Run the exported addon function
		navigator.geolocation.getCurrentPosition(bind(this, function(pos) {
			logger.log("Demo: Success!");
			var lat = pos.coords.latitude;
			var lng = pos.coords.longitude;
			var acc = pos.coords.accuracy;

			this.latView.setText(lat);
			this.lngView.setText(lng);
			this.accView.setText(acc);
			this.statusView.setText("SUCCESS");
		}), bind(this, function(err) {
			logger.log("Demo: Error!");
			this.latView.setText("-");
			this.lngView.setText("-");
			this.accView.setText("-");
			this.statusView.setText("FAIL: ", err.code);
		}));
	}

	this.initUI = function () {
		this.view.style.layout = "linear";
		this.view.style.direction = "vertical";

		this.latView = new TextView({
			superview: this.view,
			layout: "box",
			text: "(latitude)",
			color: "white",
			flex: 1
		});

		this.lngView = new TextView({
			superview: this.view,
			layout: "box",
			text: "(longitude)",
			color: "white",
			flex: 1
		});

		this.accView = new TextView({
			superview: this.view,
			layout: "box",
			text: "(accuracy)",
			color: "white",
			flex: 1
		});

		this.statusView = new TextView({
			superview: this.view,
			layout: "box",
			text: "WAITING FOR FIRST UPDATE TIMER TICK...",
			color: "white",
			flex: 1
		});

		setInterval(bind(this, "updatePosition"), 5000)
	};
	
	this.launchUI = function () {};
});

