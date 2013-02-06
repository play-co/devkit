import ui.View;
import ui.TextView;

exports = Class(ui.View, function (supr) {
	this.init = function (opts) {
		opts = merge(opts, {
			backgroundColor: '#00ff00'
		});
		
		supr(this, 'init', [opts]);
	};

	this.buildView = function () {
		var button = new ui.TextView({
			superview: this,
			text: "Game Screen",
			x: 0,
			y: 0,
			width: this.style.width,
			height: 40,
			backgroundColor: '#ffffff'
		});
	};
});
