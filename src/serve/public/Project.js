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

import squill.cssLoad;
import squill.models.DataSource as DataSource;
import util.ajax;

import .model.TileConfig as TileConfig;
import .model.GridList as GridList;
import .model.AnimationList as AnimationList;
import .model.FontList as FontList;
import .model.ImageList as ImageList;
import .model.ResourceList as ResourceList;

function protoDelay(method, orig, timeout) {
	return function() {
		return (this[method] = delay(orig, timeout)).apply(this, arguments);
	};
}

/**
 * Project model.
 */

exports = Class(function() {

	this.init = function(project) {
		merge(this, project);
	};

	this.saveManifest = protoDelay('saveManifest', function() {
		util.ajax.post({
			url: '/projects/manifest/save/' + this.appID, 
			data: this.manifest,
			headers: {
				"Content-Type": "application/json"
			}
		});
	}, 100);

	this.saveConfig = protoDelay('saveConfig', function() {
		//removed, now use local storage
		console.log("Save config is deprecated");
	}, 100);

	this.isAnimationPath = function(path) {
		var manifest = this.manifest;
		var animations = manifest.animations || [];
		var i = animations.length;

		while (i) {
			if (path === 'resources/animations/' + animations[--i].name + '.json') {
				return true;
			}
		}

		return false;
	};

	this.resolvePath = function(path) {
		return '/code/' + this.appID + '/' + path;
	};

	this.isFontFilename = function(path) {
		var manifest = this.manifest;
		var fonts = manifest.fonts || [];
		var i = fonts.length;

		while (i) {
			if (path === 'resources/fonts/' + fonts[--i].filename + '.js') {
				return fonts[i];
			}
		}

		return false;
	};

	function editList(list, isInList, item) {
		var index = list.indexOf(item);
		if (isInList && index == -1) {
			list.push(item);
		} else if (!isInList && index >= 0) {
			list.splice(index, 1);
		} else {
			return false;
		}

		return true;
	}

	this.setEmbedded = function(target, item, isEmbedded) {
		if (typeof target == 'string') {
			target = this.manifest.targets[target];
		}

		if (target && editList(target.embed, isEmbedded, item.path)) {
			this.saveManifest();
		}
	};

	this.setUploaded = function(target, item, isUploaded) {
		if (typeof target == 'string') {
			target = this.manifest.targets[target];
		}

		if (target && editList(target.upload, isUploaded, item.path)) {
			this.saveManifest();
		}
	};

	/**
	 * Project resources.
	 */

	this.getAnimationList = function() {
		if (!this._animationList) {
			this._animationList = new AnimationList();
			this._animationList.setProject(this);
		}
		return this._animationList;
	};

	this.getFontList = function() {
		if (!this._fontList) {
			this._fontList = new FontList();
			this._fontList.setProject(this);
		}
		return this._fontList;
	};

	this.getImageList = function() {
		if (!this._imageList) {
			this._imageList = new ImageList();
			this._imageList.setProject(this);
		}
		return this._imageList;
	};

	this.getResourceList = function() {
		if (!this._resourceList) {
			this._resourceList = new ResourceList();
			this._resourceList.setProject(this);
		}
		return this._resourceList;
	};

	this.getTileConfig = function() {
		if (!this._tileConfig) {
			this._tileConfig = new TileConfig({
				project: this
			});
		}
		return this._tileConfig;
	};

	this.getGridList = function() {
		if (!this._gridList) {
			this._gridList = new GridList({
				project: this,
				tileConfig: this.getTileConfig()
			});
		}
		return this._gridList;
	};

	/**
	 * Utility functions.
	 */

	this.tryIcons = function(iconList, targetSize) {
		var sizes = [], closest = null;
		if (iconList) {
			for (var size in iconList) {
				if (parseInt(size, 10) == size) {
					sizes.push(parseInt(size, 10));
				}
			}
			sizes.sort(function (a, b) {
				return a < b ? -1 : 1;
			});
			for (var i = sizes.length - 1; i >= 0; i--) {
				if (sizes[i] <= targetSize) {
					return '/projects/' + this.id + '/files/' + iconList[sizes[i]];
				}
			}
			if (sizes.length) {
				return '/projects/' + this.id + '/files/' + iconList[sizes.pop()];
			}
		}

		return null;
	}

	this.getIcon = function (targetSize) {
		var path = this.manifest.icon ? ('/projects/' + this.id + '/files/' + this.manifest.icon) : null;
		if (!path) {
			path = this.tryIcons(this.manifest.android && this.manifest.android.icons, targetSize);
		}
		if (!path) {
			path = this.tryIcons(this.manifest.ios && this.manifest.ios.icons, targetSize);
		}
		if (!path) {
			path = '/images/defaultIcon.png';
		}
		return path;
	};
});
