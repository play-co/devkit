/** @license
 * This file is part of the Game Closure SDK.
 *
 * The Game Closure SDK is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * The Game Closure SDK is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with the Game Closure SDK.  If not, see <http://www.gnu.org/licenses/>.
 */

"use import";

import sdkPlugin;
import util.ajax;
from util.browser import $;

import squill.Cell;
import squill.models.DataSource as DataSource;

var currentProject;

function noop(e) {
	e.stopPropagation();
	e.preventDefault();
	return false;
}

var currentTarget = "iPhone";

var JSONDataSource = Class(DataSource, function (supr) {
	this.toJSON = function () {
		return this._byIndex;
	}
});

//structure to save
targets = {
	"iPhone": new JSONDataSource({key: "url"}),
	"iPad": new JSONDataSource({key: "url"}),
	"Android": new JSONDataSource({key: "url"}),
	"Mobile Browser": new JSONDataSource({key: "url"}),
	"Desktop Browser": new JSONDataSource({key: "url"})
};

/**
* Cell for resources to apply rules to
*/
var ResourceCell = Class(squill.Cell, function (supr) {
	this._def = {
		className: "ResourceCell",
		children: [
			{type: "checkbox", id: "check"},
			{type: "button", label: "x", id: "cancel"}
		]
	};

	this.buildWidget = function () {
		this.cancel.onClick = bind(this, function (e) {
			//remove self from data source
			this._parent._dataSource.remove(this._data.url);
			this._parent.publish("CancelResource", this._data.url);
		});

		this.check.checkbox.onchange = bind(this, function () {
			this._data.selected = this.check.checkbox.checked;
			
			console.log(this._parent)
			this._parent.publish("UpdateRules");
		});
	}

	this.render = function () {
		this.check.setLabel(this._data.url);
		this.check.checkbox.checked = !!this._data.selected;
	}
});

var ImageCell = Class(squill.Cell, function (supr) {
	this._def = {
		className: "ImageCell",
		children: [
			{tag: "img", id: "preview"},
			{type: "label", id: "label"}
		]
	};

	this.buildWidget = function () {
		
		this.preview.addEventListener("dragenter", noop, false);
		this.preview.addEventListener("dragexit", noop, false);
		this.preview.addEventListener("dragover", noop, false);

		this.preview.addEventListener("drop", bind(this, this.dropImage), false);
	}

	this.dropImage = function(e) {
		var files = e.dataTransfer.files;
		var count = files.length;
		var file  = files[0];

		if (count < 1) {
			return console.log("No image found");
		}

		var reader = new FileReader();
		reader.onload = bind(this, function(evt) {
			this.preview.src = evt.target.result;
			this._data.commit = true;

			util.ajax.post({
				url: "/art/replaceImage/" + currentProject.id + "/" + encodeURIComponent(this._data.path),
				data: {data: evt.target.result},
				headers: {
					'Content-Type': 'application/json'
				}
			}, bind(this, function(err, resp) {
				
			}));
		});

		reader.readAsDataURL(file);

		return noop(e);
	}

	this.render = function () {
		this.preview.src = currentProject.url + "resources/" + this._data.path;
		this.label.setLabel(this._data.path);
	}
});

/**
* Cell for the folder structure
*/ 
var FolderCell = Class(squill.Cell, function (supr) {
	this._def = {
		className: "FolderCell",
		children: [
			{type: "label", id: "header"},
			{id: "copy", type: "button", label: "[>"},
			{type: "list", id: "contents", cellCtor: ImageCell}
		]
	}

	this.init = function () {
		supr(this, "init", arguments);
		this.contents.hidden = true;
	}

	this.buildWidget = function () {
		//when clicking the header, toggle the list
		this.header._el.onclick = bind(this, function() {
			
			if (this.contents.hidden) {
				this.contents._el.style.display = "block";
				this.contents.hidden = false;
			} else {
				this.contents._el.style.display = "none";
				this.contents.hidden = true;
			}
		});

		//copy over the resource to the resource list
		this.copy.onClick = bind(this, function () {
			if (!targets[currentTarget].get(this._data.url)) {

				targets[currentTarget].add({
					url: this._data.url,
					scale: null,
					resize: null,
					convert: null
				});
			}

			this._data.copied = true;
			this.copy._el.style.display = "none";
		});
	}

	this.render = function () {
		this.header.setLabel(this._data.url);
		this.contents.setDataSource(this._data.dataSource);

		//show or hide the copy button
		if (this._data.copied) {
			this.copy.hide();
		} else {
			this.copy.show();
		}
	}
});

var selected = [];

exports = Class(sdkPlugin.SDKPlugin, function(supr) {
	this._def = {
		className: 'mainPanel',
		children: [
			{id: 'gitControls', children: [
				{tag: 'h3', text: 'Save changes to repo'},
				{tag: "input", id: 'commitMessage', attrs: {placeholder: 'Message'}},
				{type: 'button', text: 'Save', id: 'commit'},
				{type: 'button', text: 'Undo', id: 'revert'},
				{tag: 'span', id: 'responseMessage'}
			]},

			{className: 'assets'},

			{id: 'assetList', isFixedHeight: false, type: "list", cellCtor: FolderCell},

			{
				id: 'assetControl',
				children: [
					{
						id: "targetGroup",
						children: [
							{tag: "span", text: "Target: "},
							{id: "target", tag: "select"},
						]
					},
					

					{id: "resourceList", type: "list", cellCtor: ResourceCell},

					{id: "disabled"},
					{id: "ruleList", children: [
						{tag: "h3", text: "Rules"},
					
						//scale to
						{children: [
							{tag: "span", text: "Scale to: ", className: "lbl"},
							{tag: "input", className: "scale", id: "scale", attrs: {
								type: "number",
								min: "1"
							}},
							{tag: "span", className: "unit", text: "%"}
						]},
						
						//resize to
						{children: [
							{tag: "span", text: "Resize to: ", className: "lbl"},
							{tag: "input", className: "width", id: "width", attrs: {type: "number"}},
							{tag: "span", text: " x "},
							{tag: "input", className: "height", id: "height", attrs: {type: "number"}},
							{tag: "span", className: "unit", text: "px"}
						]},
					
						//convert
						{type: "checkbox", label: "Convert PNG24 to PNG8", id: "convert"},
						
						{type: "button", text: "Clear rules on selected", className: "emph", id: "clear"},

					]}
				]
			}
		]
	}

	this.init = function(opts) {
		supr(this, "init", arguments);

		var html = "";
		for(var target in targets) {
			html += "<option value='" + target + "'>" + target + "</option>";
		}

		this.resourceList.setDataSource(targets["iPhone"]);

		this.target.innerHTML = html;
		this.target.onchange = bind(this, function (e) {
			
			var idx = e.target.options.selectedIndex;
			currentTarget = e.target.options[idx].value;
			
			this._showHideButtons();
			this.resourceList.setDataSource(targets[currentTarget]);
			this._updateOptions();
		});

		//listen to keydown changes
		["width", "height", "scale"].forEach(bind(this, function (input) {
			this[input].onchange = bind(this, function (e) {


				var ds;
				for (var i = 0; i < selected.length; ++i) {
					ds = this.resourceList.getDataSource().get(selected[i].url);
					ds[input] = +this[input].value || 0;
				}

				this.save();
			});
		}));

		//listen for changes on convert
		this.convert.checkbox.onchange = bind(this, function (e) {
			var ds;
			for (var i = 0; i < selected.length; ++i) {
				ds = this.resourceList.getDataSource().get(selected[i].url);
				ds.convert = e.target.checked;
			}

			this.save();
		});

		this.resourceList.subscribe("UpdateRules", this, function () {
			this._updateOptions();
		});

		this.resourceList.subscribe("CancelResource", this, function (url) {			
			var item = this.assetList.getDataSource().get(url);
			item.copied = false;
			this.assetList.getDataSource().updated(item);
		});

		this.clear.onClick = bind(this, function () {
			selected = [];
			this.resourceList.getDataSource().forEach(function (data, idx) {
				if (data.selected) {
					data.url = idx;
					selected.push(data);
				}
			});

			for (var i = 0; i < selected.length; ++i) {
				selected[i].width =
				selected[i].height =
				selected[i].scale = 
				selected[i].convert = null;
			}

			this._clearRules();
			this.save();
		});

		//send a commit request to the server
		this.commit.onClick = bind(this, function () {
			var message = this.commitMessage.value;
			this.commit.setEnabled(false);
			this.revert.setEnabled(false);

			if (!message) {
				message = "Art replacement changes";
			}

			util.ajax.post({
				url: "/art/commit/" + currentProject.id,
				data: {message: message},
				type: "json",
				headers: {
					'Content-Type': 'application/json'
				}
			}, bind(this, function(err, resp) {
				this.commitMessage.value = "";
				this.commit.setEnabled(true);
				this.revert.setEnabled(true);

				if (resp && resp.errorCode) {
					this.responseMessage.className = "red";
					this.responseMessage.innerText = "No changes to send to server";
				} else {
					this.responseMessage.className = "green";
					this.responseMessage.innerText = "Changes sent!";
				}
			}));
		});

		//send a revert request to the server
		this.revert.onClick = bind(this, function () {
			this.commit.setEnabled(false);
			this.revert.setEnabled(false);

			util.ajax.post({
				url: "/art/revert/" + currentProject.id,
				data: {},
				headers: {
					'Content-Type': 'application/json'
				}
			}, bind(this, function(err, resp) {
				window.location.reload();
			}));
		});
	}

	this._clearRules = function () {
		this.width.value =
		this.height.value =
		this.scale.value = "";
	}

	/**
	* Show or hide buttons that will let the user
	* copy a resource across
	*/
	this._showHideButtons = function () {
		var resources = targets[currentTarget];
		
		//loop over every item in the asset list
		this.assetList.getDataSource().forEach(bind(this, function (data, index) {
			//if exists in the current datasource, hide the button
			var button = this.assetList.getCellById(index).copy;
			if (resources.get(index)) {
				button.hide();
			} else {
				button.show();
			}
		}));
		
	}

	this._updateOptions = function () {
		selected = [];
		this.resourceList.getDataSource().forEach(function (data, idx) {
			if (data.selected) {
				data.url = idx;
				selected.push(data);
			}
		});

		//single selection
		if (selected.length === 1) {
			if (selected[0].width) this.width.value = String(selected[0].width);
			if (selected[0].height) this.height.value = String(selected[0].height);
			if (selected[0].scale) this.scale.value = String(selected[0].scale);
			if (selected[0].convert) this.checkbox.checked = selected[0].convert;
		} else {
			this.width.value =
			this.height.value =
			this.scale.value = "";
		}

		if (selected.length > 0) {
			this.disabled.style.display = "none";
		} else {
			this.disabled.style.display = "block";
		}

		console.log(selected, selected.length);
	}

	this.showProject = function (project) {
		supr(this, 'showProject', arguments);

		currentProject = project;
		this.appID = currentProject.id;

		util.ajax.get({
			url: "/art/isGitRepo/" + this.appID,
			type: "json"
		}, bind(this, function (err, resp) {
			if (resp.exists) {
				this.gitControls.style.display = "block";
				this.assetList._el.style.top = "100px";
			} else {
				this.gitControls.style.display = "none";
				this.assetList._el.style.top = "0px";
			}
		}));
		
		util.ajax.get({
			url: "/art/getResources/" + project.manifest.shortName || project.appID,
			type: "json"
		}, bind(this, function(err, resp) {
			//callback
			this.fill(resp.all);
			this.parse(resp.metadata);
		}));
	
	}

	this.save = function () {
		console.log(JSON.stringify(targets), this.appID, currentProject);
		util.ajax.post({
			url: "/art/saveRules/" + this.appID, 
			data: JSON.stringify(targets),
			headers: {
				"Content-Type": "application/json"
			}   
		}); 
	}

	function copy (e, title, button) {
		if (!targets[currentTarget].get(title.url)) {

			targets[currentTarget].add({
				url: title.url,
				scale: null,
				width: null,
				height: null,
				convert: null
			});
		}

		button.style.display = "none";

		e.preventDefault();
		e.stopPropagation();
		return false;
	}

	this.fill = function (data) {
		var ds = new JSONDataSource({key: "url"});
		var resource;
		var group = {};

		//convert flat array to group
		for (var i = 0; i < data.length; ++i) {
			resource = data[i];

			//initialise group
			if (!ds.get(resource.dir)) 
				ds.add({
					url: resource.dir, 
					dataSource: new JSONDataSource({key: "path"})
				});

			ds.get(resource.dir).dataSource.add(resource);
		}

		this.assetList.setDataSource(ds);
	}

	this.parse = function (metadata) {
		console.log("PARSE", metadata);

		for (var t in metadata) {
			for (var i = 0; i < metadata[t].length; ++i) {
				var current = metadata[t][i];
				var item = targets[t].get(current.url) || {};
				item.url = current.url;
				item.convert = current["png8"];
				item.width = current.w;
				item.height = current.h;
				item.scale = current.scale * 100;

				targets[t].updated(item);
			}
		}
	}
});
