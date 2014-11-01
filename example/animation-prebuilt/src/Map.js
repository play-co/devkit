import animate;
import ui.View as View;
import src.Tile as Tile;
import src.AStar as AStar;
import src.config as config;

exports = Class(View, function(supr) {
	this.init = function(opts) {
		var tiles = [];
		for (var i = 0; i < config.map.width; i++) {
			tiles[i] = [];
			for (var j = 0; j < config.map.height; j++) {
				tiles[i][j] = config.tiles[~~(Math.random() * config.tiles.length)];
			}
		}
		opts.width = config.map.unit * tiles.length;
		opts.height = config.map.unit * tiles[0].length;
		supr(this, 'init', [opts]);
		this.gridWidth = tiles.length;
		this.gridHeight = tiles[0].length;
		this.setupTiles(tiles);
		this.astar = new AStar(this.tiles);
		this.monsters = [];
	};

	this.setupTiles = function(tiles) {
		this.tiles = [];
		for (var i = 0; i < tiles.length; i++) {
			var col = tiles[i];
			var column = [];
			for (var j = 0; j < col.length; j++) {
				column[j] = new Tile({
					superview: this,
					unit: config.map.unit,
					xPos: i,
					yPos: j,
					image: col[j].image,
					canPass: col[j].canPass
				});
			}
			this.tiles[i] = column;
		}
	};

	this.randomTile = function() {
		var t = this.tiles[~~(Math.random() * this.gridWidth)][~~(Math.random() * this.gridHeight)];
		while (!t.canPass) {
			t = this.tiles[~~(Math.random() * this.gridWidth)][~~(Math.random() * this.gridHeight)];
		}
		return t;
	};

	this.addItem = function(item) {
		this.randomTile().addItem(item);
	};

	this.addHero = function(hero) {
		this.addSubview(hero);
		this.hero = hero;
		this.walkToTile(this.tiles[0][0], hero);
	};

	this.addMonster = function(monster) {
		this.addSubview(monster);
		this.walkToTile(this.randomTile(), monster);
		this.monsters.push(monster);
	};

	this.wanderMonsters = function() {
		for (var i = 0; i < this.monsters.length; i++) {
			var monster = this.monsters[i];
			if (!(monster.walking || monster.path.length) && Math.random() < 0.5) {
				var target = this.randomTile();
				monster.path = this.astar.findPath(monster.xPos, monster.yPos, target.xPos, target.yPos);
				this.walkPath(monster);
			}
		}
	};

	this.walkToTile = function(tile, creature) {
		var dx = (tile.style.x) - creature.style.x;
		var dy = (tile.style.y) - creature.style.y;
		if (creature == this.hero) {
			animate(this).now({
				dx: -dx,
				dy: -dy
			}, 500, animate.linear);
		}
		creature.walk(dx, dy);
		animate(creature).now({
			dx: dx,
			dy: dy
		}, 500, animate.linear).then(bind(this, function() {
			creature.walking = false;
			creature.xPos = tile.xPos;
			creature.yPos = tile.yPos;
			tile.item && creature.takeItem(tile);
			this.walkPath(creature);
		}));
	};

	this.walkPath = function(creature) {
		if (creature.path.length) {
			var leg = creature.path.pop();
			this.walkToTile(this.tiles[leg[0]][leg[1]], creature);
		} else {
			creature.pause();
		}
	};

	this.onInputSelect = function(e) {
		if (!(this.hero.walking || this.hero.path.length)) {
			this.hero.path = this.astar.findPath(this.hero.xPos, this.hero.yPos, e.target.xPos, e.target.yPos);
			this.walkPath(this.hero);
		}
	};
});