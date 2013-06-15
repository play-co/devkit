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
import squill.Window;
import std.uri;

import squill.Drag;

import .resolutions;
import .PortManager;

import lib.PubSub;

import net;
import net.interfaces;
import net.protocols.Cuppa;

var Chrome = exports = Class(squill.Widget, function (supr) {

	// offset from the center
	this._offsetX = 0;
	this._offsetY = 0;

	this._def = {
		className: 'frameChrome no-transitions',
		children: [
			{id: '_background', tag: 'canvas'},
			{
				id: '_frameWrapper',
				children: [
					{id: '_loadingImg'},
					{
						id: '_resizeHandle'
					}
				]
			}
		]
	};

	this.init = function(opts) {
		this._port = opts.port || 9201;

		this._rotation = opts.rotation || 0;
		this._backgroundProps = {};

		this.setType(opts.deviceName);
		this._offsetX = opts.offsetX || 0;
		this._offsetY = opts.offsetY || 0;

		this._simulatorIndex = opts.index;
		this._name = opts.name || 'Simulator_' + this._simulatorIndex;

		supr(this, 'init', arguments);

		this._mover = new squill.Drag()
			.subscribe('DragStart', this, 'onDragStart')
			.subscribe('Drag', this, 'onDrag')
			.subscribe('DragStop', this, 'onDragStop');

		this._resizer = new squill.Drag()
			.subscribe('DragStart', this, 'onResizeStart')
			.subscribe('Drag', this, 'onResize')
			.subscribe('DragStop', this, 'onResizeStop');

		// register a listener for resize events on the window
		this._win = squill.Window.get(window);
		this._win.subscribe('ViewportChange', this, 'onViewportChange');

		window.addEventListener('keydown', bind(this, this._rebuildKeyListener), true);

		// initialize muted state from localStorage
		this._isMuted = false;
		if (localStorage.settingMuted) {
			this._isMuted = true;
		}

		this._appName = opts.appName;
		this.rebuild();
	};

	this.getContainer = function () { return this._frameWrapper || supr(this, 'getContainer'); };

	this.buildWidget = function () {
		$.onEvent(this._el, 'mousedown', this, function () {
				if (this._shouldDrag) {
					this._mover.startDrag();
				}
			});

		$.onEvent(this._resizeHandle, 'mousedown', this, function () {
				this._resizer.startDrag();
			});

		//add actual simulator frame to html.
		this._frame = this.addWidget({
			before: this._loadingImg,
			tag: 'iframe',
			id: '_frame',
			attrs: {
				name: this._name
			},
			src: 'about:blank',
			className: 'frame'
		});

		/*
		this._frame.onload = bind(this, function () {
			// Focus this frame.
			this._frame.contentWindow.focus();
			this._frame.contentWindow.addEventListener('keydown', bind(this, this._rebuildKeyListener), true);

			// Create global reference.
			this.global = this._frame.contentWindow;

			// Did we load an app?
			if (!this.global.CONFIG) { return; }

			// Set ONACCESSIBLE global for game.
			this.global.ONACCESSIBLE = bind(this, function () {
				this.global.ACCESSIBILITY.mute(this.isMuted());
			});

			this.global.CONFIG.splash.hide = bind(this, 'hideLoadingImage');

			// update muted state
			this.mute(this._isMuted);

			this.shouldDrag(this._shouldDrag);

			// unused?
			this.publish('Start');

			this.global._id = this._simulatorIndex;
		});
		*/

		this._server = new DebugLoggerServer({
			name: this._name,
			sim: this
		});
		this.update();
		this.setupUIHandlers();
	};

	this.getDebugLoggerServer = function () {
		return this._server;
	};

	this.setupUIHandlers = function () {
		this.on('BECOME_ACTIVE', bind(this, function () {
			this._el.style.zIndex = 2;
			this._offsetY -= 50;
			this.update();
		}));
	
		this.on('BECOME_INACTIVE', bind(this, function () {
			this._el.style.zIndex = 1;
			this._offsetY += 50;
			this.update();
		}));
	
		this.on('RELOAD', bind(this, function () {
			this.rebuild();
		}));
	
		this.on('ROTATE', bind(this, function () {
			this.rotate();
		}));
	
		this.on('SCREENSHOT', bind(this, function () {
			this._server._conn.sendRequest('SCREENSHOT', {}, null, function (err, res) {
				var canvas = res.canvasImg;
				var win = window.open('', '', 'width=' + (res.width + 2) + ',height=' + (res.height + 2));
				var doc = win.document;
				var now = new Date();
				var min = ('00' + now.getMinutes()).substr(-2);
				var time = now.getHours() + ':' + min;
				var date = now.getMonth() + '/' + now.getDate();
				
				doc.open();
				doc.write('<html><title>Screenshot ' + date + ' ' + time + '</title></head>'
					+ '<body style="margin:0px;padding:0px;background-color:#000;">'
					+ '<img src="' + canvas + '">'
					+ '</body></html>');
				doc.close();
			})
		}));
		
		this.on('BACK_BUTTON', bind(this, function () {
			this._server._conn.sendEvent('BACK_BUTTON', {});
		}));
		
		this.on('HOME_BUTTON', bind(this, function () {
			this._server._conn.sendEvent('HOME_BUTTON', {});
		}));
	
		this.on('MUTE', bind(this, function () {
			this._isMuted ^= true;
			if (this._isMuted) {
				localStorage.settingMuted = true;
			} else {
				delete localStorage.settingMuted;
			}
			this._server._conn.sendEvent('MUTE', {shouldMute: this._isMuted});
		}));
		
		this.on('DRAG', bind(this, function () {
			this.shouldDrag(!this._shouldDrag);
		}));
		
		this.on('PAUSE', bind(this, function () {
			this._server._conn.sendEvent('PAUSE', {});
		}));
		
		this.on('STEP', bind(this, function () {
			this._server._conn.sendEvent('STEP', {});
		}));
	};

	this.hideLoadingImage = function () {
		this._loadingImg.style.opacity = 0;
		setTimeout(bind(this, function () {
			this._loadingImg.style.display = 'none';
		}), 500);
	};

	this.getFrame = function () {
		return this._frame;
	};

	this.getDocument = function () {
		return this._frame.contentDocument;
	};

	this.getLaunchURL = function (params) {
		var query = {}, hash = {
			device: this._params.name
		};

		if (this._appID) {
			query.appID = this._appID;
		} else {
			query.appID = this._appID = window.location.pathname.match(/simulate\/(.*)\//)[1];
		}

		// TODO: legacy entry support
		if (params.entry && params.entry != 'intro') {
			query.test = params.entry;
		}
		
		if (params.inviteCode) {
			query.i = params.inviteCode;
		}
		if (params.displayName) {
			hash.displayName = params.displayName;
		}
		if (params.rotation) {
			hash.rotation = params.rotation;
		}
		if (this._isMuted) {
			hash.mute = "true";
		}

		var r = new std.uri('/simulate/' + this._appID + '/' + this._params.target + '/')
			.addQuery(query)
			.addHash(hash)
			.setProtocol("http")
			.setHost(window.location.hostname)
			.setPort(this._port)

		return r;
	};

	this.getLoadingImageURL = function () {
		var splash;
		if (this._rotation % 2 == 0) {
			//even amounts of rotations mean portrait
			splash = "/splash/portrait2048";
		} else {
			//oods mean landscape
			splash = "/splash/landscape1536";
		}
		return new std.uri(this._params.target + splash).toString();
	};

	this.rebuild = function (next) {
		if (/^native/.test(this._params.target)) {
			this._loadingImg.style.display = 'block';
			this._loadingImg.style.opacity = 1;
			this._loadingImg.style.backgroundImage = 'url(' + this.getLoadingImageURL() + ')';
		}

		var url = this.getLaunchURL({
			rotation: 'none'
		});

		// always reload by redirecting through about:blank
		this._frame.src = 'about:blank';
		setTimeout(bind(this, function () {
			this._frame.src = url;
			next && next(err, res);
		}), 0);
	};

	this._rebuildKeyListener = function (e) {
		//this used to be cmd-shift-r, which is reload without cache.
		// now ctrl-r
		if (e.ctrlKey && e.which == 82) {
			this.rebuild();
			for (var i = 0; i < 25; i++) {
				console.log(Array(i).join(' '));
			}
			console.log('=================================================================');
			console.log('   REBUILDING...');
			console.log('=================================================================');
			e.preventDefault();
			return false;
		}
	};

	this.isMuted = function () {
		return this._isMuted;
	};

	this.shouldDrag = function (flag) {
		this._shouldDrag = !!flag;
	};

	this.setTransitionsEnabled = function (isEnabled) {
		if (isEnabled) {
			$.removeClass(this._el, 'no-transitions');
		} else {
			$.addClass(this._el, 'no-transitions');
		}
	}

	this.setType = function (deviceName) {
		this._deviceName = deviceName;

		var resolution = resolutions.get(deviceName);

		this._params = merge(resolution, {
			name: 'unknown',
			xChromeOffset: 0,
			yChromeOffset: 0,
			imageHeight: 0,
			imageWidth: 0
		});

		// reset any custom resize
		this._customSize = {};

		console.log('Choosing new device:');
		console.log('  type:', deviceName);
		console.log('  target:', this._params.target);
		console.log('  device:', this._params);

		if (this._frame) {
			this.update();
			this.rebuild();
		}

		setTimeout(bind(this, 'setTransitionsEnabled', true), 1000);
	};

	this.rotate = function () {
		++this._rotation;

		this.setTransitionsEnabled(true);
		this._el.style.WebkitTransform = 'rotate(' + (this._rotation % 2 ? 90 : -90) + 'deg)';

		var onRotate = bind(this, function () {
			this._el.removeEventListener("webkitTransitionEnd", onRotate);
			this.setTransitionsEnabled(false);
			this._el.style.WebkitTransform = '';
			this.update();
			setTimeout(bind(this, 'setTransitionsEnabled', true), 0);
		});

		this._el.addEventListener("webkitTransitionEnd", onRotate);
		return this._rotation;
	};

	this._zoom = 1;

	this.setZoom = function (zoom) {
		this._zoom = zoom || 1;
		this.update();
	}

	this.getDevicePixelRatio = function () {
		return this._params.devicePixelRatio || 1;
	}
	
	this.update = function () {
		var parent = this._parent;
		var params = this._params;

		if (!params.canRotate) {
			this._rotation = 0;
		}
		
		var scale = this._scale = 1 / this.getDevicePixelRatio() * this._zoom;
		var cssScale = 'scale(' + scale + ')';

		var width = this._customSize.width || params.width;
		var height = this._customSize.height || params.height;
		if (params.canRotate && this._rotation % 2 == 1) {
			var h = width;
			width = height;
			height = h;
		}

		var s = this._frame.style;
		s.WebkitTransform = cssScale;
		s.WebkitTransformOrigin = "0px 0px";

		this._width = width * scale;
		this._height = height * scale;

		// override the default full-screen with a custom screen size
		var screenSize = params.screenSize;
		if (isArray(params.screenSize)) {
			screenSize = params.screenSize[this._rotation % params.screenSize.length];
		} else {
			screenSize = params.screenSize;
		}

		var frameStyle = this._frameWrapper.style;
		if (screenSize) {
			s.width = screenSize.width + 'px';
			s.height = screenSize.height + 'px';

			frameStyle.width = screenSize.width * scale + 'px';
			frameStyle.height = screenSize.height * scale + 'px';
		} else if (width && height) {

			s.width = width + 'px';
			s.height = height + 'px';

			frameStyle.width = width * scale + 'px';
			frameStyle.height = height * scale + 'px';
		} else {
			frameStyle.width = '100%';
			frameStyle.height = '100%';

			s.width = width + 'px';
			s.height = height + 'px';
		}

		switch (params.name) {
			case 'facebook':
				params.dontCenterY = true;

				var bar = $.create({
					parent: parent.getElement(),
					style: {
						position: 'absolute',
						top: '0px',
						left: '0px',
						width: 'auto',
						height: '40px',
						float: 'left',
						zIndex: 1
					}
				});
				$.create({
					parent: parent.getElement(),
					style: {
						position: 'absolute',
						top: '0px',
						left: '0px',
						width: '100%',
						height: '40px',
						background: '#435d96'
					}
				});
				
				$.style(parent.getElement(), {
					background: '#FFF'
				});
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

		if (props && props.img) {
			var bgWidth = bgProps.width * scale;
			var bgHeight = bgProps.height * scale
			$.style(this._el, {width: bgWidth + 'px', height: bgHeight + 'px'});

			var url = '/plugins/simulate/images/' + props.img;
			if (bgWidth != this._background.width || bgHeight != this._background.height) {
				this._background.width = bgWidth;
				this._background.height = bgHeight;
				this.updateBackground(url);
			} else if (this._backgroundURL != url) {
				this.updateBackground(url);
			}

			if (props.style) { $.style(this._el, props.style); }
		}
		
		this.onViewportChange();
	};

	this.updateBackground = function (url) {
		if (url != this._backgroundURL) {
			this._backgroundURL = url;
			var img = this._backgroundImg = new Image();
			img.onload = bind(this, 'updateBackground', url);
			img.src = url;
			return;
		}

		var ctx = this._background.getContext('2d');
		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		ctx.save();

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

	this.onResizeStop =
	this.onDragStop = function () {
		this.setTransitionsEnabled(true);
	};
	
	this.onViewportChange = function() {
		if (!this._backgroundProps || !this._frame) {
			return;
		}

		var rect = this._parent.getAvailableRect();
		var width = rect.width;
		var height = rect.height;
		
		/* position the frame in the center, not the chrome -- this ensures that we
		 * always try to ensure the canvas is entirely on the screen, letting the chrome
		 * exceed the browser viewport if necessary
		 */
		var x = Math.round(Math.max(0, (width - this._width) / 2)) + this._offsetX - this._backgroundProps.offsetX * this._scale;
		var y = Math.round(Math.max(0, (height - this._height) / 2)) + this._offsetY - this._backgroundProps.offsetY * this._scale;
		
		$.style(this._frameWrapper, {
			marginTop: this._backgroundProps.offsetY * this._scale + 'px',
			marginLeft: this._backgroundProps.offsetX * this._scale + 'px'
		});
		
		if (this._params.name == 'facebook' && x > 0) {
			x = Math.max(0, x - 100);
		}
		
		$.style(this._el, {
			top: rect.y + (this._params.dontCenterY ? 0 : y) + 'px',
			left: rect.x + x + 'px'
		});
	};
});

exports.buildChromeFromURI = function(uri) {
	var uri = new std.uri(uri);

	return new Chrome({
		rotation: parseInt(uri.hash('rotation') || uri.query('rotation')) || 0,
		resolution: resolutions.get(uri.hash('device') || uri.query('device'))
	});
};

var DebugLoggerServer = Class([net.interfaces.Server, lib.PubSub], function () {

	this.init = function (opts) {
		this._name = opts.name;
		this._sim = opts.sim;
	};

	this.built = false;
	this.buildProtocol = function () {
		this._conn = new net.protocols.Cuppa();

		this._conn.onEvent.subscribe('HIDE_LOADING_IMAGE', this._sim, 'hideLoadingImage');

		this._conn.onEvent.subscribe('APP_READY', this, function (evt) {
			this.publish('NewConnection', this._conn, evt.args.uid);

			// we want to immediately send the name for logging purposes
			this._conn.sendEvent('SET_NAME', {name: this._name});
		});

		this.built = true;

		return this._conn;
	};

	this.getConn = function () {
		return this._conn;
	};
});
