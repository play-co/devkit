import device;

import isometric.Isometric as Isometric;
import isometric.models.item.PathWalkerModel as PathWalkerModel;
import isometric.models.item.SpawnerModel as SpawnerModel;

// Create group 1 with 16 images with a width of 150 and a height of 120
// and a box with a width of 150 and a height of 200, the box will be aligned on the bottom.
var tileSettings = [
	{ group: 1, images: [{index: 0, url: 'resources/images/demoGround0.png'}], width: 150, height: 120 },
	{ group: 2, images: [{index: 0, url: 'resources/images/box0.png'}], width: 150, height: 188, z: [1, 0] },
	{ group: 3, images: [], width: 150, height: 120 }
];
var roadIndex = [16, 18, 24, 26, 48, 50, 56, 58, 144, 146, 152, 154, 176, 178, 184, 186];
for (var i = 0; i < roadIndex.length; i++) {
	tileSettings[2].images.push({index: roadIndex[i], url: 'resources/images/demoRoad' + roadIndex[i] + '.png'});
}

// Create a two layers layer with tiles of 150x120:
var gridSettings = {
	tileWidth: 150,
	tileHeight: 120,
	layers: [{}, {dynamicViews: 30}]
};

// Settings to define different views:
var itemSettings = {
	item1: {
		color: '#0000DD',
		width: 30,
		height: 60,
		offsetX: -15,
		offsetY: -60
	},
	item2: {
		color: '#000044',
		width: 20,
		height: 50,
		offsetX: -10,
		offsetY: -50
	}
};

var editorSettings = {
	box: {
		type: 'item',
		model: SpawnerModel,
		layer: 1,
		group: 2,
		// Information about the models which are spawned:
		modelOpts: {
			modelInfo: [
				// The opts are passed to the constructor of the dynamic item.
				// The item value refers value in itemSettings to select the view properties.
				{count: 1, ctor: PathWalkerModel, opts: { item: 'item1' }},
				{count: 2, ctor: PathWalkerModel, opts: { item: 'item2' }}
			],
			// Condition for finding a valid path:
			conditions: {
				accept: [
					{layer: 1, type: 'group', groups: [3]}
				]				
			}
		}
	}
};

exports = Class(GC.Application, function () {
	this._settings = {
		scaleUI: true
	};

	this.initUI = function () {
		// Create an instance of Isometric, this class wraps the isometric models and views.
		this._isometric = new Isometric({
			superview: this,
			gridSettings: gridSettings, // Core settings: grid size and layers
			tileSettings: tileSettings, // Information about the graphics
			editorSettings: editorSettings, // Define the tools
			itemSettings: itemSettings // Settings for view properties
		}).show();

		// Put a "box" item on the grid:
		this._isometric.putItem('box', 1, 9, {});

		// Put a model spawning item on the map:
		var map = this._isometric.getMap();
		var tileSet = {horizontal: [24, 56, 48], vertical: [18, 146, 144]};

		// Create lines with group 3:
		map.drawLineHorizontal(1, 62, 7, 5, 3, tileSet.horizontal);
		map.drawLineHorizontal(1, 62, 11, 5, 3, tileSet.horizontal);

		map.drawLineVertical(1, 62, 7, 5, 3, tileSet.vertical);
		map.drawLineVertical(1, 0, 7, 5, 3, tileSet.vertical);
		map.drawLineVertical(1, 2, 7, 5, 3, tileSet.vertical);

		this._isometric.refreshMap();
	};

	this.tick = function (dt) {
		this._isometric.tick(dt);
	};
});