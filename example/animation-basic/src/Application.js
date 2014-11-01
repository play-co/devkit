//# Basic Animation
//Making a view move.

//Import the animation module and the `ui.View` class.
import animate;
import ui.View as View;

//## Class: Application
//The entry point of the application.
exports = Class(GC.Application, function() {

	this.initUI = function() {
		this.style.backgroundColor = "#FFFFFF";

		//Create a single red squared view.
		var square = new View({
			superview: this.view,
			backgroundColor: "#FF0000",
			x: 20,
			y: 20,
			width: 100,
			height: 100
		});

		//Change the x property from 20 to 200 in 500 ms.
		animate(square).now({x: 200}, 500)
			//Then change the x property from 200 to 20 in 1500 ms.
			.then({x: 20}, 1500);
	};

	this.launchUI = function () {};
});
//<img src="./doc/screenshot.png" alt="trail screenshot" class="screenshot">