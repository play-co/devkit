"use import";

from util.browser import $;

import squill.Widget as Widget;

import ..widgets.SliderGroup as SliderGroup;
import ..widgets.ColorGroup as ColorGroup;

exports = SettingsPanel = Class(Widget, function(supr) {
	this.init = function(opts) {
		this._fontEditor = opts.fontEditor;
		this._fontSettings = opts.fontSettings;

		this._def = {
			children: [
				{
					id: 'fontOptions',
					className: 'fontGroup',
					children: [
						{
							children: [
								{
									id: 'settingsLabel',
									type: 'label',
									label: 'settings', 
									className: 'label'
								}
							]
						},
						{
							children: [
								{
									id: 'bold',
									type: 'checkbox'
								},
								{
									id: 'boldLabel',
									type: 'label',
									label: 'bold',
									className: 'smallLabel'
								},
								{
									id: 'italic',
									type: 'checkbox'
								},
								{
									id: 'italicLabel',
									type: 'label',
									label: 'italic',
									className: 'smallLabel'
								}
							]
						},
						{
							id: 'fontOptionsInputs'
						}
					]
				}
			]
		};

		supr(this, 'init', arguments);
	};

	this.buildWidget = function() {
		var fontSettings = this._fontSettings,
			parent = $.id('fontOptionsInputs');

		this._fontSize = new SliderGroup({id: 'size', parent: parent, name: 'size', min: 12, max: 128});
		this._fontSize.subscribe('Change', this, '_onChangeSize');
		this._fontSize.setValue(fontSettings.getSize());

		this._fontTracking = new SliderGroup({id: 'tracking', parent: parent, name: 'tracking', min: -16, max: 16});
		this._fontTracking.subscribe('Change', this, '_onChangeTracking');
		this._fontTracking.setValue(fontSettings.getTracking());

		this._color = new ColorGroup({colorID: 'fontColor', parent: parent, name: 'alpha, color', alphaSlider: true});
		this._color.subscribe('ChangeColor', this, '_onChangeColor');
		this._color.subscribe('ChangeAlpha', this, '_onChangeAlpha');
		this._color.setColorValues(fontSettings.getColor());
		this._color.setAlphaValues(fontSettings.getAlpha());

		this.bold.subscribe('Check', this, '_onChangeBold');
		this.italic.subscribe('Check', this, '_onChangeItalic');
	};

	this._onChangeSize = function(value) {
		this._fontSettings.setSize(value);
		this.publish('ChangeCharacter');
	};

	this._onChangeColor = function(values) {
		this._fontSettings.setColor(values);
		this.publish('ChangeCharacter');
	};

	this._onChangeAlpha = function(values) {
		this._fontSettings.setAlpha(values);
		this.publish('ChangeCharacter');
	};

	this._onChangeBold = function() {
		this._fontSettings.setBold(this.bold.isChecked());
		this.publish('ChangeCharacter');
		this.publish('ChangeFont');
	};

	this._onChangeItalic = function() {
		this._fontSettings.setItalic(this.italic.isChecked());
		this.publish('ChangeCharacter');
		this.publish('ChangeFont');
	};

	this._onChangeTracking = function(value) {
		this._fontSettings.setTracking(value);
		this.publish('ChangeCharacter');
	};

	this._onToggle = function() {
		this._fontEditor.togglePanel(this);
	};

	this.updateSettings = function() {
		var fontSettings = this._fontSettings;

		this._fontSize.setValue(fontSettings.getSize());
		this._fontTracking.setValue(fontSettings.getTracking());
		this._color.setColorValues(fontSettings.getColor());
		this._color.setAlphaValues(fontSettings.getAlpha());
		this.bold.setChecked(fontSettings.getBold());
		this.italic.setChecked(fontSettings.getItalic());
	};
});