//# Advanced Rendering: Rendering to a Buffer <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/advrendering/buffers/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//This example shows how to create a buffer, rendering to that buffer
//and displaying the buffer on the screen.

//Import device the get the screen size and a device dependent Canvas constructor.
import device;

//## Class: Application
exports = Class(GC.Application, function () {

	//Capture the following events:
	//* inputStart: to start drawing
	//* inputMove: to change the end point of the list
	//* inputSelect: place the line on the screen
	this.initUI = function () {
		this._pixelShift = 3;
		this._pixelSize = 1 << this._pixelShift;

		//Get a device dependent Canvas constructor.
		var Canvas = new device.get("Canvas");
		this._buffer = new Canvas({width: device.width, height: device.height});
		this._ctx = this._buffer.getContext("2d");
		this._ctx.fillStyle = "#FFFFFF";

		this._ctx.fillRect(0, 0, device.width, device.height);
		this._ctx.fillStyle = "#888888";

		//The user starts drawing.
		this.view.on('InputStart', bind(this, function (evt, pt) {
			this._startX = pt.x >> this._pixelShift;
			this._startY = pt.y >> this._pixelShift;
			this._endX = pt.x >> this._pixelShift;
			this._endY = pt.y >> this._pixelShift;
		}));
		//The end position is dragged.
		this.view.on('InputMove', bind(this, function (evt, pt) {
			this._endX = pt.x >> this._pixelShift;
			this._endY = pt.y >> this._pixelShift;
		}));
		//The user stops dragging and the line is rendered to the off-screen buffer.
		this.view.on('InputSelect', bind(this, function (evt, pt) {
			this._renderLine(this._ctx);
			this._startX = null;
		}));
	};

	//[Bresenham's line algorithm](http://en.wikipedia.org/wiki/Bresenham's_line_algorithm)
	this._renderLine = function (ctx) {
		// Translate coordinates
		var x1 = this._startX;
		var y1 = this._startY;
		var x2 = this._endX;
		var y2 = this._endY;

		// Define differences and error check
		var dx = Math.abs(x2 - x1);
		var dy = Math.abs(y2 - y1);
		var sx = (x1 < x2) ? 1 : -1;
		var sy = (y1 < y2) ? 1 : -1;
		var err = dx - dy;

		ctx.fillRect(x1 << this._pixelShift, y1 << this._pixelShift, this._pixelSize, this._pixelSize);

		while (!((x1 == x2) && (y1 == y2))) {
			var e2 = err << 1;
			if (e2 > -dy) {
				err -= dy;
				x1 += sx;
			}
			if (e2 < dx) {
				err += dx;
				y1 += sy;
			}
			ctx.fillRect(x1 << this._pixelShift, y1 << this._pixelShift, this._pixelSize, this._pixelSize);
		}
	};

	//Render the buffer to the screen.
	this.render = function (ctx) {
		ctx.drawImage(this._buffer, 0, 0);
		if (this._startX) {
			//Check if a new line is being drawn.
			this._renderLine(ctx);
		}
	};

	this.launchUI = function () {};
});
