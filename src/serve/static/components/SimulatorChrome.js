import squill.Widget as Widget;
import math2D.Point as Point;
from util.browser import $;

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

    $.style(this._el, {
      left: this._offsetX + 'px',
      top: this._offsetY + 'px',
      width: this._width + 'px',
      height: this._height + 'px'
    });

  }

  this.getOffset = function () {
    return new Point(this._offsetX, this._offsetY);
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
    var ctx = this._el.getContext('2d');
    this._el.width = this._width;
    this._el.height = this._height;

    ctx.save();

    if (this._img) {
      if (this._rotation % 2 == 0) {
        ctx.drawImage(this._img, 0, 0, ctx.canvas.width, ctx.canvas.height);
      } else {
        switch (this._rotation % 4) {
          case 3:
          case 1:
            ctx.rotate(90 * Math.PI / 180);
            ctx.translate(0, -ctx.canvas.width);
            ctx.drawImage(this._img, 0, 0, ctx.canvas.height, ctx.canvas.width);
            break;
        }
      }
    }

    ctx.restore();
  }
});
