import device;

import ui.TextView as TextView;

import isometric.Isometric as Isometric;
import isometric.models.item.StaticModel as StaticModel;

import menus.views.components.ButtonView as ButtonView;

var tileSettings = [
		{ group: 1, images: [{index: 0, url: 'resources/images/demoGround0.png'}], width: 150, height: 120 },
		{ group: 2, images: [], width: 150, height: 188 },
		{cursorYes: 'resources/images/cursorYes.png', cursorNo: 'resources/images/cursorNo.png'}
	];
for (var i = 0; i < 10; i++) {
	tileSettings[1].images.push({index: i, url: 'resources/images/box' + i + '.png'});
}

// Create a two layers layer with tiles of 150x120:
var gridSettings = {tileWidth: 150, tileHeight: 120, layers: [{}, {}]};

var BoxModel = Class(StaticModel, function (supr) {
	this.init = function (opts) {
		supr(this, 'init', arguments);

		this._dt = 0;
		this._index = opts.animateIndex || 0; // If the class is loaded then index is in the opts...
	};

	/**
	 * Update the model, increase the index until it's 9:
	 */
	this.tick = function (dt) {
		if (this._index < 9) {
			this._dt += dt;
			if (this._dt > 300) {
				this._dt = 0;
				this._index++;

				// Change the index of the tile on layer 1:
				this._map.getTile(this._tileX, this._tileY)[1].index = this._index;
				// Tell the view to update this tile if it's on the screen:
				this._gridModel.getRefreshMapCB()(this._tileX, this._tileY);
			}
		}
	};

	/**
	 * This function is called when the item is saved.
	 *
	 * The following property names are reserved and can not be used to save state:
	 *
	 *   modelType, gridModel
	 *   layer
	 *   group, index
	 *   tileX, tileY
	 *   width, height
	 *   surrounding
	 *   refreshMapCB
	 */
	this.toJSON = function () {
		return merge(
			supr(this, 'toJSON'),
			{
				animateIndex: this._index
			}
		);
	};
});

// Create a tool to draw 1x1 items:
var editorSettings = {
	box: {
		type: 'item',
		modelType: 'box', // This value is the name of this tool which will be created again when the map is loaded
		model: BoxModel, // Instantiate a BoxModel for every item placed on the map
		layer: 1, // Draw to layer 1
		group: 2 // Set the group to 1, the default index is 0, the default width and height is 1
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
		}).show();

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

		// Create buttons for clearing, saving and loading:
		var options = [{style: 'RED', title: 'Clear'}, {style: 'GREEN', title: 'Save'}, {style: 'GREEN', title: 'Load'}];
		this._options = [];
		for (var i = 0; i < 3; i++) {
			this._options.push(
				new ButtonView({
					superview: this,
					x: 20 + i * 185,
					y: this.baseHeight - 65,
					width: 180,
					height: 90,
					title: options[i].title,
					textPadding: [0, 0, 12, 0],
					style: options[i].style,
					on: {
						up: bind(this, 'onOption', i)
					}
				})
			);
		}
		this._options[2].style.visible = localStorage.getItem('ISOMETRIC_SAVE_LOAD');

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

	this.onOption = function (index) {
		switch (index) {
			case 0:
				this._isometric.clear(); // Clear the map
				this._isometric.getGridModel().getMap().zeroLayer(0, 1); // Fill the map with group 1, index 0
				this._isometric.show(); // Hide the loading view, show the grid
				break;

			case 1:
				localStorage.setItem('ISOMETRIC_SAVE_LOAD', JSON.stringify(this._isometric.toJSON()));
				this._options[2].style.visible = true;
				break;

			case 2:
				var data = localStorage.getItem('ISOMETRIC_SAVE_LOAD');
				if (data) {
					try {
						this._isometric.fromJSON(JSON.parse(data));
					} catch (e) {
					}
				}
				break;
		}
	};
});