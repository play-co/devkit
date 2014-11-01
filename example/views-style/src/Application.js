//# Modify a View's Style <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/views/style/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//Create many views with random positions, sizes, rotations, and colors.

//Import the `device` module and `ui.View` class.
import device;
import ui.View as View;

//## Class: Application
exports = Class(GC.Application, function () {
	this.initUI = function () {
		this.style.backgroundColor = "#FFFFFF";

		//Create 200 views
		for (var i = 0; i < 200; i++) {
			//Randomize the size, shape, position, and color of each View.
			var width = 10 + Math.random() * 40;
			var height = 10 + Math.random() * 40;
			new View({
				superview: this.view,
				x: Math.random() * (device.width + 50) - 25,
				y: Math.random() * (device.height + 50) - 25,
				width: width,
				height: height,
				anchorX: width / 2,
				anchorY: height / 2,
				r: Math.random() * (Math.PI * 2),
				backgroundColor: getRandomColor()
			});
		}
	};
});

//Generate a random color string in hexadecimal format.
function getRandomColor () {
	var hex = Math.floor(Math.random() * 0xFFFFFF);
	return "#" + ("000000" + hex.toString(16)).substr(-6); //pad string
}

//<img src="./doc/screenshot.png" alt="view style screenshot" class="screenshot">
