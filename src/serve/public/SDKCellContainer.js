"use import";

from util.browser import $;

import squill.Cell as Cell;

var exports = SDKCellContainer = Class(Cell, function(supr) {
	this.init = function() {
		this._def = {
			children: [
				{
					id: 'cellContainerLabel',
					children: [
						{id: 'label', type: 'label', label: 'Container label'}
					]
				},
				{
					id: 'cellContainer',
					children: [
						{
							children: [
								{
									id: 'containerList',
									type: 'list',
									margin: 0,
									isTiled: true,
									cellCtor: arguments[0].data.cellCtor,
									preserveCells: false
								}
							]
						}
					]
				}
			]
		};

		supr(this, 'init', arguments);
	};

	this.buildWidget = function() {
		this.containerList.subscribe('Select', this, 'onSelectItem');
	};

	this.render = function() {
		var data = this._data;
		var cellWidth = data.cellWidth;
		var cellHeight = data.cellHeight;
		var width;
		var height;

		data.cell = this;

		if (cellWidth !== null) {
			// this.containerList.setCellDim({width: cellWidth, height: cellHeight});

			// width = this.label._el.getBoundingClientRect().width,
			// height = Math.ceil(this._data.list.length / ~~(width / cellWidth)) * cellHeight + 10;
			// $.style(this.cellContainer, {height: height + 'px'});
		} else {
			// this.containerList.setCellDim(null);
			// height: 64px, padding: 2 * 2px, margin-bottom: 4px, extra space under all rows: 10px...
			//$.style(this.cellContainer, {height: (this._data.list.length * (64 + 4 + 4) + 10) + 'px'});
		}

		this.label.setLabel(this._data.label);
		this.containerList.setDataSource(this._data.list);
		this.containerList.setCellCtor(this._data.cellCtor);
		this.containerList.render();
	};

	this.updateState = function() {
		var cells = this.containerList.getCells();
		var key;

		for (key in cells) {
			cells[key].updateState();
		}
	};

	this.onSelectItem = function(item, isSelected) {
		this._parent.publish('Select', item, isSelected);
	};
});
