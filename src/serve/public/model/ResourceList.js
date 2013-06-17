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

import .resourceUtils as resourceUtils;

import util.ajax;

exports = ResourceList = Class(PubSub, function(supr) {
	this.init = function() {
		supr(this, 'init', arguments);

		this._project = false;
		this._list = new DataSource({key: 'path'});
	};

	this._loadList = function(err, response) {
		if (err) {
			return;
		}

		var list = this._list;
		var files = response.files;
		var file;
		var type;
		var label;
		var i;
		var j = files.length;

		list.clear();

		this.hasImages = false;
		this.hasAudio = false;
		this.hasFonts = false;
		this.hasJS = false;
		this.hasMisc = false;

		for (i = 0; i < j; ++i) {
			file = files[i];
			file.manager = this;

			if (resourceUtils.isExt(file.filename, resourceUtils.IMAGE_EXTS)) {
				type = 'image';
				label = 'Images files';
				this.hasImages = true;
			} else if (resourceUtils.isExt(file.filename, resourceUtils.AUDIO_EXTS)) {
				type = 'audio';
				label = 'Audio files';
				this.hasAudio = true;
			} else if (resourceUtils.isExt(file.filename, resourceUtils.FONT_EXTS)) {
				type = 'font';
				label = 'Font files';
				this.hasFonts = true;
			} else if (resourceUtils.isExt(file.filename, resourceUtils.JS_EXTS)) {
				type = 'js';
				label = 'Javascript files';
				this.hasJS = true;
			} else {
				type = 'misc';
				label = 'Miscellaneous files';
				this.hasMisc = true;
			}

			file.type = type;
			file.label = label;

			list.add(file);
		}

		this.publish('Loaded');
	};

	this.load = function() {
		if (!this._project) {
			return;
		}

		// get the latest list of resources
		util.ajax.get(
			{
				url: '/plugins/resource_editor/get_files/' + this._project.id,
				type: 'json'
			},
			bind(this, '_loadList')
		);
	};

	this.selectTarget = function(target) {
		// reset resources
		this._list.each(
			function(resource) {
				resource.isEmbedded = false;
				resource.isUploaded = false;
			}
		);

		var list = this._list;
		var resource;
		var i, r;

		// update resources
		for (i = 0; r = target.embed[i]; ++i) {
			resource = list.get(r);
			if (resource) {
				resource.isEmbedded = true;
			}
		}

		for (i = 0; r = target.upload[i]; ++i) {
			resource = list.get(r);
			if (resource) {
				resource.isUploaded = true;
			}
		}
	};

	this.setProject = function(project) {
		this._project = project;
	};

	this.getList = function(filter) {
		return filter ? this._list.filter(filter) : this._list;
	};
});
