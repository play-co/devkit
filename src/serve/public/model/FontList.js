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

import lib.PubSub as PubSub;

import squill.models.DataSource as DataSource;

import util.ajax;

var Font = Class(PubSub, function(supr) {
	this.init = function(opts) {
		supr(this, 'init', arguments);

		this._project = opts.project;

		this.font = opts.font;
		this.dimension = opts.dimension;
		this.contextName = opts.font.contextName;

		//this.src = 'code/' + this._project.id + '/resources/fonts/' + opts.font.filename + '_0_0.png';
		this.src = '/projects/' + this._project.id + '/files/resources/fonts/' + opts.font.filename + '_0_0.png';

		this.colorImages = [];
		this.colorImageCount = 0;
		this.compositeImages = [];
		this.compositeImageCount = 0;
		this.compositeOutlineImages = [];
		this.compositeOutlineImageCount = 0;
	};

	this._load = function(i, a, f) {
		var image = new Image();

		image.onload = bind(
			this,
			function() {
				this[f]++;
				this.load();
			}
		);
		this[a].push(image);
		//image.src = 'code/' + this._project.id + '/resources/fonts/' + this.font.filename + '_' + i + '_' + this[f] + '.png';
		image.src = '/projects/' + this._project.id + '/files/resources/fonts/' + this.font.filename + '_' + i + '_' + this[f] + '.png';
	};

	this.load = function() {
		var font = this.font;

		if (this.colorImageCount < this.font.count) {
			this._load(0, 'colorImages', 'colorImageCount');
		} else if (this.compositeImageCount < this.font.count) {
			this._load(1, 'compositeImages', 'compositeImageCount');
		} else if (this.compositeOutlineImageCount < this.font.count) {
			this._load(2, 'compositeOutlineImages', 'compositeOutlineImageCount');
		} else {
			this.publish('Loaded', this);
		}
	};
	
	this.rename = function(contextName) {
		this.font.contextName = contextName;
		this.contextName = contextName;
	};
});

exports = FontList = Class(PubSub, function(supr) {
	this.init = function() {
		supr(this, 'init', arguments);

		this._project = false;
		this._list = new DataSource({key: 'contextName', sorter: function(item) { return item.contextName; }});

		this._loaded = 0;
		this._total = 0;
	};

	this._loadFont = function(font) {
		util.ajax.get(
			{
				//url: 'code/' + this._project.id + '/resources/fonts/' + font.filename + '.js'
				url: '/projects/' + this._project.id + '/files/resources/fonts/' + font.filename + '.json'
			},
			bind(
				this,
				function(err, response) {
					if (!err) {
						var opts = {
								font: font,
								project: this._project,
								dimension: JSON.parse(response)
							};

						this._list.add(new Font(opts));

						this._loaded++;
						this._checkLoaded();
					}
				}
			)
		);
	};

	this._checkLoaded = function() {
		if (this._loaded === this._total) {
			this.publish('Loaded');
		}
	};

	this.load = function() {
		if (!this._project) {
			return;
		}

		var list = this._list;
		var fonts = this._project.manifest.fonts || [];
		var font;
		var filename;
		var i = fonts.length;

		this._loading = {};
		this._loaded = 0;
		this._total = 0;

		list.clear();

		while (i) {
			font = fonts[--i];
			filename = font.filename;
			if (!this._loading[filename]) {
				this._loading[filename] = true;
				if (!list.getItemForID(filename)) {
					this._total++;
					this._loadFont(font);
				}
			}
		}

		this._checkLoaded();

		return false;
	};

	this.setProject = function(project) {
		this._project = project;
	};

	this.getList = function(filter) {
		return filter ? this._list.filter(filter) : this._list;
	};

	this.remove = function(filename, cb) {
		util.ajax.post(
			{
				url: '/plugins/font_editor/remove_fonts',
				data: {
					id: this._project.id,
					list: [filename]
				}
			},
			bind(
				this,
				function(err, response) {
					if (!err) {
						var project = this._project;
						var fonts = project.manifest.fonts;
						var i = fonts.length;

						while (i) {
							if (fonts[--i].filename === filename) {
								fonts.splice(i, 1);
								project.saveManifest();
								cb && cb();
								return;
							}
						}
					}
				}
			)
		);
	};

	this.rename = function(font, newName) {
		var testName = newName.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
		var found;

		if (testName === '') {
			return '"' + newName + '" is an invalid name.';
		}

		found = false;

		this._list.each(
			function(data) {
				found = found || (data.contextName === newName) && (data.font !== font);
			},
			this
		);

		if (found) {
			return 'The font "' + newName + '" already exists.';
		}

		font.rename(newName);
		this._project.saveManifest();

		return true;
	};

	this.clear = function() {
		this._list.clear();
	};
});
