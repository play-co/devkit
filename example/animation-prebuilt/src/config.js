exports = {
	monsterCount: 10,
	itemCount: 20,
	itemSize: 20,
	map: {
		width: 15,
		height: 15,
		unit: 40
	},
	tiles: [
		// tiles from the internets, free
		// http://www.lostgarden.com/search/label/free%20game%20graphics
		{
			image: 'resources/images/dirt.png',
			canPass: true
		},
		{
			image: 'resources/images/grass.png',
			canPass: true
		},
		{
			image: 'resources/images/wall.png',
			canPass: false
		}
	]
};