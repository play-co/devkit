/** @license
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

from util.browser import $;

import squill.Widget;
import std.uri;

import squill.Menu;
import squill.Drag;
import squill.Delegate;

import lib.PubSub;

import .util.Size as Size;
import .util.DeviceInfo as DeviceInfo;

import .components.SimulatorChrome as SimulatorChrome;
import .components.CenterLayout as CenterLayout;
import .components.Toolbar as Toolbar;
import .components.DeviceDialog as DeviceDialog;

import .components.renderers.facebook as facebookRenderer;

exports = Class(CenterLayout, function (supr) {

  this._def = {
    className: 'simulator no-transitions',
    children: [
      {type: Toolbar},
      {id: 'contents', children: [
        {id: 'background', type: SimulatorChrome},
        {id: 'splashImage'},
        {id: 'resizeHandle'},
        {id: 'build-spinner', children: [{id: 'spinner'}]}
      ]}
    ]
  };

  this.getContainer = function () { return this.frameWrapper || supr(this, 'getContainer'); };

  this.buildWidget = function () {
    supr(this, 'buildWidget', arguments);

    var opts = this._opts;

    this._device = opts.controller;
    this._port = opts.port || 9201;
    this._debug = true;
    this._isRetina = true;
    this._validOrientations = {};
    this._renderers = {
      'Facebook': facebookRenderer
    };

    this._manifest = this._device.getManifest();
    this._manifest.supportedOrientations.forEach(function (orientation) {
      this._validOrientations[orientation] = true;
    }, this);

    this.toolbar.setSimulator(this);
    this.toolbar.setValidOrientations(this._validOrientations);

    if (opts.simpleUI) {
      this.toolbar.hide();
    } else {
      this.toolbar.show();
    }

    this._rotation = opts.rotation || 0;
    this._backgroundProps = {};

    this._isDragEnabled = true;
    this._offsetX = opts.offsetX || 0;
    this._offsetY = opts.offsetY || 0;

    this._simulatorIndex = opts.index;
    this._name = opts.name || 'Simulator_' + this._simulatorIndex;

    this._mover = new squill.Drag({threshold: 0})
      .subscribe('DragStart', this, 'onDragStart')
      .subscribe('Drag', this, 'onDrag')
      .subscribe('DragStop', this, 'onDragStop');

    this._resizer = new squill.Drag({threshold: 0})
      .subscribe('DragStart', this, 'onResizeStart')
      .subscribe('Drag', this, 'onResize')
      .subscribe('DragStop', this, 'onResizeStop');

    this.background.on('Down', bind(this, '_startDrag'));

    $.onEvent(this._el, 'mousedown', this, function (evt) {
      if (evt.target == this._el) {
        var rootView = this._device.rootView;
        rootView.selectSimulator(evt);
      }
    });

    $.onEvent(this.resizeHandle, 'mousedown', this, function () {
        this._resizer.startDrag();
      });

    window.addEventListener('keydown', bind(this, this._rebuildKeyListener), true);
    window.addEventListener('message', bind(this, function (e) {
      if (e.data == 'devkit:reload') {
        this.reload();
      }

      if (e.data == 'devkit:toolbar:hide') {
        this.toolbar.hide();
      }

      if (e.data == 'devkit:toolbar:show') {
        this.toolbar.show();
      }
    }));

    // initialize muted state from localStorage
    this._isMuted = false;
    if (localStorage.getItem('settingMuted') === '1') {
      this._isMuted = true;
    }

    this.fromJSON(this._opts);
  };

  this._startDrag = function () {
    if (this._isDragEnabled) {
      this._mover.startDrag();
    }
  }

  this.setBuilding = function (isBuilding) {
    var spinner = this['build-spinner'];

    if (!isBuilding) {
      setTimeout(bind(this, function () {
        $.hide(this['build-spinner']);
        this.removeClass('building');
      }), 1000);
      spinner.style.opacity = 0;
    } else {
      this.showLoadingImage();
      spinner.style.display = 'flex';

      setTimeout(bind(this, function () {
        spinner.style.opacity = 0.5;
        this.addClass('building');
      }), 100);
    }
  }

  this._onMenuOpen = function (menu) {
    $.addClass(this.toolbar, 'menu-open');
    if (menu == this.overflowMenu) {
      var rootView = this._device.rootView;
      rootView.getSimulatorButtons().forEach(function (button) {
        this.overflowMenu.addWidget(button);
      }, this);
    }
  }

  this.setConn = function (conn) {
    if (this._client) {
      this._client.end();
    }

    var client = conn.getClient('simulator');
    this._client = client;

    // restore mute state when client connects (if necessary)
    if (this._isMuted) {
      this.setMuted(true);
    }

    client.onEvent('HIDE_LOADING_IMAGE', bind(this, 'hideLoadingImage'));
    this._sendEvent(this._isPaused ? 'PAUSE' : 'RESUME');

    if (!this._device.isLocal()) {
      if (!this._frame) {
        this._frame = $({
          before: this.splashImage,
          tag: 'img',
          id: 'frame',
          className: 'frame'
        });
      }

      this._remoteScreenshot();
    }
  }

  this._remoteScreenshot = function () {
    this._sendRequest('SCREENSHOT', bind(this, function (err, res) {
      if (!err) {
        this._frame.src = res.canvasImg;
        this._frame.style.width = res.width + 'px';
        this._frame.style.height = res.height + 'px';
      }
    }));
  }

  this._sendEvent = function (name, args) {
    if (!this._device.isLocal()) {
      this._device.activate();
    }

    if (this._client) {
      this._client.sendEvent(name, args);
    }
  }

  this._sendRequest = function (name, /* optional*/ args, cb) {
    if (!this._device.isLocal()) {
      this._device.activate();
    }

    if (this._client) {
      this._client.sendRequest(name, args, cb);
    }
  }

  this.canRotate = function () { return this._canRotate; }

  this.showLoadingImage = function () {
    if (this._deviceInfo.isNativeTarget()) {
      this.splashImage.style.display = 'block';
      this.splashImage.style.opacity = 1;
      this.splashImage.style.backgroundImage = 'url(' + this.getLoadingImageURL() + ')';
    }
  }

  this.hideLoadingImage = function () {
    this.splashImage.style.opacity = 0;
    setTimeout(bind(this, function () {
      this.splashImage.style.display = 'none';
    }), 500);
  };

  this.setRetina = function (isRetina) {
    this._isRetina = isRetina;
    this.update();
    this.refresh();
  }

  this.getFrame = function () { return this._frame; };

  this.editDevice = function () {
    var dialog = new DeviceDialog({
        simulator: this,
        loadingImage: this.getLoadingImageURL()
      })
      .on('select', bind(this, function (deviceType) {
        this.setType(deviceType);
        dialog.hide();
      }))
      .show();
  }

  this.toggleDragEnabled = function () {
    this.setDragEnabled(!this._isDragEnabled);
  }

  this.setDragEnabled = function (isDragEnabled) {
    this._isDragEnabled = !!isDragEnabled;
    this.emit('change:drag');
  };

  this.isDragEnabled = function () {
    return this._isDragEnabled;
  }

  this.isMuted = function () { return this._isMuted; };
  this.toggleMuted = function () { this.setMuted(!this._isMuted); }
  this.setMuted = function (isMuted) {
    var wasMuted = this._isMuted;
    this._isMuted = isMuted;
    if (isMuted) {
      localStorage.setItem('settingMuted', '1');
    } else {
      localStorage.setItem('settingMuted', '0');
    }

    this._sendEvent('MUTE', {shouldMute: isMuted});
    this.emit('change:mute', isMuted);
    this.emit('change');
  }

  this.getLoadingImageURL = function () {
    var splash;
    if (this._rotation % 2 == 0) {
      //even amounts of rotations mean portrait
      splash = "portrait1136";
    } else {
      //oods mean landscape
      splash = "landscape1536";
    }
    return new std.uri(this._deviceInfo.getTarget() + "/splash/" + splash).toString();
  };

  this._rebuildKeyListener = function (e) {
    //this used to be cmd-shift-r, which is reload without cache.
    // now ctrl-r
    // if (e.ctrlKey && e.which == 82) {
    //   this.rebuild();
    //   e.preventDefault();
    //   return false;
  };

  this.setTransitionsEnabled = function (isEnabled) {
    if (isEnabled) {
      $.removeClass(this._el, 'no-transitions');
    } else {
      $.addClass(this._el, 'no-transitions');
    }
  }

  this.setType = function (opts) {
    this.setTransitionsEnabled(false);

    this._deviceName = opts.id;
    this._deviceInfo = new DeviceInfo(opts);
    var info = this._deviceInfo;

    // reset any custom resize
    this._customSize = null;

    function logInfo(key, value) {
      console.log(new Array(20 - key.length + 1).join(' ')
          + '%c' + key + ':%c ' + value,
          'color: green',
          'font-weight: bold; color: blue');
    }

    logInfo('type', info.name || opts.id);
    logInfo('build-target', info.getTarget());
    logInfo('device-id', this._device.getId());
    logInfo('size', info.getScreenSize());
    logInfo('pixel-ratio', info.getDevicePixelRatio());

    this.update();

    setTimeout(bind(this, 'setTransitionsEnabled', true), 1000);

    if (this._frame) {
      this.refresh();
    }

    this.emit('change:type')
  };

  this.inspect = function () {
    var device = this._device;
    var controller = device.controller;
    var inspector = controller.view.getViewInspector();
    inspector.setDevice(device);
    inspector.toggle();
  }

  this.rotate = function () {

    var isLandscape = (this._rotation + 1) % 2 == 1;
    if (!this._deviceInfo.canRotate()
          || isLandscape && !('landscape' in this._validOrientations)
          || !isLandscape && !('portrait' in this._validOrientations))
    {
      return;
    }

    ++this._rotation;

    this.setTransitionsEnabled(true);
    this.toolbar.hide();

    this.contents.style.WebkitTransform = 'rotate(' + (this._rotation % 2 ? 90 : -90) + 'deg)';

    var onRotate = bind(this, function () {
      this.contents.removeEventListener("webkitTransitionEnd", onRotate);
      this.setTransitionsEnabled(false);

      this.contents.style.WebkitTransform = '';
      this.toolbar.show();
      this.update();

      setTimeout(bind(this, 'setTransitionsEnabled', true), 100);
    });

    this.contents.addEventListener("webkitTransitionEnd", onRotate);

    this.emit('change');
  };

  this._zoom = 0;

  this.getZoom = function () { return this._zoom; }
  this.setZoom = function (zoom) {
    this._zoom = zoom || 1;
    this.update();
    this.emit('change:zoom', this._zoom);
    this.emit('change');
  }

  this.loadURL = function (url) {
    this.showLoadingImage();

    if (this._frame) {
      $.remove(this._frame);
    }

    this._frame = $({
      before: this.splashImage,
      tag: 'iframe',
      id: 'frame',
      attrs: {
        name: this._name
      },
      src: url,
      className: 'frame'
    });

    this.update();
  }

  this.getDevicePixelRatio = function () {
    return this._deviceInfo.getDevicePixelRatio();
  }

  function sizeToCSS(size, scale) {
    scale = scale || 1;
    return {
      width: size && size.width ? size.width * scale + 'px' : '100%',
      height: size && size.height ? size.height * scale + 'px' : '100%'
    };
  }

  this._setViewport = function (size, viewport, scale) {
    $.style(this.contents, sizeToCSS(size, scale));
    // $.style(this.frameWrapper, sizeToCSS(viewport, scale));
    if (this._frame) {
      var style;

      if (this._isRetina) {
        style = merge(sizeToCSS(viewport), {
          WebkitTransform: 'scale(' + scale + ')',
          WebkitTransformOrigin: '0px 0px'
        });
      } else {
        style = merge(sizeToCSS(viewport, scale), {
          WebkitTransform: ''
        });
      }

      $.style(this._frame, style);
    }
  }

  this._computeRotation = function () {
    var isPortaitValid = ('portrait' in this._validOrientations);
    var isLandscapeValid = ('landscape' in this._validOrientations);
    var rotation = this._rotation;
    if (!this._deviceInfo.canRotate()) {
      rotation = 0;
    } else if (isPortaitValid && !isLandscapeValid) {
      rotation = 0;
    } else if (isLandscapeValid && !isPortaitValid) {
      rotation = 1;
    }
    return rotation;
  }

  this.update = function () {
    var info = this._deviceInfo;
    if (!info) { return; }

    var start = Date.now();

    var parent = this._widgetParent;
    this._rotation = this._computeRotation();
    var size = this._customSize || info.getScreenSize();
    if (this._rotation % 2 == 1) {
      size.rotate();
    }

    var dpr = this.getDevicePixelRatio();
    var zoom = this._zoom;
    if (!zoom) {
      // check for auto-zoom out to fit window
      var padding = 10;
      var winSize = new Size(window.innerWidth - padding * 2, window.innerHeight - padding * 2);
      var targetSize = info.getChromeSize(this._rotation % 2 == 1);
      if (winSize.getRatio() < targetSize.getRatio()) {
        zoom = winSize.width / targetSize.width;
      } else {
        zoom = winSize.height / targetSize.height;
      }
      zoom = Math.min(1, zoom * dpr);
    }

    var scale = this._scale = 1 / dpr * zoom;
    this._width = size.width * scale || 0;
    this._height = size.height * scale || 0;

    // override the default full-screen with a custom screen size
    // Note: custom size with viewport != screen size is not supported
    var viewportSize = this._customSize ? size : info.getViewportSize(this._rotation);

    this.contents.style.cssText = '';
    $.style(this.contents, info.getCustomStyle());

    this._setViewport(size, viewportSize, scale);

    var renderer = this._renderers[info.getName()];
    if (this._customRenderer && (!renderer || renderer != this._customRenderer)) {
      this._customRenderer.destroy(this);
      this._customRenderer = null;
    }

    if (renderer && renderer != this._customRenderer) {
      this._customRenderer = renderer;
      renderer.create(this);
    }

    this.setCenterX(info.centerSimulatorX());
    this.setCenterY(info.centerSimulatorY());

    this.background.update(merge({
      scale: scale,
      rotation: this._rotation,
      screenSize: size,
    }, info.getBackground(this._rotation)));

    this.setContentSize(size.width * scale, size.height * scale);

    this.toolbar.setOffset(this.getContentArea(), this.background.getOffset());

    console.log("UPDATE", Date.now() - start);
    this.emit('change');
  };

  this.onResizeStart = function () {
    this.setTransitionsEnabled(false);
    this.toggleClass('resize', true);
  }

  this.onResizeStop = function () {
    this.computeOffset();
    this.toggleClass('resize', false);
    this.setTransitionsEnabled(true);
  }

  this.onDragStop = function () {
    this.computeOffset();
    this.setTransitionsEnabled(true);
  };

  this.onDragStart = function () {
    this.setTransitionsEnabled(false);
  };

  this.onDrag = function (dragEvt, moveEvt, delta) {
    this.addOffset(delta.x, delta.y);
  };

  this.onResize = function (dragEvt, moveEvt, delta) {
    if (!this._customSize) {
      this._customSize = this._deviceInfo.getScreenSize();
    }

    this._customSize.add(delta.x * 2, delta.y * 2);

    this.update();
  }

  this.refresh = function () {
    if (this._frame) {
      this._frame.src = this._frame.src;
    }
  }

  this.reload = function () {
    if (this._device.isLocal()) {
      this._device.getLocalController().rebuild();
    } else {
      this._sendEvent('RELOAD');
    }
  }

  this.takeScreenshot = function () {
    if (this._device.isLocal()) {
      var win = window.open('', '', 'width=' + (this._screenWidth + 2) + ',height=' + (this._screenHeight + 2));
      this._client.sendRequest('SCREENSHOT', function (err, res) {
        var canvas = res.base64Image;
        var doc = win.document;
        var now = new Date();
        var min = ('00' + now.getMinutes()).substr(-2);
        var time = now.getHours() + ':' + min;
        var date = (1 + now.getMonth()) + '/' + now.getDate();

        doc.open();
        doc.write('<html><title>Screenshot ' + date + ' ' + time + '</title></head>'
          + '<body style="margin:0px;padding:0px;background-color:#000;">'
          + '<img src="' + canvas + '">'
          + '</body></html>');
        doc.close();
      });
    } else {
      this._remoteScreenshot();
    }
  }

  this.nativeBackButton = function () {
    this._sendEvent('BACK_BUTTON');
  }

  this.nativeHomeButton = function () {
    this._sendEvent('HOME_BUTTON');

    this._isHomeScreen = !this._isHomeScreen;
    this.emit('change:home', this._isHomeScreen);
  }

  this.isHomeScreen = function () {
    return this._isHomeScreen;
  }

  this.isDebugMode = function () { return this._isDebugMode; }
  this.toggleDebugMode = function () { this.setDebugMode(!this._isDebugMode); }
  this.setDebugMode = function (isDebugMode) {
    this._isDebugMode = isDebugMode;
    this.rebuild();
  }

  // this.delegate = new squill.Delegate(function(on) {
  //   on.btnOverflow = function () {
  //     this.overflowMenu.toggle();
  //   }
  // });

  this.step = function () {
    this.setPaused(true);
    this._sendEvent('STEP');
  }

  this.togglePaused = function () { this.setPaused(!this._isPaused); }
  this.isPaused = function () { return this._isPaused; }
  this.setPaused = function (isPaused) {
    var isPaused = !!isPaused;
    if (this._isPaused == isPaused) { return; }
    this._isPaused = isPaused;

    this._sendEvent(isPaused ? 'PAUSE' : 'RESUME');
    this.emit('change:pause', isPaused);
  }

  function bound(value, min, max) {
    return value < min ? min : value > max ? max : value;
  }

  this.toJSON = function () {
    var data = {
      type: this._deviceName
    };

    if (this._isMuted) {
      data.muted = true;
    }

    if (this._rotation % 2) {
      data.rotated = true;
    }

    if (!this._isDragEnabled) {
      data.draggable = false;
    }

    if (this._zoom !== 0 && this._zoom !== 1) {
      data.zoom = this._zoom;
    }

    return data;
  }

  this.fromJSON = function (data) {
    if (data.type) {
      this._device.setType(data.type);
    }

    if (data.muted) {
      this.setMuted(true);
    }

    if (data.draggable === false) {
      this.setDragEnabled(false);
    }

    if (data.rotated) {
      this._rotation = 1;
      this.update();
    }

    if (data.zoom) {
      this.setZoom(data.zoom);
    }
  }
});
