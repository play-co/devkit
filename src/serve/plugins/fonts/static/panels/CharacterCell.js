"use import";

from util.browser import $;

import squill.Cell;

exports = CharacterCell = Class(squill.Cell, function(supr) {
	this._def = {
		className: 'largeTile characterCell',
		children: [
			{
				className: 'largeTileContent',
				children: [
					{id: 'canvas', type: 'canvas', 'width': 40, 'height': 40}
				]
			},
			{
				className: 'largeTileOverview characterName',
				children: [
					{id: 'name', type: 'label'}
				]
			}
		]
	};

	this.buildWidget = function() {
		this.initMouseEvents();
	};

	this.isSelected = function() {
		return this._isSelected;
	};

	this.onClick = function() {
		supr(this, 'onClick', arguments);

		this._parent.publish('Select', this._data);

		this._isSelected = this._data.isSelected;
		if (this._isSelected) {
			$.addClass(this._el, 'selected');
		} else {
			$.removeClass(this._el, 'selected');
		}
	};

	this.render = function() {
		var data = this._data,
			fontSettings = data.charList.getFontSettings(),
			canvas = this.canvas._el,
			ctx = canvas.getContext('2d'),
			hexNum;

		this.name.setLabel('0x' + data.num.toString(16));

		data.cell = this;

		//ctx.fillStyle = data.color || '#000000';
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		canvas.style.fontFamily = fontSettings.getName();

		ctx.font = (fontSettings.getBold() ? 'bold ' : '') + (fontSettings.getItalic() ? 'italic ' : '') + '20px ' + fontSettings.getName();
		ctx.textBaseline = 'top';
		ctx.textAlign = 'center';

		ctx.fillStyle = data.color;
		ctx.fillText(data.character, 20, 5);

		if (data.isSelected) {
			$.addClass(this._el, 'selected');
		} else {
			$.removeClass(this._el, 'selected');
		}
	};
});
