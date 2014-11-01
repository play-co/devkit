//# Prebuilt Spritesheets
//This example demonstrates how to use SpriteViews and ImageViews with prebuilt spritesheets.
//Click on the map to walk somewhere (you can't walk through walls).

//Import `Image` and `ImageView`
import ui.ImageView as ImageView;
import ui.resource.Image as Image;
//Import classes and configuration
import src.Creature as Creature;
import src.Map as Map;
import src.config as config;

// configuration pertaining to prebuilt spritesheets
var imageData = {	
	// free items from http://ails.deviantart.com/art/420-Pixel-Art-Icons-for-RPG-129892453
	items: {
		sheetUrl: 'resources/images/items.png',
		sheetWidth: 14,
		sheetHeight: 30,
		width: 32,
		height: 32,
		offsetX: 34,
		offsetY: 34
	},
	sprites: {
		// free creatures from http://www.rpgmakervx.net/lofiversion/index.php/t1799.html

		// basic sheetData for prebuilt spritesheet
		sheetData: {
			url: 'resources/images/creatures.png',
			offsetX: 32,
			offsetY: 64,
			startX: 0,
			startY: 14
		},
		// default creature opts
		creature: {
			width: 30,
			height: 50,
			offsetY: -15
		},
		// hero animations

		// each entry is a series of frames corresponding to an animation
		hero: {
			down:  [ [0, 0], [1, 0], [2, 0], [1, 0] ],
			left:  [ [0, 1], [1, 1], [2, 1], [1, 1] ],
			right: [ [0, 2], [1, 2], [2, 2], [1, 2] ],
			up:    [ [0, 3], [1, 3], [2, 3], [1, 3] ]
		},
		// monster animations
		monsters: [
			{
				down:  [ [3, 0], [4, 0], [5, 0], [4, 0] ],
				left:  [ [3, 1], [4, 1], [5, 1], [4, 1] ],
				right: [ [3, 2], [4, 2], [5, 2], [4, 2] ],
				up:    [ [3, 3], [4, 3], [5, 3], [4, 3] ]
			},
			{
				down:  [ [6, 0], [7, 0], [8, 0], [7, 0] ],
				left:  [ [6, 1], [7, 1], [8, 1], [7, 1] ],
				right: [ [6, 2], [7, 2], [8, 2], [7, 2] ],
				up:    [ [6, 3], [7, 3], [8, 3], [7, 3] ]
			},
			{
				down:  [ [9, 0], [10, 0], [11, 0], [10, 0] ],
				left:  [ [9, 1], [10, 1], [11, 1], [10, 1] ],
				right: [ [9, 2], [10, 2], [11, 2], [10, 2] ],
				up:    [ [9, 3], [10, 3], [11, 3], [10, 3] ]
			},
			{
				down:  [ [0, 4], [1, 4], [2, 4], [1, 4] ],
				left:  [ [0, 5], [1, 5], [2, 5], [1, 5] ],
				right: [ [0, 6], [1, 6], [2, 6], [1, 6] ],
				up:    [ [0, 7], [1, 7], [2, 7], [1, 7] ]
			},
			{
				down:  [ [3, 4], [4, 4], [5, 4], [4, 4] ],
				left:  [ [3, 5], [4, 5], [5, 5], [4, 5] ],
				right: [ [3, 6], [4, 6], [5, 6], [4, 6] ],
				up:    [ [3, 7], [4, 7], [5, 7], [4, 7] ]
			},
			{
				down:  [ [6, 4], [7, 4], [8, 4], [7, 4] ],
				left:  [ [6, 5], [7, 5], [8, 5], [7, 5] ],
				right: [ [6, 6], [7, 6], [8, 6], [7, 6] ],
				up:    [ [6, 7], [7, 7], [8, 7], [7, 7] ]
			},
			{
				down:  [ [9, 4], [10, 4], [11, 4], [10, 4] ],
				left:  [ [9, 5], [10, 5], [11, 5], [10, 5] ],
				right: [ [9, 6], [10, 6], [11, 6], [10, 6] ],
				up:    [ [9, 7], [10, 7], [11, 7], [10, 7] ]
			}
		]
	}
};

//## Class: Application
exports = Class(GC.Application, function () {
	this.initUI = function () {
		// generate map
		this.map = new Map({ superview: this });
	};

	this.launchUI = function() {
		// populate map

		// add items
		var iData = imageData.items;
		for (var i = 0; i < config.itemCount; i++) {
			this.map.addItem(new ImageView({
				layout: 'box',
				centerX: true,
				centerY: true,
				width: config.itemSize,
				height: config.itemSize,
				canHandleEvents: false,
				// select random image from spritesheet
				image: new Image({
					url: iData.sheetUrl,
					sourceW: iData.width,
					sourceH: iData.height,
					sourceX: iData.offsetX * ~~(Math.random() * iData.sheetWidth),
					sourceY: iData.offsetY * ~~(Math.random() * iData.sheetHeight)
				})
			}));
		}

		// add hero
		this.map.addHero(new Creature(merge({
			name: 'hero',
			x: this.style.width / 2 - 15,
			y: this.style.height / 2 - 15,
			// use default sheetData with hero animations
			sheetData: merge({
				anims: imageData.sprites.hero
			}, imageData.sprites.sheetData)
		}, imageData.sprites.creature)));

		// add monsters
		var monsterTypeCount = imageData.sprites.monsters.length;
		for (var i = 0; i < config.monsterCount; i++) {
			this.map.addMonster(new Creature(merge({
				name: 'monster ' + ~~(Math.random() * 1000),
				// use default sheetData with random monster animations
				sheetData: merge({
					anims: imageData.sprites.monsters[~~(Math.random() * monsterTypeCount)]
				}, imageData.sprites.sheetData)
			}, imageData.sprites.creature)));
		}
		setInterval(bind(this.map, 'wanderMonsters'), 1000);
	};
});
//The output should look like this screenshot:
//<img src="./doc/screenshot.png" alt="a book screenshot" class="screenshot">