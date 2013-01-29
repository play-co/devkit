"use import";

import lib.PubSub as PubSub;

import util.ajax;

exports = FontInfo = Class(PubSub, function(supr) {
	this.init = function(opts) {
		this._project = opts.project;
		this._name = opts.name;
		this._glyphs = [];

		this._load();
	};

	this._onLoad = function(font) {
		var i, j;

		for (i = 0, j = font.chars.length; i < j; i++) {
			this._glyphs[font.chars[i].c] = font.chars[i].k || true;
		}

		this.publish('Ready', this);
	};

	this._load = function() {
		if (this._name) {
			// Determine displayable characters.
			console.error('TODO:', 'Check kerning for FontInfo loading.');
			var ctx = document.createElement('canvas').getContext('2d');
			ctx.font = '1000px ' + JSON.stringify(this._name);
			var chars = Array(257).join('_').split('').map(function (_, i) {
				return {c: i, width: ctx.measureText(String.fromCharCode(i)).width/1000};
			}).filter(function (c) {
				return c.width > 0 && c.c != 0x9 && c.c != 0xa && c.c != 0x20 && c.c != 0xa0;
			});

			console.log({chars: chars});
			
			var that = this;
			window.setTimeout(function () {
				that._onLoad({chars: chars});
			}, 0);
		}
	};

	this.getName = function() {
		return this._name;
	};

	this.getGlyphs = function() {
		return this._glyphs;
	};

	this.getGlyphInfo = function(code) {
		return this._glyphs[code];
	};

	this.hasChar = function(code) {
		return (this._glyphs[code] !== undefined);
	};
});
