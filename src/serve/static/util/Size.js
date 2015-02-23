// duck-type width
function hasWidth(obj) {
  return obj && typeof obj == 'object' && ('width' in obj);
}

var Size = Class(function () {
  this.init = function (width, height) {
    if (hasWidth(width)) {
      this.width = width.width;
      this.height = width.height;
    } else {
      this.width = width || 0;
      this.height = height || 0;
    }
  }

  this.rotate = function () {
    var h = this.height;
    this.height = this.width;
    this.width = h;
    return this;
  }

  this.getRatio = function () {
    return this.width / this.height;
  }

  this.add = function (w, h) {
    if (hasWidth(w)) {
      this.width += w.width;
      this.height += w.height;
    } else {
      this.width += w;
      this.height += h;
    }
  }

  this.scale = function (scale) {
    this.width *= scale;
    this.height *= scale;
    return this;
  }

  this.toString = function () { return this.width + 'x' + this.height; }
});

Size.subtract = function (a, b) {
  return new Size(a.width - b.width, a.height - b.height);
}

Size.add = function (a, b) {
  return new Size(a.width + b.width, a.height + b.height);
}

Size.scale = function (a, scale) {
  return new Size(a.width * scale, a.height * scale);
}

module.exports = Size;
