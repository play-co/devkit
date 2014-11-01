//## Moving Multiple Rectangles
//Move over each rectangle to animate it to the edge of the device.

import animate;
import device;
import ui.View as View;

//## Class: Application
exports = Class(GC.Application, function () {

	this.initUI = function () {
		var startX = device.width / 2 - 75;
		var startY = device.height / 2 - 25;

		this.style.backgroundColor = "#FFFFFF";

		var redBox = new View({
			superview: this.view,
			x: startX,
			y: startY,
			width: 50,
			height: 50,
			backgroundColor: "#FF0000"
		});
		redBox.style.anchorX = redBox.style.width / 2;
		redBox.style.anchorY = redBox.style.height / 2;

		redBox.on("InputOver", function () {
			moveSquare(this, 3000, 0);
		});

		var greenBox = new View({
			superview: this.view,
			x: startX + 50,
			y: startY,
			width: 50,
			height: 50,
			backgroundColor: "#00FF00"
		});
		greenBox.style.anchorX = greenBox.style.width / 2;
		greenBox.style.anchorY = greenBox.style.height / 2;

		greenBox.on("InputOver", function () {
			moveSquare(this, 2000, device.height / 2 - this.style.height / 2);
		});

		var blueBox = new View({
			superview: this.view,
			x: startX + 100,
			y: startY,
			width: 50,
			height: 50,
			backgroundColor: "#0000FF"
		});
		blueBox.style.anchorX = blueBox.style.width / 2;
		blueBox.style.anchorY = blueBox.style.height / 2;

		blueBox.on("InputOver", function () {
			moveSquare(this, 1000, device.height - this.style.height);
		});
	};
});

function moveSquare (square, midDelay, targetY) {
	animate(square).now({
		opacity: 0.1,
		x: device.width - 50,
		rotation: Math.PI * 2
	}, 1000, animate.EASE_IN).wait(midDelay).then({
			opacity: 1,
			x: 0,
			y: targetY,
		}, 1000, animate.EASE_OUT);
}
//<img src="./doc/screenshot.png" alt="trail screenshot" class="screenshot">