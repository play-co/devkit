"use import";

import lib.PubSub as PubSub;

import util.ajax;

exports = FontPreviewRenderer = Class(PubSub, function(supr) {
	this.init = function(opts) {
		this._buffer1Ctx = opts.buffer1Ctx;
		this._buffer2Ctx = opts.buffer2Ctx;

		supr(this, 'init', arguments);
	};

	this.setData = function(data) {
		this._data = data;
	};

	this.renderLine = function(ctx, images, x, y, text, color, size) {
		if (!images) {
			return;
		}

		var data = this._data;
		var buffer1Ctx = this._buffer1Ctx;
		var buffer2Ctx = this._buffer2Ctx;
		var font = data.font;
		var dimension = data.dimension;
		var chr;
		var scale = size / data.font.size;
		var ow, oh, w, h;
		var allowSpace = false;
		var i, j;

		for (i = 0, j = text.length; i < j; i++) {
			chr = text.charCodeAt(i);
			if (dimension[chr]) {
				allowSpace = true;
				chr = dimension[chr];
				if (images[chr.i]) {
					ow = chr.ow * scale;
					oh = chr.oh * scale;
					w = chr.w * scale;
					h = chr.h * scale;
					if (color === null) {
						ctx.drawImage(images[chr.i], chr.x, chr.y, chr.w, chr.h, ~~(x * scale), y + oh, w, h);
					} else {
						buffer1Ctx.save();

						buffer1Ctx.fillStyle = color;
						buffer1Ctx.fillRect(0, 0, w, h);

						buffer2Ctx.clearRect(0, 0, w + 2, h + 2);
						buffer2Ctx.drawImage(images[chr.i], chr.x, chr.y, chr.w, chr.h, 1, 1, w, h);

						buffer1Ctx.globalCompositeOperation = 'destination-in';
						buffer1Ctx.drawImage(this._buffer2Ctx.canvas, -1, -1);

						buffer1Ctx.restore();

						ctx.drawImage(this._buffer1Ctx.canvas, 0, 0, w, h, ~~(x * scale), y + oh, w, h);
					}

					x += chr.ow;
				}
			} else if ((chr === 32) && allowSpace) {
				x += 20;
			}
		}
	};
});
