"use import";

from util.browser import $;

import squill.contextMenu as contextMenu;

import .SDKCell as SDKCell;

exports = SDKContextMenuCell = Class(SDKCell, function(supr) {
	this.buildWidget = function() {
		supr(this, 'buildWidget', arguments);

		if (this.cellMenuButton) {
			$.onEvent(this._el, 'mouseover', this, '_onMouseOver');
			$.onEvent(this._el, 'mouseout', this, '_onMouseOut');
			$.onEvent(this.cellMenuButton, 'click', this, '_onMenuClick');
		}
	};

	this._onMouseOver = function(evt) {
		$.addClass(this.cellMenuButton, 'highlightCellMenuButton');
	};

	this._onMouseOut = function(evt) {
		$.removeClass(this.cellMenuButton, 'highlightCellMenuButton');
	};

	this._onMenuClick = function(evt) {
		if (this._el.contextMenu) {
			$.stopEvent(evt);
			contextMenu.show(this._el.contextMenu, evt.target);
		}
	};
});
