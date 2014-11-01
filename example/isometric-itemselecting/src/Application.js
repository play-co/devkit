import device;

import ui.TextView as TextView;

import isometric.Isometric as Isometric;
import isometric.models.item.StaticModel as StaticModel;

import menus.views.components.ButtonView as ButtonView;

// Create group 1 with 16 images with a width of 150 and a height of 120
// and a box with a width of 150 and a height of 200, the box will be aligned on the bottom.
var tileSettings = [
		{group: 1, images: [{index: 0, url: 'resources/images/demoGround0.png'}], width: 150, height: 120},
		{group: 2, images: [], width: 150, height: 188},
		{cursorYes: 'resources/images/cursorYes.png', cursorNo: 'resources/images/cursorNo.png'}
	];
for (var i = 0; i < 10; i++) {
	tileSettings[1].images.push({index: i, url: 'resources/images/box' + i + '.png', selectable: true});
}

// Create a two layers layer with tiles of 150x120:
var gridSettings = {tileWidth: 150, tileHeight: 120, layers: [{}, {}]};

// A static model subclass for an animating box:
var BoxModel = Class(StaticModel, function (supr) {
	this.init = function (opts) {
		supr(this, 'init', arguments);

		this._dt = 0;
		this._index = 0;
		this._dir = 1;
	};

	this.tick = function (dt) {
		this._dt += dt;
		if (this._dt > 25) {
			this._dt = 0;
			this._index += this._dir;
			if ((this._index === 0) || (this._index === 9)) {
				this._dir = -this._dir;
			}
			// Change the index of the tile on layer 1:
			this._map.getTile(this._tileX, this._tileY)[1].index = this._index;
			// Update the tile images:
			this._gridModel.getRefreshMapCB()(this._tileX, this._tileY);
			// Tell the view to update this tile if it's on the screen:
			this.emit('Refresh', this._tileX, this._tileY);
		}
	};
});

// Create a tool to draw 1x1 items:
var editorSettings = {
	box: {
		type: 'item', // Use the item drawing tool
		model: BoxModel, // Instantiate a BoxModel for every item placed on the map
		layer: 1, // Draw to layer 1
		group: 2, // Use group 2
		index: 0, // Set index 0
		width: 1, // The item is 1x1 tile
		height: 1,
		conditions: {
			accept: [
				{layer: 1, type: 'emptyOrZero'}, // Only allow boxes on empty tiles
			]
		}
	}
};

exports = Class(GC.Application, function () {
	this.initUI = function () {
		this.engine.updateOpts({
			alwaysRepaint: true,
			clearEachFrame: false, // Don't clear the isometric tiles always cover the entire screen
			keyListenerEnabled: false,
			logsEnabled: true,
			noTimestep: false,
			noReflow: true, // Don't use the reflow manager
			showFPS: false,
			resizeRootView: false,
			scaleUI: true,
			preload: ['resources/images']
		});

		// Create an instance of Isometric, this class wraps the isometric models and views.
		this._isometric = new Isometric({
			superview: this,
			gridSettings: gridSettings, // Core settings: grid size and layers
			tileSettings: tileSettings, // Information about the graphics
			editorSettings: editorSettings // Define the tools
		}).
			show().
			on('SelectItem', bind(this, 'onSelectItem')).
			on('UnselectItem', bind(this, 'onUnselectItem'));

		// Create the tool buttons:
		this._tools = ['Drag', 'Box'];
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
			autoSize: false
		});

		// A text displaying info about the selected item:
		this._selectedText = new TextView({
			superview: this,
			x: 20,
			y: this.baseHeight - 60,
			width: 500,
			height: 60,
			size: 40,
			color: '#FFFFFF',
			strokeColor: '#000000',
			strokeWidth: 6,
			horizontalAlign: 'left',
			autoFontSize: false,
			autoSize: false,
			blockEvents: true,
			text: 'Click on an item to select it'
		});

		this._isometric.setTool(false);

		// Put a "box" item on the grid:
		this._isometric.putItem('box', 0, 9, {});
	};
	
	this.tick = function (dt) {
		this._isometric.tick(dt);
	};

	/**
	 * Select a tool...
	 */
	this.onTool = function (index) {
		this._isometric.setTool(index ? this._tools[index].toLowerCase() : false); // Set the tool, setting to false enables dragging...
		this._modeText.setText(this._tools[index]);	
	};

	/**
	 * Called when an item is selected...
	 */
	this.onSelectItem = function (model) {
		this._selectedText.setText('Item selected at (' + model.getTileX() + ', ' + model.getTileY() + ')');
	};

	/**
	 * Called when an item was selected and the grid outside of an item is clicked...
	 */
	this.onUnselectItem = function (model) {
		this._selectedText.setText('Click on an item to select it');
	};
});