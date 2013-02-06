/** @license
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

import ui.View;
import ui.TextView;

exports = Class(ui.View, function (supr) {
	this.init = function (opts) {
		opts = merge(opts, {
			backgroundColor: '#00ff00'
		});
		
		supr(this, 'init', [opts]);
	};

	this.buildView = function () {
		var button = new ui.TextView({
			superview: this,
			text: "Game Screen",
			x: 0,
			y: 0,
			width: this.style.width,
			height: 40,
			backgroundColor: '#ffffff'
		});
	};
});
