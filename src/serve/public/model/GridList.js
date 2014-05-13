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
	var result = {};
	var i;

	for (i in item) {
		if (item.hasOwnProperty(i)) {
			result[i] = item[i];
		}
	}

	return result;
}

var GridLayer = Class(function() {
	this.init = function(opts) {
		var x, y;

		this._grid = opts.grid;
		this._tileConfig = opts.tileConfig;

		this._visible = true;
		this._data = [[]];

		this._width = opts.width || 32;
		this._height = opts.height || 32;

		if (opts.layer) {
			for (y = 0; y < this._height; y++) {
				this._data[y] = [];
				for (x = 0; x < this._width; x++) {
					if (opts.layer[y] && opts.layer[y][x]) {
						this._data[y][x] = opts.layer[y][x];
					} else {
						this._data[y][x] = {i: -1};
					}
				}
			}
		}
	};

	this._fromData = function(data, x, y) {
		if ((y < data.length) && (x < data[y].length)) {
			return data[y][x];
		}
		return null;
	};

	this.resize = function(width, height) {
		var line;
		var data = [];
		var x, y;

		if (width && height) {
			this._width = width;
			this._height = height;
		} else {
			width = this._width;
			height = this._height;
		}

		for (y = 0; y < height; y++) {
			line = [];
			for (x = 0; x < width; x++) {
				line[x] = this._fromData(this._data, x, y) || {i: -1};
			}
			data[y] = line;
		}

		this._data = data;
	};

	this.getTile = function(x, y, clone) {
		if ((x < 0) || (y < 0) || (x === false) || (y === false)) {
			return {i: -1};
		}
		var result = this._data[y][x] || {i: -1};
		if (clone) {
			result = shallowCopy(result);
		}

		return result;
	};

	this.copy = function(x1, y1, x2, y2) {
		var result = [];
		var line;
		var x, y;

		for (y = y1; y <= y2; y++) {
			line = [];
			for (x = x1; x <= x2; x++) {
				line.push(this.getTile(x, y, true));
			}
			result.push(line);
		}

		return result;
	};

	this.clearTile = function(x, y) {
		var width = this._width;
		var height = this._height;

		if ((x >= 0) && (x < width) && (y >= 0) && (y < height)) {
			this._data[y][x] = {i: -1};
		}
	};

	this.setTile = function(x, y, tile, edge, mustResolve) {
		var result = false;
		var tileConfig = this._tileConfig;
		var dest;
		var images;
		var imageGroups;
		var imageGroup;
		var properties1, properties2;
		var width = this._width;
		var height = this._height;
		var find;
		var i, j;

		if ((x >= 0) && (x < width) && (y >= 0) && (y < height)) {
			if (tileConfig.getApplyRules() && (edge !== undefined)) {
				dest = this._data[y][x];
				// No destination tile set or empty destination or no edge...
				if (!dest || (dest.i === undefined) || (dest.i === -1) || (edge === 0)) {
					this._data[y][x] = {i: tile.i, n: tile.n};
					result = true;
				} else {
					images = tileConfig.getImages();
					imageGroups = tileConfig.getImageGroups();
					properties1 = images[dest.i].properties;
					properties2 = images[tile.i].properties;

					// No properties for source or destination tile...
					if ((properties1[dest.n] === undefined) || (properties2[tile.n] === undefined)) {
						if (mustResolve !== true) {
							this._data[y][x] = tile;
							result = true;
						}
					} else {
						properties1 = properties1[dest.n];
						properties2 = properties2[tile.n];
						find = '';
						j = 1;
						for (i = 0; i < 4; i++) {
							find += ((find === '') ? '' : '_') + (((edge & j) === j) ? properties1[i] : properties2[i]);
							j <<= 1;
						}
						// Check if the combination exists...
						if (imageGroups[find] !== undefined) {
							imageGroup = imageGroups[find];
							imageGroup = imageGroup[Math.round(Math.random() * imageGroup.length) % imageGroup.length];
							this._data[y][x] = {i:imageGroup.i, n:imageGroup.n};
							result = true;
						} else if (mustResolve !== true) {
							this._data[y][x] = tile;
							result = true;
						}
					}
				}
			} else if (mustResolve !== true) {
				this._data[y][x] = tile;
				result = true;
			}
		}

		return result;
	};

	this.setVisible = function(visible) {
		this._visible = visible;
	};

	this.getData = function() {
		return this._data;
	};

	this.getWidth = function() {
		return this._width;
	};

	this.getHeight = function() {
		return this._height;
	};

	this.each = function(cb, context) {
		var width = this._width;
		var height = this._height;
		var data = this._data;
		var x, y;

		for (y = 0; y < height; y++) {
			for (x = 0; x < width; x++) {
				cb.call(context, x, y, data[y][x]);
			}
		}
	};

	this.isVisible = function() {
		return this._visible;
	};

	this.removeImage = function(index) {
		var width = this._width;
		var height = this._height;
		var data = this._data;
		var tile;
		var x, y;

		for (y = 0; y < height; y++) {
			for (x = 0; x < width; x++) {
				tile = this._data[y][x];
				if (tile.i === index) {
					tile.i = -1;
				} else if (tile.i > index) {
					tile.i--;
				}
			}
		}
	};

	this.toJSON = function() {
		var result = [];
		var line;
		var data = this._data;
		var tile;
		var width = this._width;
		var height = this._height;
		var x, y;

		for (y = 0; y < height; y++) {
			line = [];
			for (x = 0; x < width; x++) {
				if (data[y]) {
					tile = data[y][x];
					if (tile) {
						line[x] = {i: tile.i, n: tile.n};
					} else {
						line[x] = {i: -1};
					}
				} else {
					line[x] = {i: -1};
				}
			}
			result[y] = line;
		}

		return result;
	};

	this.findRange = function() {
		var width = this._width;
		var height = this._height;
		var minX = 10000;
		var maxX = 0;
		var minY = 10000;
		var maxY = 0;
		var x, y;

		for (y = 0; y < height; y++) {
			line = this._data[y];
			for (x = 0; x < width; x++) {
				if (line[x].i !== -1) {
					minX = Math.min(x, minX);
					minY = Math.min(y, minY);
					maxX = Math.max(x, maxX);
					maxY = Math.max(y, maxY);
				}
			}
		}

		return {minX: minX, minY: minY, maxX: maxX, maxY: maxY};
	};
});

var Grid = Class(function() {
	this.init = function(opts) {
		var grid;
		var i;

		this._project = opts.project;
		this._tileConfig = opts.tileConfig;

		this.name = opts.name;
		this.contextName = opts.contextName;

		if (opts.grid) {
			grid = opts.grid;

			this._layers = [];
			for (i = 0; i < grid.layers.length; i++) {
				this._layers.push(new GridLayer({
					grid: this,
					tileConfig: this._tileConfig,
					width: grid.width,
					height: grid.height,
					layer: grid.layers[i]
				}));
			}
		} else {
			this._layers = [new GridLayer({grid: this, tileConfig: this._tileConfig})];
			this._layers[0].resize(opts.width || 32, opts.height || 32);
		}

		this._modified = +(new Date());
	};

	this.setTile = function(layer, x, y, tile) {
		if (layer <= this._layers.length) {
			var undoTile = this._layers[layer].getTile(x, y, true);

			this._layers[layer].setTile(x, y, tile);
			this._modified = +(new Date());

			return undoTile;
		}
		return false;
	};

	this.setTiles = function(layer, x1, y1, x2, y2, tile) {
		var result = {
				layer: layer,
				tiles: []
			};
		var layer = this._layers[layer];
		var edge;
		var undoTile;
		var x, y;

		if (x2 === -1) {
			x2 = layer.getWidth() - 1;
		}
		if (y2 === -1) {
			y2 = layer.getHeight() - 1;
		}

		/*
			+-----+-----+
			|  1  |  2  |
			+-----+-----+
			|  4  |  8  |
			+-----+-----+
		*/
		if ((x1 === x2) && (y1 === y2)) {
			for (y = y1 - 1; y <= y2 + 1; y++) {
				for (x = x1 - 1; x <= x2 + 1; x++) {
					edge = 0;
					edge |= (x === x1 - 1) ? (1 + 4) : 0;
					edge |= (x === x2 + 1) ? (2 + 8) : 0;
					edge |= (y === y1 - 1) ? (1 + 2) : 0;
					edge |= (y === y2 + 1) ? (4 + 8) : 0;
					undoTile = layer.getTile(x, y, true);
					if (layer.setTile(x, y, tile, edge, !((x === x1) && (y === y1)))) {
						result.tiles.push({x: x, y: y, tile: undoTile});
					}
				}
			}
		} else if (x1 === x2) {
			for (y = y1; y <= y2; y++) {
				for (x = x1 - 1; x <= x2 + 1; x++) {
					edge = 0;
					edge |= (x === x1 - 1) ? (1 + 4) : 0;
					edge |= (x === x2 + 1) ? (2 + 8) : 0;
					edge |= (y === y1) ? (1 + 2) : 0;
					edge |= (y === y2) ? (4 + 8) : 0;
					undoTile = layer.getTile(x, y, true);
					if (layer.setTile(x, y, tile, edge, (x === x1 - 1) || (x === x2 + 1))) {
						result.tiles.push({x: x, y: y, tile: undoTile});
					}
				}
			}
		} else if (y1 === y2) {
			for (y = y1 - 1; y <= y2 + 1; y++) {
				for (x = x1; x <= x2; x++) {
					edge = 0;
					edge |= (x === x1) ? (1 + 4) : 0;
					edge |= (x === x2) ? (2 + 8) : 0;
					edge |= (y === y1 - 1) ? (1 + 2) : 0;
					edge |= (y === y2 + 1) ? (4 + 8) : 0;
					undoTile = layer.getTile(x, y, true);
					if (layer.setTile(x, y, tile, edge, (y === y1 - 1) || (y === y2 + 1))) {
						result.tiles.push({x: x, y: y, tile: undoTile});
					}
				}
			}
		} else {
			for (y = y1; y <= y2; y++) {
				for (x = x1; x <= x2; x++) {
					edge = 0;
					edge |= (x === x1) ? (1 + 4) : 0;
					edge |= (x === x2) ? (2 + 8) : 0;
					edge |= (y === y1) ? (1 + 2) : 0;
					edge |= (y === y2) ? (4 + 8) : 0;
					undoTile = layer.getTile(x, y, true);
					if (layer.setTile(x, y, tile, edge, false)) {
						result.tiles.push({x: x, y: y, tile: undoTile});
					}
				}
			}
		}

		this._modified = +(new Date());

		return result;
	};

	this.fillMap = function(tile) {
		var result = [];
		var layers = this._layers;
		var i = layers.length;
		
		while (i) {
			layer = layers[--i];
			result.push(this.setTiles(i, 0, 0, -1, -1, tile));
		}

		this._modified = +(new Date());

		return result;
	};

	this.clearTiles = function(layer, x1, y1, x2, y2) {
		var result = {
				layer: layer,
				tiles: []
			};
		var layer = this._layers[layer];
		var x, y;

		if (x2 === -1) {
			x2 = layer.getWidth() - 1;
		}
		if (y2 === -1) {
			y2 = layer.getHeight() - 1;
		}

		for (y = y1; y <= y2; y++) {
			for (x = x1; x <= x2; x++) {
				result.tiles.push({x: x, y: y, tile: layer.getTile(x, y, true)});
				layer.clearTile(x, y);
			}
		}

		this._modified = +(new Date());

		return result;
	};

	this.copy = function(x1, y1, x2, y2) {
		var result = [];
		var layers = this._layers;
		var layer;
		var i = layers.length;

		while (i) {
			layer = layers[--i];
			if (layer.isVisible()) {
				result.push({layer:i, tiles:layer.copy(x1, y1, x2, y2)});
			}
		}

		return result;
	};

	this.clearMap = function(tile) {
		var result = [];
		var layers = this._layers;
		var i = layers.length;
		
		while (i) {
			layer = layers[--i];
			result.push(this.clearTiles(i, 0, 0, -1, -1));
		}

		return result;
	};

	this.getLayer = function(layer) {
		return this._layers[layer];
	};

	this.getLayers = function(layer) {
		return this._layers;
	};

	this.getTileInfo = function(x, y) {
		var result = [];
		var layers = this._layers;
		var layer;
		var i, j;

		for (i = 0, j = layers.length; i < j; i++) {
			layer = layers[i];
			if (layer.isVisible()) {
				result.push(layer.getTile(x, y));
			}
		}

		return result;
	};

	this.getProject = function() {
		return this._project;
	};

	this.getTileConfig = function() {
		return this._tileConfig;
	};

	this.getModified = function() {
		return this._modified;
	};

	this.addLayer = function() {
		var layer = new GridLayer({gird: this, tileConfig: this._tileConfig});
		layer.resize();
		this._layers.push(layer);
	};

	this.removeLayer = function(index) {
		var result = {
				layer: index,
				tiles: []
			};
		var layer = this._layers[index];
		var x, y;

		for (y = 0; y < this._height; y++) {
			for (x = 0; x <= this._width; x++) {
				result.tiles.push({
					x: x,
					y: y,
					tile: layer.getTile(x, y, true)
				});
			}
		}
		this._layers.splice(index, 1);

		return result;
	};

	this.save = function() {
		var layers = this._layers;
		var data = {
				name: this.name,
				contextName: this.contextName || this.name,
				width: layers[0].getWidth(),
				height: layers[0].getHeight(),
				layers: []
			};
		var i, j;

		for (i = 0, j = layers.length; i < j; i++) {
			data.layers[i] = layers[i].toJSON();
		}

		util.ajax.post(
			{
				url: '/plugins/tile_editor/save_grid',
				data: {
					id: this._project.id,
					name: this.name,
					grid: data
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

	this.removeImage = function(index) {
		var layers = this._layers;
		var i, j;

		for (i = 0, j = layers.length; i < j; i++) {
			layers[i].removeImage(index);
		}
	};

	this.createLayer = function() {
		return new GridLayer({grid: this, tileConfig: this._tileConfig});
	};

	this.findRange = function() {
		var layers = this._layers;
		var range;
		var minX = 10000;
		var maxX = 0;
		var minY = 10000;
		var maxY = 0;
		var i, j;

		for (i = 0, j = layers.length; i < j; i++) {
			range = layers[i].findRange();
			minX = Math.min(minX, range.minX);
			minY = Math.min(minY, range.minY);
			maxX = Math.max(maxX, range.maxX);
			maxY = Math.max(maxY, range.maxY);
		}

		return {minX: minX, minY: minY, maxX: maxX, maxY: maxY};
	};

	this.rename = function(newName) {
		this.contextName = newName;
		this.save();
	};
});

exports = GridList = Class(PubSub, function(supr) {
	this.init = function(opts) {
		supr(this, 'init', arguments);

		this._project = opts.project;
		this._tileConfig = opts.tileConfig;

		this._list = new DataSource({key: 'contextName', sorter: function(item) { return item.contextName; }});

		this._loaded = 0;
		this._total = 0;
	};

	this._loadGrid = function(grid) {
		util.ajax.get(
			{
				url: 'code/' + this._project.id + '/resources/grids/' + grid.name + '.json',
				type: 'json'
			},
			bind(
				this,
				function(err, response) {
					if (!err) {
						this._list.add(new Grid({
							name: response.name,
							contextName: response.contextName,
							project: this._project,
							tileConfig: this._tileConfig,
							grid: response
						}));

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
		var grids = this._project.manifest.grids || [];
		var grid;
		var name;
		var i = grids.length;

		this._loading = {};
		this._loaded = 0;
		this._total = 0;

		list.clear();

		while (i) {
			grid = grids[--i];
			name = grid.name;
			if (!this._loading[name]) {
				this._loading[name] = true;
				if (!list.getItemForID(name)) {
					this._total++;
					this._loadGrid(grid);
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

	this._newName = function() {
		var project = this._project;
		var manifest = project.manifest;
		var name;
		var found;
		var i;
		var j = 0;

		found = true;
		while (found) {
			found = false;
			for (i = 0; i < manifest.grids.length; i++) {
				name = 'grid' + j;
				if (manifest.grids[i].name === name) {
					found = true;
					break;
				}
			}
			if (found) {
				j++;
			}
		}

		return name;
	};

	this.add = function(width, height) {
		var project = this._project;
		var manifest = project.manifest;
		var name = this._newName();
		var grid;

		if (!manifest.grids) {
			manifest.grids = [];
		}

		manifest.grids.push({name: name});

		grid = new Grid({
			project: this._project,
			name: name,
			contextName: contextName,
			tileConfig: this._tileConfig,
			width: width,
			height: height
		});
		grid.save();
		this._list.add(grid);

		project.saveManifest();
	};

	this.duplicate = function(grid) {
		var project = this._project;
		var manifest = project.manifest;
		var layers = grid.getLayers();
		var layerData = [];
		var name = this._newName();
		var contextName;
		var grid;
		var found;
		var i;
		var j = 1;

		if (!manifest.grids) {
			manifest.grids = [];
		}

		found = true;
		while (found) {
			found = false;
			for (i = 0; i < manifest.grids.length; i++) {
				contextName = grid.contextName + '(' + j + ')';
				if (manifest.grids[i].contextName === contextName) {
					found = true;
					break;
				}
			}
			if (found) {
				j++;
			}
		}

		for (i = 0; i < layers.length; i++) {
			layerData.push(layers[i].getData());
		}
		manifest.grids.push({name: name});

		grid = new Grid({
			project: this._project,
			name: name,
			contextName: contextName,
			tileConfig: this._tileConfig,
			grid: {
				width: layers[0].getWidth(),
				height: layers[0].getHeight(),
				layers: layerData
			}
		});
		grid.save();
		this._list.add(grid);

		project.saveManifest();
	};

	this.remove = function(name, cb) {
		util.ajax.post(
			{
				url: '/plugins/tile_editor/remove_grid',
				data: {
					id: this._project.id,
					name: name
				}
			},
			bind(
				this,
				function(err, response) {
					if (!err) {
						var project = this._project;
						var grids = project.manifest.grids;
						var i = grids.length;

						while (i) {
							if (grids[--i].name === name) {
								grids.splice(i, 1);
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

	this.removeImage = function(index) {
		this.list.each(
			function(grid) {
				grid.removeImage(index);
				grid.save();
			},
			this
		);
	};

	this.rename = function(grid, newName) {
		var testName = newName.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
		var found;

		if (testName === '') {
			return '"' + newName + '" is an invalid name.';
		}

		found = false;

		this._list.each(
			function(data) {
				found = found || (data.contextName === newName) && (data !== grid);
			},
			this
		);

		if (found) {
			return 'The grid "' + newName + '" already exists.';
		}

		grid.rename(newName);

		return true;
	};

	this.clear = function() {
		this._list.clear();
	};
});
