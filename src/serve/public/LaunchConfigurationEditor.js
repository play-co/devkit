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

import lib.PubSub;
import std.uri;

import squill.cssLoad;
import squill.Delegate;
import squill.Widget;
import squill.PillButtons;
import squill.List;
import squill.Cell;
import squill.Button;
import squill.models.DataSource as DataSource;

import util.Animation;
from util.browser import $;

import runtimeBrowser.util.resolutions as resolutions;

var unique_client_id = 0;

var defaultNames = ['bob', 'woot', 'hope', 'marty', 'wellington', 'george', 'hunter', 'maxwell', 'zimbabwe', 'zanthor', 'physikai', 'pal', 'stan'];

var ClientWrapper = Class(lib.PubSub, function() {
	this.init = function(opts) {
		opts = opts || {};
		
		this.id = ++unique_client_id;
		this.displayName = opts.displayName || defaultNames[this.id % defaultNames.length];
		this.device = opts.device || 'browser';
		this.rotation = opts.rotation;
		this.entry = opts.entry;
	};
	
	this.set = function(key, value) {
		this[key] = value;
		this.publish('Change', key, value);
	};
	
	this.toJSON = function() {
		return {
			displayName: this.displayName,
			device: this.device,
			rotation: this.rotation,
			entry: this.entry
		};
	};
});

import ....sdkPlugin;

exports = Class(sdkPlugin.SDKPlugin, function(supr) {
	this.init = function() {
		this._defaultText = $({text: 'Select a project on the left.'});
		this._launchConfigs = new DataSource();
		this._launchClients = new DataSource();

		var options = [];
		for (var i = 1; i <= 10; ++i) {
			options.push({
				value: i,
				text: '' + i,
				selected: i == 1
			});
		}

		this._def = {
			className: 'mainPanel',
			children: [
				{
					className: 'topBar'
				},
				{
					className: 'mainContentWrapper contentNoRows',
					children: [
						{
							className: 'mainContentRight contentOneRow',
							children: [
								{
									id: 'lnchClientWrapper',
									children: [
										{
											id: 'lnchClientList',
											type: 'list',
											className: 'clientList',
											dataSource: this._launchClients,
											cellCtor: ClientEditor
										}
									]
								}
							]
						},
						{
							className: 'mainContentLeft contentOneRow',
							children: [
								{
									className: 'smallItemListWrapper darkPanel',
									children: [
										{
											id: 'lnchConfigList',
											type: 'list',
											selectable: 'single',
											className: 'smallItemList',
											dataSource: this._launchConfigs,
											cellCtor: ConfigCell
										}
									]
								}
							]
						},
						{
							id: 'lnchInfoWrapper',
							className: 'toolWrapper',
							children: [
								{
									className: 'lnchEditorOptions',
									children: [
										{id: 'numClientsChooser', type: squill.PillButtons, options: options},
										{id: 'lnchHasServer', label: ' start JS server', type: 'checkbox'}
									]
								}
							]
						}
					]
				},
				{
					className: 'toolWrapper'
				}
			]
		};

		supr(this, 'init', arguments);
	};

	this.onConfigChange = function() {
		this._project.saveConfig();
	};

	this.delegate = new squill.Delegate(function(on) {
		on.lnchHasServer = function() {
			this._currentConfig.hasServer = this.lnchHasServer.isChecked();
			this.onConfigChange();
		};
	});

	this.buildWidget = function(el) {
		this.numClientsChooser.subscribe('Select', this, 'setNumClients');
		this.lnchConfigList.selection.subscribe('Select', this, 'chooseConfig');
	};

	this.getCurrentConfig = function() {
		return this._currentConfig;
	};

	this.chooseConfig = function(config) {
		this._launchClients.clear();
		this._currentConfig = config;
		var clients = config.clients;
		if (clients) {
			for (var i = 0, c; c = clients[i]; ++i) {
				if (!(c instanceof ClientWrapper)) {
					clients[i] = new ClientWrapper(c);
					clients[i].subscribe('Change', this, 'onConfigChange');
				}
				
				this._launchClients.add(clients[i]);
			}
		}

		var numClients = config.numClients || clients.length || 1;
		this.numClientsChooser.setValue(numClients);
		this.setNumClients(numClients);
		this.lnchHasServer.setChecked(config.hasServer);
	};

	this.setNumClients = function(numClients) {
		var curr = this._launchClients.getCount(),
			clients = this._currentConfig.clients,
			i;

		if (numClients < curr) {
			for (i = numClients; i < curr; ++i) {
				this._launchClients.remove(clients[i]);
			}
		} else if (numClients > curr) {
			for (i = curr; i < numClients; ++i) {
				if (!clients[i] || !(clients[i] instanceof ClientWrapper)) {
					clients[i] = new ClientWrapper(clients[i]);
				}
				
				this._launchClients.add(clients[i]);
			}
		}

		this._currentConfig.numClients = numClients;
		this.onConfigChange();
	};

	this.showProject = function(project) {
		supr(this, 'showProject', arguments);
		this.reload();
	};

	this.setOverview = function(overview) {
		this._overview = overview;
		overview.setLaunchConfigurator(this);
	};

	this.reload = function() {
		this._launchClients.clear();
		this._launchConfigs.clear();

		var config = this._project.config;
		var launch = config.launch;
		var lastLaunch = config.lastLaunch;

		for (var name in launch) {
			var c = launch[name];
			c.id = name;

			if (!lastLaunch || name == lastLaunch) {
				lastLaunch = name;
				c.isSelected = true;
				this.lnchConfigList.selection.select(c);
			} else {
				c.isSelected = false;
			}

			this._launchConfigs.add(c);
		}

		this.chooseConfig(launch[lastLaunch]);
	};
});

var ConfigCell = Class(squill.Cell, function(supr) {
	this._def = {className: 'defaultCellStyle configurationName'};

	this.render = function() {
		$.setText(this._el, this._data.id);
	};
});

var ResolutionTile = Class(squill.Widget, function(supr) {
	this.init = function(opts) {
		this._resolution = opts.resolution;
		this._device = opts.device;
		
		supr(this, 'init', arguments);
	};

	this.getDevice = function() { return this._device; };

	this.buildWidget = function(el) {
		$.apply(el, {
			className: 'resolutionChoice',
			children: [
				$({
					className: 'content',
					children: [
						$({
							className: 'resolutionImg',
							tag: 'img',
							src: this._resolution.thumbnail
						})
					]
				}),
				$({
					className: 'overview',
					children: [
						$({
							className: 'resolutionName',
							text: this._resolution.name
						}),
						$({
							className: 'resolutionValue',
							html: this._resolution.width && (this._resolution.width + 'x' + this._resolution.height) || '&nbsp;'
						})
					]
				})
			]
		});
		
		$.onEvent(el, 'mousedown', this, 'publish', 'Select', this._resolution);
	};
});

var ClientEditor = Class(squill.Cell, function(supr) {
	this.buildWidget = function(el) {
		el.className = 'lnchClientEditor';

		this._title = $({parent: el, className: 'titleInput', tag: 'input', attrs: {type: 'text'}});
		$.onEvent(this._title, 'blur', this, 'onTitleChange');

		this._resolutions = $({parent: el, className: 'resolutionPicker darkPanel'});

		this._entry = $({
			parent: el,
			className: 'entryInput',
			tag: 'select',
			children: [
				$({tag: 'option', attrs: {value: 'single'}, text: 'launchSinglePlayer'}),
				$({tag: 'option', attrs: {value: 'multi'}, text: 'launchMultiPlayer'}),
				$({tag: 'option', attrs: {value: 'intro'}, text: 'launchUI'})
			]
		});

		this._rotation = $({
			parent: el,
			className: 'rotationInput',
			tag: 'select',
			children: [
				$({tag: 'option', attrs: {value: '0'}, text: 'portrait'}),
				$({tag: 'option', attrs: {value: '1'}, text: 'landscape'})
			]
		});

		$.onEvent(this._entry, 'blur', this, 'onEntryChange');
		$.onEvent(this._rotation, 'blur', this, 'onRotationChange');

		this._selectedTile = null;
		this._tiles = {};
		for (var i in resolutions.defaults) {
			
			var tile = this._tiles[i] = new ResolutionTile({
					parent: this._resolutions,
					device: i,
					resolution: resolutions.defaults[i]
				});
			
			tile.subscribe('Select', this, 'onResSelect', tile);
		}
	};

	this.onRotationChange = function() {
		this._data.set('rotation', this._rotation.value);
	};

	this.onEntryChange = function() {
		this._data.set('entry', this._entry.value);
	};

	this.onTitleChange = function() {
		this._data.set('displayName', this._title.value);
	};

	this.onResSelect = function(tile) {
		this._data.set('device', tile && tile.getDevice() || 'browser');
		this.highlightTile(tile);
	};

	this.highlightTile = function(tile) {
		if (this._selectedTile) { $.removeClass(this._selectedTile.getElement(), 'selected'); }

		if (tile) {
			var el = tile.getElement(),
				left = el.offsetLeft,
				width = el.offsetWidth;

			$.addClass(el, 'selected');

			if (this._resolutions.scrollLeft + this._resolutions.offsetWidth < left + width) {
				if (this._anim) { this._anim.jumpTo(this._anim._s); }
				this._anim = new util.Animation({
					start: this._resolutions.scrollLeft,
					end: left + width - this._resolutions.offsetWidth,
					duration: 250,
					subject: bind(this, function(s) {
						this._resolutions.scrollLeft = s;
					})
				}).play(); 

				// this._resolutions.scrollLeft = left + width - this._resolutions.offsetWidth;
			} else if (this._resolutions.scrollLeft > left) {
				if (this._anim) { this._anim.jumpTo(this._anim._s); }
				this._anim = new util.Animation({
					start: this._resolutions.scrollLeft,
					end: left,
					duration: 250,
					subject: bind(this, function(s) {
						logger.log(s);
						this._resolutions.scrollLeft = s;
					})
				}).play();

				// this._resolutions.scrollLeft = left;
			}
		}

		this._selectedTile = tile;
	};

	this.render = function() {
		this._title.value = this._data.displayName;
		this._entry.value = this._data.entry;
		this._rotation.value = this._data.rotation;

		var selectedDevice = this._data.device || 'browser';
		this.highlightTile(this._tiles[selectedDevice]);
	};
});
