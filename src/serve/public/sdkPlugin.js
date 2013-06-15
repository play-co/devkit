/** @license
 * This file is part of the Game Closure SDK.
 *
 * The Game Closure SDK is free software: you can redistribute it and/or modify
 * it under the terms of the Mozilla Public License v. 2.0 as published by Mozilla.

 * The Game Closure SDK is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * Mozilla Public License v. 2.0 for more details.

 * You should have received a copy of the Mozilla Public License v. 2.0
 * along with the Game Closure SDK.  If not, see <http://mozilla.org/MPL/2.0/>.
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
