import device;

import ui.TextView as TextView;

import isometric.Isometric as Isometric;
import isometric.models.item.PathWalkerModel as PathWalkerModel;
import isometric.models.item.SpawnerModel as SpawnerModel;

import menus.views.components.ButtonView as ButtonView;

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

var BoxModel = Class(SpawnerModel, function (supr) {
	this.init = function (opts) {
		supr(this, 'init', arguments);
	};
});

var itemSettings = {
	item: {
		width: 48,
		height: 48,
		offsetX: -24,
		offsetY: -48,
		images: [
			'resources/images/dir0.png',
			'resources/images/dir1.png',
			'resources/images/dir2.png',
			'resources/images/dir3.png',
			'resources/images/dir4.png',
			'resources/images/dir5.png',
			'resources/images/dir6.png',
			'resources/images/dir7.png',
			'resources/images/dir8.png'
		]
	}
};

var ImageModel = Class(PathWalkerModel, function (supr) {
	this.init = function (opts) {
		supr(this, 'init', arguments);

		this._skip = 0;
		this._speed = 1;
	};

	this.onNewTile = function () {
		this._skip = 2;
	};

	this.tick = function (dt) {
		var opts = this._opts;
		if (this._skip) {
			this._skip--;
		} else {
			opts.imageIndex = (1 + this._movedX) * 3 + this._movedY + 1;
		}

		return supr(this, 'tick', arguments);
	}
});

var editorSettings = {
	box: {
		type: 'item',
		model: BoxModel,
		layer: 1,
		group: 2,
		index: 0,
		width: 1,
		height: 1,
		modelOpts: {
			modelInfo: [
				{count: 1, ctor: ImageModel, opts: { item: 'item' }},
			],
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
		this._isometric = new Isometric({
			superview: this,
			gridSettings: gridSettings,
			tileSettings: tileSettings,
			editorSettings: editorSettings,
			itemSettings: itemSettings
		}).show();

		// Put a "box" item on the grid:
		this._isometric.putItem('box', 1, 9, {});

		var map = this._isometric.getMap();
		var tileSet = {horizontal: [24, 56, 48], vertical: [18, 146, 144]};

		map.drawLineHorizontal(1, 61, 10, 8, 3, tileSet.horizontal);

		map.drawLineVertical(1, 0, 7, 8, 3, tileSet.vertical);

		this._isometric.refreshMap();
	};

	this.tick = function (dt) {
		this._isometric.tick(dt);
	};

	this.launchUI = function () {};
});