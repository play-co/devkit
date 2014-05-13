import ui.TextView as TextView;

exports = Class(GC.Application, function () {

	this.initUI = function () {
		var textview = new TextView({
			superview: this.view,
			layout: "box",
			text: "Hello, world!",
			color: "white"
		});
	};
	
	this.launchUI = function () {};
});
