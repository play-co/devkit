"use import";

from util.browser import $;

import lib.PubSub as PubSub;

import squill.Widget as Widget;

var Slider = Class(PubSub, function(supr) {
	this._css = 'rng';
	this._type = 'range';

	this.init = function(opts) {
		supr(this, 'init', arguments);

		this._ctx = opts.ctx;
		this._y = opts.y || 0;
		this._width = opts.width || 100;
		this._padding = opts.padding || 12;
		this._alpha = opts.alpha;

		this._activeIndex = 0;
		this._hoverIndex = false;

		this._relX = 0;
		this._relY = 0;

		this._values = [{p:0, v:this._alpha ? 100 : '#FF0000'}];
	};

	this._valueColor = function(value) {
		var color;

		if (this._alpha) {
			color = ~~(value.v * 255 / 100);
			color = 'rgb(' + color + ',' + color + ',' + color + ')';
		} else {
			color = value.v;
		}
		return color;
	};

	this.render = function() {
		var width = this._width,
			padding = this._padding,
			ctx = this._ctx,
			radialGradient,
			linearGradient,
			values = this._values,
			value,
			color,
			radius,
			relX, relY,
			y = this._y,
			x,
			v, p,
			i;

		ctx.clearRect(0, y, width, padding * 2);

		ctx.lineCap = 'round';

		ctx.beginPath();
		ctx.arc(padding + 2, y + padding, 2, Math.PI * 0.5, Math.PI * 1.5, false);
		ctx.arc(width - padding - 2, y + padding, 2, Math.PI * 1.5, Math.PI * 0.5, false);
		ctx.closePath();

		if (values.length === 1) {
			ctx.fillStyle = this._valueColor(values[0]);
		} else {
			this._sortValues();
			linearGradient = ctx.createLinearGradient(padding, 0, width - padding * 2, 0);
			for (i = 0; i < values.length; i++) {
				value = values[i];
				p = (value.p < 0) ? 0 : value.p;
				linearGradient.addColorStop(p / 1000, this._valueColor(value));
			}

			ctx.fillStyle = linearGradient;
		}
		ctx.lineWidth = 1;
		ctx.strokeStyle = '#FFFFFF';
		ctx.stroke();
		ctx.fill();

		if ((values.length > 1) || (values[0].p !== 0)) {
			for (i = 0; i < values.length; i++) {
				value = values[i];
				x = ~~((width - padding * 2) * value.p / 1000);

				if (i === this._activeIndex) {
					relX = this._relX;
					relY = this._relY;
				} else {
					relX = 0;
					relY = 0;
				}

				ctx.save();

				if (i === this._hoverIndex) {
					ctx.shadowOffsetX = 0;
					ctx.shadowOffsetY = 0;
					ctx.shadowBlur = 10;
					ctx.shadowColor = '#0099FF';
				}

				radius = (i === this._activeIndex) ? 6 : 4.5;

				ctx.beginPath();
				ctx.arc(padding + x + relX, padding + y + relY, radius, 0, Math.PI * 2, false);
				ctx.closePath();
				ctx.fillStyle = value.c;
				ctx.fill();

				ctx.restore();

				ctx.beginPath();
				ctx.arc(padding + x + relX, padding + y + relY, radius, 0, Math.PI * 2, false);
				ctx.closePath();
				ctx.lineWidth = 1;
				ctx.strokeStyle = '#FFFFFF';
				ctx.stroke();
			}
		}
	};

	this._sortValues = function() {
		var toString = function() {
				var s = (5000 + this.p) + '';
				return s;
			},
			values = this._values,
			i;

		for (i = 0; i < values.length; i++) {
			values[i].toString = toString;
		}
		values.sort();
	};

	this._rgb = function(c) {
		return {
			red: parseInt(c.substr(1, 2), 16),
			grn: parseInt(c.substr(3, 2), 16),
			blu: parseInt(c.substr(5, 2), 16)
		};
	};

	this._toHex = function(n) {
		n = n.toString(16);
		return ((n.length < 2) ? '0' : '') + n;
	};

	this._betweenColors = function(c1, c2, p) {
		var rgb = {},
			rgb1 = this._rgb(c1.v),
			rgb2 = this._rgb(c2.v),
			dp = c2.p - c1.p;

		p -= c1.p;
		rgb.red = ~~(rgb1.red + (rgb2.red - rgb1.red) * p / dp);
		rgb.grn = ~~(rgb1.grn + (rgb2.grn - rgb1.grn) * p / dp);
		rgb.blu = ~~(rgb1.blu + (rgb2.blu - rgb1.blu) * p / dp);

		return '#' + (this._toHex(rgb.red) + this._toHex(rgb.grn) + this._toHex(rgb.blu)).toUpperCase();
	};

	this._betweenAlphas = function(a1, a2, p) {
		var alpha,
			alpha1 = a1.v,
			alpha2 = a2.v,
			dp = a2.p - a1.p;

		p -= a1.p;

		return ~~(alpha1 + (alpha2 - alpha1) * p / dp);
	};

	this._pToActiveIndex = function(p) {
		var values = this._values,
			i;

		for (i = 0; i < values.length; i++) {
			if (values[i].p === p) {
				this._activeIndex = i;
				break;
			}
		}
	};

	this._findPoint = function(x, y) {
		var width = this._width,
			padding = this._padding,
			values = this._values,
			x1, y1, x2, y2,
			i;

		if ((values.length > 1) || (values[0].p !== 0)) {
			for (i = 0; i < values.length; i++) {
				x1 = padding + ~~((width - padding * 2) * values[i].p / 1000) - 7;
				y1 = padding - 5 + this._y;
				x2 = x1 + 14;
				y2 = padding + 5 + this._y;
				if ((x >= x1) && (y >= y1) && (x <= x2) && (y <= y2)) {
					return i;
				}
			}
		}

		return false;
	};

	this.onMouseOut = function(evt) {
		this._hoverIndex = false;
		this._mouseDown = false;
		this._relX = 0;
		this._relY = 0;
		this.render();
	};

	this.onMouseDown = function(evt) {
		var width = this._width,
			padding = this._padding,
			mouseX = evt.offsetX,
			mouseY = evt.offsetY,
			values = this._values,
			value,
			found = false,
			p,
			x,
			y = this._y,
			i;

		found = this._findPoint(mouseX, mouseY);

		if (found === false) {
			if ((mouseX > padding) && (mouseY > y + padding - 5) && (mouseX < width - padding) && (mouseY < y + padding + 5)) {
				p = ~~(1000 * (mouseX - padding) / (this._width - padding * 2));
				for (i = 0; i < values.length; i++) {
					if (p === values[i].p) {
						found = true;
						break;
					}
				}
				if (!found) {
					if ((values.length === 1) && (values[0].p === 0)) {
						values[0].p = p;
						value = values[0].v;
					} else {
						value = values[0].v;
						if (values.length > 1) {
							found = false;
							for (i = 1; i < values.length; i++) {
								if ((p > values[i - 1].p) && (p < values[i].p)) {
									value = this[this._alpha ? '_betweenAlphas' : '_betweenColors'](values[i - 1], values[i], p);
									found = true;
								}
							}
							if (!found) {
								if (p < values[0].p) {
									value = values[0].v;
								} else if (p > values[values.length - 1].p) {
									value = values[values.length - 1].v;
								}
							}
						}
						values.push({p:p, v:value});
					}

					this._sortValues();
					this._pToActiveIndex(p);

					this._hoverIndex = this._activeIndex;
					this.render();
					this.publish('Change', this._values);
					this.publish('ChangeActive', value);
				}
			}
			this._mouseDown = false;
		} else {
			this._mouseDown = true;
			this._mouseX = mouseX;
			this._mouseY = mouseY;
			this._activeIndex = found;
			this.publish('ChangeActive', values[this._activeIndex].v);
		}
	};
	
	this.onMouseUp = function(evt) {
		if (this._mouseDown) {
			var width = this._width,
				padding = this._padding,
				values = this._values,
				value = values[this._activeIndex],
				x = padding + ~~((width - padding * 2) * value.p / 1000) + this._relX,
				i;

			if (x < padding) {
				x = padding;
			}
			if (x > width - padding) {
				x = width - padding;
			}
			value.p = ~~((x - padding) / (width - padding * 2) * 1000);

			for (i = 0; i < values.length; i++) {
				if ((i !== this._activeIndex) && (values[i].p === value.p)) {
					if (this._activeIndex === values.length) {
						values.pop();
						this._activeIndex--;
					} else if (i === values.length - 1) {
						values.pop();
					} else {
						values[i] = values.pop();
					}
					break;
				}
			}
			this._sortValues();

			this._mouseDown = false;
		}

		this._relX = 0;
		this._relY = 0;
		this.render();
	};
	
	this.onMouseMove = function(evt) {
		var values = this._values,
			mouseX = evt.offsetX,
			mouseY = evt.offsetY;

		if (this._mouseDown) {
			this._relX = mouseX - this._mouseX;
			this._relY = mouseY - this._mouseY;

			if (Math.abs(this._relY) > 5) {
				if (values.length === 1) {
					values[0].p = 0;
				} else if (this._activeIndex === values.length - 1) {
					values.pop();
					this._activeIndex = 0;
				} else {
					values[this._activeIndex] = values.pop();
				}

				this._sortValues();
				this._mouseDown = false;
				this._relX = 0;
				this._relY = 0;

				this.publish('Change', this._values);
			}

			this.render();
		} else {
			i = this._findPoint(mouseX, mouseY);
			if (this._hoverIndex !== i) {
				this._hoverIndex = i;
				this.render();
			}
		}
	};

	this.getValues = function() {
		return this._values;
	};

	this.setValues = function(values) {
		this._values = values;
		this.render();
	};

	this.getActiveValue = function() {
		return this._values[this._activeIndex].v;
	};

	this.setActiveValue = function(value) {
		this._values[this._activeIndex].v = value;
		this.render();
	};
});


var ColorSlider = exports = Class(Widget, function(supr) {
	this._css = 'rng';
	this._type = 'range';

	this.init = function(opts) {
		this._width = opts.width || 100;
		this._padding = 12;
		this._alphaSlider = opts.alphaSlider;

		this._def = {
			children: [
				{
					id: opts.id + 'Canvas',
					tag: 'canvas',
					attrs: {
						width: this._width,
						height: this._padding * 2 + (this._alphaSlider ? this._padding * 2 : 0)
					}
				}
			]
		};

		supr(this, 'init', arguments);
	};

	this.buildWidget = function() {
		var el = this._el;
			canvas = el.firstChild;

		el.slider = this;

		this._ctx = canvas.getContext('2d');

		this._colorSlider = new Slider({
			ctx: canvas.getContext('2d'),
			width: this._width,
			y: this._alphaSlider ? this._padding * 2 : 0
		});

		if (this._alphaSlider) {
			this._alphaSlider = new Slider({
				ctx: canvas.getContext('2d'),
				width: this._width,
				alpha: true
			});
			this._sliders = [this._alphaSlider, this._colorSlider];

			this._alphaSlider.subscribe('Change', this, '_onChangeAlpha');
			this._alphaSlider.subscribe('ChangeActive', this, '_onChangeActiveAlpha');
		} else {
			this._sliders = [this._colorSlider];
		}

		this._colorSlider.subscribe('Change', this, '_onChangeColor');
		this._colorSlider.subscribe('ChangeActive', this, '_onChangeActiveColor');

		$.onEvent(canvas, 'mouseout', this, '_onMouseOut');
		$.onEvent(canvas, 'mousedown', this, '_onMouseDown');
		$.onEvent(canvas, 'mouseup', this, '_onMouseUp');
		$.onEvent(canvas, 'mousemove', this, '_onMouseMove');

		this._render();
	};

	this._render = function() {
		this._eachSlider('render', []);
	};

	this._onChangeColor = function(values) {
		this.publish('ChangeColor', values);
	};

	this._onChangeActiveColor = function(value) {
		this.publish('ChangeActiveColor', value);
	};

	this._onChangeAlpha = function(values) {
		this.publish('ChangeAlpha', values);
	};

	this._onChangeActiveAlpha = function(value) {
		this.publish('ChangeActiveAlpha', value);
	};

	this._eachSlider = function(method, params) {
		var sliders = this._sliders,
			slider,
			i = sliders.length;

		while (i) {
			slider = sliders[--i];
			slider[method].call(slider, params);
		}
	};

	this._onMouseOut = function(evt) {
		this._eachSlider('onMouseOut', evt);
	};

	this._onMouseDown = function(evt) {
		this._eachSlider('onMouseDown', evt);
	};
	
	this._onMouseUp = function(evt) {
		this._eachSlider('onMouseUp', evt);
	};
	
	this._onMouseMove = function(evt) {
		this._eachSlider('onMouseMove', evt);
	};

	this.getColorValues = function() {
		return this._colorSlider.getValues();
	};

	this.setColorValues = function(values) {
		this._colorSlider.setValues(values);
		this._render();
	};

	this.getAlphaValues = function() {
		return this._alphaSlider.getValues();
	};

	this.setAlphaValues = function(values) {
		this._alphaSlider.setValues(values);
		this._render();
	};

	this.getActiveColor = function() {
		return this._colorSlider.getActiveValue();
	};

	this.setActiveColor = function(value) {
		this._colorSlider.setActiveValue(value);
		this._render();
	};

	this.getActiveAlpha = function() {
		return this._alphaSlider.getActiveValue();
	};

	this.setActiveAlpha = function(value) {
		this._alphaSlider.setActiveValue(value);
		this._render();
	};
});

