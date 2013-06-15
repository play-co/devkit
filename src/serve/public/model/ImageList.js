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

import lib.PubSub as PubSub;

import squill.models.DataSource as DataSource;

import util.ajax;

exports = ImageList = Class(PubSub, function(supr) {
	this.init = function() {
		supr(this, 'init', arguments);

		this._project = false;
		this._list = new DataSource({key: 'path'});

		this._animationList = false;
	};

	this._isFontImage = function(filename) {
		if (this._project.manifest.fonts) {
			var fonts = this._project.manifest.fonts;
			var font;
			var fontFilename;
			var i = fonts.length;

			while (i) {
				font = fonts[--i];
				fontFilename = font.filename;
				if (fontFilename === filename.substr(0, fontFilename.length)) {
					return font;
				}
			}
		}

		return false;
	};

	this.onAnimationsLoaded = function() {
		var animationList = this._animationList.getList();
		
		this._list.each(
			function(file) {
				var found = false;

				animationList.each(
					function(animation) {
						found = found || animation.hasFile(file.path);
					},
					this
				);

				if (!file.typeInfo) {
					file.typeInfo = '';
				}
				if (found) {
					file.typeInfo += ((file.typeInfo === '') ? '' : ' ') + 'animation';
				} else {
					file.typeInfo.replace(/animation/gi, '');
				}
			},
			this
		);

		this.publish('Loaded');
	};

	this._loadList = function(err, response) {
		if (err) {
			return;
		}

		var list = this._list;
		var files = response.files;
		var file;
		var i;
		var j = files.length;

		list.clear();

		for (i = 0; i < j; ++i) {
			file = files[i];
			file.isFontImage = this._isFontImage(file.filename);
			file.typeInfo = file.isFontImage ? 'font' : '';

			list.add(file);
		}

		if (!this._animationList) {
			this._animationList = this._project.getAnimationList();
			this._animationList.subscribe('Loaded', this, 'onAnimationsLoaded');
		}
		this._animationList.load();
	};

	this.load = function() {
		if (!this._project) {
			return;
		}

		// get the latest list of resources
		util.ajax.get(
			{
				url: '/plugins/image_editor/get_images/' + this._project.id,
				type: 'json'
			},
			bind(this, '_loadList')
		);
	};

	this.setProject = function(project) {
		this._project = project;
	};

	this.getList = function(filter) {
		return filter ? this._list.filter(filter) : this._list;
	};

	this.selectGroup = function(group) {
		// new group is selected
		var list = this._list;
		var image;
		var key;
		var i;

		// select all images in the group and build a hash of the images
		var selectedImages = {};

		for (i = 0; key = group.resources[i]; ++i) {
			selectedImages[key] = true;
			image = list.get(key);
			if (image) {
				image.isSelected = true;
			} else {
				logger.warn(key + ' not found!');
			}
		}

		// TODO!
		// if (group.name != this._project.config.lastImageGroup) {
		// 	this._project.config.lastImageGroup = group.name;
		// 	this._project.saveConfig();
		// }

		// deselect all other images
		list.each(
			function(image) {
				key = image[list.key];
				if (image.isSelected && !(key in selectedImages)) {
					image.isSelected = false;
				}
			}
		);
	};
});
