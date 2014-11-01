import ui.SpriteView as SpriteView;
import src.config as config;

exports = Class(SpriteView, function(supr) {
	this.init = function(opts) {
		supr(this, 'init', [opts]);
		this.name = opts.name;
		this.items = [];
		this.path = [];
	};

	this.walk = function(dx, dy) {
		this.walking = true;
		if (Math.abs(dx) > Math.abs(dy)) {
			this.startAnimation(dx > 0 ? 'right' : 'left', { loop: true });
		} else {
			this.startAnimation(dy > 0 ? 'down' : 'up', { loop: true });
		}
		this.resume();
	};

	this.takeItem = function(tile) {
		var item = tile.item;
		logger.log(this.name + ' got item ' + item.uid);
		tile.removeSubview(item);
		tile.item = null;
		this.items.push(item);
	};
});