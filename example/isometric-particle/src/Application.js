import device;

import isometric.Isometric as Isometric;
import isometric.models.item.PathWalkerModel as PathWalkerModel;
import isometric.models.item.SpawnerModel as SpawnerModel;

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
			height: 30,
			offsetX: -15,
			offsetY: -30,
		},
		item2: {
			color: '#000044',
			width: 20,
			height: 30,
			offsetX: -10,
			offsetY: -30,
		}
	};

var particleSettings = {
	particle1: {
		count: 1,
		duration: 1000,
		radius: 0,
		size: 10,
		stepCB: function (view, opts, d, dt) {
			var style = view.style;

			style.x = opts.start.x;
			style.y = opts.start.y - 100 * d;
			style.visible = true;
		},
		color: '#FF0000'
	},
	particle2: {
		extnds: 'particle1',
		color: '#FFDD00'
	}
};

var ParticleModel = Class(PathWalkerModel, function (supr) {
	this.init = function (opts) {
		supr(this, 'init', arguments);
		this._dt = 0;
		this._particle = opts.particle;
		this._particleCenter = opts.particleCenter;
	};

	this.tick = function (dt) {
		var result = supr(this, 'tick', arguments);
		this._dt -= dt;
		if (this._dt < 0) {
			this._dt = 1000;
			this._opts.particles = [{type: this._particle, x: this._particleCenter, y: 0, clear: true}];
		} else if (this._opts.particles) {
			this._opts.particles.length = 0;
		}

		return result;
	};
});

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
				{count: 4, ctor: ParticleModel, opts: { item: 'item1', particle: 'particle1', particleCenter: 15 }},
				{count: 2, ctor: ParticleModel, opts: { item: 'item2', particle: 'particle2', particleCenter: 10 }}
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
			itemSettings: itemSettings, // Settings for view properties
			particleSettings: particleSettings
		}).show();

		// Put a "box" item on the grid:
		this._isometric.putItem('box', 1, 9, {});

		var map = this._isometric.getMap();
		var tileSet = {horizontal: [24, 56, 48], vertical: [18, 146, 144]};

		map.drawLineHorizontal(1, 0, 7, 3, 3, tileSet.horizontal);
		map.drawLineHorizontal(1, 0, 11, 3, 3, tileSet.horizontal);

		map.drawLineVertical(1, 0, 7, 5, 3, tileSet.vertical);
		map.drawLineVertical(1, 2, 7, 5, 3, tileSet.vertical);

		this._isometric.refreshMap();
	};

	this.tick = function (dt) {
		this._isometric.tick(dt);
	};
});