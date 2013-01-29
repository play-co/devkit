"use import";

import util.ajax;
import lib.PubSub as PubSub;

exports = FontMapper = Class(PubSub, function(supr) {
	this.init = function(opts) {
		supr(this, 'init', arguments);

		this._fontRenderer = opts.fontRenderer;
		this._map = {};

		this._bufferCanvas = [document.createElement('canvas'), document.createElement('canvas')];
	};

	this._getRange = function(list) {
		var dimension,
			width = 0,
			height = 0,
			i, j;

		for (i = 0, j = list.length; i < j; i++) {
			dimension = list[i].dimension;
			if ((dimension.maxX !== -10000) &&
				(dimension.minX !== 10000) &&
				(dimension.maxY !== -10000) &&
				(dimension.minY !== 10000)) {
				width = Math.max(dimension.maxX - dimension.minX, width);
				height = Math.max(dimension.maxY - dimension.minY, height);
			}
		}

		return {width: width / 2, height: height / 2};
	};

	this._showInPopup = function(ctx, size) {
		var win = window.open('', 'font' + Math.random(), 'location=0,status=0,scrollbars=1,width=256,height=256'),
			previewCanvas,
			previewCtx;

		win.document.write('<canvas id="preview" width="' + size + '" height="' + size + '"></canvas>');

		previewCanvas = win.document.getElementById('preview');
		previewCtx = previewCanvas.getContext('2d');
		previewCtx.fillStyle = '#888888';
		previewCtx.fillRect(0, 0, size, size);

		previewCtx.drawImage(ctx.canvas, 0, 0);
	};

	this._saveFontMap = function() {
		if (this._state.layer === 0) {
			console.log('Saving map:', this._state.opts.filename, this._map);
			util.ajax.post(
				{
					url: '/plugins/font_editor/save_map',
					data: {
						projectID: this._projectID,
						filename: this._state.opts.filename,
						map: this._map
					},
					headers: {
						"Content-Type": "application/json"
					}
				},
				bind(
					this,
					function(err, response) {
						if (err) { return alert(JSON.stringify(err)); }
						//console.log(response);
					}
				)
			);
		}
	};

	this._saveChunkDone = function() {
		var state = this._state,
			ctx = this._ctx,
			opts = state.opts,
			imageSize = opts.imageSize,
			i;

		state.chunkIndex++;
		if (state.chunkIndex >= state.chunkCount) {
			//for (i = 0; i < opts.canvasCount; i++) {
			//	this._showInPopup(ctx[i], imageSize);
			//}
			for (i = 0; i < opts.canvasCount; i++) {
				ctx[i].clearRect(0, 0, ctx[i].canvas.width, ctx[i].canvas.height);
			}

			state.layer++;
			if (state.layer < 3) {
				// Render the next layer...
				state.current = 0;
				state.x = 0;
				state.y = 0;
				opts.canvasIndex = 0;

				this._renderInterval = setInterval(bind(this, this._renderUpdate), 10);
			} else {
				for (i = 0; i < opts.canvasCount; i++) {
					ctx[i].canvas.width = 1;
					ctx[i].canvas.height = 1;
				}

				this.publish('Finished', opts.canvasCount);
			}
		} else {
			this.publish('Progress', state.layer, ~~(state.chunkIndex / state.chunkCount * 100));

			state.dataOffset += state.chunkSize;
			if (state.dataOffset >= this._fontData[state.dataIndex].length) {
				state.dataIndex++;
				state.dataOffset = 0;
			}
			this._saveFont();
		}
	};

	this._saveFont = function() {
		var state = this._state,
			offset = state.dataOffset,
			size = state.chunkSize,
			data = {},
			imageStr = this._fontData[state.dataIndex];

		data.filename = state.opts.filename;
		data.firstChunk = (offset === 0);
		if (offset + size >= imageStr.length) {
			size = imageStr.length - offset;
			data.lastChunk = true;
		} else {
			data.lastChunk = false;
		}

		data.projectID = this._projectID;
		data.chunk = imageStr.substr(offset, size);
		data.index = state.dataIndex;
		data.layer = this._state.layer;
		data.count = state.opts.canvasCount;

		util.ajax.post({
			url: '/plugins/font_editor/save_font', 
			data: data,
			headers: {
				"Content-Type": "application/json"
			}
		}, bind(this, this._saveChunkDone));
	};

	this._fontHeight = function(opts) {
		var height = opts.size / 2;

		if (opts.outline !== 0) {
			height += opts.outline * 2;
			if (opts.outlineY > 0) {
				height += opts.outlineY;
			} else if (opts.outlineY < 0) {
				height -= opts.outlineY;
			}
		}
		if (opts.dropShadow !== 0) {
			height += Math.ceil(dropShadow / 2);
			if (opts.dropShadowY > 0) {
				height += opts.dropShadowY;
			} else if (opts.dropShadowY < 0) {
				height -= opts.dropShadowY;
			}
		}

		return height + 8;
	};

	// @todo get all data from dimension...
	this._addToMap = function(opts, state, dimension) {
		var minY = this._fontRenderer.getBufferSize() / 2 - opts.size / 2;
		var code = opts.char.charCodeAt(0),
			scale = 0.5,
			info = {
				x: state.x,
				y: state.y,
				w: ((dimension.maxX - dimension.minX) * scale),
				h: this._fontHeight(opts),
				ow: (dimension.offsetWidth * scale),
				oh: 0,//((minY + opts.size / 2 - this._fontRenderer.getBufferSize() / 2) * scale),
				i: opts.canvasIndex
			};

		if (this._fontInfo && isArray(this._fontInfo.getGlyphs()[code])) {
			info.k = this._fontInfo.getGlyphs()[code];
		}

		this._map[code] = info;
	};

	this._renderChar = function() {
		var state = this._state,
			opts = state.opts,
			ctx = this._ctx[opts.canvasIndex],
			fontRenderer = this._fontRenderer,
			imageSize = opts.imageSize,
			cellSize = opts.cellSize;

		opts.char = state.list[state.current].char;
		opts.x = state.x;
		opts.y = state.y;

		switch (state.layer) {
			case 0:
				opts.hideCharacter = false;
				opts.hideOutline = false;
				opts.hideShadow = false;
				opts.hideEmboss = false;
				opts.gray = false;
				break;

			case 1:
				opts.hideCharacter = false;
				opts.hideEmboss = false;
				opts.hideOutline = true;
				opts.hideShadow = true;
				opts.gray = true;
				break;

			case 2:
				opts.hideOutline = false;
				opts.hideCharacter = true;
				opts.hideShadow = true;
				opts.hideEmboss = true;
				opts.gray = true;
				break;
		}

		fontRenderer.clear();

		fontRenderer.renderCharacter(ctx, opts);

		this._addToMap(opts, state, state.list[state.current].dimension);

		state.x += cellSize;
		if (state.x > imageSize - cellSize) {
			state.x = 0;
			state.y += cellSize;
			if (state.y + cellSize >= 1024) {
				opts.canvasIndex++;
				state.y = 0;
			}
		}

		state.current++;
		this.publish('Progress', state.layer, ~~(state.current / state.list.length * 100));
	};

	this._renderUpdate = function() {
		var state = this._state,
			opts = state.opts,
			ctx = this._ctx,
			i;

		if (state.current < state.list.length) {
			this._renderChar();
		} else {
			clearInterval(this._renderInterval);
			this._saveFontMap();

			this._fontData = [];
			state.chunkSize = 100 * 1024;
			state.chunkCount = 0;
			state.chunkIndex = 0;
			state.dataIndex = 0;
			state.dataOffset = 0;
			for (i = 0; i < opts.canvasCount; i++) {
				this._fontData[i] = this._ctx[i].canvas.toDataURL('image/png');
				state.chunkCount += Math.ceil(this._fontData[i].length / state.chunkSize);
			}

			this.publish('FinishedGenerate');

			this._saveFont();
		}
	};

	this._createBitmap = function(opts) {
		var bufferCanvas = this._bufferCanvas,
			imageSize = opts.imageSize,
			i;

		this._projectID = opts.projectID;
		this._map = {};
		this._ctx = [];

		for (i = 0; i < opts.canvasCount; i++) {
			bufferCanvas[i].width = imageSize;
			bufferCanvas[i].height = imageSize;
			this._ctx[i] = bufferCanvas[i].getContext('2d');
		}

		this._state = {
			opts: opts,
			list: opts.list,
			layer: 0,
			current: 0,
			x: 0,
			y: 0
		};

		this._renderInterval = setInterval(bind(this, this._renderUpdate), 10);
	};

	this.createMap = function(opts) {
		var fontRenderer = this._fontRenderer,
			dimension,
			cellSize,
			imageSize1, imageSize2,
			count,
			scale = 0.5,
			list1 = opts.list,
			list2 = [],
			i, j;

		for (i = 0, j = list1.length; i < j; i++) {
			opts.char = list1[i];
			dimension = fontRenderer.measureCharacter(opts, scale);
			if (opts.char !== ' ') {
				if ((dimension.maxX !== -10000 * scale) && (dimension.minX !== 10000 * scale) && (dimension.maxY !== -10000 * scale) && (dimension.minX !== 10000 * scale)) {
					list2.push({
						char: opts.char,
						dimension: dimension
					});
				}
			}
		}

		dimension = this._getRange(list2);
		dimension.height = this._fontHeight(opts);

		cellSize = Math.max(dimension.width, dimension.height);
		count = Math.ceil(Math.sqrt(list2.length));

		imageSize1 = cellSize * count;
		imageSize2 = 1;
		while (imageSize1 > imageSize2) {
			imageSize2 <<= 1;
		}

		opts.canvasIndex = 0;
		if (imageSize2 > 1024) {
			imageSize2 = 1024;
			opts.canvasCount = 2;
		} else {
			opts.canvasCount = 1;
		}

		opts.list = list2;
		opts.count = count;
		opts.cellSize = cellSize;
		opts.imageSize = imageSize2;

		this._createBitmap(opts);
	};

	this.setFontInfo = function(fontInfo) {
		this._fontInfo = fontInfo;
	};

	this.cancel = function() {
		clearInterval(this._renderInterval);
	};
});
