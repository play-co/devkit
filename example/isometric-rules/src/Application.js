import device;

import ui.TextView as TextView;

import isometric.Isometric as Isometric;
import isometric.models.map.updaters.lineUpdater as lineUpdater;

import menus.views.components.ButtonView as ButtonView;

// Create a ground group and two groups with lines with a width of 150 and a height of 120:
var tileSettings = [
		{ group: 1, images: [{index: 0, url: 'resources/images/demoGround0.png'}], width: 150, height: 120 },
		{ group: 2, images: [], width: 150, height: 120 },
		{ group: 3, images: [], width: 150, height: 160 },
		{cursorYes: 'resources/images/cursorYes.png', cursorNo: 'resources/images/cursorNo.png'}
	];
// Set the road tiles, the numbers represent the binairy values of a 3x3 grid:
var index = [16, 18, 24, 26, 48, 50, 56, 58, 144, 146, 152, 154, 176, 178, 184, 186]
for (var i = 0; i < index.length; i++) {
	tileSettings[1].images.push({index: index[i], url: 'resources/images/demoRoad' + index[i] + '.png'});
	tileSettings[2].images.push({index: index[i], url: 'resources/images/blue' + index[i] + '.png'});
}

// Create a two layers layer with tiles of 150x120:
var gridSettings = {tileWidth: 150, tileHeight: 120, layers: [{}, {}]};

var editorSettings = {
	road: {
		type: 'line', // Use line drawing
		layer: 1, // Draw on layer 1
		group: 2, // The group defined in the tile settings
		tileSet: {
			horizontal: [24, 56, 48], // These are the bits set for a horizontal line 24 and 48 are the caps, 56 is the center
			vertical: [18, 146, 144] // These are the bits set for a vertical line 18 and 144 are the caps, 146 is the center
		},
		conditions: {
			accept: [
				{layer: 0, type: 'group', groups: [1]}, // Allow drawing on a gound tile
				{layer: 1, type: 'group', groups: [2]} // Allow drawing on an existing road tile
			],
			decline: [
				{layer: 1, type: 'group', groups: [3]} // Deny drawing when there's a blue tile
			]
		},
		updater: lineUpdater // Use the line updater to merge adjecent lines
	},
	blue: {
		type: 'line', // Use line drawing
		layer: 1, // Draw on layer 1
		group: 3, // The group defined in the tile settings
		tileSet: {
			horizontal: [24, 56, 48], // These are the bits set for a horizontal line 24 and 48 are the caps, 56 is the center
			vertical: [18, 146, 144] // These are the bits set for a vertical line 18 and 144 are the caps, 146 is the center
		},
		conditions: {
			accept: [
				{layer: 0, type: 'group', groups: [1]}, // Allow drawing on a ground tile
				{layer: 1, type: 'group', groups: [3]} // Allow drawing on an existing blue tile
			],
			decline: [
				{layer: 1, type: 'group', groups: [2]} // Deny drawing when there's a road tile
			]
		},
		updater: lineUpdater // Use the line updater to merge adjecent lines
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
		this._tools = ['Drag', 'Road', 'Blue'];
		for (var i = 0; i < 3; i++) {
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