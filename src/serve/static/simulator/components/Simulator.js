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

/**
 * Note that we're in the browser runtime here, so we can assume
 * `document` and `window` exist and that util.browser and squill
 * will both import successfully.  This would not be the case in,
 * for example, the iOS runtime.
 */

from util.browser import $;

import squill.Widget;
import std.uri;

import squill.Menu;
import squill.Drag;
import squill.Delegate;

import lib.PubSub;

import ..util.resolutions as resolutions;

// runs a (ctx, cb) or just a plain (cb) on the next frame.  Use instead of
// setTimeout(0) to guarantee that the layouting in the browser is complete
// and css changes are applied (setTimeout(0) does not make this gaurantee)
var onNextFrame = (function () {
  var reqAnim = window.requestAnimationFrame;
  var cancelAnim = window.cancelAnimationFrame;
  var prefixes = ['', 'webkit', 'moz', 'o', 'ms'];
  for (var i = 0; i < prefixes.length && !reqAnim; ++i) {
    reqAnim = window[prefixes[i] + 'RequestAnimationFrame'];
    cancelAnim = window[prefixes[i] + 'CancelAnimationFrame'] || window[prefixes[i] + 'CancelRequestAnimationFrame'];
  }

  return function (ctx, cb) {
    if (arguments.length == 1) {
      cb = arguments[0];
    } else {
      cb = bind.apply(GLOBAL, arguments);
    }

    reqAnim(cb);
  };
})();


/*


    util.ajax.get({url: '/apps/' + appID + '/files/manifest.json', type: 'json'}, f.slot());
    document.title = manifest.title;
    document.querySelector('link[rel=icon]').setAttribute('href', '/apps/' + appID + '/files/' + getIcon(manifest));

function getIcon(manifest) {
  var icon;
  if (manifest) {
    if (manifest.icon) {
      icon = manifest.icon;
    }

    if (!icon && manifest.icons) {
      var min = Infinity;
      Object.keys(manifest.icons).forEach(function (size) {
        size = parseInt(size);
        if (size && size < min) {
          min = size;
        }
      });
      icon = manifest.icons[min];
    }
  }

  return icon
    || manifest.android && getIcon(manifest.android)
    || manifest.ios && getIcon(manifest.ios) || '../../../images/defaultIcon.png';
}


*/
exports = Class(squill.Widget, function (supr) {

  function createButton(opts) {
    return {
      id: opts.id,
      attrs: {tooltip: opts.tooltip},
      className: opts.tooltip ? 'withTooltip' : '',
      type: 'button',
      text: opts.text,
      children: [
        opts.icon && {tag: 'i', className: 'glyphicon glyphicon-' + opts.icon}
      ]
    };
  }

  this._def = {
    className: 'simulator no-transitions',
    children: [
      {id: 'center', children: [
        {id: 'toolbar', children: [
          {id: 'buttonContainer', children: [
            createButton({id: 'btnSimulators', tooltip: 'change the device type', icon: 'phone'}),
            createButton({id: 'btnReload', tooltip: 'reload the game', icon: 'refresh'}),
            createButton({id: 'btnInspect', tooltip: 'inspect the view hierarchy', icon: 'search'}),
            createButton({id: 'btnDrag', tooltip: 'lock simulator position', icon: 'move'}),
            createButton({id: 'btnRotate', tooltip: 'rotate the device', icon: 'repeat'}),
            createButton({id: 'btnNativeBack', tooltip: 'back button (hardware)', icon: 'chevron-left'}),
            createButton({id: 'btnNativeHome', tooltip: 'home button (hardware)', icon: 'home'}),
            createButton({id: 'btnScreenShot', tooltip: 'take a screenshot', icon: 'picture'}),
            createButton({id: 'btnMute', tooltip: 'mute all sounds', icon: 'volume-up'}),
            createButton({id: 'btnPause', tooltip: 'pause game timer', icon: 'pause'}),
            createButton({id: 'btnStep', tooltip: 'step forward 1 frame', icon: 'step-forward'}),
            createButton({id: 'btnOverflow', tooltip: 'more options', icon: 'chevron-down'}),
            {id: 'simulatorMenu', type: 'menu', className: 'list', children: []},
            {id: 'overflowMenu', type: 'menu', children: [
                {id: 'btnDebug', text: 'switch to release build', type: 'button'},
                {id: 'btnAddSimulator', text: 'add simulator', type: 'button'},
              ]}
          ]}
        ]},
        {id: 'contents', children: [
          {id: 'background', tag: 'canvas'},
          {
            id: 'frameWrapper',
            children: [
              {id: 'splashImage'},
              {id: 'resizeHandle'},
              {id: 'build-spinner', children: [{id: 'spinner'}]}
            ]
          }
        ]}
      ]}
    ]
  };

  this.getContainer = function () { return this.frameWrapper || supr(this, 'getContainer'); };

  this.buildWidget = function () {
    var opts = this._opts;

    this._device = opts.controller;
    this._simulatorMenuItems = [];
    this._port = opts.port || 9201;
    this._debug = true;

    this._rotation = opts.rotation || 0;
    this._backgroundProps = {};

    this._isDragEnabled = true;
    this._offsetX = opts.offsetX || 0;
    this._offsetY = opts.offsetY || 0;

    this._simulatorIndex = opts.index;
    this._name = opts.name || 'Simulator_' + this._simulatorIndex;

    this._mover = new squill.Drag()
      .subscribe('DragStart', this, 'onDragStart')
      .subscribe('Drag', this, 'onDrag')
      .subscribe('DragStop', this, 'onDragStop');

    this._resizer = new squill.Drag()
      .subscribe('DragStart', this, 'onResizeStart')
      .subscribe('Drag', this, 'onResize')
      .subscribe('DragStop', this, 'onResizeStop');

    $.onEvent(this.contents, 'mousedown', this, function () {
        if (this._isDragEnabled) {
          this._mover.startDrag();
        }
      });

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

    this.forEachDescend(function (widget) {
      if (widget instanceof squill.Menu) {
        widget.on('open', bind(this, '_onMenuOpen', widget));
        widget.on('close', bind(this, '_onMenuClose', widget));
      }
    }, this);

    // initialize muted state from localStorage
    this._isMuted = false;
    if (localStorage.getItem('settingMuted') === '1') {
      this._isMuted = true;
    }

    this.toolbar.addEventListener("webkitTransitionEnd", bind(this, function () {
      $.removeClass(this.toolbar, 'transition');
    }));

    this.fromJSON(this._opts);
  };

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

  this._onMenuClose = function (menu) {
    $.removeClass(this.toolbar, 'menu-open');
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

    // toggle the mute button and mute the app if necessary
    if (this._isMuted) {
      this._isMuted = false;
      this.delegate.call(this, 'btnMute');
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
    if (/^native/.test(this._params.target)) {
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

  this.getFrame = function () { return this._frame; };

  this.setDragEnabled = function (isDragEnabled) { this._isDragEnabled = !!isDragEnabled; };

  this.isMuted = function () { return this._isMuted; };

  this.setMuted = function (isMuted) {
    var wasMuted = this._isMuted;
    this._isMuted = isMuted;
    if (isMuted) {
      localStorage.setItem('settingMuted', '1');
    } else {
      localStorage.setItem('settingMuted', '0');
    }

    this._sendEvent('MUTE', {shouldMute: isMuted});
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
    return new std.uri(this._params.target + "/splash/" + splash).toString();
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

  this.setType = function (deviceName, opts) {
    this.setTransitionsEnabled(false);

    this._deviceName = deviceName;

    this._params = merge({}, opts, {
      xChromeOffset: 0,
      yChromeOffset: 0
    });

    // reset any custom resize
    this._customSize = {};

    function logInfo(key, value) {
      console.log(new Array(20 - key.length + 1).join(' ')
          + '%c' + key + ':%c ' + value,
          'color: green',
          'font-weight: bold; color: blue');
    }

    logInfo('type', this._params.name || deviceName);
    logInfo('build-target', this._params.target);
    logInfo('device-id', this._device.getId());
    logInfo('width', this._params.width);
    logInfo('height', this._params.height);
    logInfo('pixel-ratio', this._params.devicePixelRatio);

    this.update();
    this.toolbar.style.opacity = 1;
    setTimeout(bind(this, 'setTransitionsEnabled', true), 1000);
  };

  var DeviceCell = Class(squill.Widget, function () {

    var FIT_TO = 50;

    this._def = {
      className: 'device',
      children: [
        {id: 'previewBg', children: [
          {id: 'preview'}
        ]},
        {id: 'label', type: 'label'},
        {id: 'resolution', type: 'label'}
      ]
    };

    function getScale(w, h) {
      var ratio = w / h;
      return FIT_TO / (ratio > 1 ? w : h)
    }

    this.buildWidget = function () {
      var def = this._opts.def;
      var w = def.width || 1;
      var h = def.height || 1;

      this.label.setText(def.name);
      if (def.width && def.height) {
        this.resolution.setText(w + 'x' + h);
      }

      this.initMouseEvents();

      var setBg = false;
      var scale = getScale(w, h);
      if (def.background) {
        var bg = def.background;
        if (isArray(bg)) {
          bg = bg[0];
        }

        if (bg.width && bg.height) {
          setBg = true;

          var bgScale = getScale(bg.width, bg.height);
          if (bgScale < scale) {
            scale = bgScale;
          }
        }
      }

      this.preview.style.width = w * scale + 'px';
      this.preview.style.height = h * scale + 'px';
      this.preview.style.backgroundImage = 'url(' + this._opts.previewImage + ')';

      if (setBg) {
        this.previewBg.style.cssText =
          'background-image: url(images/' + bg.img + ');'
          + 'width:' + bg.width * scale + 'px;'
          + 'min-height:' + bg.height * scale + 'px;'
          + 'padding:' + bg.offsetY * scale + 'px 0 0 ' + bg.offsetX * scale + 'px;'
      }
    }
  });

  this.refreshSimulators = function () {
    this._simulatorMenuItems.forEach(function (item) { item.remove(); });
    var items = this._simulatorMenuItems = [];

    var previewImage = this.getLoadingImageURL();
    for (var type in resolutions.defaults) {
      items.push(new DeviceCell({
          parent: this.simulatorMenu,
          type: type,
          def: resolutions.defaults[type],
          previewImage: previewImage
        }).on('Select', bind(this, function (type) {
          if (this._createNewSimulator) {

          } else {
            this._device.setType(type);
          }
          this.simulatorMenu.hide();

          this.emit('change');
        }, type)));
    }
  }

  this.inspect = function () {
    var device = this._device;
    var controller = device.controller;
    var inspector = controller.view.getViewInspector();
    inspector.setDevice(device);
    inspector.toggle();
  }

  this.rotate = function () {

    if (this._canRotate) {
      ++this._rotation;

      this.setTransitionsEnabled(true);
      this.hideToolbar();
      this.contents.style.WebkitTransform = 'rotate(' + (this._rotation % 2 ? 90 : -90) + 'deg)';

      var onRotate = bind(this, function () {
        this.contents.removeEventListener("webkitTransitionEnd", onRotate);
        this.setTransitionsEnabled(false);

        this.contents.style.WebkitTransform = '';
        this.showToolbar();
        this.update();

        setTimeout(bind(this, 'setTransitionsEnabled', true), 100);
      });

      this.contents.addEventListener("webkitTransitionEnd", onRotate);
    }

    return this._rotation;
  };

  this.hideToolbar = function () {
    $.addClass(this.toolbar, 'transition');
    onNextFrame(this, function () {
      this.toolbar.style.opacity = 0;
    });
  }

  this.showToolbar = function () {
    $.addClass(this.toolbar, 'transition');
    onNextFrame(this, function () {
      this.toolbar.style.opacity = 1;
    });
  }

  this._zoom = 0;

  this.setZoom = function (zoom) {
    this._zoom = zoom || 1;
    this.update();
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
    return this._params.devicePixelRatio || 1;
  }

  this._setScreenSize = function (width, height) {
    if (this._frame) {
      var s = this._frame.style;
      s.width = width + 'px';
      s.height = height + 'px';
      this._screenWidth = width;
      this._screenHeight = height;
    }
  }

  this.update = function () {
    var params = this._params;
    if (!params) { return; }

    var parent = this._widgetParent;
    this._canRotate = 'canRotate' in params ? !!params.canRotate : true;
    this._isDragEnabled = 'canDrag' in params ? !!params.canDrag : true;

    if (!params.canRotate) {
      this._rotation = 0;
    }

    // copy background properties from params to our local background properties
    var bgProps = this._backgroundProps;
    var props = params.background;
    var rotation = this._rotation;
    if (props && params.canRotate && isArray(props)) {
      props = props[this._rotation % params.background.length];
      bgProps.isRotated = true;
      rotation = 0;
    } else {
      bgProps.isRotated = false;
    }

    if (props) {
      if (rotation % 2) {
        bgProps.width = props.height;
        bgProps.height = props.width;
        bgProps.offsetX = props.height - params.height - props.offsetY;
        bgProps.offsetY = props.offsetX;
      } else {
        bgProps.width = props.width;
        bgProps.height = props.height;
        bgProps.offsetX = props.offsetX;
        bgProps.offsetY = props.offsetY;
      }
    } else {
      bgProps.offsetX = 0;
      bgProps.offsetY = 0;
      bgProps.height = 0;
      bgProps.width = 0;
      // $.style(this.contents, {width: '100%', height: '100%'});
    }

    var width = this._customSize.width || params.width;
    var height = this._customSize.height || params.height;
    if (params.canRotate && this._rotation % 2 == 1) {
      var h = width;
      width = height;
      height = h;
    }

    var zoom = this._zoom;
    if (!zoom) {
      var winWidth = window.innerWidth;
      var winHeight = window.innerHeight;
      var targetWidth = bgProps.width || width;
      var targetHeight = bgProps.height || height;
      var ratio = winWidth / winHeight;
      var targetRatio = targetWidth / targetHeight;
      if (ratio < targetRatio) {
        zoom = winWidth / targetWidth;
      } else {
        zoom = winHeight / targetHeight;
      }
      zoom = Math.min(1, zoom * this.getDevicePixelRatio());
    }

    var scale = this._scale = 1 / this.getDevicePixelRatio() * zoom;
    var cssScale = 'scale(' + scale + ')';

    this._width = width * scale || 0;
    this._height = height * scale || 0;

    // override the default full-screen with a custom screen size
    var screenSize = params.screenSize;
    if (isArray(params.screenSize)) {
      screenSize = params.screenSize[this._rotation % params.screenSize.length];
    } else {
      screenSize = params.screenSize;
    }

    if (this._frame) {
      var s = this._frame.style;
      s.WebkitTransform = cssScale;
      s.WebkitTransformOrigin = "0px 0px";
    }

    var s = this._el.style;
    s.paddingRight = s.paddingLeft = this._width / 2 + 'px';
    s.paddingTop = s.paddingBottom = this._height / 2 + 'px';

    var frameStyle = this.frameWrapper.style;
    if (screenSize) {
      this._setScreenSize(screenSize.width, screenSize.height);
      frameStyle.width = screenSize.width * scale + 'px';
      frameStyle.height = screenSize.height * scale + 'px';
    } else if (width && height) {
      this._setScreenSize(width, height);
      frameStyle.width = width * scale + 'px';
      frameStyle.height = height * scale + 'px';
    } else {
      frameStyle.width = '100%';
      frameStyle.height = '100%';
      this._setScreenSize(width, height);
    }

    var parentNode = this.getElement().parentNode;
    switch (params.name) {
      case 'Facebook':
        params.dontCenterY = true;

        if (!this._facebookBar) {
          var bar = this._facebookBar = $.create({
            parent: parent,
            style: {
              position: 'absolute',
              top: '0px',
              left: '0px',
              right: '0px',
              bottom: '0px',
              zIndex: 0,
              minWidth: '1052px',
              background: 'url("images/facebook-header-center.png") repeat-x'
            }
          });

          bar.innerHTML = "<div style='position:absolute;top:0px;left:0px;width:636px;height:44px;background:url(images/facebook-header-left.png)'></div>"
            + "<div style='position:absolute;top:0px;right:0px;width:296px;height:44px;background:url(images/facebook-header-right.png)'></div>"
            + "<div style=\"position:absolute;top:13px;left:56px;width:550px;height:20px;cursor:default;color:#141823; white-space: nowrap; overflow: hidden; font: 14px 'Helvetica Neue', Helvetica, Arial, 'lucida grande', tahoma, verdana, arial, sans-serif; font-weight: bold; \"></div>";

          // $.setText(bar.lastChild, this._manifest.title);

          var rightBar = $.create({
            parent: bar,
            style: {
              position: 'absolute',
              top: '44px',
              bottom: '0px',
              right: '10px',
              width: '244px',
              backgroundColor: '#FAFAF9',
              borderColor: '#B3B3B3',
              borderWidth: '0px 1px',
              borderStyle: 'solid',
              zIndex: 1
            }
          });
        }

        $.style(parentNode, {
          background: '#FFF'
        });
        break;
      default:
        if (this._facebookBar) {
          $.remove(this._facebookBar);
          $.style(parentNode, {
            background: '#000'
          });

          this._facebookBar = null;
        }
        break;
    }

    if (props) {
      var bgWidth = bgProps.width * scale;
      var bgHeight = bgProps.height * scale;
      this.contents.style.cssText = '';

      $.style(this.contents, {width: bgWidth + 'px', height: bgHeight + 'px'});

      var url;
      if (props.img) {
        url = 'images/' + props.img;
      }

      if (bgWidth != this.background.width || bgHeight != this.background.height) {
        this.background.width = bgWidth;
        this.background.height = bgHeight;
        this.updateBackground(url);
      } else if (this._backgroundURL != url) {
        this.updateBackground(url);
      }

      if (props.style) { $.style(this.contents, props.style); }
    } else {
      this.updateBackground();
    }

    this.onViewportChange();
  };

  this.updateBackground = function (url) {
    if (url != this._backgroundURL) {
      this._backgroundURL = url;
      if (url) {
        var img = this._backgroundImg = new Image();
        img.onload = bind(this, 'updateBackground', url);
        img.src = url;
        return;
      } else {
        this._backgroundImg = null;
      }
    }

    var ctx = this.background.getContext('2d');
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.save();

    if (this._backgroundImg) {
      if (this._backgroundProps.isRotated || this._rotation % 2 == 0) {
        ctx.drawImage(this._backgroundImg, 0, 0, ctx.canvas.width, ctx.canvas.height);
      } else {
        switch (this._rotation % 4) {
          case 3:
          case 1:
            ctx.rotate(90 * Math.PI / 180);
            ctx.translate(0, -ctx.canvas.width);
            ctx.drawImage(this._backgroundImg, 0, 0, ctx.canvas.height, ctx.canvas.width);
            break;
        }
      }
    }

    ctx.restore();
  }

  this.onResizeStart =
  this.onDragStart = function () {
    this.setTransitionsEnabled(false);
  };

  this.onDrag = function (dragEvt, moveEvt, delta) {
    this._offsetX += delta.x;
    this._offsetY += delta.y;
    this.onViewportChange();
  };

  this.onResize = function (dragEvt, moveEvt, delta) {
    if (!this._customSize.width) {
      this._customSize.width = this._width;
      this._customSize.height = this._height;
    }

    this._customSize.width += delta.x * 2;
    this._customSize.height += delta.y * 2;

    this.update();
  }

  this.delegate = new squill.Delegate(function(on) {

    on.btnSimulators = function () {
      this.refreshSimulators();

      this._createNewSimulator = false;
      this.simulatorMenu.toggle();
    }

    on.btnAddSimulator = function () {
      this._createNewSimulator = true;
      this.simulatorMenu.toggle();
    }

    on.btnReload = function() {
      if (this._device.isLocal()) {
        this._device.getLocalController().rebuild();
      } else {
        this._sendEvent('RELOAD');
      }
    }

    on.btnInspect = function () { this.inspect(); };
    on.btnRotate = function () {
      this.rotate();
      this.emit('change');
    };

    on.btnScreenShot = function () {
      if (this._device.isLocal()) {
        var win = window.open('', '', 'width=' + (this._screenWidth + 2) + ',height=' + (this._screenHeight + 2));
        this._client.sendRequest('SCREENSHOT', function (err, res) {
          var canvas = res.canvasImg;
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
    };

    on.btnNativeBack = function () {
      this._sendEvent('BACK_BUTTON');
    };

    on.btnNativeHome = function () {
      this._sendEvent('HOME_BUTTON');

      this._isAtHomeScreen = !this._isAtHomeScreen;

      var el = this.btnNativeHome._el;
      el.setAttribute('tooltip', this._isAtHomeScreen ? 'return to game' : 'home (hardware button)');
      if (this._isAtHomeScreen) {
        $.addClass(el, 'disabled');
      } else {
        $.removeClass(el, 'disabled');
      }
    };

    on.btnMute = function () {
      var isMuted = !this.isMuted();
      this.setMuted(isMuted);

      var el = this.btnMute.getElement();
      var icon = el.childNodes[0];
      el.setAttribute('tooltip', isMuted ? 'unmute all sounds' : 'mute all sounds');
      if (isMuted) {
        $.addClass(icon, 'glyphicon-volume-off');
        $.removeClass(icon, 'glyphicon-volume-up');
      } else {
        $.addClass(icon, 'glyphicon-volume-up');
        $.removeClass(icon, 'glyphicon-volume-off');
      }

      this.emit('change');
    };

    on.btnDrag = function () {
      this.setDragEnabled(!this._isDragEnabled);

      var el = this.btnDrag.getElement();
      el.setAttribute('tooltip', this._isDragEnabled ? 'lock simulator position' : 'unlock simulator position');
      if (!this._isDragEnabled) {
        $.addClass(el, 'disabled');
      } else {
        $.removeClass(el, 'disabled');
      }
    };

    on.btnPause = function () { this.setPaused(!this._isPaused); };
    on.btnStep = function () {
      this.setPaused(true);
      this._sendEvent('STEP');
    };

    on.btnDebug = function () {
      this._isDebugMode = !this._isDebugMode;
      var el = this.btnDebug._el;
      el.setAttribute('tooltip', this._isDebugMode ? 'switch to release build' : 'switch to debug build');
    }

    on.btnOverflow = function () {
      this.overflowMenu.toggle();
    }
  });

  this.setPaused = function (isPaused) {
    if (this._isPaused == isPaused) { return; }

    this._isPaused = isPaused;

    this._sendEvent(this._isPaused ? 'PAUSE' : 'RESUME');

    var icon = this.btnPause._el.childNodes[0];
    if (!this._isPaused) {
      $.addClass(icon, 'glyphicon-pause');
      $.removeClass(icon, 'glyphicon-play');
    } else {
      $.addClass(icon, 'glyphicon-play');
      $.removeClass(icon, 'glyphicon-pause');
    }

    var el = this.btnPause._el;
    el.setAttribute('tooltip', this._isPaused ? 'resume game timer' : 'pause game timer');
  }

  this.onResizeStop =
  this.onDragStop = function () {
    this.setTransitionsEnabled(true);
  };

  function bound(value, min, max) {
    return value < min ? min : value > max ? max : value;
  }

  this.onViewportChange = function() {
    if (!this._backgroundProps) {
      return;
    }

    var minW = this._el.offsetWidth / 2;
    var minH = this._el.offsetHeight / 2
    var boundW = minW - this.frameWrapper.offsetWidth / 2;
    var boundH = minH - this.frameWrapper.offsetHeight / 2;
    this._offsetX = bound(this._offsetX, -boundW, boundW);
    this._offsetY = bound(this._offsetY, -boundH, boundH);

    if (!this._backgroundProps.width) {
      this._width = this._el.offsetWidth;
      this.contents.style.width = this._width + 'px';
    }

    if (!this._backgroundProps.height) {
      this._height = this._el.offsetHeight;
      this.contents.style.height = this._height + 'px';
      // this._backgroundProps.offsetY = -this._el.offsetHeight / 2;
    }

    /* position the frame in the center, not the chrome -- this ensures that we
     * always try to ensure the canvas is entirely on the screen, letting the chrome
     * exceed the browser viewport if necessary
     */
    var x = Math.round(-this._width / 2 + this._offsetX - this._backgroundProps.offsetX * this._scale);
    var y = Math.round(-this._height / 2 + this._offsetY - this._backgroundProps.offsetY * this._scale);

    $.style(this.frameWrapper, {
      marginTop: this._backgroundProps.offsetY * this._scale + 'px',
      marginLeft: this._backgroundProps.offsetX * this._scale + 'px'
    });

    if (this._params.name == 'Facebook' && x > 0) {
      x = Math.max(0, x - 100);
    }

    this.setTransitionsEnabled(false);

    var top = (this._params.dontCenterY ? -this._height / 2 : y);
    var left = x;
    $.style(this.contents, {
      top: top + 'px',
      left: left + 'px',
    });

    // position toolbar
    top -= 30;
    $.style(this.toolbar, {
      top: top + 'px',
      left: left + 'px',
      width: this.contents.offsetWidth + 'px',
      paddingTop: -Math.min(0, top + minH - 7) + 'px',
      paddingLeft: -Math.min(0, left + minW) + 'px'
    });

    if (!this._mover.isDragging()) {
      onNextFrame(this, 'setTransitionsEnabled', true);
    }
  };

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
  }
});
