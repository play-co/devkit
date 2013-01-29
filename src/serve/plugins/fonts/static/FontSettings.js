"use import";

exports = FontSettings = Class(function() {
	this.init = function(opts) {
		this._name = opts.name || 'Verdana';
		this._size = opts.size || 20;
		this._tracking = opts.tracking || 0;
		this._bold = opts.bold || false;
		this._italic = opts.italic || false;

		this._color = opts.color || [{p:0, v:'#FFFFFF'}];
		this._alpha = opts.color || [{p:0, v:100}];

		this._outline = opts.outline || 0;
		this._outlineColor = opts.outlineColor || [{p:0, v:'#880000'}];
		this._outlineAlpha = opts.outlineAlpha || [{p:0, v:100}];
		this._outlineRect = opts.outlineRect || false;
		this._outlineX = opts.outlineX || 0;
		this._outlineY = opts.outlineY || 0;

		this._emboss = opts.emboss || 0;
		this._embossColor1 = opts.embossColor1 || [{p:0, v:'#000000'}];
		this._embossAlpha1 = opts.embossAlpha1 || [{p:0, v:100}];
		this._embossColor2 = opts.embossColor2 || [{p:0, v:'#FFFFFF'}];
		this._embossAlpha2 = opts.embossAlpha2 || [{p:0, v:100}];

		this._dropShadow = opts.dropShadow || 0;
		this._dropShadowColor = opts.dropShadowColor || '#000000';
		this._dropShadowX = opts.dropShadowX || 0;
		this._dropShadowY = opts.dropShadowY || 0;
	};

	this.addToManifest = function(manifest) {
		var found = false,
			fonts = manifest.fonts || [],
			font = {},
			i = fonts.length;

		while (i) {
			if (fonts[--i].filename === this._filename) {
				font = fonts[i];
				found = true;
				break;
			}
		}

		font.version = '1';

		font.filename = this._filename;
		font.contextName = this._contextName || this._filename;
		font.name = this._name;
		font.size = this._size;
		font.tracking = this._tracking;
		font.bold = this._bold;
		font.italic = this._italic;

		font.color = this._color;
		font.alpha = this._alpha;

		font.outline = this._outline;
		font.outlineColor = this._outlineColor;
		font.outlineAlpha = this._outlineAlpha;
		font.outlineRect = this._outlineRect;
		font.outlineX = this._outlineX;
		font.outlineY = this._outlineY;

		font.emboss = this._emboss;
		font.embossColor1 = this._embossColor1;
		font.embossAlpha1 = this._embossAlpha1;
		font.embossColor2 = this._embossColor2;
		font.embossAlpha2 = this._embossAlpha2;

		font.dropShadow = this._dropShadow;
		font.dropShadowColor = this._dropShadowColor;
		font.dropShadowX = this._dropShadowX;
		font.dropShadowY = this._dropShadowY;

		font.count = this._count;

		if (!found) {
			fonts.push(font);
		}

		manifest.fonts = fonts;
	};

	this.getFilename = function() { return this._filename; };
	this.setFilename = function(filename) { this._filename = filename; };

	this.getName = function() { return this._name; };
	this.setName = function(name) { this._name = name; };

	this.getContextName = function() { return this._contextName; };
	this.setContextName = function(contextName) { this._contextName = contextName; };

	this.getSize = function() { return this._size; };
	this.setSize = function(size) { this._size = size; };
	this.getTracking = function() { return this._tracking; };
	this.setTracking = function(tracking) { this._tracking = tracking; };
	this.getBold = function() { return this._bold; };
	this.setBold = function(bold) { this._bold = bold; };
	this.getItalic = function() { return this._italic; };
	this.setItalic = function(italic) { this._italic = italic; };

	this.getColor = function() { return this._color; };
	this.setColor = function(color) { this._color = color; };
	this.getAlpha = function() { return this._alpha; };
	this.setAlpha = function(alpha) { this._alpha = alpha; };

	this.getOutline = function() { return this._outline; };
	this.setOutline = function(outline) { this._outline = outline; };
	this.getOutlineColor = function() { return this._outlineColor; };
	this.setOutlineColor = function(outlineColor) { this._outlineColor = outlineColor; };
	this.getOutlineAlpha = function() { return this._outlineAlpha; };
	this.setOutlineAlpha = function(outlineAlpha) { this._outlineAlpha = outlineAlpha; };
	this.getOutlineRect = function() { return this._outlineRect; };
	this.setOutlineRect = function(outlineRect) { this._outlineRect = outlineRect; };
	this.getOutlineX = function() { return (this._outline === 0) ? 0 : this._outlineX; };
	this.setOutlineX = function(outlineX) { this._outlineX = outlineX; };
	this.getOutlineY = function() { return (this._outline === 0) ? 0 : this._outlineY; };
	this.setOutlineY = function(outlineY) { this._outlineY = outlineY; };

	this.getEmboss = function() { return this._emboss; };
	this.setEmboss = function(emboss) { this._emboss = emboss; };
	this.getEmbossColor1 = function() { return this._embossColor1; };
	this.setEmbossColor1 = function(embossColor1) { this._embossColor1 = embossColor1; };
	this.getEmbossAlpha1 = function() { return this._embossAlpha1; };
	this.setEmbossAlpha1 = function(embossAlpha1) { this._embossAlpha1 = embossAlpha1; };
	this.getEmbossColor2 = function() { return this._embossColor2; };
	this.setEmbossColor2 = function(embossColor2) { this._embossColor2 = embossColor2; };
	this.getEmbossAlpha2 = function() { return this._embossAlpha2; };
	this.setEmbossAlpha2 = function(embossAlpha2) { this._embossAlpha2 = embossAlpha2; };

	this.getDropShadow = function() { return this._dropShadow; };
	this.setDropShadow = function(dropShadow) { this._dropShadow = dropShadow; };
	this.getDropShadowColor = function() { return this._dropShadowColor; };
	this.setDropShadowColor = function(dropShadowColor) { this._dropShadowColor = dropShadowColor; };
	this.getDropShadowX = function() { return (this._dropShadow === 0) ? 0 : this._dropShadowX; };
	this.setDropShadowX = function(dropShadowX) { this._dropShadowX = dropShadowX; };
	this.getDropShadowY = function() { return (this._dropShadow === 0) ? 0 : this._dropShadowY; };
	this.setDropShadowY = function(dropShadowY) { this._dropShadowY = dropShadowY; };

	this.setCount = function(count) { this._count = count; };
});
