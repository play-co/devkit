"use import";

from util.browser import $;

import squill.Widget as Widget;

exports = SliderGroup = Class(Widget, function(supr) {
	this.init = function(opts) {
		var id = opts.id,
			name = opts.name;

		this._id = id;
		this._name = name;
		this._min = opts.min;
		this._max = opts.max;

		this._def = {children: []};

		if (name) {
			this._def.children.push({
				type: 'label',
				label: name,
				className: 'smallLabel'
			});
		}

		this._def.children.push({
			className: 'sliderGroup',
			children: [
				{
					id: id + 'Slider',
					type: 'slider',
					label: name + 'Label',
					min: opts.min,
					max: opts.max,
					step: opts.step || 1,
					className: 'fontSlider',
					width: 240
				},
				{
					id: id + 'Value',
					type: 'text',
					className: 'fontSliderValue'
				}
			]
		});

		supr(this, 'init', arguments);
	};

	this.buildWidget = function() {
		$.id(this._id + 'Slider').slider.subscribe('Change', this, '_onChangeSlider');
		$.onEvent(this._id + 'Value', 'keyup', this, '_onChangeValue');

		return this;
	};

	this.setValue = function(value) {
		$.id(this._id + 'Slider').slider.setValue(value);
		$.setValue(this._id + 'Value', value);
	};

	this._onChangeSlider = function(value) {
		$.setValue(this._id + 'Value', value);
		this.publish('Change', value);
	};

	this._onChangeValue = function() {
		var value = this[this._id + 'Value'].getValue();
		if (!isNaN(value) && (value >= this._min) && (value <= this._max)) {
			value = parseInt(value, 10);
			$.id(this._id + 'Slider').slider.setValue(value);
			this.publish('Change', value);
		}
	};
});
