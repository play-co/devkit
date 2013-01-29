"use import";

// @todo: align the gradients using the maximum dimensions!!!!!!!!!

var CharacterDimension = Class(function() {
	this.init = function(opts) {
		if (opts) {
			this.minX = opts.minX;
			this.minY = opts.minY;
			this.maxX = opts.maxX;
			this.maxY = opts.maxY;
		} else {
			this.reset();
		}
	};

	this.reset = function() {
		this.minX = 10000;
		this.maxX = -10000;
		this.minY = 10000;
		this.maxY = -10000;
	};

	this.checkMinX = function(minX) {
		this.minX = Math.min(minX, this.minX);
	};

	this.checkMaxX = function(maxX) {
		this.maxX = Math.max(maxX, this.maxX);
	};

	this.checkMinY = function(minY) {
		this.minY = Math.min(minY, this.minY);
	};

	this.checkMaxY = function(maxY) {
		this.maxY = Math.max(maxY, this.maxY);
	};

	this.get = function() {
		return new CharacterDimension({
			minX: this.minX,
			minY: this.minY,
			maxX: this.maxX,
			maxY: this.maxY
		});
	};

	this.set = function(dimension) {
		this.minX = dimension.minX;
		this.minY = dimension.minY;
		this.maxX = dimension.maxX;
		this.maxY = dimension.maxY;
	};

	this.render = function(ctx, color) {
		ctx.strokeStyle = color;
		ctx.strokeRect(
			this.minX + 0.5,
			this.minY + 0.5,
			this.maxX - this.minX,
			this.maxY - this.minY
		);
	};
});

var tempBuffer = document.createElement('canvas'),
	outlineBuffer = document.createElement('canvas'),
	characterBuffer = document.createElement('canvas'),
	embossBuffer = document.createElement('canvas'),
	buffer = document.createElement('canvas');

var CharacterRenderer = Class(function() {
	this.init = function(destBuffer, bufferSize) {
		this._destBuffer = destBuffer;

		this._bufferSize = bufferSize;
		this._bufferWidth = bufferSize;
		this._bufferHeight = bufferSize;

		tempBuffer.width = this._bufferWidth;
		tempBuffer.height = this._bufferHeight;
		this._tempBufferCtx = tempBuffer.getContext('2d');

		outlineBuffer.width = this._bufferWidth;
		outlineBuffer.height = this._bufferHeight;
		this._outlineBufferCtx = outlineBuffer.getContext('2d');

		characterBuffer.width = this._bufferWidth;
		characterBuffer.height = this._bufferHeight;
		this._characterBufferCtx = characterBuffer.getContext('2d');

		embossBuffer.width = this._bufferWidth;
		embossBuffer.height = this._bufferHeight;
		this._embossBufferCtx = embossBuffer.getContext('2d');

		buffer.width = this._bufferWidth;
		buffer.height = this._bufferHeight;
		this._bufferCtx = buffer.getContext('2d');
	};

	this.clear = function() {
		var buffers = [
				this._tempBufferCtx,
				this._outlineBufferCtx,
				this._characterBufferCtx,
				this._embossBufferCtx,
				this._bufferCtx
			],
			i = buffers.length;

		while (i) {
			buffers[--i].clearRect(0, 0, this._bufferWidth, this._bufferHeight);
		}
	};

	this.setSettings = function(settings) {
		this._settings = settings;
	};

	this.setCharacter = function(character) {
		this._character = character;
	};

	this.setDimension = function(dimension) {
		this._dimension = dimension;
	};

	this.setPixels = function(pixels) {
		this._pixels = pixels;
	};

	this.scan = function(buffer) {
		var width = this._bufferWidth,
			height = this._bufferHeight,
			imageData = buffer.getContext('2d').getImageData(0, 0, width, height),
			data = imageData.data,
			offset,
			pixels = [],
			minX = 100000,
			maxX = -100000,
			minY = 100000,
			maxY = -100000,
			x, y,
			i, j;

		offset = 3;
		for (y = 0; y < height; y++) {
			for (x = 0; x < width; x++) {
				if (data[offset] > 0) {
					minX = Math.min(minX, x);
					maxX = Math.max(maxX, x);
					minY = Math.min(minY, y);
					maxY = Math.max(maxY, y);
					pixels.push({x: x, y: y});
				}
				offset += 4;
			}
		}

		if (minX !== 100000) {
			minX -= 2;
		}
		if (maxX !== -100000) {
			maxX += 2;
		}
		if (minY !== 100000) {
			minY -= 2;
		}
		if (maxY !== -100000) {
			maxY += 2;
		}

		this._dimension.checkMinX(minX);
		this._dimension.checkMaxX(maxX);
		this._dimension.checkMinY(minY);
		this._dimension.checkMaxY(maxY);

		this._pixels = pixels;

		return pixels;
	};

	this._rgb = function(c) {
		var red = parseInt(c.substr(1, 2), 16),
			grn = parseInt(c.substr(3, 2), 16),
			blu = parseInt(c.substr(5, 2), 16),
			gray;

		if (this._settings.gray) {
			gray = ~~(red * 0.3 + grn * 0.59 + blu * 0.11);
			red = gray;
			grn = gray;
			blu = gray;
		}

		return {
			red: 0xFF,//red,
			grn: 0xFF,//grn,
			blu: 0xFF,//blu,
			alpha: 100
		};
	};

	this._cloneRGB = function(rgb) {
		return {red: rgb.red, grn: rgb.grn, blu: rgb.blu};
	};

	this._setColor = function(ctx, colors, alphas, dimension) {
		var toString = function() {
				return (5000 + this.p) + '';
			},
			linearGradient = ctx.createLinearGradient(0, dimension.minY, 0, dimension.maxY),
			done0,
			done1000,
			color,
			colorStops = [],
			rgb,
			alpha,
			alpha1, alpha2,
			alphaStops = [],
			da, dp,
			i, j;
	
		if (colors.length === 1) {
			color = colors[0];
			colorStops.push({p:0, rgb:this._rgb(color.v), toString:toString});
			colorStops.push({p:1000, rgb:this._rgb(color.v), toString:toString});
		} else {
			done0 = false;
			done1000 = false;
			for (i = 0; i < colors.length; i++) {
				color = colors[i];
				done0 = done0 || (color.p === 0);
				done1000 = done1000 || (color.p === 1000);
				colorStops.push({p:color.p, rgb:this._rgb(color.v), toString:toString});
			}
			colorStops.sort();
			if (!done0) {
				color = colorStops[0];
				colorStops.push({p:0, rgb:this._cloneRGB(color.rgb), toString:toString});
				colorStops.sort();
			}
			if (!done1000) {
				color = colorStops[colorStops.length - 1];
				colorStops.push({p:1000, rgb:this._cloneRGB(color.rgb), toString:toString});
				colorStops.sort();
			}
		}

		if (alphas.length === 1) {
			alpha = alphas[0];
			alphaStops.push({p:0, alpha:alpha.v, toString:toString});
			alphaStops.push({p:1000, alpha:alpha.v, toString:toString});
		} else {
			done0 = false;
			done1000 = false;
			for (i = 0; i < alphas.length; i++) {
				alpha = alphas[i];
				done0 = done0 || (alpha.p === 0);
				done1000 = done1000 || (alpha.p === 1000);
				alphaStops.push({p:alpha.p, alpha:alpha.v, toString:toString});
			}
			alphaStops.sort();
			if (!done0) {
				alpha = alphaStops[0];
				alphaStops.push({p:0, alpha:alpha.alpha, toString:toString});
				alphaStops.sort();
			}
			if (!done1000) {
				alpha = alphaStops[alphaStops.length - 1];
				alphaStops.push({p:1000, alpha:alpha.alpha, toString:toString});
				alphaStops.sort();
			}
		}

		for (i = 0; i < colorStops.length; i++) {
			color = colorStops[i];
			for (j = 0; j < alphaStops.length - 1; j++) {
				alpha1 = alphaStops[j];
				alpha2 = alphaStops[j + 1];
				if (color.p === alpha1.p) {
					color.rgb.alpha = alpha1.alpha;
					break;
				} else if (color.p === alpha2.p) {
					color.rgb.alpha = alpha2.alpha;
					break;
				} else if ((color.p > alpha1.p) && (color.p < alpha2.p)) {
					da = alpha2.alpha - alpha1.alpha;
					dp = alpha2.p - alpha1.p;
					color.rgb.alpha = (alpha1.alpha + (color.p - alpha1.p) / dp * da);
					break;
				}
			}
		}

		for (i = 0; i < colorStops.length; i++) {
			color = colorStops[i];
			rgb = color.rgb;
			linearGradient.addColorStop(color.p / 1000, 'rgba(' + rgb.red + ',' + rgb.grn + ',' + rgb.blu + ',' + (rgb.alpha / 100) + ')');
		}
		ctx.fillStyle = linearGradient;
	};

	this._getFontString = function(opts) {
		var settings = this._settings,
			bold = (settings.bold ? 'bold ' : ''),
			italic = (settings.italic ? 'italic ' : '');

		if (opts.noItalic === true) {
			italic = '';
		}

		return bold + italic + settings.size + 'px ' + settings.font;
	};

	this.renderEmboss = function(opts) {
		var ctx = this._embossBufferCtx,
			width = this._bufferWidth,
			height = this._bufferHeight,
			settings = this._settings,
			w, h,
			x, y,
			i;

		ctx.clearRect(0, 0, width, height);

		ctx.font = this._getFontString(opts);
		ctx.textBaseline = 'top';

		w = ctx.measureText(this._character).width;
		h = settings.size;
		x = width / 2 - w / 2;
		y = height / 2 - h / 2;

		ctx.fillStyle = '#000000';

		!opts.mask && this._setColor(ctx, settings.embossColor1, settings.embossAlpha1, opts.dimension || this._dimension);
		for (i = 0; i < settings.emboss; i++) {
			ctx.fillText(this._character, x - i, y - settings.emboss);
			ctx.fillText(this._character, x - settings.emboss, y - i);
		}

		// Clear the emboss1 where it overlaps with emboss2 to make sure that
		// the alpha emboss2 doesn't show emboss1...
		ctx.save();
		ctx.globalCompositeOperation = 'destination-out';
		ctx.fillStyle = '#000000';
		for (i = 0; i < settings.emboss; i++) {
			ctx.fillText(this._character, x + i, y + settings.emboss);
			ctx.fillText(this._character, x + settings.emboss, y + i);
		}
		ctx.restore();

		!opts.mask && this._setColor(ctx, settings.embossColor2, settings.embossAlpha2, opts.dimension || this._dimension);
		for (i = 0; i < settings.emboss; i++) {
			ctx.fillText(this._character, x + i, y + settings.emboss);
			ctx.fillText(this._character, x + settings.emboss, y + i);
		}

		// Clear the character which leaves only the embossing...
		ctx.save();
		ctx.fillStyle = '#000000';
		ctx.globalCompositeOperation = 'destination-out';
		ctx.fillText(this._character, x, y);
		ctx.restore();
	};

	this.renderCharacter = function(opts) {
		var ctx = this._characterBufferCtx,
			width = this._bufferWidth,
			height = this._bufferHeight,
			settings = this._settings,
			w, h,
			x, y,
			i;

		ctx.clearRect(0, 0, width, height);

		ctx.font = this._getFontString(opts);
		ctx.textBaseline = 'top';

		w = ctx.measureText(this._character).width;
		h = settings.size;
		x = width / 2 - w / 2;
		y = height / 2 - h / 2;

		ctx.fillStyle = '#000000';
		!opts.mask && this._setColor(ctx, settings.color, settings.alpha, opts.dimension || this._dimension);
		ctx.fillText(this._character, x, y);
	};

	this.renderOutline = function(dimension) {
		var outlineBufferCtx = this._outlineBufferCtx,
			bufferCtx = this._bufferCtx,
			pixels = this._pixels,
			pixel,
			settings = this._settings,
			rect = settings.outlineRect,
			outline = settings.outline,
			outline2 = outline * 2,
			outlineX = settings.outlineX + 0.5,
			outlineY = settings.outlineY + 0.5,
			radius = outline / 2, //~~(outline / 2),
			tau = Math.PI * 2,
			i = pixels.length;

		bufferCtx.clearRect(0, 0, this._bufferWidth, this._bufferHeight);

		outlineBufferCtx.clearRect(0, 0, this._bufferWidth, this._bufferHeight);
		outlineBufferCtx.fillStyle = '#000000';
		while (i) {
			pixel = pixels[--i];
			if (rect) {
				outlineBufferCtx.fillRect(pixel.x - outline + outlineX, pixel.y - outline + outlineY, outline2, outline2);
			} else {
				outlineBufferCtx.beginPath();
				outlineBufferCtx.arc(pixel.x + outlineX, pixel.y + outlineY, outline, 0, tau, false);
				outlineBufferCtx.closePath();
				outlineBufferCtx.fill();
			}
		}

		bufferCtx.save();
		bufferCtx.clearRect(0, 0, this._bufferWidth, this._bufferHeight);
		this._setColor(bufferCtx, settings.outlineColor, settings.outlineAlpha, dimension || this._dimension);
		bufferCtx.fillRect(dimension.minX, dimension.minY, dimension.maxX - dimension.minX, dimension.maxY - dimension.minY);
		bufferCtx.restore();

		outlineBufferCtx.save();
		outlineBufferCtx.globalCompositeOperation = 'source-in';
		outlineBufferCtx.drawImage(buffer, 0, 0);
		outlineBufferCtx.restore();
	};

	this.renderToTempBuffer = function(opts) {
		var ctx = this._tempBufferCtx,
			settings = this._settings;

		ctx.save();

		if (opts.compositeOperation) {
			ctx.globalCompositeOperation = opts.compositeOperation;
		}

		ctx.drawImage(opts.buffer, 0, 0);

		ctx.restore();
	};

	this.renderToDestBuffer = function(opts) {
		var ctx = this._destBuffer.getContext('2d'),
			settings = this._settings;

		ctx.save();

		if ((settings.dropShadow !== 0) && (settings.hideShadow !== true)) {
			ctx.shadowOffsetX = settings.dropShadowX;
			ctx.shadowOffsetY = settings.dropShadowY;
			ctx.shadowBlur = settings.dropShadow;
			ctx.shadowColor = settings.dropShadowColor;
		}

		ctx.drawImage(opts.buffer, 0, 0);

		ctx.restore();
	};

	this.measureOutline = function(offset) {
		var dimension = this._dimension,
			settings = this._settings;

		if (settings.outline !== 0) {
			dimension.checkMinX(dimension.minX + settings.outlineX - settings.outline);
			dimension.checkMaxX(dimension.maxX + settings.outlineX + settings.outline);

			dimension.checkMinY(dimension.minY + settings.outlineY - settings.outline);
			dimension.checkMaxY(dimension.maxY + settings.outlineY + settings.outline);

			if (offset) {
				if (settings.outlineX > 0) {
					dimension.minX += settings.outlineX - settings.outline;
				} else if (settings.outlineX < 0) {
					dimension.maxX += settings.outlineX + settings.outline;
				}
				if (settings.outlineY > 0) {
					dimension.minY += settings.outlineY - settings.outline;
				} else if (settings.outlineY < 0) {
					dimension.maxY += settings.outlineY + settings.outline;
				}
			}
		}
	};

	this.measureDropShadow = function() {
		var dimension = this._dimension,
			settings = this._settings,
			dropShadow = settings.dropShadow;

		if (dropShadow !== 0) {
			dropShadow = Math.ceil(dropShadow / 2);

			dimension.checkMinX(dimension.minX + settings.dropShadowX - dropShadow);
			dimension.checkMaxX(dimension.maxX + settings.dropShadowX + dropShadow);

			dimension.checkMinY(dimension.minY + settings.dropShadowY - dropShadow);
			dimension.checkMaxY(dimension.maxY + settings.dropShadowY + dropShadow);
		}
	};
});

exports = FontRenderer = Class(function() {
	this.init = function(opts) {
		this._destBuffer = document.createElement('canvas'),
		this._destCtx = this._destBuffer.getContext('2d');

		this._bufferSize = opts.bufferSize;
		this._destBuffer.width = this._bufferSize;
		this._destBuffer.height = this._bufferSize;

		this._characterRenderer = new CharacterRenderer(this._destBuffer, this._bufferSize);
	};

	this.measureCharacter = function(opts) {
		var characterRenderer = this._characterRenderer,
			result,
			dimension;

		characterRenderer.setCharacter(opts.char);
		characterRenderer.setSettings(opts);

		// Measure the complete size of the character...
		//characterRenderer.clear();
		result = new CharacterDimension();
		characterRenderer.setDimension(result);

		if (opts.emboss === 0) {
			characterRenderer.renderCharacter({mask: true});
			characterRenderer.scan(characterBuffer);
		} else {
			characterRenderer.renderEmboss({mask: true});
			characterRenderer.scan(embossBuffer);
		}

		characterRenderer.measureOutline();
		characterRenderer.measureDropShadow();

		// Measure the size of the character without italic...
		characterRenderer.clear();
		dimension = new CharacterDimension();
		characterRenderer.setDimension(dimension);

		if (opts.emboss === 0) {
			characterRenderer.renderCharacter({mask: true, noItalic: true});
			characterRenderer.scan(characterBuffer);
		} else {
			characterRenderer.renderEmboss({mask: true, noItalic: true});
			characterRenderer.scan(embossBuffer);
		}

		characterRenderer.measureOutline();
		characterRenderer.measureDropShadow();

		result.offsetWidth = dimension.maxX - dimension.minX;

		return result;
	};

	this.clear = function() {
		this._characterRenderer.clear();
	};

	this.renderCharacter = function(ctx, opts) {
		var characterRenderer = this._characterRenderer,
			dimension = new CharacterDimension(),
			characterDimension,
			outlineDimension,
			totalDimension;

		this._destCtx.clearRect(0, 0, this._destBuffer.width, this._destBuffer.height);

		characterRenderer.setCharacter(opts.char);
		characterRenderer.setSettings(opts);
		characterRenderer.setDimension(dimension);

		if (opts.emboss === 0) {
			characterRenderer.renderCharacter({mask: true});
			characterRenderer.scan(characterBuffer);
		} else {
			characterRenderer.renderEmboss({mask: true});
			characterRenderer.scan(embossBuffer);
		}

		characterDimension = dimension.get();

		characterRenderer.measureOutline(true);
		outlineDimension = dimension.get();

		dimension.set(characterDimension);
		characterRenderer.measureOutline();
		characterRenderer.measureDropShadow();
		totalDimension = dimension.get();

		if ((opts.outline !== 0) && (opts.hideOutline !== true)) {
			// Render the outline buffer...
			characterRenderer.renderOutline(outlineDimension);
			// Render the outline buffer to the destination buffer...
			characterRenderer.renderToTempBuffer({
				buffer: outlineBuffer,
				compositeOperation: 'destination-over'
			});

			// Render the character mask...
			characterRenderer.renderCharacter({
				mask: true
			});
			// Clear the chararacter from the outline in the destination buffer...
			characterRenderer.renderToTempBuffer({
				buffer: characterBuffer,
				compositeOperation: 'destination-out'
			});
		}

		if ((opts.emboss !== 0) && (opts.hideEmboss !== true)) {
			// Render the emboss buffer...
			characterRenderer.renderEmboss({
				mask: true
			});
			// Render the emboss mask to the destination buffer which clears the embossing...
			characterRenderer.renderToTempBuffer({
				buffer: embossBuffer,
				compositeOperation: 'destination-out'
			});

			// Render the emboss buffer with the color settings...
			characterRenderer.renderEmboss({
				mask: false,
				dimension: characterDimension
			});
			// Render the embossing to the output buffer...
			characterRenderer.renderToTempBuffer({
				buffer: embossBuffer
			});
		}

		if (opts.hideCharacter !== true) {
			// Render the character buffer...
			characterRenderer.renderCharacter({
				dimension: characterDimension,
				mask: false
			});
			// Render the character buffer to the destination buffer...
			characterRenderer.renderToTempBuffer({
				buffer: characterBuffer
			});
		}

		// Render the combined buffers to the destination buffer...
		characterRenderer.renderToDestBuffer({
			buffer: tempBuffer
		});

		var minY = this._destBuffer.height / 2 - opts.size / 2;
		
		ctx.drawImage(
			this._destBuffer,
			totalDimension.minX,
			minY,
			totalDimension.maxX - totalDimension.minX,
			totalDimension.maxY - minY,
			opts.x + 0.5,
			opts.y + 0.5,
			(totalDimension.maxX - totalDimension.minX) / 2,
			(totalDimension.maxY - minY) / 2
		);
	};

	this.getBufferSize = function() {
		return this._bufferSize;
	};
});
