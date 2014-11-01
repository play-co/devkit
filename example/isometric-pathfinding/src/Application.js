import device;

import ui.TextView as TextView;

import isometric.Isometric as Isometric;
import isometric.models.item.DynamicModel as DynamicModel;

import menus.views.components.ButtonView as ButtonView;

// Create two groups with one image:
var tileSettings = [
		{group: 1, images: [{index: 0, url: 'resources/images/demoGround0.png'}], width: 150, height: 120},
		{group: 2, images: [{index: 0, url: 'resources/images/demoGround1.png'}], width: 150, height: 120}
	];

// Create a single layer with tiles of 150x120:
var gridSettings = {
		tileWidth: 150,
		tileHeight: 120,
		layers: [{}, {dynamicViews: 30}]
	};

// Create a tool to click on a tile for the destination:
var editorSettings = {
		moveto: {
			type: 'item'
		}
	};

// Set the item settings, the dynamic item is a blue rectangle:
var itemSettings = {
		item: {
			color: '#0000DD',
			width: 20,
			height: 50,
			offsetX: -10,
			offsetY: -50,
		}
	};

// Create a map with random tiles:
var mapSettings = {
		generatorSteps: [
			{
				type: 'fill',
				stepsPerFrame: 200,
				layer: 0, // 25% of the tiles of layer 0 are set to group 2 with index 0
				index: 0,
				group: 2,
				chance: 0.25,
				accept: [
					{
						layer: 0,
						group: 1,
						tiles: [0]
					}
				]
			}
		]
	};

// A subclass of DynamicModel can move on the grid.
var DemoModel = Class(DynamicModel, function (supr) {
	this.init = function (opts) {
		supr(this, 'init', arguments);

		this._speed = 1.0;
		this._roadLeft = 0.5; // Move on the center.
		this._roadRight = 0.5; // Move on the center.
	};

	this.tick = function (dt) {
		this._opts.visible = true;

		return supr(this, 'tick', arguments);
	};
});

exports = Class(GC.Application, function () {
	this._settings = {
		scaleUI: true
	};

	this.initUI = function () {
		// Create an instance of Isometric, this class wraps the isometric models and views.
		this._isometric = new Isometric({
			superview: this,
			gridSettings: gridSettings, // Core settings: grid size and layers
			mapSettings: mapSettings, // Settings to create a map with random tiles
			tileSettings: tileSettings, // Information about the graphics
			editorSettings: editorSettings, // Define the tools
			itemSettings: itemSettings // Settings to display the dynamic item
		}).
			generate().
			show().
			on('Edit', bind(this, 'onEdit'));

		// Create the tool buttons:
		this._tools = ['Drag', 'MoveTo'];
		for (var i = 0; i < 2; i++) {
			new ButtonView({
				superview: this,
				x: 20 + i * 185,
				y: -20,
				width: 180,
				height: 90,
				title: this._tools[i],
				style: 'BLUE',
				on: {
					up: bind(this, 'onTool', i)
				}
			});
		}

		// Create a text displaying the active tool:
		this._modeText = new TextView({
			superview: this,
			x: this.baseWidth - 180,
			y: 0,
			width: 150,
			height: 60,
			size: 40,
			color: '#FFFFFF',
			strokeColor: '#000000',
			strokeWidth: 6,
			horizontalAlign: 'right',
			text: 'Drag',
			autoFontSize: false,
			autoSize: false,
			blockEvents: true
		});

		this._index = 0;
		this._isometric.setTool(false);
		this._isometric.on('Ready', bind(this, 'onReady'));
	};

	this.tick = function (dt) {
		this._isometric.tick(dt);
	};

	this.onReady = function () {
		// Change the index of the tile on layer 1:
		this._isometric.getMap().getTile(0, 9)[0].group = 1;
		this._isometric.refreshMap(0, 9); // Update the images on screen

		// Create a new dynamic model which is able to move on the grid:
		this._dynamicModel = this._isometric.putDynamicItem(
			DemoModel,
			{
				tileX: 0,
				tileY: 9,
				item: 'item',
				// These are the conditions for finding a path, all tiles of group 1 are accepted...
				conditions: {
					accept: [
						{layer: 0, type: 'group', groups: [1]}
					]
				}
			}
		);		
	};

	/**
	 * The grid is clicked, selected contains the position.
	 */
	this.onEdit = function (selection) {
		this._dynamicModel.moveTo(selection.rect.x, selection.rect.y);
	};

	/**
	 * Select a tool...
	 */
	this.onTool = function (index) {
		this._index = index;
		this._isometric.setTool(index ? this._tools[index].toLowerCase() : false);
		this._modeText.setText(this._tools[index]);	
	};
});