/* @license
 * This file is part of the Game Closure SDK.
 *
 * The Game Closure SDK is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * The Game Closure SDK is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with the Game Closure SDK.  If not, see <http://www.gnu.org/licenses/>.
 */

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
