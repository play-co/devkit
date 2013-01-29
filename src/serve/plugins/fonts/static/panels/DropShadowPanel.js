"use import";

from util.browser import $;

import squill.Widget as Widget;

import ..widgets.SliderGroup as SliderGroup;
import ..widgets.ColorGroup as ColorGroup;

exports = DropShadowPanel = Class(Widget, function(supr) {
	this.init = function(opts) {
		this.index = opts.index;

		this._fontEditor = opts.fontEditor;
		this._fontSettings = opts.fontSettings;

		this._def = {
			children: [
				{
					id: 'fontDropShadow',
					className: 'fontGroup',
					children: [
						{
							type: 'label',
							label: 'dropshadow', 
							className: 'label'
						},
						{
							id: 'fontDropShadowWrapper1'
						},
						{
							type: 'label',
							label: 'color',
							className: 'smallLabel'
						},
						{
							id: 'fontDropShadowColor',
							type: 'color',
							className: 'settingsItem'
						},
						{
							id: 'fontDropShadowWrapper2'
						}
					]
				}
			]
		};

		supr(this, 'init', arguments);
	};

	this.buildWidget = function() {
		var fontSettings = this._fontSettings,
			parent;

		this.fontDropShadowColor.setValue(fontSettings.getDropShadowColor());
		this.fontDropShadowColor.subscribe('Change', this, '_onChangeDropShadowColor');

		parent = $.id('fontDropShadowWrapper1');
		this._dropShadow = new SliderGroup({id: 'dropShadow', parent: parent, name: 'blur distance', min: 0, max: 24});
		this._dropShadow.setValue(fontSettings.getDropShadow());
		this._dropShadow.subscribe('Change', this, '_onChangeDropShadow');

		parent = $.id('fontDropShadowWrapper2');
		this._dropShadowX = new SliderGroup({id: 'dropShadowX', parent: parent, name: 'offset x, y', min: -20, max: 20});
		this._dropShadowX.setValue(fontSettings.getDropShadowX());
		this._dropShadowX.subscribe('Change', this, '_onChangeDropShadowX');

		this._dropShadowY = new SliderGroup({id: 'dropShadowY', parent: parent, min: -20, max: 20});
		this._dropShadowY.setValue(fontSettings.getDropShadowY());
		this._dropShadowY.subscribe('Change', this, '_onChangeDropShadowY');
	};

	this._onChangeDropShadow = function(value) {
		this._fontSettings.setDropShadow(value);
		this.publish('ChangeCharacter');
	};

	this._onChangeDropShadowColor = function(value) {
		this._fontSettings.setDropShadowColor(value);
		this.publish('ChangeCharacter');
	};

	this._onChangeDropShadowAlpha = function(value) {
		this._fontSettings.setDropShadowAlpha(value);
		this.publish('ChangeCharacter');
	};

	this._onChangeDropShadowX = function(value) {
		this._fontSettings.setDropShadowX(value);
		this.publish('ChangeCharacter');
	};

	this._onChangeDropShadowY = function(value) {
		this._fontSettings.setDropShadowY(value);
		this.publish('ChangeCharacter');
	};

	this.updateSettings = function() {
		var fontSettings = this._fontSettings;

		this.fontDropShadowColor.setValue(fontSettings.getDropShadowColor());

		this._dropShadow.setValue(fontSettings.getDropShadow());
		this._dropShadowX.setValue(fontSettings.getDropShadowX());
		this._dropShadowY.setValue(fontSettings.getDropShadowY());
	};
});