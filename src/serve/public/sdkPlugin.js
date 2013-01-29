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
