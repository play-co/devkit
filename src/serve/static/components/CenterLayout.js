import math2D.Point as Point;
import squill.Widget as Widget;
from util.browser import $;

import ..util.Size as Size;

// centers an element with a given content-size within this node
module.exports = Class(Widget, function () {
  this._def = {
    className: 'center-layout',
    children: [
      {id: '_center', children: [
        {id: '_corner'}
      ]}
    ]
  }

  this.buildWidget = function () {
    this._offset = new Point(0, 0);
  }

  this.getContainer = function () { return this._corner; }

  this.setCenterX = function (isCentered) {
    this._isCenteredX = isCentered;
    this.toggleClass('center-x', isCentered);
  }

  this.setCenterY = function (isCentered) {
    this._isCenteredY = isCentered;
    this.toggleClass('center-y', isCentered);
  }


  function bound(value, min, max) {
    return value < min ? min : value > max ? max : value;
  }

  this.addOffset = function (x, y) {
    this._offset.add(x, y);
    this.onLayoutChange();
  }

  this.setOffset = function (x, y) {
    this._offset.x = x;
    this._offset.y = y;
    this.onLayoutChange();
  }

  this.setContentSize = function (width, height) {
    this._contentSize = new Size(width, height);
    this.onLayoutChange();
  }

  this.computeOffset = function () {
    this._offset = this._computeOffset();
  }

  this.getContentArea = function () {
    return new Size(this._el.offsetWidth, this._el.offsetHeight);
  }

  this._computeOffset = function () {
    var contentArea = this.getContentArea();
    var maxOffset = Size.subtract(contentArea, this._contentSize).scale(0.5);
    var offsetX = this._isCenteredX
      ? bound(this._offset.x, -maxOffset.width, maxOffset.width)
      : bound(this._offset.x, 0, 2 * maxOffset.width);

    var offsetY = this._isCenteredY
      ? bound(this._offset.y, -maxOffset.height, maxOffset.height)
      : bound(this._offset.y, 0, 2 * maxOffset.height);

    return new Point(offsetX, offsetY);
  }

  this.onLayoutChange = function () {
    // var top = this.hasClass('center-x') ? -this._height / 2 : y;
    // var left = x;
    // var fullWidth = this.contents.offsetWidth;
    // var fullHeight = this.contents.offsetHeight;

    var offset = this._computeOffset();
    $.style(this._corner, {
      left: (this._isCenteredX && -this._contentSize.width / 2 || 0) + offset.x + 'px',
      top: (this._isCenteredY && -this._contentSize.height / 2 || 0) + offset.y + 'px',

      // width: fullWidth + 'px',
      // height: fullHeight + 'px'
    });
  }
});
