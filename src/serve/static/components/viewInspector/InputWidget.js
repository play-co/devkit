import squill.Widget as Widget;
from util.browser import $;

exports = Class(Widget, function (supr) {
  this._def = {
    children: [
      {type: 'text', id: '_value'}
    ]
  };

  this.buildWidget = function () {
    this._value.subscribe('ValueChange', this, 'publish', 'ValueChange');
    this._value.subscribe('Blur', this, '_onBlur');
    this._value.subscribe('Focus', this, '_onFocus');

    this._value.subscribe('Down', this, '_onMouseDown');
    this._value.subscribe('KeyDown', this, '_onKeyDown');

    var inputEl = this._value.getInputElement();

    var prop = this._opts.prop || {};

    if (prop.readOnly) {
      this._isReadyOnly = true;
      inputEl.style.cursor = 'default';
    }

    switch (prop.type) {
      case 'boolean':
        this._type = 'boolean';
        inputEl.style.cursor = 'pointer';
        break;
      case 'string':
        this._type = 'string';
        break;
      case 'number':
      default:
        this._type = 'number';
        if ('min' in prop) {
          this._min = prop.min;
        }

        if ('max' in prop) {
          this._max = prop.max;
        }

        this._increment = prop.increment;
        break;
    }

    this.initMouseEvents();
  };

  this._onMouseDown = function (e) {
    if (this._isReadyOnly) {
      $.stopEvent(e);
      return;
    }

    if (this._type == 'boolean') {
      this._setValue(!this.getValue());
      $.stopEvent(e);
    }
  };

  this._onFocus = function () {
    switch (this._type) {
      case 'boolean':
        this._value.getElement().blur();
        break;
    }
  };

  this._onBlur = function () {
    this.setValue(this.getValue());
  };

  // set and publish
  this._setValue = function (value) {
    this.setValue(value);
    this.publish('ValueChange', this._value.getValue());
  };

  this.setValue = function (value) {
    this._lastValue = value;

    switch (this._type) {
      case 'number':
        if (value == undefined) { value = '-'; }
        this._value.setValue(value);
        break;
      case 'boolean':
        this._value.setValue(value ? 'true' : 'false');
        break;
      case 'string':
      default:
        this._value.setValue('' + value);
        break;
    }
  };


  // ugly way to do fixed-point sum
  // e.g. 0.06 - 0.01 should be 0.05 (not 0.049999999999999996)
  function add(value, incr) {
    var sum = value + incr;
    var str = incr.toString().split(".");
    if (str.length > 1) {
      var frac = str[1].length;
      sum = +sum.toFixed(frac);
    }

    return sum;
  }

  this._onKeyDown = function (evt) {
    switch (evt.keyCode) {
      case 37: // left
        break;
      case 38: // up
        this._setValue(add(this.getValue(), (this._increment || 1)));
        $.stopEvent(evt);
        break;
      case 39: // right
        break;
      case 40: // down
        this._setValue(add(this.getValue(), -(this._increment || 1)));
        $.stopEvent(evt);
        break;
    }
  };

  this.getValue = function () {
    switch (this._type) {
      case 'number':
        var val = this._value.getValue();
        if (val == '-') { return undefined; }

        val = parseFloat(val);
        if (('_max' in this) && val > this._max) {
          val = this._max;
        }

        if (('_min' in this) && val < this._min) {
          val = this._min;
        }

        if (isNaN(val)) {
          return this._lastValue;
        } else {
          return val;
        }
      case 'boolean':
        return this._value.getValue() == 'true';
      default:
      case 'string':
        return this._value.getValue();
    }
  };
});
