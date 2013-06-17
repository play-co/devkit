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

function shallowCopy(item) {
	var result = {},
		i;

	for (i in item) {
		if (item.hasOwnProperty(i)) {
			result[i] = item[i];
		}
	}

	return result;
}

var Animation = Class(function() {
	this.init = function(opts) {
		var filenames = opts.filenames,
			frames = opts.frames,
			i, j;

		this.name = opts.name; // key for dataSource!

		this._project = opts.project;
		this._images = {};

		this._files = {};
		this._filenames = [];
		for (i = 0, j = filenames.length; i < j; i++) {
			this._files[filenames[i]] = true;
			this._filenames.push(filenames[i]);
		}

		this._frames = [];
		for (i = 0, j = frames.length; i < j; i++) {
			// x, y, w, h, ax, ay, t, i
			this._frames.push(shallowCopy(frames[i]));
		}

		this.loadImages();
	};

	this._frameSortIndex = function(i) {
		i = i + '';
		return '0000'.substr(0, 4 - i.length) + i;
	};

	this.removeFrame = function(index) {
		var result = null,
			frames = this._frames,
			frame,
			i, j;

		for (i = 0, j = frames.length; i < j; i++) {
			frame = frames[i];
			if (frame.i === index) {
				index = frame.i;
				result = shallowCopy(frame);
				frames.splice(i, 1);
				break;
			}
		}
		for (i = 0, j = frames.length; i < j; i++) {
			frame = frames[i];
			if (frame.i > index) {
				frame.i--;
			}
		}

		return result;
	};

	this.frameUp = function(index) {
		var result = null;
		var frames = this._frames;
		var i;

		if (index > 0) {
			i = frames[index - 1].i;
			frames[index - 1].i = frames[index].i;
			frames[index].i = i;

			result = index;
		}

		return result;
	};

	this.frameDown = function(index) {
		var result = null;
		var frames = this._frames;
		var i;

		if (index < frames.length - 1) {
			i = frames[index + 1].i;
			frames[index + 1].i = frames[index].i;
			frames[index].i = i;

			result = index;
		}

		return result;
	};

	this.changeFrame = function(newFrame) {
		var result = null,
			frames = this._frames,
			frame,
			i, j;

		for (i = 0, j = frames.length; i < j; i++) {
			frame = frames[i];
			if (frame.i === newFrame.i) {
				result = {
					index: i,
					frame: shallowCopy(frame)
				};
				frame.x = newFrame.x;
				frame.y = newFrame.y;
				frame.w = newFrame.w;
				frame.h = newFrame.h;
				frame.ax = newFrame.ax;
				frame.ay = newFrame.ay;
				frame.t = newFrame.t;
				break;
			}
		}

		return result;
	};

	this.getFrames = function() {
		var sorter = function() { return this.sortIndex; },
			frames = this._frames,
			frame,
			i, j;

		for (i = 0, j = frames.length; i < j; i++) {
			frame = frames[i];
			frame.sortIndex = this._frameSortIndex(frame.i);
			frame.toString = sorter;
		}

		return frames;
	};

	this.getImages = function() {
		return this._images;
	};

	this.getFilenames = function() {
		return this._filenames;
	};

	this.getManager = function() {
		return this._manager;
	};

	this.getAlignmentInfo = function(maxWidth, maxHeight) {
		var result = {};
		var frames = this._frames;
		var frame;
		var minX = 0;
		var maxX = 0;
		var minY = 0;
		var maxY = 0;
		var anchorMinX = 1024;
		var anchorMaxX = 0;
		var anchorMinY = 1024;
		var anchorMaxY = 0;
		var ow, oh;
		var w, h;
		var i = frames.length;

		while (i) {
			frame = frames[--i];

			minX = Math.min(minX, frame.ax);
			maxX = Math.max(maxX, frame.w);
			maxX = Math.max(maxX, frame.ax);

			minY = Math.min(minY, frame.ay);
			maxY = Math.max(maxY, frame.h);
			maxY = Math.max(maxY, frame.ay);

			anchorMinX = Math.min(anchorMinX, frame.ax);
			anchorMaxX = Math.max(anchorMaxX, frame.ax);
			anchorMinY = Math.min(anchorMinY, frame.ay);
			anchorMaxY = Math.max(anchorMaxY, frame.ay);
		}

		w = maxX - minX;
		h = maxY - minY;

		result.deltaAX = anchorMaxX - anchorMinX;
		result.deltaAY = anchorMaxY - anchorMinY;

		ow = w;
		oh = h;

		if (w > maxWidth) {
			h *= maxWidth / w;
			w = maxWidth;
		}

		if (h > maxHeight) {
			w *= maxHeight / h;
			h = maxHeight;
		}

		result.scaleWidth = w / ow;
		result.scaleHeight = h / oh;

		return result;
	};

	this.loadImages = function() {
		var filenames = this._filenames;
		var filename;
		var i = filenames.length;

		while (i) {
			filename = filenames[--i];
			this._images[filename] = new Image();
			this._images[filename].src = '/code/' + this._project.id + '/' + filename;
		}
	};

	this.save = function() {
		util.ajax.post(
			{
				url: '/plugins/image_editor/save_animation',
				data: {
					appID: this._project.manifest.appID,
					name: this.name,
					animation: this.toJSON()
				}
			},
			bind(
				this,
				function(err, response) {
					if (err) { return alert(JSON.stringify(err)); }
				}
			)
		);
	};

	this.toJSON = function() {
		var filenames = this._filenames,
			frames = this._frames,
			frame,
			result = {
				name: this.name,
				filenames: [],
				frames: []
			},
			i, j;

		for (i = 0, j = filenames.length; i < j; i++) {
			result.filenames.push(filenames[i]);
		}
		for (i = 0, j = frames.length; i < j; i++) {
			result.frames.push({
				i: frames[i].i,
				x: frames[i].x,
				y: frames[i].y,
				w: frames[i].w,
				h: frames[i].h,
				ax: frames[i].ax,
				ay: frames[i].ay,
				t: frames[i].t,
				f: frames[i].f
			});
		}

		return result;
	};

	this.hasFile = function(filename) {
		return (this._files[filename] === true);
	};
});

exports = AnimationList = Class(PubSub, function(supr) {
	this.init = function() {
		supr(this, 'init', arguments);

		this._project = false;
		this._list = new DataSource({key: 'name', sorter: function(item) { return item.name; }});

		this._loaded = 0;
		this._total = 0;
	};

	this.onLoad = function(err, response) {
		if (!err) {
			response.project = this._project;
			this._list.add(new Animation(response));
		}
		this._loaded++;
		this._checkLoaded();
	};

	this._loadAnimation = function(name) {
		util.ajax.get(
			{
				url: 'code/' + this._project.id + '/resources/animations/' + name + '.json',
				type: 'json'
			},
			bind(
				this,
				'onLoad'
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
		var animations = this._project.manifest.animations || [];
		var name;
		var i;
		var j = animations.length;

		this._loading = {};
		this._loaded = 0;
		this._total = 0;

		list.clear();

		for (i = 0; i < j; i++) {
			name = animations[i].name;
			if (!this._loading[name]) {
				this._loading[name] = true;
				if (!list.getItemForID(name)) {
					this._total++;
					this._loadAnimation(name);
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

	this.getForFile = function(filename) {
		var result = new DataSource({key: 'name', sorter: function(item) { return item.name; }});

		this._list.each(
			function(animation) {
				animation.hasFile(filename) && result.add(animation);
			},
			this
		);

		return result;
	};

	this.add = function(animation) {
		var project = this._project;
		var newAnimation;

		animation.project = project;
		newAnimation = new Animation(animation);
		this._list.add(newAnimation);

		project.manifest.animations.push({name: animation.name});
		project.saveManifest();

		return newAnimation;
	};

	this.remove = function(animation) {
		var found = false;
		var project = this._project;
		var animations = project.manifest.animations;
		var i = animations.length;

		while (i) {
			if (animations[--i].name === animation.name) {
				animations.splice(i, 1);
				found = true;
				break;
			}
		}
		if (found) {
			project.saveManifest();
			this._list.remove(animation);
		}
	};
});
