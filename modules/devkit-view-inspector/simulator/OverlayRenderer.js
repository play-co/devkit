/**
 * @license
 * This file is part of the Game Closure SDK.
 *
 * The Game Closure SDK is free software: you can redistribute it and/or modify
 * it under the terms of the Mozilla Public License v. 2.0 as published by Mozilla.

 * The Game Closure SDK is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * Mozilla Public License v. 2.0 for more details.

 * You should have received a copy of the Mozilla Public License v. 2.0
 * along with the Game Closure SDK.  If not, see <http://mozilla.org/MPL/2.0/>.
 */

import device;
import devkit.debugging;

module.exports = Class(function () {

  // store the views we need to render
  this._highlightViewUID = null;
  this.setHighlight = function (uid) { this._highlightViewUID = uid; };

  this._selectedViewUID = null;
  this.setSelected = function (uid) { this._selectedViewUID = uid; };

  var tick = 0;
  var maxColor = 255;
  var minColor = 100;
  var _ctx;
  var _appCanvas;

  // render the highlighted view
  var _now = Date.now()
  function renderHighlight (pos, ctx) {
    if (!ctx) { return; }
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(pos.r);

    // pulsate the blue
    tick += -(_now - (_now = Date.now()));

    var weight = (Math.sin(2 * Math.PI * tick / 1000) + 1) / 2;
    var val = (weight * (maxColor - minColor)) + minColor | 0;


    var color = '0,' + (val * 0.7 | 0) + ',' + (val | 0);

    ctx.strokeStyle = 'rgba(' + color + ', 0.7)';
    ctx.strokeRect(0, 0, pos.width, pos.height);
    ctx.fillStyle = 'rgba(' + color + ', 0.6)';
    ctx.fillRect(0, 0, pos.width, pos.height);

    //draw the cross hair
    //ctx.fillStyle = 'rgb(' + val + ',' + val + ',' + val +')';
    var opacity = weight * (1 - 0.4) + 0.4;
    ctx.fillStyle = 'rgba(255,255,255,' + (opacity.toFixed(2)) +')';
    ctx.translate(pos.anchorX, pos.anchorY);
    ctx.rotate(tick / 500);

    ctx.fillRect(-0.5, -7, 1, 14);
    ctx.fillRect(-7, -0.5, 14, 1);

    ctx.restore();
  }

  function renderSelected (pos, ctx) {
    if (!ctx) { return; }

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(pos.r);
    ctx.strokeStyle = "red";
    ctx.lineWidth = 1;
    ctx.strokeRect(-0.5, -0.5, pos.width + 1, pos.height + 1);
    ctx.restore();
  }

  if (!device.isMobile) {
    var element = document.createElement('x');
    var documentElement = document.documentElement;
    var getComputedStyle = window.getComputedStyle;
    var supportsPointerEvents = false;
    if (element && ('pointerEvents' in element.style)) {
      element.style.pointerEvents = 'auto';
      element.style.pointerEvents = 'x';
      documentElement.appendChild(element);
      supportsPointerEvents = getComputedStyle && getComputedStyle(element, '').pointerEvents === 'auto';
      documentElement.removeChild(element);
    }

    if (device.isSimulator && document.body && document.body.appendChild && supportsPointerEvents) {
      var canvas = new (device.get('Canvas'))();
      canvas.style.cssText = 'position: absolute; left: 0; top: 0; z-index: 1000; pointer-events: none;';
      document.body.appendChild(canvas);

      _ctx = canvas.getContext('2d');
    }
  }

  // used to drive renderer separately when app is paused
  this.startTick = function () {
    this.stopTick();
    this._tick = setInterval(bind(this, 'render', _ctx), 1000 / 30);
  };

  // used to stop renderer's timer when app is unpaused
  this.stopTick = function () {
    if (this._tick) {
      clearInterval(this._tick);
    }
  };

  this.setEnabled = function (isEnabled) {
    this._isEnabled = isEnabled;
    if (_ctx) {
      _ctx.clear();
    }
  };

  this.render = function (ctx) {
    if (!ctx) { return; }
    // if (!this._isEnabled) { return; }

    if (!_appCanvas) {
      _appCanvas = document.getElementById("timestep_onscreen_canvas");
    }

    // on simulated devices, we have our own canvas
    // so size it to fit the screen (clearing it too)
    if (_ctx) {
      ctx = _ctx;
      if (_appCanvas) {
        ctx.canvas.width = _appCanvas.width;
        ctx.canvas.height = _appCanvas.height;
        ctx.canvas.style.width = _appCanvas.style.width;
        ctx.canvas.style.height = _appCanvas.style.height;
      }
    }

    // render highlighted views
    var view, pos;
    if (this._highlightViewUID !== null) {
      view = devkit.debugging.getViewById(this._highlightViewUID);
      pos = view && view.getPosition();
      if (pos) {
        renderHighlight(pos, ctx);
      }
    }

    // render selected views
    if (this._selectedViewUID !== null) {
      view = devkit.debugging.getViewById(this._selectedViewUID);
      pos = view && view.getPosition();
      if (pos) {
        renderSelected(pos, ctx);
      }
    }
  };
});
