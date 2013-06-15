/** @license
 * This file is part of the Game Closure SDK.
 *
 * The Game Closure SDK is free software: you can redistribute it and/or modify
 * it under the terms of the Mozilla Public License v. 2.0 as published by Mozilla.

 * The Game Closure SDK is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * Mozilla Public License v. 2.0 for more details.

 * You should have received a copy of the Mozilla Public License v. 2.0
 * along with the Game Closure SDK.  If not, see <http://mozilla.org/MPL/2.0/>.
 */

"use import";

import util.ajax;

var TileImage = Class(function() {
	this.init = function(opts) {
		this.filename = opts.filename;
		this.groups = opts.groups || 0;
		this.properties = opts.properties || {};
	};

	this.clean = function() {
		var properties = this.properties;
		var property;
		var v;
		var i, j;

		for (i in properties) {
			if (properties.hasOwnProperty(i)) {
				property = properties[i];
				v = 0;
				for (j = 0; j < 4; j++) {
					v += property[j];
				}
				if (v === -4) {
					delete(properties[i]);
				}
			}
		}
	};
});

exports = TileConfig = Class(function() {
	this.init = function(opts) {
		this._project = opts.project;

		var manifest = this._project.manifest;
		if (!manifest.tileConfig) {
			manifest.tileConfig = {
				tileWidth: 64,
				tileHeight: 64
			};
			this._project.saveManifest();
		}

		if (!manifest.tileConfig.images) {
			manifest.tileConfig.images = [];
		}
		this._images = manifest.tileConfig.images;
		this._imageGroups = false;
		
		var i = this._images.length;
		while (i) {
			i--;
			this._images[i] = new TileImage(this._images[i]);
		}

		this._applyRules = false;

		this._tileWidth = manifest.tileConfig.tileWidth;
		this._tileHeight = manifest.tileConfig.tileHeight;
	};

	this.getTileWidth = function() {
		return this._tileWidth;
	};

	this.getTileHeight = function() {
		return this._tileHeight;
	};

	this.getImages = function() {
		return this._images;
	};

	this.getImage = function(filename) {
		var images = this._images;
		var i = images.length;

		while (i) {
			if (images[--i].filename === filename) {
				return images[i];
			}
		}
		return false;
	};

	this.getImages = function() {
		return this._images;
	};

	this.getApplyRules = function() {
		return this._applyRules;
	};

	this.setApplyRules = function(applyRules) {
		this._applyRules = applyRules;
	};

	this.getImageGroups = function() {
		if (!this._imageGroups) {
			this.updateImageGroups();
		}
		return this._imageGroups;
	};

	this.addImage = function(filename) {
		var result = this.getImage(filename);
		if (!result) {
			result = new TileImage({filename: filename});
			this._images.push(result);
			this._project.saveManifest();
		}
		return result;
	};

	this.removeImage = function(filename) {
		var images = this._images;
		var i = images.length;
		var j;

		while (i) {
			if (images[--i].filename === filename) {
				images.splice(i, 1);
				this._project.saveManifest();
				return i;
			}
		}

		return false;
	};

	this.updateImageGroups = function() {
		var images = this._images;
		var properties;
		var property;
		var value;
		var i = images.length;
		var j, k;

		this._imageGroups = {};
		while (i) {
			properties = images[--i].properties;
			for (j in properties) {
				if (properties.hasOwnProperty(j)) {
					property = properties[j];
					value = '';
					for (k = 0; k < 4; k++) {
						value += ((value === '') ? '' : '_') + property[k];
					}
					if (!this._imageGroups[value]) {
						this._imageGroups[value] = [];
					}
					this._imageGroups[value].push({i: i, n: parseInt(j, 10)});
				}
			}
		}
	};

	this.resetImageGroups = function() {
		this._imageGroups = false;
	};
	
	this.imageNumToRect = function(num, image) {
		if (!image || !image.width) {
			return false;
		}

		var tileWidth = this._tileWidth;
		var tileHeight = this._tileHeight;
		var countX = ~~(image.width / tileWidth);
		var tileX = num % countX;
		var tileY = ~~(num / countX);

		return {
			x1: tileX * tileWidth,
			y1: tileY * tileHeight,
			x2: (tileX + 1) * tileWidth,
			y2: (tileY + 1) * tileHeight,
			width: tileWidth,
			height: tileHeight
		};
	};
});
