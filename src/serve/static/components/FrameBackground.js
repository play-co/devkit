import squill.Widget as Widget;
import math2D.Point as Point;
from util.browser import $;

var SHADOW_OFFSET_X = 20;
var SHADOW_OFFSET_Y = 20;
var SHADOW_BLUR = 50;
var SHADOW_COLOR = 'rgba(0, 0, 0, 0.5)';

module.exports = Class(Widget, function () {

  this._def = {tag: 'canvas'};

  this.buildWidget = function () {
    this.initMouseEvents();
  }

  this.update = function (opts) {
    this._rotation = opts.rotation || 0;
    this._scale = opts.scale || 1;

    if (!opts) {
      return this.hide();
    }

    this._computePosition(opts);
    this._render(opts.img);
  }

  this._computePosition = function (opts) {

    // compute position
    var scale = this._scale;
    var width = opts.width;
    var height = opts.height;
    var offsetX = opts.offsetX;
    var offsetY = opts.offsetY;

    var isRotated = !!(this._rotation % 2);
    if (isRotated) {
      width = opts.height;
      height = opts.width;
      offsetX = opts.height - opts.screenSize.width - opts.offsetY;
      offsetY = opts.offsetX;
    }

    this._width = width * scale;
    this._height = height  * scale;
    this._offsetX = -(offsetX || 0) * scale;
    this._offsetY = -(offsetY || 0) * scale;

    var x = this._shadowX = Math.max(0, SHADOW_BLUR - SHADOW_OFFSET_X);
    var y = this._shadowY = Math.max(0, SHADOW_BLUR - SHADOW_OFFSET_Y);

    var ctx = this._el.getContext('2d');
    this._fullWidth = this._width + SHADOW_OFFSET_X + SHADOW_BLUR + x;
    this._fullHeight = this._height + SHADOW_OFFSET_Y + SHADOW_BLUR + y;

    $.style(this._el, {
      left: this._offsetX - x + 'px',
      top: this._offsetY - y + 'px',
      width: this._fullWidth + 'px',
      height: this._fullHeight + 'px'
    });

  }

  this.getOffset = function () {
    // return offset rectangle excluding shadow size
    return {
      x: this._offsetX,
      y: this._offsetY,
      width: this._width,
      height: this._height
    };
  }

  this._render = function (url) {
    // render image
    this._url = url;
    if (url) {
      var img = this._img = new Image();
      img.onload = bind(this, '_renderChrome');
      img.src = 'images/' + url;
      return;
    } else {
      this._img = null;
    }

    this._renderChrome();
  }

  this._renderChrome = function () {

    // avoid unnecessary renders
    var cacheKey = [
      this._width,
      this._height,
      !!this._img,
      this._img && this._img.src
    ].join('|');

    if (this._cacheKey == cacheKey) { return; }
    this._cacheKey = cacheKey;

    if (this._img) {
      this.show();
    } else {
      this.hide();
    }

    // render the image
    var x = Math.max(0, SHADOW_BLUR - SHADOW_OFFSET_X);
    var y = Math.max(0, SHADOW_BLUR - SHADOW_OFFSET_Y);

    var ctx = this._el.getContext('2d');
    this._el.width = this._fullWidth;
    this._el.height = this._fullHeight;

    ctx.save();

    ctx.shadowBlur = SHADOW_BLUR;
    ctx.shadowOffsetX = SHADOW_OFFSET_X;
    ctx.shadowOffsetY = SHADOW_OFFSET_Y;
    ctx.shadowColor = SHADOW_COLOR;

    ctx.translate(x, y);

    if (this._img) {
      if (this._rotation % 2 == 0) {
        ctx.drawImage(this._img, 0, 0, this._width, this._height);
      } else {
        switch (this._rotation % 4) {
          case 3:
          case 1:
            ctx.rotate(90 * Math.PI / 180);
            ctx.translate(0, -this._width);
            ctx.drawImage(this._img, 0, 0, this._height, this._width);
            break;
        }
      }
    }

    ctx.restore();
  }
});
