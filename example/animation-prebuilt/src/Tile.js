import ui.ImageView as ImageView;

exports = Class(ImageView, function(supr) {
	this.init = function(opts) {
		opts.x = opts.unit * opts.xPos;
		opts.y = opts.unit * opts.yPos;
		opts.width = opts.height = opts.unit;
		supr(this, 'init', [opts]);
		this.canPass = opts.canPass;
		this.xPos = opts.xPos;
		this.yPos = opts.yPos;
	};

	this.addItem = function(item) {
		this.addSubview(item);
		this.item = item;
	};
});