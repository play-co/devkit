import device;

import ui.TextView as TextView;

import isometric.Isometric as Isometric;
import isometric.models.map.updaters.lineUpdater as lineUpdater;

import menus.views.components.ButtonView as ButtonView;

// Create group 1 and 2 with 16 images with a width of 150 and a height of 120:
var tileSettings = [
		{group: 1, images: [], width: 150, height: 120},
		{group: 2, images: [], width: 150, height: 120},
		{cursorYes: 'resources/images/cursorYes.png', cursorNo: 'resources/images/cursorNo.png'}
	];
// Set the ground tiles, the numbers represent the binary values of a 2x2 grid:
for (var i = 0; i < 16; i++) {
	tileSettings[0].images.push({index: i, url: 'resources/images/demoGround' + i + '.png'});
}
// Set the road tiles, the numbers represent the binary values of a 3x3 grid:
var roadIndex = [16, 18, 24, 26, 48, 50, 56, 58, 144, 146, 152, 154, 176, 178, 184, 186]
for (var i = 0; i < roadIndex.length; i++) {
	tileSettings[1].images.push({index: roadIndex[i], url: 'resources/images/demoRoad' + roadIndex[i] + '.png'});
}

// Create a two layers layer with tiles of 150x120:
var gridSettings = {tileWidth: 150, tileHeight: 120, layers: [{}, {}]};

// Generate a map, 20 chains of rectangles with 50 rectangles each...
var mapSettings = {
		generatorSteps: [
			{
				type: 'rectangles',
				repeat: 1000,
				count: 50,
				group: 1, // The group defined in the tile settings
				accept: [
					{
						// Accept tiles 0..15 from group 1 on layer 0:
						layer: 0,
						group: 1,
						tiles: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
					}
				]
			}
		]
	};

// The editor settings define a single "road" tool
var editorSettings = {
	road: {
		type: 'line', // Use line drawing
		layer: 1, // Render to layer 1
		group: 2, // The group defined in the tile settings
		tileSet: {
			horizontal: [24, 56, 48], // These are the bits set for a horizontal line 24 and 48 are the caps, 56 is the center
			vertical: [18, 146, 144] // These are the bits set for a vertical line 18 and 144 are the caps, 146 is the center
		},
		// The line updater is used to merge line caps, this function is called when the initial drawing is done...
		updater: lineUpdater
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
			mapSettings: mapSettings, // Define the way the map is generated
			editorSettings: editorSettings // Define the tools
		}).
			generate().
			show();

		// Create the tool buttons:
		this._tools = ['Drag', 'Road'];
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

		// Text showing which tool is active:
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

		this._isometric.setTool(false);
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
});