import device;

import isometric.Isometric as Isometric;

// Create group 1 with 16 images with a width of 150 and a height of 120:
var tileSettings = [{ group: 1, images: [], width: 150, height: 120 }];
for (var i = 0; i < 16; i++) {
	tileSettings[0].images.push({index: i, url: 'resources/images/demoGround' + i + '.png'});
}

// Create a single layer with tiles of 150x120:
var gridSettings = {tileWidth: 150, tileHeight: 120, layers: [{}]};

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
			mapSettings: mapSettings // Settings to generate a map
		}).
			generate().
			show();
	};

	this.tick = function (dt) {
		this._isometric.tick(dt);
	};
});