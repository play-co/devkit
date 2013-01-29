"use import";

from util.browser import $;

import squill.Widget as Widget;

import ..widgets.SliderGroup as SliderGroup;
import ..widgets.ColorGroup as ColorGroup;

exports = OutlinePanel = Class(Widget, function(supr) {
	this.init = function(opts) {
		this.index = opts.index;

		this._fontEditor = opts.fontEditor;
		this._fontSettings = opts.fontSettings;

		this._def = {
			id: 'fontOutline',
			className: 'fontGroup',
			children: [
				{
					id: 'outlineLabel',
					type: 'label',
					label: 'outline', 
					className: 'label'
				},
				{
					id: 'outlineSettings'
				},
				{
					children: [
						{
							id: 'rect',
							type: 'checkbox'
						},
						{
							id: 'rectLabel',
							type: 'label',
							label: 'rectangular outline',
							className: 'smallLabel'
						}
					]
				}
			]
		};

		supr(this, 'init', arguments);
	};

	this.buildWidget = function() {
		var fontSettings = this._fontSettings,
			parent = $.id('outlineSettings');

		this._outline = new SliderGroup({id: 'outline', parent: parent, name: 'width', min: 0, max: 24});
		this._outline.setValue(fontSettings.getOutline());
		this._outline.subscribe('Change', this, '_onChangeOutline');

		this._outlineColor = new ColorGroup({colorID: 'outlineColor', parent: parent, name: 'alpha, color', alphaSlider: true});
		this._outlineColor.subscribe('ChangeColor', this, '_onChangeOutlineColor');
		this._outlineColor.subscribe('ChangeAlpha', this, '_onChangeOutlineAlpha');
		this._outlineColor.setColorValues(fontSettings.getOutlineColor());
		this._outlineColor.setAlphaValues(fontSettings.getOutlineAlpha());

		this._outlineX = new SliderGroup({id: 'outlineX', parent: parent, name: 'offset x, y', min: -20, max: 20});
		this._outlineX.setValue(fontSettings.getOutlineX());
		this._outlineX.subscribe('Change', this, '_onChangeOutlineX');

		this._outlineY = new SliderGroup({id: 'outlineY', parent: parent, min: -20, max: 20});
		this._outlineY.setValue(fontSettings.getOutlineY());
		this._outlineY.subscribe('Change', this, '_onChangeOutlineY');

		this.rect.subscribe('Check', this, this._onChangeRect);
		this.rect.setChecked(fontSettings.getOutlineRect());
	};

	this._onChangeOutline = function(value) {
		this._fontSettings.setOutline(value);
		this.publish('ChangeCharacter');
	};

	this._onChangeOutlineColor = function(values) {
		this._fontSettings.setOutlineColor(values);
		this.publish('ChangeCharacter');
	};

	this._onChangeOutlineAlpha = function(values) {
		this._fontSettings.setOutlineAlpha(values);
		this.publish('ChangeCharacter');
	};

	this._onChangeRect = function() {
		this._fontSettings.setOutlineRect(this.rect.isChecked());
		this.publish('ChangeCharacter');
	};

	this._onChangeOutlineX = function(value) {
		this._fontSettings.setOutlineX(value);
		this.publish('ChangeCharacter');
	};

	this._onChangeOutlineY = function(value) {
		this._fontSettings.setOutlineY(value);
		this.publish('ChangeCharacter');
	};

	this.updateSettings = function() {
		var fontSettings = this._fontSettings;

		this._outline.setValue(fontSettings.getOutline());
		this._outlineColor.setColorValues(fontSettings.getOutlineColor());
		this._outlineColor.setAlphaValues(fontSettings.getOutlineAlpha());
		this._outlineX.setValue(fontSettings.getOutlineX());
		this._outlineY.setValue(fontSettings.getOutlineY());
		this.rect.setChecked(fontSettings.getOutlineRect());
	};
});