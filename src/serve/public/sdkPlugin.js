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

"use import";

import lib.Enum as Enum;

import squill.Widget;

exports.listMode = Enum('TILED', 'ROWS');

exports.SDKPlugin = Class(squill.Widget, function(supr) {
	this.showProject = function(project) {
		this._project = project;
	};

	this.getProject = function() { return this._project; };

	this.setOverview = function(overview) {
		this._overview = overview;
	};
});
