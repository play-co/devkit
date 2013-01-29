"use import";

from util.browser import $;

import squill.Widget as Widget;

import .ColorSlider as ColorSlider;

exports = ColorGroup = Class(Widget, function(supr) {
	this.init = function(opts) {
		this._id = opts.colorID;
		this._alphaSlider = opts.alphaSlider;

		this._def = {
			className: 'fontColorGroup',
			children: [
				{
					id: opts.colorID + 'Label',
					type: 'label',
					label: opts.name,
					className: 'smallLabel'
				},
				{
					id: opts.colorID + 'Wrapper',
					className: 'fontColorWrapper',
					children: [
						{
							id: opts.colorID + 'SliderWrapper',
							className: 'fontSliderWrapper'
						},
						{
							id: opts.colorID + 'Alpha',
							type: 'alpha',
							className: 'fontColorAlpha'
						},
						{
							id: opts.colorID,
							type: 'color',
							className: 'fontColorValue'
						}
					]
				}
			]
		};

		supr(this, 'init', arguments);
	};

	this.buildWidget = function() {
		$.onEvent(this._id, 'change', this, '_onChangeColor');
		$.onEvent(this._id + 'Alpha', 'keyup', this, '_onEditAlpha');

		this._colorSlider = new ColorSlider({
			parent: $.id(this._id + 'SliderWrapper'),
			id: this._id + 'Slider',
			width: 200,
			alphaSlider: this._alphaSlider
		});

		this[this._id + 'Alpha'].subscribe('Change', this, '_onChangeAlpha');

		this._colorSlider.subscribe('ChangeColor', this, '_onChangeColors');
		this._colorSlider.subscribe('ChangeActiveColor', this, '_onChangeActiveColor');
		this._colorSlider.subscribe('ChangeAlpha', this, '_onChangeAlphas');
		this._colorSlider.subscribe('ChangeActiveAlpha', this, '_onChangeActiveAlpha');
	};

	this._fixColor = function(color) {
		if (color.substr(0, 1) !== '#') {
			color = '#' + color;
		}
		return color;
	};

	this._setValue = function(id, v) {
		v += '';
		if (v.substr(0, 1) === '#') {
			v = v.substr(1, v.length - 1);
		}
		if ($.id(id).firstChild !== null) {
			$.id(id).firstChild.value = v;
		} else {
			$.id(id).value = v;
		}
	};

	this.setColorValues = function(values) {
		this._colorSlider.setColorValues(values);

		var value = this._colorSlider.getActiveColor();
		this._setValue(this._id, value);
		$.style(this._id, {color: '#000000', backgroundColor: this._fixColor(value)});
	};

	this.setAlphaValues = function(values) {
		this._colorSlider.setAlphaValues(values);

		this._setValue(this._id + 'Alpha', this._colorSlider.getActiveAlpha());
	};

	this._onChangeColor = function(evt) {
		this._colorSlider.setActiveColor(this._fixColor(evt.target.value));
		this.publish('ChangeColor', this._colorSlider.getColorValues());
	};

	this._onChangeActiveColor = function(value) {
		this._setValue(this._id, value);
		$.style(this._id, {color: '#000000', backgroundColor: this._fixColor(value)});
	};

	this._onChangeColors = function(values) {
		this.publish('ChangeColor', values);
	};

	this._onEditAlpha = function(evt) {
		if (!isNaN(evt.target.value)) {
			var alpha = parseInt(evt.target.value, 10);
			if ((alpha >= 0) && (alpha <= 100)) {
				this._colorSlider.setActiveAlpha(alpha);
				this.publish('ChangeAlpha', this._colorSlider.getAlphaValues());
			}
		}
	};

	this._onChangeAlpha = function(value) {
		this._colorSlider.setActiveAlpha(value);
		this.publish('ChangeAlpha', this._colorSlider.getAlphaValues());
	};

	this._onChangeActiveAlpha = function(value) {
		this._setValue(this._id + 'Alpha', value);
	};

	this._onChangeAlphas = function(values) {
		this.publish('ChangeAlpha', values);
	};

/*
	this._onChangeActive = function(color) {
		$.id(this._id).value = color;
		$.style(this._id, {color: '#000000', backgroundColor: color});
	};
*/
	this.getColor = function() {
		return this._color;
	};
});
