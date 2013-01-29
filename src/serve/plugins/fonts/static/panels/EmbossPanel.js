"use import";

from util.browser import $;

import squill.Widget as Widget;

import ..widgets.SliderGroup as SliderGroup;
import ..widgets.ColorGroup as ColorGroup;

exports = EmbossPanel = Class(Widget, function(supr) {
	this.init = function(opts) {
		this.index = opts.index;

		this._fontEditor = opts.fontEditor;
		this._fontSettings = opts.fontSettings;

		this._def = {
			children: [
				{
					className: 'fontGroup',
					children: [
						{
							id: 'embossLabel',
							type: 'label',
							label: 'emboss', 
							className: 'label'
						},
						{
							id: 'fontEmboss'
						}
					]
				}
			]
		};

		supr(this, 'init', arguments);
	};

	this.buildWidget = function() {
		var fontSettings = this._fontSettings,
			parent = $.id('fontEmboss');

		this._emboss = new SliderGroup({id: 'emboss', parent: parent, name: 'width', min: 0, max: 4});
		this._emboss.setValue(fontSettings.getEmboss());
		this._emboss.subscribe('Change', this, '_onChangeEmboss');

		this._embossColor1 = new ColorGroup({colorID: 'embossColor1', parent: parent, name: 'alpha 1, color 1', alphaSlider: true});
		this._embossColor1.subscribe('ChangeColor', this, '_onChangeEmbossColor1');
		this._embossColor1.subscribe('ChangeAlpha', this, '_onChangeEmbossAlpha1');
		this._embossColor1.setColorValues(fontSettings.getEmbossColor1());
		this._embossColor1.setAlphaValues(fontSettings.getEmbossAlpha1());

		this._embossColor2 = new ColorGroup({colorID: 'embossColor2', parent: parent, name: 'alpha 2, color 2', alphaSlider: true});
		this._embossColor2.subscribe('ChangeColor', this, '_onChangeEmbossColor2');
		this._embossColor2.subscribe('ChangeAlpha', this, '_onChangeEmbossAlpha2');
		this._embossColor2.setColorValues(fontSettings.getEmbossColor2());
		this._embossColor2.setAlphaValues(fontSettings.getEmbossAlpha2());
	};

	this._onChangeEmboss = function(value) {
		this._fontSettings.setEmboss(value);
		this.publish('ChangeCharacter');
	};

	this._onChangeEmbossColor1 = function(values) {
		this._fontSettings.setEmbossColor1(values);
		this.publish('ChangeCharacter');
	};

	this._onChangeEmbossAlpha1 = function(values) {
		this._fontSettings.setEmbossAlpha1(values);
		this.publish('ChangeCharacter');
	};

	this._onChangeEmbossColor2 = function(values) {
		this._fontSettings.setEmbossColor2(values);
		this.publish('ChangeCharacter');
	};

	this._onChangeEmbossAlpha2 = function(values) {
		this._fontSettings.setEmbossAlpha2(values);
		this.publish('ChangeCharacter');
	};

	this.updateSettings = function() {
		var fontSettings = this._fontSettings;

		this._emboss.setValue(fontSettings.getEmboss());
		this._embossColor1.setColorValues(fontSettings.getEmbossColor1());
		this._embossColor1.setAlphaValues(fontSettings.getEmbossAlpha1());
		this._embossColor2.setColorValues(fontSettings.getEmbossColor2());
		this._embossColor2.setAlphaValues(fontSettings.getEmbossAlpha2());
	};
});