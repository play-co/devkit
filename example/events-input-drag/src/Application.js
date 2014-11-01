import animate;
import device;
import ui.TextView as TextView;
import event.input.drag as drag;

exports = Class(GC.Application, function () {
	this.makeRotor = function(x, y, r, dr, bgColor) {
		var dragview = drag.makeDraggable(new TextView({
			superview: this.view,
			layout: 'box',
			width: device.width/3, // Scale with screen
			height: device.height/3,
			backgroundColor: bgColor, // Make edges clearly visible
			text: 'DRAG ME',
			color: 'white',
			x: x,
			y: y,
			r: r,
			centerAnchor: true
		}));

		// Fancy: It rotates too! (Why not?)
		dragview.rotate = function() {
			animate(dragview).now({
				dr: dr
			}, 1000, animate.linear).then(bind(this, 'rotate'));
		};

		dragview.rotate();
	}

	this.initUI = function () {
		// Make a bunch of rotors to drag around
		this.makeRotor(0, 0, 1, 2, 'red');
		this.makeRotor(device.width/3, device.height/3, 2, 1, 'blue');
		this.makeRotor(2*device.width/3, device.height/3, 3, -1, 'green');
		this.makeRotor(device.width/3, 2*device.height/3, 4, 0.5, 'yellow');
		this.makeRotor(2*device.width/3, 2*device.height/3, 5, -0.5, 'orange');
	};
	
	this.launchUI = function () {};
});

